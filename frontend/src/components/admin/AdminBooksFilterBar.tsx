import { useEffect, useRef, useState, type FormEvent } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { cn } from '../../lib/cn';
import { CATALOG_CATEGORIES } from '../../services/book-service';
import { Button } from '../ui/Button';
import { SearchInput } from '../ui/Input';

interface AdminBooksFilterBarProps {
  q: string;
  category: string;
  availableOnly: boolean;
  limit: number;
  hasActiveFilters: boolean;
  onQueryChange: (nextQ: string) => void;
  onCategoryChange: (nextCategory: string) => void;
  onAvailableOnlyChange: (nextAvailableOnly: boolean) => void;
  onLimitChange: (nextLimit: number) => void;
  onResetFilters: () => void;
}

export function AdminBooksFilterBar({
  q,
  category,
  availableOnly,
  limit,
  hasActiveFilters,
  onQueryChange,
  onCategoryChange,
  onAvailableOnlyChange,
  onLimitChange,
  onResetFilters,
}: AdminBooksFilterBarProps) {
  const [draftQuery, setDraftQuery] = useState(q);
  const [prevQ, setPrevQ] = useState(q);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const debounceTimerRef = useRef<number | null>(null);

  if (prevQ !== q) {
    setPrevQ(q);
    setDraftQuery(q);
  }

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current !== null) {
        window.clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isFilterOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsFilterOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFilterOpen]);

  const clearPendingDebounce = () => {
    if (debounceTimerRef.current !== null) {
      window.clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
  };

  const handleInputChange = (nextValue: string) => {
    setDraftQuery(nextValue);
    clearPendingDebounce();
    debounceTimerRef.current = window.setTimeout(() => {
      const normalized = nextValue.trim();
      if (normalized !== q) {
        onQueryChange(normalized);
      }
    }, 300);
  };

  const handleClearSearch = () => {
    clearPendingDebounce();
    setDraftQuery('');
    if (q !== '') {
      onQueryChange('');
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    clearPendingDebounce();
    const normalized = draftQuery.trim();
    if (normalized !== q) {
      onQueryChange(normalized);
    }
  };

  const activeFilterCount = (category.trim() !== '' ? 1 : 0) + (availableOnly ? 1 : 0);

  return (
    <section
      aria-label="Filter Koleksi Buku Admin"
      className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 sm:p-4"
    >
      <form onSubmit={handleSubmit} className="flex items-center gap-2.5">
        <SearchInput
          id="admin-books-search-input"
          aria-label="Cari judul, penulis, atau ISBN"
          placeholder="Cari judul, penulis, atau ISBN..."
          value={draftQuery}
          onChange={(event) => handleInputChange(event.target.value)}
          onClear={handleClearSearch}
          containerClassName="flex-1"
        />

        <button
          type="button"
          aria-label="Filter koleksi"
          aria-haspopup="dialog"
          aria-expanded={isFilterOpen}
          onClick={() => setIsFilterOpen(true)}
          className={cn(
            'relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-control)] border transition-colors duration-150',
            activeFilterCount > 0
              ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-primary)]'
              : 'border-[var(--color-border)] bg-[var(--color-surface-subtle)] text-[var(--color-ink)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-primary)]',
          )}
        >
          <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
          {activeFilterCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[var(--color-primary)] px-1 font-mono text-[10px] font-bold text-white tabular-nums">
              {activeFilterCount}
            </span>
          )}
        </button>
      </form>

      {isFilterOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
          onClick={() => setIsFilterOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-filter-modal-title"
            className="w-full max-w-md rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-3.5">
              <h2
                id="admin-filter-modal-title"
                className="text-sm font-bold text-[var(--color-ink)]"
              >
                Filter Koleksi
              </h2>
              <button
                type="button"
                aria-label="Tutup filter"
                onClick={() => setIsFilterOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-control)] text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-ink)]"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="space-y-4 px-5 py-4">
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="admin-books-category"
                  className="text-xs font-semibold tracking-wide text-[var(--color-ink-muted)]"
                >
                  Kategori
                </label>
                <select
                  id="admin-books-category"
                  value={category}
                  onChange={(event) => onCategoryChange(event.target.value)}
                  className="min-h-[42px] rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-ink)] transition-colors hover:border-[var(--color-border-strong)] focus:border-[var(--color-primary)] focus:outline-none"
                >
                  <option value="">Semua Kategori</option>
                  {CATALOG_CATEGORIES.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="admin-books-limit"
                  className="text-xs font-semibold tracking-wide text-[var(--color-ink-muted)]"
                >
                  Baris / Halaman
                </label>
                <select
                  id="admin-books-limit"
                  value={String(limit)}
                  onChange={(event) => onLimitChange(Number(event.target.value))}
                  className="min-h-[42px] rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-ink)] transition-colors hover:border-[var(--color-border-strong)] focus:border-[var(--color-primary)] focus:outline-none"
                >
                  <option value="10">10 baris</option>
                  <option value="20">20 baris</option>
                  <option value="50">50 baris</option>
                </select>
              </div>

              <label className="flex min-h-[42px] cursor-pointer items-center gap-2.5 rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-3 py-2 text-xs font-semibold text-[var(--color-ink)]">
                <input
                  type="checkbox"
                  checked={availableOnly}
                  onChange={(event) => onAvailableOnlyChange(event.target.checked)}
                  className="h-4 w-4 rounded border-[var(--color-border-strong)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                />
                Hanya Stok Tersedia
              </label>
            </div>

            <div className="flex items-center justify-between border-t border-[var(--color-border)] px-5 py-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={!hasActiveFilters}
                onClick={() => {
                  setDraftQuery('');
                  onResetFilters();
                }}
              >
                Reset Filter
              </Button>
              <Button type="button" size="sm" onClick={() => setIsFilterOpen(false)}>
                Terapkan
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
