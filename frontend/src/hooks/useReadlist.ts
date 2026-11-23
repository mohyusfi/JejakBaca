import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isApiError } from '../lib/api-error';
import {
  readlistService,
  type ReadlistQueryParams,
} from '../services/readlist-service';
import { useToast } from './useToast';

export const readlistKeys = {
  all: ['readlist'] as const,
  lists: () => [...readlistKeys.all, 'list'] as const,
  list: (params: ReadlistQueryParams) => [...readlistKeys.lists(), params] as const,
};

export function useReadlistQuery(params: ReadlistQueryParams) {
  const normalizedParams: ReadlistQueryParams = {
    q: params.q?.trim() || undefined,
    page: params.page && params.page > 1 ? params.page : 1,
    limit: params.limit || 10,
  };

  return useQuery({
    queryKey: readlistKeys.list(normalizedParams),
    queryFn: ({ signal }) => readlistService.list(normalizedParams, signal),
  });
}

export function useRemoveFromReadlistMutation() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (workId: string) => readlistService.remove(workId),
    onSuccess: () => {
      // Invalidate semua query readlist
      void queryClient.invalidateQueries({ queryKey: readlistKeys.all });

      // Invalidate cache buku publik agar status inReadlist sinkron
      void queryClient.invalidateQueries({ queryKey: ['public-books'] });

      // Invalidate cache ringkasan user
      void queryClient.invalidateQueries({ queryKey: ['my-overview'] });
      void queryClient.invalidateQueries({ queryKey: ['graphql'] });

      showToast({
        title: 'Buku dihapus dari Readlist',
        description: 'Buku berhasil dihapus dari daftar referensi tersimpan Anda.',
        tone: 'success',
      });
    },
    onError: (error) => {
      const message =
        isApiError(error) && error.message
          ? error.message
          : 'Gagal menghapus buku dari Readlist. Silakan coba beberapa saat lagi.';

      showToast({
        title: 'Gagal menghapus buku',
        description: message,
        tone: 'error',
      });
    },
  });
}
