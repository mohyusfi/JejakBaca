import { useNavigate } from '@tanstack/react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { useToast } from './useToast';
import { readlistService } from '../services/readlist-service';
import { publicBookKeys } from './usePublicBooks';
import { readlistKeys } from './useReadlist';
import { isApiError } from '../lib/api-error';
import type { ApiPaginatedResponse } from '../types/api';
import type { PublicBookDetail, PublicBookSummary } from '../types/domain';

export interface UseReadlistActionParams {
  workId?: string;
  title?: string;
  inReadlist?: boolean;
}

export function useReadlistAction({
  workId,
  title = '',
  inReadlist = false,
}: UseReadlistActionParams) {
  const { actor } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const addMutation = useMutation({
    mutationFn: (targetWorkId: string) => readlistService.add(targetWorkId),
    onSuccess: (_, targetWorkId) => {
      // 1. Invalidate queries
      void queryClient.invalidateQueries({ queryKey: publicBookKeys.all });
      void queryClient.invalidateQueries({ queryKey: readlistKeys.all });
      void queryClient.invalidateQueries({ queryKey: ['graphql', 'myOverview'] });
      void queryClient.invalidateQueries({ queryKey: ['my-overview'] });

      // 2. Perbarui cache detail buku jika ada
      queryClient.setQueryData<PublicBookDetail>(
        publicBookKeys.detail(targetWorkId),
        (old) => {
          if (!old) return old;
          return { ...old, inReadlist: true };
        },
      );

      // 3. Perbarui cache daftar pencarian buku publik
      queryClient.setQueriesData<ApiPaginatedResponse<PublicBookSummary>>(
        { queryKey: publicBookKeys.searches() },
        (old) => {
          if (!old?.data) return old;
          return {
            ...old,
            data: old.data.map((b) =>
              b.workId === targetWorkId ? { ...b, inReadlist: true } : b,
            ),
          };
        },
      );

      showToast({
        tone: 'success',
        title: 'Berhasil Ditambahkan ke Readlist',
        description: `Buku "${title}" berhasil disimpan ke Readlist Anda.`,
      });
    },
    onError: (err) => {
      let message = 'Gagal menambahkan buku ke Readlist.';
      if (isApiError(err)) {
        if (err.code === 'ALREADY_IN_READLIST') {
          message = 'Buku ini sudah tersimpan di Readlist Anda.';
        } else if (err.code === 'UPSTREAM_API_ERROR') {
          message = 'Layanan Open Library sedang tidak dapat dijangkau. Silakan coba beberapa saat lagi.';
        } else {
          message = err.message || message;
        }
      } else if (err instanceof Error) {
        message = err.message;
      }

      showToast({
        tone: 'error',
        title: 'Gagal Menambahkan ke Readlist',
        description: message,
      });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (targetWorkId: string) => readlistService.remove(targetWorkId),
    onSuccess: (_, targetWorkId) => {
      // 1. Invalidate queries
      void queryClient.invalidateQueries({ queryKey: publicBookKeys.all });
      void queryClient.invalidateQueries({ queryKey: readlistKeys.all });
      void queryClient.invalidateQueries({ queryKey: ['graphql', 'myOverview'] });
      void queryClient.invalidateQueries({ queryKey: ['my-overview'] });

      // 2. Perbarui cache detail buku jika ada
      queryClient.setQueryData<PublicBookDetail>(
        publicBookKeys.detail(targetWorkId),
        (old) => {
          if (!old) return old;
          return { ...old, inReadlist: false };
        },
      );

      // 3. Perbarui cache daftar pencarian buku publik
      queryClient.setQueriesData<ApiPaginatedResponse<PublicBookSummary>>(
        { queryKey: publicBookKeys.searches() },
        (old) => {
          if (!old?.data) return old;
          return {
            ...old,
            data: old.data.map((b) =>
              b.workId === targetWorkId ? { ...b, inReadlist: false } : b,
            ),
          };
        },
      );

      showToast({
        tone: 'success',
        title: 'Berhasil Dihapus dari Readlist',
        description: `Buku "${title}" berhasil dihapus dari Readlist Anda.`,
      });
    },
    onError: (err) => {
      let message = 'Gagal menghapus buku dari Readlist.';
      if (isApiError(err)) {
        if (err.code === 'UPSTREAM_API_ERROR') {
          message = 'Layanan Open Library sedang tidak dapat dijangkau. Silakan coba beberapa saat lagi.';
        } else {
          message = err.message || message;
        }
      } else if (err instanceof Error) {
        message = err.message;
      }

      showToast({
        tone: 'error',
        title: 'Gagal Menghapus dari Readlist',
        description: message,
      });
    },
  });

  const handleAdd = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!workId || addMutation.isPending || removeMutation.isPending) return;

    if (actor === 'guest') {
      void navigate({
        to: '/login',
        search: { redirect: `/public-books?workId=${workId}` },
      });
      return;
    }

    if (actor === 'admin') {
      return;
    }

    addMutation.mutate(workId);
  };

  const handleRemove = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!workId || addMutation.isPending || removeMutation.isPending) return;

    if (actor !== 'user') {
      return;
    }

    removeMutation.mutate(workId);
  };

  const handleToggle = (e?: React.MouseEvent) => {
    if (inReadlist) {
      handleRemove(e);
    } else {
      handleAdd(e);
    }
  };

  return {
    actor,
    canShowAction: actor !== 'admin',
    inReadlist: Boolean(inReadlist),
    isLoading: addMutation.isPending || removeMutation.isPending,
    isAdding: addMutation.isPending,
    isRemoving: removeMutation.isPending,
    handleAdd,
    handleRemove,
    handleToggle,
  };
}
