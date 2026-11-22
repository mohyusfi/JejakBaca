import { useEffect, useRef, useState, type FormEvent } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { cn } from '../../lib/cn';
import { CATALOG_CATEGORIES } from '../../services/book-service';
import { SearchInput } from '../ui/Input';

export interface CatalogFilterBarProps {
  q: string;
  category: string;
  availableOnly: boolean;
  onQueryChange: (nextQuery: string) => void;
  onCategoryChange: (nextCategory: string) => void;
  onAvailableOnlyChange: (nextValue: boolean) => void;
}

export function CatalogFilterBar({
  q,
  category,
  availableOnly,
  onQueryChange,
  onCategoryChange,
  onAvailableOnlyChange,
}: CatalogFilterBarProps) {
  const [draftQ, setDraftQ] = useState(q);
  const [prevQ, setPrevQ] = useState(q);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const debounceTimerRef = useRef<number | null>(null);

  if (q !== prevQ) {
    setPrevQ(q);
    setDraftQ(q);
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
    setDraftQ(nextValue);
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
    setDraftQ('');
    if (q !== '') {
      onQueryChange('');
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    clearPendingDebounce();
    const normalized = draftQ.trim();
    if (normalized !== q) {
      onQueryChange(normalized);
    }
  };

  const normalizedActiveCategory = category.trim().toLowerCase();
  const isCustomCategory =
    normalizedActiveCategory !== '' &&
    !CATALOG_CATEGORIES.some((preset) => preset.toLowerCase() === normalizedActiveCategory);

  const activeFilterCount =
    (normalizedActiveCategory !== '' ? 1 : 0) + (availableOnly ? 1 : 0);

  const handleResetModalFilters = () => {
    if (normalizedActiveCategory !== '') {
      onCategoryChange('');
    }
    if (availableOnly) {
      onAvailableOnlyChange(false);
    }
  };

  return (
    <section
      aria-label="Pencarian dan filter Katalog Perpustakaan"
      className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 sm:p-4"
    >
      <form onSubmit={handleSubmit} className="flex items-center gap-2.5">
        <SearchInput
          id="catalog-search-input"
          aria-label="Cari judul, penulis, atau ISBN"
          placeholder="Cari judul, penulis, atau ISBN..."
          value={draftQ}
          onChange={(e) => handleInputChange(e.target.value)}
          onClear={handleClearSearch}
          containerClassName="flex-1"
        />

        <button
          type="button"
          aria-label="Filter katalog"
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
            aria-labelledby="catalog-filter-modal-title"
            className="w-full max-w-md rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-3.5">
              <h2
                id="catalog-filter-modal-title"
                className="text-sm font-bold text-[var(--color-ink)]"
              >
                Filter Katalog
              </h2>
              <button
                type="button"
                aria-label="Tutup filter"
                onClick={() => setIsFilterOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-control)] text-[var(--color-ink-muted)] transition-colors hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-ink)]"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="space-y-5 px-5 py-4">
              <div>
                <p className="mb-2.5 text-xs font-semibold tracking-wide text-[var(--color-ink-muted)] uppercase">
                  Kategori
                </p>
                <div
                  role="group"
                  aria-label="Filter kategori koleksi"
                  className="flex flex-wrap items-center gap-2"
                >
                  <button
                    type="button"
                    aria-pressed={normalizedActiveCategory === ''}
                    onClick={() => onCategoryChange('')}
                    className={cn(
                      'inline-flex min-h-[34px] items-center rounded-full border px-3.5 py-1 text-xs font-semibold transition-colors duration-150',
                      normalizedActiveCategory === ''
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white'
                        : 'border-[var(--color-border)] bg-[var(--color-surface-subtle)] text-[var(--color-ink-muted)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-ink)]',
                    )}
                  >
                    Semua
                  </button>

                  {CATALOG_CATEGORIES.map((preset) => {
                    const isSelected = normalizedActiveCategory === preset.toLowerCase();
                    return (
                      <button
                        key={preset}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => onCategoryChange(isSelected ? '' : preset)}
                        className={cn(
                          'inline-flex min-h-[34px] items-center rounded-full border px-3.5 py-1 text-xs font-semibold transition-colors duration-150',
                          isSelected
                            ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white'
                            : 'border-[var(--color-border)] bg-[var(--color-surface-subtle)] text-[var(--color-ink-muted)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-ink)]',
                        )}
                      >
                        {preset}
                      </button>
                    );
                  })}

                  {isCustomCategory && (
                    <button
                      type="button"
                      aria-pressed
                      onClick={() => onCategoryChange('')}
                      className="inline-flex min-h-[34px] items-center rounded-full border border-[var(--color-primary)] bg-[var(--color-primary)] px-3.5 py-1 text-xs font-semibold text-white"
                    >
                      {category}
                    </button>
                  )}
                </div>
              </div>

              <div className="border-t border-[var(--color-border)] pt-4">
                <p className="mb-2.5 text-xs font-semibold tracking-wide text-[var(--color-ink-muted)] uppercase">
                  Ketersediaan Stok
                </p>
                <button
                  type="button"
                  role="switch"
                  aria-checked={availableOnly}
                  onClick={() => onAvailableOnlyChange(!availableOnly)}
                  className={cn(
                    'flex min-h-[42px] w-full items-center justify-between gap-3 rounded-[var(--radius-control)] border px-3.5 py-2 text-sm font-medium transition-colors duration-150 select-none',
                    availableOnly
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-primary)]'
                      : 'border-[var(--color-border)] bg-[var(--color-surface-subtle)] text-[var(--color-ink)] hover:border-[var(--color-border-strong)]',
                  )}
                >
                  <span>Tersedia Saja</span>
                  <span
                    aria-hidden="true"
                    className={cn(
                      'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-150',
                      availableOnly ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border-strong)]',
                    )}
                  >
                    <span
                      className={cn(
                        'inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform duration-150',
                        availableOnly ? 'translate-x-[18px]' : 'translate-x-[3px]',
                      )}
                    />
                  </span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-[var(--color-border)] bg-[var(--color-surface-subtle)]/60 px-5 py-3">
              <button
                type="button"
                disabled={activeFilterCount === 0}
                onClick={handleResetModalFilters}
                className="text-xs font-semibold text-[var(--color-ink-muted)] transition-colors hover:text-[var(--color-ink)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={() => setIsFilterOpen(false)}
                className="inline-flex min-h-[36px] items-center rounded-[var(--radius-control)] bg-[var(--color-primary)] px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[var(--color-primary-hover)]"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
