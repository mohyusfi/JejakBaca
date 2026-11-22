import { useEffect } from 'react';
import { AlertCircle, BookOpen, RefreshCw, X } from 'lucide-react';
import { useLibraryBookDetail } from '../../hooks/useLibraryBooks';
import { isApiError } from '../../lib/api-error';
import { cn } from '../../lib/cn';
import { getStockSummary, type StockHealth } from '../../lib/format';
import { BookCover } from '../ui/BookCover';
import { Button } from '../ui/Button';
import { Skeleton } from '../ui/Skeleton';
import { StatusBadge, type StatusTone } from '../ui/StatusBadge';

export interface LibraryBookDetailPanelProps {
  bookId: number | null;
  onClose: () => void;
}

const STOCK_TONE_MAP: Record<StockHealth, StatusTone> = {
  available: 'available',
  low: 'low',
  empty: 'critical',
};

const STOCK_RATIO_WEIGHT: Record<StockHealth, string> = {
  available: 'font-semibold text-[var(--color-status-available-ink)]',
  low: 'font-semibold text-[var(--color-status-low-ink)]',
  empty: 'font-bold text-[var(--color-status-critical-ink)]',
};

export function LibraryBookDetailPanel({ bookId, onClose }: LibraryBookDetailPanelProps) {
  const { data: book, isLoading, isError, error, refetch } = useLibraryBookDetail(bookId);

  useEffect(() => {
    if (bookId === null) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [bookId, onClose]);

  if (bookId === null) {
    return null;
  }

  const isNotFound = isApiError(error) && error.status === 404;

  return (
    <>
      <div
        aria-hidden="true"
        onClick={onClose}
        className="fixed inset-0 z-40 bg-[#141920]/35 lg:hidden"
      />

      <aside
        aria-label="Detail Buku Perpustakaan"
        className={cn(
          'fixed inset-x-0 bottom-0 z-40 max-h-[82dvh] overflow-y-auto rounded-t-[12px] border-t border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-xl',
          'lg:static lg:z-auto lg:sticky lg:top-20 lg:max-h-[calc(100dvh-6rem)] lg:rounded-[var(--radius-card)] lg:border lg:shadow-none',
        )}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[var(--color-border-strong)] lg:hidden" aria-hidden="true" />

        <div className="flex items-start justify-between gap-3 border-b border-[var(--color-border)] pb-3">
          <div>
            <p className="font-mono text-[11px] font-semibold tracking-wider text-[var(--color-primary)] uppercase">
              Detail Buku Perpustakaan
            </p>
            <p className="text-xs text-[var(--color-ink-subtle)]">
              Koleksi UNTAD untuk Peminjaman mandiri
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup panel detail buku"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-control)] border border-[var(--color-border)] text-[var(--color-ink-muted)] transition-colors hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-ink)]"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {isLoading && (
          <div className="mt-4 space-y-4" aria-label="Memuat detail buku">
            <div className="flex gap-4">
              <Skeleton className="h-40 w-28 shrink-0 rounded-[var(--radius-cover)]" />
              <div className="flex-1 space-y-2.5 pt-1">
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-6 w-24 rounded-full" />
              </div>
            </div>
            <Skeleton className="h-28 w-full rounded-[var(--radius-control)]" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-11/12" />
              <Skeleton className="h-3.5 w-4/5" />
            </div>
          </div>
        )}

        {isError && !isLoading && (
          <div className="mt-4 rounded-[var(--radius-control)] border border-[var(--color-danger-border)] bg-[var(--color-danger-surface)] p-4">
            <div className="flex items-start gap-2.5">
              <AlertCircle
                className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-danger)]"
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-bold text-[var(--color-ink)]">
                  {isNotFound ? 'Buku tidak ditemukan' : 'Gagal memuat detail buku'}
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-[var(--color-ink-muted)]">
                  {isNotFound
                    ? `Buku dengan ID #${bookId} tidak tersedia dalam katalog saat ini.`
                    : error instanceof Error
                      ? error.message
                      : 'Terjadi kesalahan saat mengambil detail buku.'}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {!isNotFound && (
                    <Button
                      variant="secondary"
                      size="sm"
                      leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
                      onClick={() => void refetch()}
                    >
                      Coba Lagi
                    </Button>
                  )}
                  <Button variant="secondary" size="sm" onClick={onClose}>
                    Tutup Panel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {book && !isLoading && !isError && (() => {
          const stock = getStockSummary(book.stockAvailable, book.stockTotal);
          const borrowedCount = Math.max(0, book.stockTotal - book.stockAvailable);

          return (
            <div className="mt-4 space-y-4">
              <div className="flex items-start gap-4">
                <BookCover
                  src={book.coverUrl}
                  title={book.title}
                  category={book.category}
                  size="lg"
                />

                <div className="min-w-0 flex-1">
                  <h2 className="text-base leading-snug font-bold text-[var(--color-ink)] sm:text-lg">
                    {book.title}
                  </h2>
                  <p className="mt-1 text-sm text-[var(--color-ink-muted)]">{book.author}</p>

                  <div className="mt-2.5 flex flex-wrap items-center gap-2">
                    <StatusBadge tone={STOCK_TONE_MAP[stock.health]}>{stock.label}</StatusBadge>
                  </div>
                </div>
              </div>

              <dl className="divide-y divide-[var(--color-border)] rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-surface-subtle)] text-xs sm:text-sm">
                <div className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                  <dt className="font-medium text-[var(--color-ink-muted)]">Kategori</dt>
                  <dd className="text-right font-semibold text-[var(--color-ink)]">
                    {book.category ?? 'Umum'}
                  </dd>
                </div>

                <div className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                  <dt className="font-medium text-[var(--color-ink-muted)]">Tahun Terbit</dt>
                  <dd className="text-right font-mono font-medium text-[var(--color-ink)] tabular-nums">
                    {book.publishedYear ?? '-'}
                  </dd>
                </div>

                <div className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                  <dt className="font-medium text-[var(--color-ink-muted)]">ISBN</dt>
                  <dd className="text-right font-mono text-[var(--color-ink)] tabular-nums">
                    {book.isbn ?? 'Tidak tersedia'}
                  </dd>
                </div>

                <div className="flex flex-col gap-1 px-3.5 py-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <dt className="font-medium text-[var(--color-ink-muted)]">Rincian Stok</dt>
                    <dd className={cn('text-right font-mono tabular-nums', STOCK_RATIO_WEIGHT[stock.health])}>
                      {stock.ratioText}
                    </dd>
                  </div>
                  <p className="text-right font-mono text-[11px] text-[var(--color-ink-subtle)] tabular-nums">
                    Total {book.stockTotal} eksemplar • {borrowedCount} sedang dipinjam
                  </p>
                </div>
              </dl>

              <div>
                <h3 className="flex items-center gap-1.5 text-xs font-semibold tracking-wider text-[var(--color-ink-muted)] uppercase">
                  <BookOpen className="h-3.5 w-3.5 text-[var(--color-primary)]" aria-hidden="true" />
                  <span>Deskripsi Buku</span>
                </h3>
                <p className="mt-2 max-w-prose text-sm leading-relaxed text-[var(--color-ink-muted)]">
                  {book.description.trim() || 'Deskripsi buku belum tersedia.'}
                </p>
              </div>
            </div>
          );
        })()}
      </aside>
    </>
  );
}
