import { apiClient } from '../lib/api-client';
import type { ApiPaginatedResponse, ApiSuccessResponse } from '../types/api';
import type { LibraryBook } from '../types/domain';

export const CATALOG_CATEGORIES = [
  'Informatika',
  'Sistem Informasi',
  'Matematika',
  'Metodologi Penelitian',
  'Teknik Sipil',
] as const;

export const CATALOG_LIMIT_OPTIONS = [10, 20, 50] as const;

export const DEFAULT_CATALOG_LIMIT = 10;

export interface LibraryBooksQueryParams {
  q?: string;
  category?: string;
  availableOnly?: boolean;
  page?: number;
  limit?: number;
}

export const bookService = {
  /**
   * Mengambil daftar paginasi Buku Perpustakaan UNTAD dari GET /api/v1/books.
   */
  async list(
    params: LibraryBooksQueryParams,
    signal?: AbortSignal,
  ): Promise<ApiPaginatedResponse<LibraryBook>> {
    return apiClient.get<ApiPaginatedResponse<LibraryBook>>('/api/v1/books', {
      query: {
        q: params.q?.trim() || undefined,
        category: params.category?.trim() || undefined,
        availableOnly: params.availableOnly ? 'true' : undefined,
        page: params.page ?? 1,
        limit: params.limit ?? DEFAULT_CATALOG_LIMIT,
      },
      signal,
    });
  },

  /**
   * Mengambil detail lengkap satu Buku Perpustakaan dari GET /api/v1/books/{id}.
   */
  async detail(bookId: number, signal?: AbortSignal): Promise<LibraryBook> {
    const res = await apiClient.get<ApiSuccessResponse<LibraryBook>>(
      `/api/v1/books/${bookId}`,
      { signal },
    );
    return res.data;
  },
};
