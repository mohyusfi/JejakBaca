import { useEffect, useRef, useState, type FormEvent } from 'react';
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

  return (
    <section
      aria-label="Pencarian dan filter Katalog Perpustakaan"
      className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          id="catalog-search-input"
          aria-label="Cari judul, penulis, atau ISBN"
          placeholder="Cari judul, penulis, atau ISBN..."
          value={draftQ}
          onChange={(e) => handleInputChange(e.target.value)}
          onClear={handleClearSearch}
          containerClassName="flex-1"
        />

        <div className="flex items-center justify-between gap-3 sm:justify-end">
          <button
            type="button"
            role="switch"
            aria-checked={availableOnly}
            onClick={() => onAvailableOnlyChange(!availableOnly)}
            className={cn(
              'inline-flex min-h-[40px] items-center gap-2.5 rounded-[var(--radius-control)] border px-3 py-2 text-sm font-medium transition-colors duration-150 select-none',
              availableOnly
                ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-primary)]'
                : 'border-[var(--color-border)] bg-[var(--color-surface-subtle)] text-[var(--color-ink)] hover:border-[var(--color-border-strong)]',
            )}
          >
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
            <span>Tersedia Saja</span>
          </button>
        </div>
      </form>

      <div
        role="group"
        aria-label="Filter kategori koleksi"
        className="mt-3 flex items-center gap-2 overflow-x-auto border-t border-[var(--color-border)] pt-3 pb-0.5"
      >
        <button
          type="button"
          aria-pressed={normalizedActiveCategory === ''}
          onClick={() => onCategoryChange('')}
          className={cn(
            'inline-flex min-h-[34px] shrink-0 items-center rounded-full border px-3.5 py-1 text-xs font-semibold transition-colors duration-150',
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
                'inline-flex min-h-[34px] shrink-0 items-center rounded-full border px-3.5 py-1 text-xs font-semibold transition-colors duration-150',
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
            className="inline-flex min-h-[34px] shrink-0 items-center rounded-full border border-[var(--color-primary)] bg-[var(--color-primary)] px-3.5 py-1 text-xs font-semibold text-white"
          >
            {category}
          </button>
        )}
      </div>
    </section>
  );
}
