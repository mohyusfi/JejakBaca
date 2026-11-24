import { Link } from '@tanstack/react-router';
import { BookPlus } from 'lucide-react';
import { useBorrowAction } from '../../hooks/useBorrowAction';
import { cn } from '../../lib/cn';
import { getStockSummary, type StockHealth } from '../../lib/format';
import type { LibraryBook } from '../../types/domain';
import { BookCover } from '../ui/BookCover';
import { Button } from '../ui/Button';

export interface LibraryBookRowProps {
  book: LibraryBook;
  isSelected: boolean;
  onSelect: (bookId: number) => void;
}

const STOCK_BADGE_CLASS: Record<StockHealth, string> = {
  available:
    'border-[var(--color-primary-border)] bg-[var(--color-primary-soft)] font-semibold text-[var(--color-primary)]',
  low: 'border-[var(--color-border-strong)] bg-[var(--color-surface-subtle)] font-semibold text-[var(--color-ink)]',
  empty: 'border-[var(--color-danger)] bg-[var(--color-danger)] font-semibold text-white',
};

const STOCK_TEXT_WEIGHT: Record<StockHealth, string> = {
  available: 'font-medium text-[var(--color-ink-muted)]',
  low: 'font-semibold text-[var(--color-ink)]',
  empty: 'font-semibold text-[var(--color-danger)]',
};

export function LibraryBookRow({ book, isSelected, onSelect }: LibraryBookRowProps) {
  const stock = getStockSummary(book.stockAvailable, book.stockTotal);
  const shortDescription = (book.description ?? '').trim();
  const { actor, handleBorrow, isLoading, isBorrowed, isOutOfStock } = useBorrowAction(book);

  return (
    <article
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-[var(--radius-card)] border transition-colors duration-150',
        'focus-within:ring-2 focus-within:ring-[var(--color-primary)] focus-within:ring-offset-1',
        isSelected
          ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)]/30'
          : 'border-[var(--color-border-strong)]/80 bg-[var(--color-surface)] hover:border-[var(--color-primary)]',
      )}
    >
      <span
        className={cn(
          'pointer-events-none absolute top-3 -right-8 z-10 hidden w-28 rotate-45 border py-0.5 text-center text-[10px] font-bold tracking-wider uppercase shadow-xs md:block',
          isBorrowed
            ? 'border-[var(--color-primary-border)] bg-[var(--color-primary)] font-semibold text-white'
            : STOCK_BADGE_CLASS[stock.health],
        )}
      >
        {isBorrowed ? 'Dipinjam' : stock.label}
      </span>

      <div className="flex flex-1 items-start justify-between gap-4 px-5 py-4 md:flex-col md:items-stretch">
        <div className="flex min-w-0 flex-1 items-start gap-4 md:flex-col md:items-center">
          <BookCover
            src={book.coverUrl}
            title={book.title}
            category={book.category}
            size="sm"
            className="w-16 sm:w-[72px] md:w-28"
          />
          <div className="min-w-0 flex-1 pt-0.5 md:w-full">
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
            {shortDescription && (
              <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-[var(--color-ink-muted)]">
                {shortDescription}
              </p>
            )}
          </div>
        </div>
        <span
          className={cn(
            'inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-xs whitespace-nowrap md:hidden',
            isBorrowed
              ? 'border-[var(--color-primary-border)] bg-[var(--color-primary)] font-semibold text-white'
              : STOCK_BADGE_CLASS[stock.health],
          )}
        >
          {isBorrowed ? 'Dipinjam' : stock.label}
        </span>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-[var(--color-border)] bg-[var(--color-surface-subtle)]/70 px-5 py-2.5">
        <p className="min-w-0 truncate whitespace-nowrap text-xs font-medium text-[var(--color-ink-muted)]">
          {book.category && <span>{book.category}</span>}
          {book.category && book.publishedYear && (
            <span aria-hidden="true" className="mx-1.5">
              ·
            </span>
          )}
          {book.publishedYear && <span className="tabular-nums">{book.publishedYear}</span>}
        </p>
        <div className="relative z-20 flex shrink-0 items-center gap-2.5 whitespace-nowrap">
          <span className={cn('text-xs tabular-nums', STOCK_TEXT_WEIGHT[stock.health])}>
            {stock.ratioText}
          </span>
          {actor === 'admin' ? (
            <Link
              to="/admin/books"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex min-h-[30px] items-center rounded-[var(--radius-control)] border border-[var(--color-border)] bg-white px-2.5 py-1 text-xs font-semibold text-[var(--color-ink)] hover:bg-[var(--color-surface-subtle)]"
            >
              Kelola
            </Link>
          ) : isBorrowed ? null : isOutOfStock ? (
            <span className="inline-flex items-center rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-2.5 py-1 text-xs font-semibold text-[var(--color-ink-subtle)]">
              Stok Habis
            </span>
          ) : (
            <Button
              variant="circulation"
              size="sm"
              isLoading={isLoading}
              onClick={handleBorrow}
              aria-label={`Pinjam ${book.title}`}
              title="Pinjam buku"
              className="min-h-[30px] px-2.5 py-1 text-xs"
            >
              <BookPlus className="h-4 w-4" aria-hidden="true" />
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}
