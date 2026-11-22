import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ApiPaginatedResponse, ApiSuccessResponse } from '../../types/api';
import type {
  AdminLoanItem,
  LibraryBook,
  PublicBookDetail,
  PublicBookSummary,
} from '../../types/domain';
import {
  apiClient,
  registerUnauthorizedHandler,
  setAuthToken,
} from '../api-client';
import { isApiError } from '../api-error';
import { graphqlRequest } from '../graphql-client';
import { resetMockState, switchMockSessionRole } from '../mock/mock-transport';

describe('apiClient & graphqlRequest', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_USE_MOCK', 'false');
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('menyertakan header Authorization Bearer saat token tersedia', async () => {
    setAuthToken('jwt-token-123');
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({ success: true, message: 'OK', data: { id: 1 } }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );

    const res = await apiClient.get<ApiSuccessResponse<{ id: number }>>('/api/v1/auth/me');
    expect(res.data.id).toBe(1);

    const [, init] = fetchSpy.mock.calls[0];
    const headers = init?.headers as Headers;
    expect(headers.get('Authorization')).toBe('Bearer jwt-token-123');
  });

  it('memetakan ApiErrorResponse standar (code, message, details) dan memicu handler 401', async () => {
    const unauthorizedSpy = vi.fn();
    const unsubscribe = registerUnauthorizedHandler(unauthorizedSpy);

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          success: false,
          message: 'Validasi gagal',
          error: {
            code: 'VALIDATION_ERROR',
            details: [{ field: 'email', message: 'Format email tidak valid' }],
          },
        }),
        { status: 400, headers: { 'content-type': 'application/json' } },
      ),
    );

    try {
      await apiClient.post('/api/v1/auth/register', {});
      expect.unreachable('Harusnya melempar ApiError');
    } catch (error) {
      expect(isApiError(error)).toBe(true);
      if (isApiError(error)) {
        expect(error.code).toBe('VALIDATION_ERROR');
        expect(error.details).toEqual([
          { field: 'email', message: 'Format email tidak valid' },
        ]);
      }
    }
    expect(unauthorizedSpy).not.toHaveBeenCalled();

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          success: false,
          message: 'Token kedaluwarsa',
          error: { code: 'UNAUTHORIZED' },
        }),
        { status: 401, headers: { 'content-type': 'application/json' } },
      ),
    );

    await expect(apiClient.get('/api/v1/loans/my')).rejects.toMatchObject({
      status: 401,
      code: 'UNAUTHORIZED',
    });
    expect(unauthorizedSpy).toHaveBeenCalledTimes(1);

    unsubscribe();
  });

  it('menghormati skipUnauthorizedHandler saat login gagal 401', async () => {
    const unauthorizedSpy = vi.fn();
    const unsubscribe = registerUnauthorizedHandler(unauthorizedSpy);

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          success: false,
          message: 'Kredensial salah',
          error: { code: 'UNAUTHORIZED' },
        }),
        { status: 401, headers: { 'content-type': 'application/json' } },
      ),
    );

    await expect(
      apiClient.post(
        '/api/v1/auth/login',
        { identifier: 'x', password: 'y' },
        { skipUnauthorizedHandler: true },
      ),
    ).rejects.toMatchObject({ status: 401, code: 'UNAUTHORIZED' });

    expect(unauthorizedSpy).not.toHaveBeenCalled();
    unsubscribe();
  });

  it('mengirim query GraphQL dengan Bearer token dan memetakan GraphQL errors', async () => {
    setAuthToken('jwt-gql');
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: null,
          errors: [{ message: 'Query tidak valid' }],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );

    await expect(
      graphqlRequest({ query: 'query { invalid }' }),
    ).rejects.toMatchObject({
      code: 'GRAPHQL_ERROR',
      message: 'Query tidak valid',
    });
  });

  it('menyediakan data seed realistis mencakup seluruh edge case saat VITE_USE_MOCK=true', async () => {
    vi.stubEnv('VITE_USE_MOCK', 'true');
    resetMockState();

    // Cek edge case stok buku (aman, menipis=1, habis=0)
    const booksRes = await apiClient.get<ApiPaginatedResponse<LibraryBook>>('/api/v1/books');
    expect(booksRes.data.some((b) => b.stockAvailable > 1)).toBe(true);
    expect(booksRes.data.some((b) => b.stockAvailable === 1)).toBe(true);
    expect(booksRes.data.some((b) => b.stockAvailable === 0)).toBe(true);

    // Cek edge case Buku Publik tanpa deskripsi
    const pubList = await apiClient.get<ApiPaginatedResponse<PublicBookSummary>>(
      '/api/v1/public-books',
      { query: { subject: 'all' } },
    );
    expect(pubList.data.length).toBeGreaterThan(0);
    const noDescDetail = await apiClient.get<ApiSuccessResponse<PublicBookDetail>>(
      '/api/v1/public-books/OL262421W',
    );
    expect(noDescDetail.data.description).toBeNull();
    expect(noDescDetail.data.descriptionFallback).toContain('Open Library');

    // Cek edge case peminjaman aktif, Terlambat, dan dikembalikan via sesi User mock
    switchMockSessionRole('user');
    const loansRes = await apiClient.get<ApiPaginatedResponse<AdminLoanItem>>(
      '/api/v1/loans/my',
      { query: { status: 'all' } },
    );
    expect(loansRes.data.some((l) => l.status === 'borrowed' && !l.isOverdue)).toBe(true);
    expect(loansRes.data.some((l) => l.status === 'borrowed' && l.isOverdue)).toBe(true);
    expect(loansRes.data.some((l) => l.status === 'returned')).toBe(true);
  });
});
