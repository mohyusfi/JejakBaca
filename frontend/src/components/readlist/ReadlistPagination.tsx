import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../ui/Button';

export interface ReadlistPaginationProps {
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (newPage: number) => void;
  isLoading?: boolean;
}

export function ReadlistPagination({
  page,
  totalPages,
  total,
  onPageChange,
  isLoading = false,
}: ReadlistPaginationProps) {
  if (totalPages <= 1) {
    return (
      <div className="flex items-center justify-between text-xs text-[var(--color-ink-subtle)] py-2">
        <span>Menampilkan seluruh {total} buku tersimpan</span>
      </div>
    );
  }

  return (
    <nav
      aria-label="Paginasi Readlist"
      className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border)] pt-4"
    >
      <p className="text-xs text-[var(--color-ink-subtle)]">
        Halaman <span className="font-mono tabular-nums font-semibold text-[var(--color-ink)]">{page}</span> dari{' '}
        <span className="font-mono tabular-nums font-semibold text-[var(--color-ink)]">{totalPages}</span>{' '}
        ({total} total buku tersimpan)
      </p>

      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={page <= 1 || isLoading}
          onClick={() => onPageChange(page - 1)}
          leftIcon={<ChevronLeft className="h-4 w-4" />}
        >
          Sebelumnya
        </Button>

        <Button
          variant="secondary"
          size="sm"
          disabled={page >= totalPages || isLoading}
          onClick={() => onPageChange(page + 1)}
          rightIcon={<ChevronRight className="h-4 w-4" />}
        >
          Berikutnya
        </Button>
      </div>
    </nav>
  );
}
