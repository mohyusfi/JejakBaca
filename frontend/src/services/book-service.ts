import { apiClient } from '../lib/api-client';
import type { ApiPaginatedResponse, ApiSuccessResponse } from '../types/api';
import type {
  CreateLibraryBookRequest,
  LibraryBook,
  UpdateLibraryBookRequest,
} from '../types/domain';

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

  /**
   * Menambahkan Buku Perpustakaan baru via POST /api/v1/books (Admin).
   */
  async create(payload: CreateLibraryBookRequest): Promise<LibraryBook> {
    const res = await apiClient.post<ApiSuccessResponse<LibraryBook>>(
      '/api/v1/books',
      payload,
    );
    return res.data;
  },

  /**
   * Memperbarui metadata dan total stok Buku Perpustakaan via PUT /api/v1/books/{id} (Admin).
   */
  async update(
    bookId: number,
    payload: UpdateLibraryBookRequest,
  ): Promise<LibraryBook> {
    const res = await apiClient.put<ApiSuccessResponse<LibraryBook>>(
      `/api/v1/books/${bookId}`,
      payload,
    );
    return res.data;
  },

  /**
   * Menghapus Buku Perpustakaan via DELETE /api/v1/books/{id} (Admin).
   */
  async delete(bookId: number): Promise<{ id: number }> {
    const res = await apiClient.delete<ApiSuccessResponse<{ id: number }>>(
      `/api/v1/books/${bookId}`,
    );
    return res.data;
  },
};
