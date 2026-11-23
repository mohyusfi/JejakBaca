import { useEffect, useState } from 'react';
import { Bookmark, Calendar, Globe, Trash2, X } from 'lucide-react';
import { cn } from '../../lib/cn';
import { formatAuthors, formatDateId } from '../../lib/format';
import type { ReadlistItem } from '../../types/domain';
import { BookCover } from '../ui/BookCover';
import { Button } from '../ui/Button';
import { ConfirmDialog } from '../ui/ConfirmDialog';

export interface ReadlistDetailPanelProps {
  item: ReadlistItem | null;
  onClose: () => void;
  onDelete: (workId: string) => Promise<void> | void;
  isDeleting?: boolean;
}

export function ReadlistDetailPanel({
  item,
  onClose,
  onDelete,
  isDeleting = false,
}: ReadlistDetailPanelProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (!item) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [item, onClose]);

  if (!item) {
    return null;
  }

  const authorsText = formatAuthors(item.authors);
  const savedDateText = formatDateId(item.createdAt);

  const handleConfirmDelete = async () => {
    setConfirmOpen(false);
    await onDelete(item.workId);
    onClose();
  };

  return (
    <>
      {/* Backdrop overlay di mobile */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className="fixed inset-0 z-40 bg-[#141920]/35 lg:hidden"
      />

      <aside
        aria-label="Panel Detail Snapshot Readlist"
        className={cn(
          'fixed inset-x-0 bottom-0 z-40 max-h-[85dvh] overflow-y-auto rounded-t-[12px] border-t border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-xl',
          'lg:static lg:z-auto lg:sticky lg:top-20 lg:max-h-[calc(100dvh-6rem)] lg:rounded-[var(--radius-card)] lg:border lg:shadow-none',
        )}
      >
        {/* Handle visual mobile */}
        <div
          className="mx-auto mb-3 h-1 w-10 rounded-full bg-[var(--color-border-strong)] lg:hidden"
          aria-hidden="true"
        />

        {/* Header Panel */}
        <div className="flex items-start justify-between gap-3 border-b border-[var(--color-border)] pb-3">
          <div>
            <div className="flex items-center gap-1.5 font-mono text-[11px] font-semibold tracking-wider text-[var(--color-primary)] uppercase">
              <Bookmark className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Snapshot Readlist</span>
            </div>
            <p className="text-xs text-[var(--color-ink-subtle)]">
              Tersimpan offline di database lokal
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup panel detail"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-control)] border border-[var(--color-border)] text-[var(--color-ink-muted)] transition-colors hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-ink)]"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Metadata Utama */}
        <div className="mt-4 flex gap-4">
          <BookCover
            src={item.coverUrl}
            title={item.title}
            size="md"
            className="w-28 shrink-0 sm:w-32"
          />

          <div className="flex-1 space-y-1.5 pt-0.5">
            <h3 className="text-base leading-snug font-bold text-[var(--color-ink)]">
              {item.title}
            </h3>
            <p className="text-sm font-medium text-[var(--color-ink-muted)]">
              {authorsText}
            </p>

            {item.firstPublishYear && (
              <p className="text-xs text-[var(--color-ink-subtle)]">
                Tahun terbit:{' '}
                <span className="font-mono tabular-nums font-semibold text-[var(--color-ink)]">
                  {item.firstPublishYear}
                </span>
              </p>
            )}

            <div className="flex items-center gap-1.5 text-xs text-[var(--color-ink-subtle)] pt-1">
              <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Disimpan {savedDateText}</span>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-[var(--color-ink-subtle)]">
              <Globe className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="font-mono text-[11px]">{item.workId}</span>
            </div>
          </div>
        </div>

        {/* Deskripsi Snapshot */}
        <div className="mt-5 rounded-[var(--radius-card)] border border-[var(--color-border)]/70 bg-[var(--color-surface-subtle)]/50 p-4">
          <h4 className="text-xs font-semibold tracking-wider text-[var(--color-ink-muted)] uppercase">
            Deskripsi Tersimpan
          </h4>

          {item.description && item.description.trim() !== '' ? (
            <p className="mt-2 text-sm leading-relaxed text-[var(--color-ink)] whitespace-pre-line">
              {item.description}
            </p>
          ) : (
            <p className="mt-2 text-sm italic text-[var(--color-ink-subtle)]">
              Deskripsi tidak tersedia saat buku ini disimpan ke Readlist.
            </p>
          )}
        </div>

        {/* Action Button */}
        <div className="mt-6 border-t border-[var(--color-border)] pt-4">
          <Button
            variant="circulation"
            size="md"
            className="w-full"
            leftIcon={<Trash2 className="h-4 w-4" />}
            isLoading={isDeleting}
            onClick={() => setConfirmOpen(true)}
          >
            Hapus dari Readlist
          </Button>
        </div>
      </aside>

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
