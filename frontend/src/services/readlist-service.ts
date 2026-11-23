import { apiClient } from '../lib/api-client';
import type { ApiPaginatedResponse, ApiSuccessResponse } from '../types/api';
import type { ReadlistItem } from '../types/domain';

export const DEFAULT_READLIST_LIMIT = 10;
export const READLIST_LIMIT_OPTIONS = [10, 20, 50] as const;

export interface ReadlistQueryParams {
  q?: string;
  page?: number;
  limit?: number;
}

export const readlistService = {
  /**
   * Mengambil daftar paginasi snapshot Readlist milik User dari GET /api/v1/readlist.
   */
  async list(
    params: ReadlistQueryParams = {},
    signal?: AbortSignal,
  ): Promise<ApiPaginatedResponse<ReadlistItem>> {
    return apiClient.get<ApiPaginatedResponse<ReadlistItem>>('/api/v1/readlist', {
      query: {
        q: params.q?.trim() || undefined,
        page: params.page && params.page > 1 ? params.page : undefined,
        limit:
          params.limit && params.limit !== DEFAULT_READLIST_LIMIT
            ? params.limit
            : undefined,
      },
      signal,
    });
  },

  /**
   * Menghapus satu item Buku Publik dari Readlist via DELETE /api/v1/readlist/{workId}.
   */
  async remove(workId: string): Promise<{ workId: string }> {
    const res = await apiClient.delete<ApiSuccessResponse<{ workId: string }>>(
      `/api/v1/readlist/${encodeURIComponent(workId)}`,
    );
    return res.data;
  },

  /**
   * Menambahkan Buku Publik ke Readlist via POST /api/v1/readlist.
   */
  async add(workId: string): Promise<ReadlistItem> {
    const res = await apiClient.post<ApiSuccessResponse<ReadlistItem>>(
      '/api/v1/readlist',
      { workId },
    );
    return res.data;
  },
};
