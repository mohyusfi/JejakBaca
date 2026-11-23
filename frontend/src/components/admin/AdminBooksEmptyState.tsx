import { BookX, RotateCcw } from 'lucide-react';
import { Button } from '../ui/Button';

interface AdminBooksEmptyStateProps {
  hasActiveFilters: boolean;
  onResetFilters: () => void;
}

export function AdminBooksEmptyState({
  hasActiveFilters,
  onResetFilters,
}: AdminBooksEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[var(--radius-card)] border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface)] px-6 py-12 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-surface-subtle)] text-[var(--color-ink-muted)]">
        <BookX className="h-5 w-5" aria-hidden="true" />
      </div>
      <h3 className="mt-3 text-base font-bold text-[var(--color-ink)]">
        {hasActiveFilters
          ? 'Tidak ada buku yang cocok dengan filter'
          : 'Belum ada buku di koleksi perpustakaan'}
      </h3>
      <p className="mt-1 max-w-md text-sm text-[var(--color-ink-muted)]">
        {hasActiveFilters
          ? 'Coba ubah kata kunci pencarian, kategori, atau nonaktifkan filter stok tersedia.'
          : 'Koleksi buku perpustakaan masih kosong.'}
      </p>
      {hasActiveFilters && (
        <Button type="button" variant="secondary" size="sm" className="mt-4" onClick={onResetFilters}>
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          Reset Filter
        </Button>
      )}
    </div>
  );
}
