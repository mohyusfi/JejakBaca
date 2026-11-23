import { createFileRoute } from '@tanstack/react-router';
import { RefreshCw } from 'lucide-react';
import {
  AdminLoansEmptyState,
  AdminLoansFilterBar,
  AdminLoansPagination,
  AdminLoansSkeleton,
  AdminLoansTable,
} from '../../components/admin';
import { Button } from '../../components/ui/Button';
import { useAdminLoans } from '../../hooks/useLoans';
import type { LoanStatusFilter } from '../../types/domain';

interface AdminLoansSearch {
  status?: LoanStatusFilter;
  q?: string;
  page?: number;
  limit?: number;
}

const DEFAULT_LOANS_STATUS: LoanStatusFilter = 'borrowed';
const DEFAULT_LOANS_LIMIT = 10;
const ALLOWED_LIMITS = [10, 20, 50];
const ALLOWED_STATUSES: LoanStatusFilter[] = ['borrowed', 'overdue', 'returned', 'all'];

function parsePositiveInt(value: unknown, fallback: number): number {
  const num = typeof value === 'number' ? value : Number(value);
  return Number.isInteger(num) && num > 0 ? num : fallback;
}

export const Route = createFileRoute('/admin/loans')({
  validateSearch: (search: Record<string, unknown>): AdminLoansSearch => {
    const rawStatus =
      typeof search.status === 'string' ? (search.status.toLowerCase() as LoanStatusFilter) : undefined;
    const status =
      rawStatus && ALLOWED_STATUSES.includes(rawStatus) && rawStatus !== DEFAULT_LOANS_STATUS
        ? rawStatus
        : undefined;
    const q = typeof search.q === 'string' && search.q.trim() ? search.q : undefined;
    const pageNum = parsePositiveInt(search.page, 1);
    const limitNum = parsePositiveInt(search.limit, DEFAULT_LOANS_LIMIT);
    const limit = ALLOWED_LIMITS.includes(limitNum) ? limitNum : DEFAULT_LOANS_LIMIT;

    return {
      status,
      q,
      page: pageNum > 1 ? pageNum : undefined,
      limit: limit !== DEFAULT_LOANS_LIMIT ? limit : undefined,
    };
  },
  component: AdminLoansPage,
});

function AdminLoansPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  const status: LoanStatusFilter = search.status ?? DEFAULT_LOANS_STATUS;
  const q = search.q ?? '';
  const page = search.page ?? 1;
  const limit = search.limit ?? DEFAULT_LOANS_LIMIT;

  const hasActiveFilters = Boolean(q.trim() || status !== DEFAULT_LOANS_STATUS);

  const { data, isLoading, isError, isFetching, refetch } = useAdminLoans({
    status,
    q,
    page,
    limit,
  });

  const updateSearch = (patch: Partial<AdminLoansSearch>, resetPage = true) => {
    void navigate({
      search: (prev) => {
        const next: AdminLoansSearch = {
          ...prev,
          ...patch,
        };
        if (resetPage) {
          next.page = undefined;
        }
        return {
          status: next.status && next.status !== DEFAULT_LOANS_STATUS ? next.status : undefined,
          q: next.q?.trim() ? next.q : undefined,
          page: next.page && next.page > 1 ? next.page : undefined,
          limit: next.limit && next.limit !== DEFAULT_LOANS_LIMIT ? next.limit : undefined,
        };
      },
      replace: true,
    });
  };

  const resetFilters = () => {
    void navigate({
      search: {
        limit: limit !== DEFAULT_LOANS_LIMIT ? limit : undefined,
      },
      replace: true,
    });
  };

  const loans = data?.data ?? [];
  const meta = data?.meta ?? {
    page,
    limit,
    total: 0,
    totalPages: 1,
  };

  return (
    <section aria-label="Pantau Peminjaman Mahasiswa" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-[var(--color-ink)]">Pantau Peminjaman Mahasiswa</h2>
          <p className="text-xs text-[var(--color-ink-muted)]">
            Pantau buku yang sedang dipinjam, melewati jatuh tempo, serta riwayat pengembalian lengkap dengan identitas NIM.
          </p>
        </div>
      </div>

      <AdminLoansFilterBar
        status={status}
        q={q}
        limit={limit}
        hasActiveFilters={hasActiveFilters}
        onStatusChange={(nextStatus) => updateSearch({ status: nextStatus })}
        onQueryChange={(nextQ) => updateSearch({ q: nextQ })}
        onLimitChange={(nextLimit) => updateSearch({ limit: nextLimit })}
        onResetFilters={resetFilters}
      />

      {isLoading ? (
        <AdminLoansSkeleton />
      ) : isError ? (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-card)] border border-[var(--color-danger-border)] bg-[var(--color-danger-surface)] px-4 py-3 text-sm text-[var(--color-danger)]"
        >
          <span>Gagal memuat daftar peminjaman mahasiswa.</span>
          <Button type="button" variant="secondary" size="sm" onClick={() => void refetch()}>
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            Coba Lagi
          </Button>
        </div>
      ) : loans.length === 0 ? (
        <AdminLoansEmptyState status={status} q={q} onResetFilters={resetFilters} />
      ) : (
        <>
          <AdminLoansTable loans={loans} />
          <AdminLoansPagination
            page={meta.page}
            totalPages={meta.totalPages}
            isFetching={isFetching}
            onPageChange={(nextPage) => updateSearch({ page: nextPage }, false)}
          />
        </>
      )}
    </section>
  );
}
