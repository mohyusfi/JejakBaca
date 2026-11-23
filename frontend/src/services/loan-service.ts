import { apiClient } from '../lib/api-client';
import type { ApiPaginatedResponse, ApiSuccessResponse } from '../types/api';
import type { AdminLoanItem, LoanItem, LoanStatusFilter } from '../types/domain';

export interface MyLoansQueryParams {
  status?: LoanStatusFilter;
  page?: number;
  limit?: number;
}

export interface AdminLoansQueryParams {
  status?: LoanStatusFilter;
  page?: number;
  limit?: number;
  q?: string;
}

export const loanService = {
  /**
   * Meminjam Buku Perpustakaan secara mandiri (POST /api/v1/loans)
   */
  async borrowBook(bookId: number): Promise<LoanItem> {
    const res = await apiClient.post<ApiSuccessResponse<LoanItem>>('/api/v1/loans', {
      bookId,
    });
    return res.data;
  },

  /**
   * Mengembalikan Buku Perpustakaan yang sedang dipinjam (PATCH /api/v1/loans/{id}/return)
   */
  async returnLoan(loanId: number): Promise<LoanItem> {
    const res = await apiClient.patch<ApiSuccessResponse<LoanItem>>(
      `/api/v1/loans/${loanId}/return`,
      {},
    );
    return res.data;
  },

  /**
   * Mengambil daftar peminjaman milik User yang login (GET /api/v1/loans/my)
   */
  async getMyLoans(
    params?: MyLoansQueryParams,
    signal?: AbortSignal,
  ): Promise<ApiPaginatedResponse<LoanItem>> {
    return apiClient.get<ApiPaginatedResponse<LoanItem>>('/api/v1/loans/my', {
      query: {
        status: params?.status && params.status !== 'all' ? params.status : undefined,
        page: params?.page ?? 1,
        limit: params?.limit ?? 10,
      },
      signal,
    });
  },

  /**
   * Mengambil seluruh data peminjaman perpustakaan (khusus Admin) (GET /api/v1/admin/loans)
   */
  async getAdminLoans(
    params?: AdminLoansQueryParams,
    signal?: AbortSignal,
  ): Promise<ApiPaginatedResponse<AdminLoanItem>> {
    return apiClient.get<ApiPaginatedResponse<AdminLoanItem>>('/api/v1/admin/loans', {
      query: {
        status: params?.status && params.status !== 'all' ? params.status : undefined,
        page: params?.page ?? 1,
        limit: params?.limit ?? 10,
        q: params?.q?.trim() || undefined,
      },
      signal,
    });
  },
};
