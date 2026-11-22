import { BookX, RotateCcw } from 'lucide-react';
import { Button } from '../ui/Button';

export interface CatalogEmptyStateProps {
  hasActiveFilters: boolean;
  onResetFilters: () => void;
}

export function CatalogEmptyState({
  hasActiveFilters,
  onResetFilters,
}: CatalogEmptyStateProps) {
  return (
    <section
      aria-label="Hasil pencarian kosong"
      className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-10 text-center"
    >
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-surface-subtle)] text-[var(--color-primary)]">
        <BookX className="h-6 w-6" aria-hidden="true" />
      </div>

      <h2 className="mt-3 text-base font-bold text-[var(--color-ink)]">
        {hasActiveFilters
          ? 'Buku yang cocok tidak ditemukan'
          : 'Katalog Perpustakaan masih kosong'}
      </h2>

      <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-[var(--color-ink-muted)]">
        {hasActiveFilters
          ? 'Coba ubah kata kunci judul, penulis, atau ISBN, pilih kategori lain, atau nonaktifkan filter Tersedia Saja.'
          : 'Belum ada koleksi Buku Perpustakaan UNTAD yang terdaftar saat ini.'}
      </p>

      {hasActiveFilters && (
        <div className="mt-5">
          <Button
            variant="primary"
            size="md"
            leftIcon={<RotateCcw className="h-4 w-4" />}
            onClick={onResetFilters}
          >
            Reset Filter
          </Button>
        </div>
      )}
    </section>
  );
}
