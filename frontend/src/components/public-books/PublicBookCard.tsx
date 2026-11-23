import { Bookmark, BookmarkCheck, BookOpen, Loader2 } from 'lucide-react';
import { useReadlistAction } from '../../hooks/useReadlistAction';
import { cn } from '../../lib/cn';
import { formatAuthors } from '../../lib/format';
import type { PublicBookSummary } from '../../types/domain';
import { BookCover } from '../ui/BookCover';
import { Button } from '../ui/Button';

export interface PublicBookCardProps {
  book: PublicBookSummary;
  isSelected: boolean;
  onSelect: (workId: string) => void;
}

export function PublicBookCard({ book, isSelected, onSelect }: PublicBookCardProps) {
  const {
    canShowAction,
    isLoading,
    handleToggle,
  } = useReadlistAction({
    workId: book.workId,
    title: book.title,
    inReadlist: book.inReadlist,
  });

  return (
    <article
      data-testid={`public-book-card-${book.workId}`}
      className={cn(
        'group relative flex flex-col justify-between rounded-[var(--radius-card)] border bg-[var(--color-surface)] p-4 transition-all duration-150',
        isSelected
          ? 'border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/20'
          : 'border-[var(--color-border)] hover:border-[var(--color-border-strong)] hover:shadow-xs',
      )}
    >
      {canShowAction && (
        <button
          type="button"
          aria-label={book.inReadlist ? 'Hapus dari Readlist' : 'Tambah ke Readlist'}
          aria-pressed={book.inReadlist}
          title={book.inReadlist ? 'Hapus dari Readlist (klik lagi)' : 'Tambah ke Readlist'}
          disabled={isLoading}
          onClick={handleToggle}
          className={cn(
            'absolute top-3 right-3 z-10 inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-control)] border transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-60',
            book.inReadlist
              ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)]'
              : 'border-[var(--color-border)] bg-[var(--color-surface-subtle)] text-[var(--color-ink-muted)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] hover:text-[var(--color-primary)]',
          )}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : book.inReadlist ? (
            <BookmarkCheck className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Bookmark className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
      )}

      <div className={cn('flex items-start gap-3.5', canShowAction && 'pr-9')}>
        <BookCover
          src={book.coverUrl}
          title={book.title}
          category={book.subjects[0] || 'PUBLIK'}
          code={book.workId}
          size="md"
          className="shrink-0 transition-transform duration-150 group-hover:scale-[1.02]"
        />

        <div className="flex min-w-0 flex-1 flex-col justify-between">
          <div>
            <div className="flex items-center gap-1.5 pb-1">
              <span className="inline-flex items-center rounded bg-[var(--color-primary-soft)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--color-primary)]">
                Buku Publik
              </span>
              {book.inReadlist && (
                <span className="inline-flex items-center rounded bg-[var(--color-status-available-bg)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--color-status-available-ink)] border border-[var(--color-status-available-border)]">
                  Di Readlist
                </span>
              )}
            </div>

            <h3
              id={`book-title-${book.workId}`}
              className="line-clamp-2 text-sm leading-snug font-bold text-[var(--color-ink)] transition-colors group-hover:text-[var(--color-primary)]"
              title={book.title}
            >
              {book.title}
            </h3>

            <p className="mt-1 line-clamp-1 text-xs text-[var(--color-ink-muted)]">
              {formatAuthors(book.authors)}
            </p>
          </div>

          <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-[var(--color-ink-subtle)]">
            {book.firstPublishYear && (
              <span className="font-mono tabular-nums">
                Terbit {book.firstPublishYear}
              </span>
            )}
            {book.workId && (
              <span className="font-mono text-[10px] text-[var(--color-ink-subtle)]/75">
                #{book.workId}
              </span>
            )}
          </div>
        </div>
      </div>

      {book.subjects && book.subjects.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1 border-t border-[var(--color-border)]/60 pt-2.5">
          {book.subjects.slice(0, 3).map((subj) => (
            <span
              key={subj}
              className="inline-block truncate max-w-[140px] rounded bg-[var(--color-surface-subtle)] px-2 py-0.5 text-[10px] font-medium text-[var(--color-ink-muted)]"
              title={subj}
            >
              {subj}
            </span>
          ))}
          {book.subjects.length > 3 && (
            <span className="inline-block rounded bg-[var(--color-surface-subtle)] px-1.5 py-0.5 text-[10px] font-mono text-[var(--color-ink-subtle)]">
              +{book.subjects.length - 3}
            </span>
          )}
        </div>
      )}

      <div className="mt-3.5 flex pt-1">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="w-full text-xs"
          leftIcon={<BookOpen className="h-3.5 w-3.5 text-[var(--color-primary)]" />}
          onClick={() => onSelect(book.workId)}
        >
          {isSelected ? 'Sedang Dilihat' : 'Lihat Detail'}
        </Button>
      </div>
    </article>
  );
}
