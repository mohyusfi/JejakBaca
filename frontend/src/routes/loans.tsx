import { useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { AlertCircle, AlertTriangle, BookOpen, CheckCircle2, Clock, CornerDownLeft, Library, RefreshCw } from 'lucide-react';
import { UserRouteGuard } from '../components/layout/RouteGuard';
import { BookCover } from '../components/ui/BookCover';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { useMyLoans, useMyOverview, useReturnLoan } from '../hooks/useLoans';
import { useToast } from '../hooks/useToast';
import { cn } from '../lib/cn';
import { formatDateId, formatLoanDueLabel, formatLoanQuota } from '../lib/format';
import type { LoanItem, LoanStatusFilter } from '../types/domain';

export interface LoansSearchParams {
  status?: LoanStatusFilter;
  page?: number;
}

export function validateLoansSearch(raw: Record<string, unknown>): LoansSearchParams {
  const statusStr = typeof raw.status === 'string' ? raw.status.toLowerCase() : undefined;
  const status =
    statusStr && ['all', 'borrowed', 'overdue', 'returned'].includes(statusStr)
      ? (statusStr as LoanStatusFilter)
      : undefined;

  let page: number | undefined;
  if (typeof raw.page === 'number' && Number.isInteger(raw.page) && raw.page > 1) {
    page = raw.page;
  } else if (typeof raw.page === 'string' && /^\d+$/.test(raw.page.trim())) {
    const parsed = Number(raw.page.trim());
    if (parsed > 1) page = parsed;
  }

  return { status, page };
}

export const Route = createFileRoute('/loans')({
  validateSearch: validateLoansSearch,
  component: MyLoansPage,
});

const STATUS_TABS: Array<{ id: LoanStatusFilter; label: string }> = [
  { id: 'all', label: 'Semua' },
  { id: 'borrowed', label: 'Dipinjam' },
  { id: 'overdue', label: 'Terlambat' },
  { id: 'returned', label: 'Dikembalikan' },
];

function MyLoansPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { showToast } = useToast();

  const activeTab: LoanStatusFilter = search.status ?? 'all';
  const currentPage = search.page ?? 1;

  // 1. Data Ringkasan Kuota dari GraphQL POST /graphql (query myOverview)
  const overviewQuery = useMyOverview();

  // 2. Data Daftar Peminjaman dari REST GET /api/v1/loans/my
  const loansQuery = useMyLoans({
    status: activeTab,
    page: currentPage,
    limit: 10,
  });

  // 3. Mutasi Pengembalian Buku PATCH /api/v1/loans/:id/return
  const returnMutation = useReturnLoan();
  const [returningLoan, setReturningLoan] = useState<LoanItem | null>(null);

  const handleTabChange = (nextStatus: LoanStatusFilter) => {
    void navigate({
      search: (prev) => ({
        ...prev,
        status: nextStatus === 'all' ? undefined : nextStatus,
        page: undefined,
      }),
    });
  };

  const handlePageChange = (nextPage: number) => {
    void navigate({
      search: (prev) => ({
        ...prev,
        page: nextPage > 1 ? nextPage : undefined,
      }),
    });
  };

  const handleConfirmReturn = () => {
    if (!returningLoan) return;

    returnMutation.mutate(returningLoan.id, {
      onSuccess: () => {
        showToast({
          tone: 'success',
          title: 'Buku Berhasil Dikembalikan',
          description: `Buku "${returningLoan.bookTitle}" telah dicatat kembali ke perpustakaan.`,
        });
        setReturningLoan(null);
      },
      onError: (err) => {
        showToast({
          tone: 'error',
          title: 'Gagal Mengembalikan Buku',
          description: err instanceof Error ? err.message : 'Terjadi kesalahan sistem.',
        });
      },
    });
  };

  const overview = overviewQuery.data;
  const loans = loansQuery.data?.data ?? [];
  const meta = loansQuery.data?.meta;
  const totalPages = meta?.totalPages ?? 1;

  return (
    <UserRouteGuard>
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
        {/* Header Zona Peminjaman */}
        <header className="border-b border-[var(--color-border)] pb-5">
          <p className="font-mono text-xs font-semibold tracking-wider text-[var(--color-primary)] uppercase">
            Sirkulasi Mahasiswa
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[var(--color-ink)] sm:text-3xl">
            Peminjaman Saya
          </h1>
          <p className="mt-1.5 text-sm text-[var(--color-ink-muted)]">
            Pantau Buku Perpustakaan yang sedang dipinjam, kuota aktif (maks 3 buku), sisa hari jatuh tempo, serta riwayat buku yang telah dikembalikan.
          </p>
        </header>

        {/* Strip Ringkasan Kuota (GraphQL myOverview) */}
        <section aria-label="Ringkasan Kuota Peminjaman" className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Card 1: Kuota Aktif */}
          <div className="rounded-[var(--radius-card)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] p-4 shadow-xs">
            <div className="flex items-center justify-between text-xs text-[var(--color-ink-muted)]">
              <span className="font-medium">Buku Dipinjam</span>
              <BookOpen className="h-4 w-4 text-[var(--color-primary)]" aria-hidden="true" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-[var(--color-ink)] tabular-nums">
                {overviewQuery.isLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  formatLoanQuota(overview?.activeLoansCount ?? 0)
                )}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-[var(--color-ink-subtle)]">
              Batas kuota maksimal 3 buku aktif
            </p>
          </div>

          {/* Card 2: Status Terlambat */}
          <div className="rounded-[var(--radius-card)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] p-4 shadow-xs">
            <div className="flex items-center justify-between text-xs text-[var(--color-ink-muted)]">
              <span className="font-medium">Pinjaman Terlambat</span>
              <Clock className="h-4 w-4 text-[var(--color-danger)]" aria-hidden="true" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span
                className={cn(
                  'text-2xl font-bold tracking-tight tabular-nums',
                  (overview?.overdueLoansCount ?? 0) > 0
                    ? 'text-[var(--color-danger)]'
                    : 'text-[var(--color-ink)]',
                )}
              >
                {overviewQuery.isLoading ? (
                  <Skeleton className="h-8 w-14" />
                ) : (
                  `${overview?.overdueLoansCount ?? 0} buku`
                )}
              </span>
              {!overviewQuery.isLoading && (overview?.overdueLoansCount ?? 0) > 0 && (
                <span className="inline-flex items-center rounded-full bg-[var(--color-danger)] px-2 py-0.5 text-[10px] font-bold text-white uppercase">
                  Perhatian
                </span>
              )}
            </div>
            <p className="mt-1 text-[11px] text-[var(--color-ink-subtle)]">
              {(overview?.overdueLoansCount ?? 0) > 0
                ? 'Harap segera dikembalikan ke perpustakaan'
                : 'Tidak ada pinjaman melewati batas tempo'}
            </p>
          </div>

          {/* Card 3: Readlist */}
          <div className="rounded-[var(--radius-card)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] p-4 shadow-xs">
            <div className="flex items-center justify-between text-xs text-[var(--color-ink-muted)]">
              <span className="font-medium">Readlist Saya</span>
              <CornerDownLeft className="h-4 w-4 text-[var(--color-primary)]" aria-hidden="true" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-[var(--color-ink)] tabular-nums">
                {overviewQuery.isLoading ? (
                  <Skeleton className="h-8 w-14" />
                ) : (
                  `${overview?.readlistCount ?? 0} referensi`
                )}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-[var(--color-ink-subtle)]">
              Buku Publik yang disimpan untuk referensi
            </p>
          </div>
        </section>

        {/* Tab Filter Status */}
        <section aria-label="Filter Status Peminjaman" className="border-b border-[var(--color-border)]">
          <nav className="flex space-x-2" aria-label="Status Tabs">
            {STATUS_TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleTabChange(tab.id)}
                  className={cn(
                    'border-b-2 px-3.5 py-2.5 text-xs font-semibold whitespace-nowrap transition-colors duration-150 sm:text-sm',
                    isActive
                      ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                      : 'border-transparent text-[var(--color-ink-muted)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-ink)]',
                  )}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </section>

        {/* Daftar Peminjaman */}
        <section aria-label="Daftar Transaksi Peminjaman" className="space-y-3">
          {/* Loading Skeleton */}
          {loansQuery.isLoading && (
            <div className="space-y-3" aria-label="Memuat data peminjaman">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3.5">
                    <Skeleton className="h-20 w-14 shrink-0 rounded-[var(--radius-cover)]" />
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-48" />
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-40" />
                    </div>
                  </div>
                  <Skeleton className="h-9 w-28 rounded-[var(--radius-control)]" />
                </div>
              ))}
            </div>
          )}

          {/* Error State */}
          {loansQuery.isError && !loansQuery.isLoading && (
            <div className="rounded-[var(--radius-card)] border border-[var(--color-danger-border)] bg-[var(--color-surface)] p-6 text-center">
              <AlertCircle className="mx-auto h-8 w-8 text-[var(--color-danger)]" aria-hidden="true" />
              <h2 className="mt-2 text-sm font-bold text-[var(--color-ink)]">Gagal memuat data peminjaman</h2>
              <p className="mt-1 text-xs text-[var(--color-ink-muted)]">
                {loansQuery.error instanceof Error ? loansQuery.error.message : 'Terjadi gangguan saat memuat peminjaman.'}
              </p>
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
                className="mt-3"
                onClick={() => void loansQuery.refetch()}
              >
                Coba Lagi
              </Button>
            </div>
          )}

          {/* Empty State */}
          {!loansQuery.isLoading && !loansQuery.isError && loans.length === 0 && (
            <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center sm:p-12">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-surface-subtle)] text-[var(--color-primary)]">
                <BookOpen className="h-6 w-6" aria-hidden="true" />
              </div>
              <h2 className="mt-3 text-base font-bold text-[var(--color-ink)]">
                {activeTab === 'all'
                  ? 'Belum Ada Peminjaman Buku'
                  : `Tidak ada peminjaman berstatus "${STATUS_TABS.find((t) => t.id === activeTab)?.label}"`}
              </h2>
              <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-[var(--color-ink-muted)] sm:text-sm">
                Buku Perpustakaan UNTAD dapat dipinjam secara mandiri dengan kuota maksimal 3 buku dan jatuh tempo 7 hari.
              </p>
              <div className="mt-5">
                <Link
                  to="/"
                  className="inline-flex min-h-[40px] items-center gap-2 rounded-[var(--radius-control)] bg-[var(--color-primary)] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[var(--color-primary-hover)] sm:text-sm"
                >
                  <Library className="h-4 w-4" aria-hidden="true" />
                  <span>Katalog Perpustakaan</span>
                </Link>
              </div>
            </div>
          )}

          {/* List Item Peminjaman */}
          {!loansQuery.isLoading && loans.length > 0 && (
            <div className="space-y-3">
              {loans.map((loan) => {
                const isReturned = loan.status === 'returned';
                const isOverdue = loan.isOverdue;

                return (
                  <article
                    key={loan.id}
                    className="flex flex-col gap-4 rounded-[var(--radius-card)] border border-[var(--color-border-strong)]/80 bg-[var(--color-surface)] p-4 transition-colors sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 items-start gap-4">
                      <BookCover
                        src={loan.bookCoverUrl}
                        title={loan.bookTitle}
                        category="Perpustakaan"
                        size="sm"
                        className="w-16 shrink-0 sm:w-20"
                      />
                      <div className="min-w-0 flex-1 space-y-1">
                        <h2 className="text-sm font-bold text-[var(--color-ink)] sm:text-base">
                          <Link
                            to="/"
                            search={{ bookId: loan.bookId }}
                            className="transition-colors hover:text-[var(--color-primary)]"
                          >
                            {loan.bookTitle}
                          </Link>
                        </h2>
                        <p className="truncate text-xs text-[var(--color-ink-muted)]">{loan.bookAuthor}</p>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 font-mono text-xs text-[var(--color-ink-muted)]">
                          <span>
                            Pinjam: <strong className="font-semibold text-[var(--color-ink)] tabular-nums">{formatDateId(loan.borrowedAt)}</strong>
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>
                            Jatuh Tempo: <strong className="font-semibold text-[var(--color-ink)] tabular-nums">{formatDateId(loan.dueDate)}</strong>
                          </span>
                        </div>

                        {/* Status Peringatan Terlambat / Sisa Hari (Tanpa Denda) */}
                        <div className="pt-1">
                          {isOverdue ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-danger)] bg-[var(--color-danger)] px-2.5 py-0.5 text-xs font-semibold text-white">
                              <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden="true" />
                              <span className="tabular-nums">{formatLoanDueLabel(loan)}</span>
                            </span>
                          ) : isReturned ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-2.5 py-0.5 text-xs font-medium text-[var(--color-ink-muted)]">
                              <CheckCircle2 className="h-3 w-3 shrink-0 text-[var(--color-status-available-ink)]" aria-hidden="true" />
                              <span>{formatLoanDueLabel(loan)}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-2.5 py-0.5 text-xs font-medium text-[var(--color-ink)]">
                              <Clock className="h-3 w-3 shrink-0 text-[var(--color-primary)]" aria-hidden="true" />
                              <span className="tabular-nums">{formatLoanDueLabel(loan)}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Tombol Aksi Pengembalian Mandiri */}
                    {!isReturned && (
                      <div className="shrink-0 pt-2 sm:pt-0">
                        <Button
                          variant="secondary"
                          size="md"
                          onClick={() => setReturningLoan(loan)}
                          className="w-full sm:w-auto"
                        >
                          Kembalikan
                        </Button>
                      </div>
                    )}
                  </article>
                );
              })}

              {/* Paginasi Sederhana */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-[var(--color-border)] pt-4 text-xs font-medium">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={currentPage <= 1}
                    onClick={() => handlePageChange(currentPage - 1)}
                  >
                    Sebelumnya
                  </Button>
                  <span className="font-mono text-[var(--color-ink-muted)] tabular-nums">
                    Halaman {currentPage} dari {totalPages}
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={currentPage >= totalPages}
                    onClick={() => handlePageChange(currentPage + 1)}
                  >
                    Selanjutnya
                  </Button>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Modal Dialog Konfirmasi Pengembalian Buku */}
        {returningLoan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-[#141920]/45 backdrop-blur-xs transition-opacity"
              aria-hidden="true"
              onClick={() => setReturningLoan(null)}
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="confirm-return-title"
              className="relative z-10 w-full max-w-md rounded-[var(--radius-card)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] p-5 shadow-2xl sm:p-6"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
                  <CornerDownLeft className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <h2 id="confirm-return-title" className="text-base font-bold text-[var(--color-ink)]">
                    Kembalikan Buku Perpustakaan?
                  </h2>
                  <p className="mt-1 text-xs leading-relaxed text-[var(--color-ink-muted)] sm:text-sm">
                    Anda akan mengembalikan eksemplar buku <strong className="text-[var(--color-ink)]">"{returningLoan.bookTitle}"</strong> ke koleksi perpustakaan UNTAD. Kuota peminjaman Anda akan bertambah 1 buku setelah pengembalian dicatat.
                  </p>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap justify-end gap-2.5">
                <Button
                  variant="secondary"
                  size="md"
                  disabled={returnMutation.isPending}
                  onClick={() => setReturningLoan(null)}
                >
                  Batal
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  isLoading={returnMutation.isPending}
                  onClick={handleConfirmReturn}
                >
                  Ya, Kembalikan
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </UserRouteGuard>
  );
}
