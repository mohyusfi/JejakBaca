import { ChevronRight } from 'lucide-react';
import { cn } from '../../lib/cn';
import { getStockSummary, type StockHealth } from '../../lib/format';
import type { LibraryBook } from '../../types/domain';
import { BookCover } from '../ui/BookCover';
import { StatusBadge, type StatusTone } from '../ui/StatusBadge';

export interface LibraryBookRowProps {
  book: LibraryBook;
  isSelected: boolean;
  onSelect: (bookId: number) => void;
}

const STOCK_TONE_MAP: Record<StockHealth, StatusTone> = {
  available: 'available',
  low: 'low',
  empty: 'critical',
};

const STOCK_TEXT_WEIGHT: Record<StockHealth, string> = {
  available: 'font-normal text-[var(--color-ink-muted)]',
  low: 'font-semibold text-[var(--color-status-low-ink)]',
  empty: 'font-semibold text-[var(--color-status-critical-ink)]',
};

export function LibraryBookRow({ book, isSelected, onSelect }: LibraryBookRowProps) {
  const stock = getStockSummary(book.stockAvailable, book.stockTotal);
  const badgeTone = STOCK_TONE_MAP[stock.health];

  return (
    <article
      className={cn(
        'group relative flex flex-col gap-3 rounded-[var(--radius-card)] border px-4 py-3.5 transition-colors duration-150 sm:flex-row sm:items-center sm:justify-between sm:gap-5',
        'focus-within:ring-2 focus-within:ring-[var(--color-primary)] focus-within:ring-offset-1',
        isSelected
          ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)]/30'
          : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-subtle)]/40',
      )}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3.5">
        <BookCover
          src={book.coverUrl}
          title={book.title}
          category={book.category}
          size="sm"
          className="sm:w-14"
        />

        <div className="min-w-0 flex-1">
          <h2 className="text-sm leading-snug font-semibold text-[var(--color-ink)] transition-colors group-hover:text-[var(--color-primary)] sm:text-[15px]">
            <button
              type="button"
              aria-pressed={isSelected}
              onClick={() => onSelect(book.id)}
              className="text-left focus:outline-none after:absolute after:inset-0 after:rounded-[var(--radius-card)]"
            >
              {book.title}
            </button>
          </h2>

          <p className="mt-0.5 truncate text-sm text-[var(--color-ink-muted)]">
            {book.author}
          </p>

          {(book.category || book.publishedYear) && (
            <p className="mt-1.5 flex flex-wrap items-center gap-x-1.5 text-xs text-[var(--color-ink-subtle)]">
              {book.category && <span>{book.category}</span>}
              {book.category && book.publishedYear && (
                <span aria-hidden="true">·</span>
              )}
              {book.publishedYear && (
                <span className="tabular-nums">{book.publishedYear}</span>
              )}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 border-t border-[var(--color-border)]/70 pt-2.5 sm:shrink-0 sm:justify-end sm:border-t-0 sm:pt-0">
        <div className="flex items-center gap-2.5 sm:flex-col sm:items-end sm:gap-1">
          <StatusBadge tone={badgeTone}>{stock.label}</StatusBadge>
          <span className={cn('text-xs tabular-nums', STOCK_TEXT_WEIGHT[stock.health])}>
            {stock.ratioText}
          </span>
        </div>

        <span
          aria-hidden="true"
          className={cn(
            'inline-flex shrink-0 items-center gap-0.5 text-xs transition-colors duration-150 sm:w-14 sm:justify-end',
            isSelected
              ? 'font-semibold text-[var(--color-primary)]'
              : 'font-medium text-[var(--color-ink-subtle)] group-hover:text-[var(--color-primary)]',
          )}
        >
          <span>{isSelected ? 'Terpilih' : 'Detail'}</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </article>
  );
}
