import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../ui/Button';

export interface PublicBooksPaginationProps {
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (nextPage: number) => void;
  isLoading?: boolean;
}

export function PublicBooksPagination({
  page,
  totalPages,
  total,
  onPageChange,
  isLoading = false,
}: PublicBooksPaginationProps) {
  if (totalPages <= 1 && total <= 10) {
    return null;
  }

  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  return (
    <nav
      role="navigation"
      aria-label="Paginasi Buku Publik"
      className="flex flex-col items-center justify-between gap-3 border-t border-[var(--color-border)] pt-4 sm:flex-row"
    >
      <div className="text-xs text-[var(--color-ink-muted)]">
        Menampilkan halaman{' '}
        <span className="font-semibold text-[var(--color-ink)] font-mono tabular-nums">
          {page}
        </span>{' '}
        dari{' '}
        <span className="font-semibold text-[var(--color-ink)] font-mono tabular-nums">
          {Math.max(1, totalPages)}
        </span>{' '}
        (<span className="font-semibold font-mono tabular-nums">{total}</span> total buku publik)
      </div>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={!hasPrev || isLoading}
          onClick={() => onPageChange(page - 1)}
          leftIcon={<ChevronLeft className="h-4 w-4" />}
        >
          Sebelumnya
        </Button>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={!hasNext || isLoading}
          onClick={() => onPageChange(page + 1)}
          rightIcon={<ChevronRight className="h-4 w-4" />}
        >
          Berikutnya
        </Button>
      </div>
    </nav>
  );
}
