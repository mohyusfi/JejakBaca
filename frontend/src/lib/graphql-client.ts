import type { GraphQLRequest, GraphQLResponse } from '../types/api';
import { getAuthToken, notifyUnauthorized } from './api-client';
import { ApiError, isApiError, isApiErrorResponse } from './api-error';
import { isMockModeEnabled } from './env';

export interface GraphQLClientOptions extends GraphQLRequest {
  signal?: AbortSignal;
}

export async function graphqlRequest<TData>(
  options: GraphQLClientOptions,
): Promise<TData> {
  const token = getAuthToken();

  if (isMockModeEnabled()) {
    const { handleMockGraphQL } = await import('./mock/mock-transport');
    try {
      return await handleMockGraphQL<TData>(
        {
          query: options.query,
          variables: options.variables,
          operationName: options.operationName,
        },
        token,
      );
    } catch (error) {
      if (isApiError(error) && error.status === 401) {
        notifyUnauthorized();
      }
      throw error;
    }
  }

  const headers = new Headers({
    Accept: 'application/json',
    'Content-Type': 'application/json',
  });

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch('/graphql', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        query: options.query,
        variables: options.variables,
        operationName: options.operationName ?? undefined,
      }),
      signal: options.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error;
    }
    throw new ApiError(
      'Tidak dapat terhubung ke endpoint GraphQL. Periksa koneksi jaringan Anda.',
      0,
      'NETWORK_ERROR',
    );
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new ApiError(
      'Respons GraphQL tidak valid.',
      response.status,
      'INTERNAL_ERROR',
    );
  }

  if (response.status === 401) {
    notifyUnauthorized();
  }

  if (!response.ok) {
    if (isApiErrorResponse(payload)) {
      throw new ApiError(
        payload.message,
        response.status,
        payload.error.code,
        payload.error.details,
      );
    }
    throw new ApiError(
      `Permintaan GraphQL gagal dengan status ${response.status}.`,
      response.status,
      response.status === 401 ? 'UNAUTHORIZED' : 'GRAPHQL_ERROR',
    );
  }

  const gqlPayload = payload as GraphQLResponse<TData>;
  if (gqlPayload.errors && gqlPayload.errors.length > 0) {
    const firstError = gqlPayload.errors[0];
    const extCode = firstError.extensions?.code;
    const isUnauthorized =
      extCode === 'UNAUTHORIZED' ||
      firstError.message.toLowerCase().includes('unauthorized') ||
      firstError.message.toLowerCase().includes('autentikasi');

    if (isUnauthorized) {
      notifyUnauthorized();
    }

    throw new ApiError(
      gqlPayload.errors.map((e) => e.message).join('; '),
      isUnauthorized ? 401 : 200,
      isUnauthorized ? 'UNAUTHORIZED' : 'GRAPHQL_ERROR',
    );
  }

  if (gqlPayload.data === null || gqlPayload.data === undefined) {
    throw new ApiError('Data GraphQL kosong.', 200, 'GRAPHQL_ERROR');
  }

  return gqlPayload.data;
}
