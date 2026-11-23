import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { isApiError } from '../lib/api-error';
import { bookService, DEFAULT_CATALOG_LIMIT } from '../services/book-service';
import type {
  CreateLibraryBookRequest,
  UpdateLibraryBookRequest,
} from '../types/domain';
import { adminKeys } from './useAdminOverview';

export interface CatalogFilterState {
  q: string;
  category: string;
  availableOnly: boolean;
  limit: number;
}

export interface AdminLibraryBooksParams extends CatalogFilterState {
  page: number;
}

export const libraryBookKeys = {
  all: ['library-books'] as const,
  lists: () => [...libraryBookKeys.all, 'list'] as const,
  list: (filters: CatalogFilterState) => [...libraryBookKeys.lists(), filters] as const,
  paginated: (params: AdminLibraryBooksParams) =>
    [...libraryBookKeys.lists(), 'paginated', params] as const,
  details: () => [...libraryBookKeys.all, 'detail'] as const,
  detail: (id: number) => [...libraryBookKeys.details(), id] as const,
};

/**
 * Hook infinite query untuk daftar Buku Perpustakaan pada halaman Katalog Perpustakaan.
 */
export function useInfiniteLibraryBooks(filters: CatalogFilterState) {
  const normalizedFilters: CatalogFilterState = {
    q: filters.q.trim(),
    category: filters.category.trim(),
    availableOnly: Boolean(filters.availableOnly),
    limit: filters.limit || DEFAULT_CATALOG_LIMIT,
  };

  return useInfiniteQuery({
    queryKey: libraryBookKeys.list(normalizedFilters),
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      bookService.list(
        {
          q: normalizedFilters.q,
          category: normalizedFilters.category,
          availableOnly: normalizedFilters.availableOnly,
          page: pageParam,
          limit: normalizedFilters.limit,
        },
        signal,
      ),
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage.meta;
      return page < totalPages ? page + 1 : undefined;
    },
  });
}

/**
 * Hook detail satu Buku Perpustakaan untuk panel sisi (desktop) atau bottom sheet (mobile).
 */
export function useLibraryBookDetail(bookId: number | null) {
  const isValidId = bookId !== null && Number.isInteger(bookId) && bookId > 0;

  return useQuery({
    queryKey: libraryBookKeys.detail(isValidId ? bookId : 0),
    queryFn: ({ signal }) => bookService.detail(bookId as number, signal),
    enabled: isValidId,
    retry: (failureCount, error) => {
      if (isApiError(error) && error.status === 404) {
        return false;
      }
      return failureCount < 1;
    },
  });
}

/**
 * Hook paginated query untuk daftar Buku Perpustakaan di Workspace Admin (`/admin/books`).
 */
export function useLibraryBooks(params: AdminLibraryBooksParams) {
  const normalizedParams: AdminLibraryBooksParams = {
    q: params.q.trim(),
    category: params.category.trim(),
    availableOnly: Boolean(params.availableOnly),
    page: Math.max(1, params.page || 1),
    limit: params.limit || DEFAULT_CATALOG_LIMIT,
  };

  return useQuery({
    queryKey: libraryBookKeys.paginated(normalizedParams),
    queryFn: ({ signal }) => bookService.list(normalizedParams, signal),
    placeholderData: keepPreviousData,
  });
}

/**
 * Hook mutasi penambahan Buku Perpustakaan baru (POST /api/v1/books)
 */
export function useCreateLibraryBook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateLibraryBookRequest) => bookService.create(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: libraryBookKeys.all });
      void queryClient.invalidateQueries({ queryKey: adminKeys.all });
      void queryClient.invalidateQueries({ queryKey: ['graphql'] });
    },
  });
}

/**
 * Hook mutasi pembaruan Buku Perpustakaan (PUT /api/v1/books/{id})
 */
export function useUpdateLibraryBook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateLibraryBookRequest }) =>
      bookService.update(id, payload),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: libraryBookKeys.all });
      void queryClient.invalidateQueries({ queryKey: adminKeys.all });
      void queryClient.invalidateQueries({ queryKey: ['graphql'] });
      queryClient.setQueryData(libraryBookKeys.detail(data.id), data);
    },
  });
}

/**
 * Hook mutasi penghapusan Buku Perpustakaan (DELETE /api/v1/books/{id})
 */
export function useDeleteLibraryBook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (bookId: number) => bookService.delete(bookId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: libraryBookKeys.all });
      void queryClient.invalidateQueries({ queryKey: adminKeys.all });
      void queryClient.invalidateQueries({ queryKey: ['graphql'] });
    },
  });
}
