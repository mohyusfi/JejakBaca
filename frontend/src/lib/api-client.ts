import { ApiError, isApiError, isApiErrorResponse } from './api-error';
import { getAuthStorageKey, isMockModeEnabled } from './env';

export type UnauthorizedHandler = () => void;

const unauthorizedHandlers = new Set<UnauthorizedHandler>();

export function registerUnauthorizedHandler(handler: UnauthorizedHandler): () => void {
  unauthorizedHandlers.add(handler);
  return () => {
    unauthorizedHandlers.delete(handler);
  };
}

export function notifyUnauthorized(): void {
  for (const handler of unauthorizedHandlers) {
    handler();
  }
}

export function getAuthToken(): string | null {
  try {
    return window.localStorage.getItem(getAuthStorageKey());
  } catch {
    return null;
  }
}

export function setAuthToken(token: string | null): void {
  try {
    if (token) {
      window.localStorage.setItem(getAuthStorageKey(), token);
    } else {
      window.localStorage.removeItem(getAuthStorageKey());
    }
  } catch {
    // Abaikan jika localStorage tidak tersedia (mis. mode privat ketat)
  }
}

export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  skipUnauthorizedHandler?: boolean;
}

function buildRequestUrl(
  path: string,
  query?: Record<string, string | number | boolean | undefined | null>,
): string {
  if (!query) return path;
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.set(key, String(value));
    }
  }
  const serialized = searchParams.toString();
  return serialized ? `${path}?${serialized}` : path;
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const method = options.method ?? 'GET';
  const token = getAuthToken();
  const url = buildRequestUrl(path, options.query);

  if (isMockModeEnabled()) {
    const { handleMockRest } = await import('./mock/mock-transport');
    try {
      return await handleMockRest<T>(method, url, options.body, token);
    } catch (error) {
      if (isApiError(error) && error.status === 401 && !options.skipUnauthorizedHandler) {
        notifyUnauthorized();
      }
      throw error;
    }
  }

  const headers = new Headers({
    Accept: 'application/json',
    ...options.headers,
  });

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let serializedBody: string | undefined;
  if (options.body !== undefined) {
    headers.set('Content-Type', 'application/json');
    serializedBody = JSON.stringify(options.body);
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: serializedBody,
      signal: options.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error;
    }
    throw new ApiError(
      'Tidak dapat terhubung ke server. Periksa koneksi jaringan Anda.',
      0,
      'NETWORK_ERROR',
    );
  }

  let parsedPayload: unknown = null;
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    try {
      parsedPayload = await response.json();
    } catch {
      throw new ApiError(
        'Respons server tidak valid.',
        response.status,
        'INTERNAL_ERROR',
      );
    }
  }

  if (response.status === 401 && !options.skipUnauthorizedHandler) {
    notifyUnauthorized();
  }

  if (!response.ok || isApiErrorResponse(parsedPayload)) {
    if (isApiErrorResponse(parsedPayload)) {
      throw new ApiError(
        parsedPayload.message,
        response.status,
        parsedPayload.error.code,
        parsedPayload.error.details,
      );
    }

    throw new ApiError(
      `Permintaan gagal dengan status ${response.status}.`,
      response.status,
      response.status === 401 ? 'UNAUTHORIZED' : 'INTERNAL_ERROR',
    );
  }

  return parsedPayload as T;
}

export const apiClient = {
  get: <T>(path: string, options?: Omit<ApiRequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: Omit<ApiRequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(path, { ...options, method: 'POST', body }),
  put: <T>(path: string, body?: unknown, options?: Omit<ApiRequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(path, { ...options, method: 'PUT', body }),
  patch: <T>(path: string, body?: unknown, options?: Omit<ApiRequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(path, { ...options, method: 'PATCH', body }),
  delete: <T>(path: string, options?: Omit<ApiRequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(path, { ...options, method: 'DELETE' }),
};
