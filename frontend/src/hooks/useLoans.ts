import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { libraryBookKeys } from './useLibraryBooks';
import { loanService, type AdminLoansQueryParams, type MyLoansQueryParams } from '../services/loan-service';

export const loanKeys = {
  all: ['loans'] as const,
  myLists: () => [...loanKeys.all, 'my'] as const,
  myList: (params?: MyLoansQueryParams) => [...loanKeys.myLists(), params ?? {}] as const,
  adminLists: () => [...loanKeys.all, 'admin'] as const,
  adminList: (params?: AdminLoansQueryParams) => [...loanKeys.adminLists(), params ?? {}] as const,
};

/**
 * Hook mutasi peminjaman mandiri Buku Perpustakaan (POST /api/v1/loans)
 */
export function useBorrowBook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (bookId: number) => loanService.borrowBook(bookId),
    onSuccess: () => {
      // Segarkan cache katalog buku, detail buku, daftar peminjaman, dan ringkasan GraphQL
      void queryClient.invalidateQueries({ queryKey: libraryBookKeys.all });
      void queryClient.invalidateQueries({ queryKey: loanKeys.all });
      void queryClient.invalidateQueries({ queryKey: ['graphql', 'myOverview'] });
      void queryClient.invalidateQueries({ queryKey: ['graphql', 'adminOverview'] });
    },
  });
}

/**
 * Hook mutasi pengembalian buku (PATCH /api/v1/loans/{id}/return)
 */
export function useReturnLoan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (loanId: number) => loanService.returnLoan(loanId),
    onSuccess: () => {
      // Segarkan cache katalog buku, detail buku, daftar peminjaman, dan ringkasan GraphQL
      void queryClient.invalidateQueries({ queryKey: libraryBookKeys.all });
      void queryClient.invalidateQueries({ queryKey: loanKeys.all });
      void queryClient.invalidateQueries({ queryKey: ['graphql', 'myOverview'] });
      void queryClient.invalidateQueries({ queryKey: ['graphql', 'adminOverview'] });
    },
  });
}

/**
 * Hook query daftar peminjaman milik User yang login (GET /api/v1/loans/my)
 */
export function useMyLoans(params?: MyLoansQueryParams) {
  return useQuery({
    queryKey: loanKeys.myList(params),
    queryFn: ({ signal }) => loanService.getMyLoans(params, signal),
  });
}

/**
 * Hook query daftar peminjaman seluruh perpustakaan untuk Admin (GET /api/v1/admin/loans)
 */
export function useAdminLoans(params?: AdminLoansQueryParams) {
  return useQuery({
    queryKey: loanKeys.adminList(params),
    queryFn: ({ signal }) => loanService.getAdminLoans(params, signal),
  });
}
