import { BookmarkX, Compass, RotateCcw } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { Button } from '../ui/Button';

export interface ReadlistEmptyStateProps {
  hasActiveFilters: boolean;
  onResetFilters: () => void;
}

export function ReadlistEmptyState({
  hasActiveFilters,
  onResetFilters,
}: ReadlistEmptyStateProps) {
  if (hasActiveFilters) {
    return (
      <section
        aria-label="Hasil pencarian Readlist kosong"
        className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-12 text-center"
      >
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-surface-subtle)] text-[var(--color-primary)]">
          <BookmarkX className="h-6 w-6" aria-hidden="true" />
        </div>

        <h2 className="mt-3 text-base font-bold text-[var(--color-ink)]">
          Buku tidak ditemukan di Readlist
        </h2>

        <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-[var(--color-ink-muted)]">
          Tidak ada buku di Readlist Anda yang cocok dengan kata kunci pencarian. Coba periksa kembali ejaan judul atau nama penulis.
        </p>

        <div className="mt-5">
          <Button
            variant="primary"
            size="md"
            leftIcon={<RotateCcw className="h-4 w-4" />}
            onClick={onResetFilters}
          >
            Reset Pencarian
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section
      aria-label="Readlist masih kosong"
      className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-14 text-center"
    >
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-surface-subtle)] text-[var(--color-primary)]">
        <Compass className="h-7 w-7" aria-hidden="true" />
      </div>

      <h2 className="mt-4 text-lg font-bold text-[var(--color-ink)]">
        Readlist Anda Masih Kosong
      </h2>

      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-[var(--color-ink-muted)]">
        Anda belum menyimpan referensi buku publik. Buka katalog Jelajah Buku Publik untuk menemukan karya Open Library menarik dan menyimpannya sebagai snapshot metadata.
      </p>

      <div className="mt-6 flex justify-center">
        <Link to="/public-books">
          <Button
            variant="primary"
            size="md"
            leftIcon={<Compass className="h-4 w-4" />}
          >
            Jelajah Buku Publik
          </Button>
        </Link>
      </div>
    </section>
  );
}
