import { useQuery } from '@tanstack/react-query';
import {
  DEFAULT_PUBLIC_TOPIC,
  publicBookService,
  type PublicBooksQueryParams,
} from '../services/public-book-service';

export const publicBookKeys = {
  all: ['public-books'] as const,
  searches: () => [...publicBookKeys.all, 'search'] as const,
  search: (params: PublicBooksQueryParams) => [...publicBookKeys.searches(), params] as const,
  details: () => [...publicBookKeys.all, 'detail'] as const,
  detail: (workId: string) => [...publicBookKeys.details(), workId] as const,
};

/**
 * Hook pencarian referensi Buku Publik Open Library via proxy backend.
 */
export function usePublicBooks(params: PublicBooksQueryParams) {
  const normalizedParams: PublicBooksQueryParams = {
    q: params.q?.trim() || undefined,
    // Jika tidak ada pencarian q dan subject tidak disetel, gunakan topik default 'computer_science'
    subject: !params.q?.trim() && !params.subject?.trim()
      ? DEFAULT_PUBLIC_TOPIC
      : params.subject?.trim() || undefined,
    page: params.page && params.page > 0 ? params.page : 1,
    limit: params.limit && params.limit > 0 ? params.limit : 10,
  };

  return useQuery({
    queryKey: publicBookKeys.search(normalizedParams),
    queryFn: ({ signal }) => publicBookService.search(normalizedParams, signal),
  });
}

/**
 * Hook detail satu Buku Publik (LAZY FETCH - hanya dipanggil saat workId valid dan dipilih).
 */
export function usePublicBookDetail(workId: string | null | undefined) {
  const isValidWorkId = Boolean(workId && workId.trim().length > 0);

  return useQuery({
    queryKey: publicBookKeys.detail(isValidWorkId ? (workId as string) : ''),
    queryFn: ({ signal }) => publicBookService.detail(workId as string, signal),
    enabled: isValidWorkId,
  });
}
