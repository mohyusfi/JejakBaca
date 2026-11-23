import { apiClient } from '../lib/api-client';
import type { ApiPaginatedResponse, ApiSuccessResponse } from '../types/api';
import type { PublicBookDetail, PublicBookSummary } from '../types/domain';

export const UNTAD_ACADEMIC_TOPICS = [
  { id: 'computer_science', label: 'Ilmu Komputer' },
  { id: 'engineering', label: 'Teknik' },
  { id: 'economics', label: 'Ekonomi' },
  { id: 'agriculture', label: 'Pertanian' },
  { id: 'law', label: 'Hukum' },
  { id: 'medicine', label: 'Kedokteran' },
] as const;

export type UntadTopicId = (typeof UNTAD_ACADEMIC_TOPICS)[number]['id'];

export const DEFAULT_PUBLIC_TOPIC: UntadTopicId = 'computer_science';

export interface PublicBooksQueryParams {
  q?: string;
  subject?: string;
  page?: number;
  limit?: number;
}

export const publicBookService = {
  /**
   * Mengambil daftar Buku Publik dari Open Library via proxy backend (GET /api/v1/public-books)
   */
  async search(
    params: PublicBooksQueryParams,
    signal?: AbortSignal,
  ): Promise<ApiPaginatedResponse<PublicBookSummary>> {
    return apiClient.get<ApiPaginatedResponse<PublicBookSummary>>('/api/v1/public-books', {
      query: {
        q: params.q?.trim() || undefined,
        subject: params.subject?.trim() || undefined,
        page: params.page ?? 1,
        limit: params.limit ?? 10,
      },
      signal,
    });
  },

  /**
   * Mengambil detail lengkap satu Buku Publik secara lazy (GET /api/v1/public-books/{workId})
   */
  async detail(workId: string, signal?: AbortSignal): Promise<PublicBookDetail> {
    const res = await apiClient.get<ApiSuccessResponse<PublicBookDetail>>(
      `/api/v1/public-books/${encodeURIComponent(workId)}`,
      { signal },
    );
    return res.data;
  },
};
