import { useState } from 'react';
import { Calendar, Trash2 } from 'lucide-react';
import { cn } from '../../lib/cn';
import { formatAuthors, formatDateId } from '../../lib/format';
import type { ReadlistItem } from '../../types/domain';
import { BookCover } from '../ui/BookCover';
import { ConfirmDialog } from '../ui/ConfirmDialog';

export interface ReadlistCardProps {
  item: ReadlistItem;
  isSelected: boolean;
  onSelect: (workId: string) => void;
  onDelete: (workId: string) => Promise<void> | void;
  isDeleting?: boolean;
}

export function ReadlistCard({
  item,
  isSelected,
  onSelect,
  onDelete,
  isDeleting = false,
}: ReadlistCardProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  const authorsText = formatAuthors(item.authors);
  const savedDateText = formatDateId(item.createdAt);

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    setConfirmOpen(false);
    await onDelete(item.workId);
  };

  return (
    <>
      <article
        className={cn(
          'group relative flex items-start gap-4 overflow-hidden rounded-[var(--radius-card)] border p-4 transition-all duration-150',
          'focus-within:ring-2 focus-within:ring-[var(--color-primary)] focus-within:ring-offset-1',
          isSelected
            ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)]/20 shadow-xs'
            : 'border-[var(--color-border-strong)]/80 bg-[var(--color-surface)] hover:border-[var(--color-primary)]',
        )}
      >
        <button
          type="button"
          onClick={() => onSelect(item.workId)}
          className="shrink-0 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] rounded-[var(--radius-cover)]"
          aria-label={`Lihat detail ${item.title}`}
        >
          <BookCover
            src={item.coverUrl}
            title={item.title}
            size="sm"
            className="w-20 sm:w-24 pointer-events-none"
          />
        </button>

        <div className="flex min-w-0 flex-1 flex-col justify-between self-stretch">
          <div className="min-w-0">
            <h2 className="text-base leading-snug font-semibold text-[var(--color-ink)] transition-colors group-hover:text-[var(--color-primary)]">
              <button
                type="button"
                aria-pressed={isSelected}
                onClick={() => onSelect(item.workId)}
                className="text-left focus:outline-none hover:underline"
              >
                {item.title}
              </button>
            </h2>

            <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
              {authorsText}
            </p>

            {item.firstPublishYear && (
              <p className="mt-1 text-xs text-[var(--color-ink-subtle)]">
                Terbit pertama:{' '}
                <span className="font-mono tabular-nums font-semibold text-[var(--color-ink)]">
                  {item.firstPublishYear}
                </span>
              </p>
            )}

            {item.description && (
              <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-[var(--color-ink-muted)]">
                {item.description}
              </p>
            )}
          </div>

          <div className="mt-3 flex items-center justify-between gap-3 border-t border-[var(--color-border)]/60 pt-2.5">
            <p className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--color-ink-subtle)]">
              <Calendar className="h-3.5 w-3.5 text-[var(--color-ink-muted)]" aria-hidden="true" />
              <span>Disimpan {savedDateText}</span>
            </p>

            <button
              type="button"
              onClick={handleDeleteClick}
              disabled={isDeleting}
              aria-label={`Hapus ${item.title} dari Readlist`}
              className="flex items-center gap-1.5 rounded-[var(--radius-control)] px-2 py-1 text-xs font-semibold text-[var(--color-danger)] transition-colors hover:bg-[var(--color-danger)]/10 disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Hapus</span>
            </button>
          </div>
        </div>
      </article>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Hapus dari Readlist?"
        description={`Apakah Anda yakin ingin menghapus "${item.title}" dari Readlist? Metadata snapshot buku ini akan dihapus dari akun Anda.`}
        confirmLabel="Hapus Buku"
        cancelLabel="Batal"
        confirmTone="circulation"
      />
    </>
  );
}
