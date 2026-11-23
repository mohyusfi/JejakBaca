import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../ui/Button';

interface AdminBooksPaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (nextPage: number) => void;
  isFetching?: boolean;
}

export function AdminBooksPagination({
  page,
  totalPages,
  onPageChange,
  isFetching = false,
}: AdminBooksPaginationProps) {
  const safeTotalPages = Math.max(1, totalPages);

  return (
    <nav
      aria-label="Paginasi Daftar Koleksi Admin"
      className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3"
    >
      <p className="text-xs text-[var(--color-ink-muted)]">
        Menampilkan halaman{' '}
        <span className="font-mono font-semibold tabular-nums text-[var(--color-ink)]">
          {page}
        </span>{' '}
        dari{' '}
        <span className="font-mono font-semibold tabular-nums text-[var(--color-ink)]">
          {safeTotalPages}
        </span>
      </p>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={page <= 1 || isFetching}
          onClick={() => onPageChange(page - 1)}
          className="whitespace-nowrap"
        >
          <span className="inline-flex items-center gap-1.5">
            <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Sebelumnya</span>
          </span>
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={page >= safeTotalPages || isFetching}
          onClick={() => onPageChange(page + 1)}
          className="whitespace-nowrap"
        >
          <span className="inline-flex items-center gap-1.5">
            <span>Berikutnya</span>
            <ChevronRight className="h-4 w-4 shrink-0" aria-hidden="true" />
          </span>
        </Button>
      </div>
    </nav>
  );
}
