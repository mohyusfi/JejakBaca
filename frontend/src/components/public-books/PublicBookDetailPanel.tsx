import { useEffect } from 'react';
import { AlertCircle, BookmarkCheck, BookmarkPlus, Globe, RefreshCw, Trash2, X } from 'lucide-react';
import { usePublicBookDetail } from '../../hooks/usePublicBooks';
import { useReadlistAction } from '../../hooks/useReadlistAction';
import { cn } from '../../lib/cn';
import { formatAuthors } from '../../lib/format';
import { BookCover } from '../ui/BookCover';
import { Button } from '../ui/Button';
import { Skeleton } from '../ui/Skeleton';

export interface PublicBookDetailPanelProps {
  workId: string | null;
  onClose: () => void;
}

export function PublicBookDetailPanel({ workId, onClose }: PublicBookDetailPanelProps) {
  const {
    data: detail,
    isLoading,
    isError,
    error,
    refetch,
  } = usePublicBookDetail(workId);

  const {
    actor,
    canShowAction,
    isLoading: isActionLoading,
    handleAdd,
    handleRemove,
  } = useReadlistAction({
    workId: detail?.workId ?? workId ?? '',
    title: detail?.title ?? '',
    inReadlist: detail?.inReadlist ?? false,
  });

  useEffect(() => {
    if (!workId) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [workId, onClose]);

  if (!workId) return null;

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs transition-opacity lg:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        role="region"
        aria-label="Panel Detail Buku Publik"
        className={cn(
          'fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-2xl border-t border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-xl transition-transform lg:static lg:z-auto lg:max-h-none lg:w-[380px] xl:w-[420px] lg:shrink-0 lg:rounded-[var(--radius-card)] lg:border lg:p-5 lg:shadow-none',
        )}
      >
        {/* Mobile handle indicator */}
        <div
          className="mx-auto mb-3 h-1 w-10 rounded-full bg-[var(--color-border-strong)] lg:hidden"
          aria-hidden="true"
        />

        {/* Panel Header */}
        <div className="flex items-start justify-between gap-3 border-b border-[var(--color-border)] pb-3">
          <div>
            <div className="flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5 text-[var(--color-primary)]" aria-hidden="true" />
              <p className="font-mono text-[11px] font-semibold tracking-wider text-[var(--color-primary)] uppercase">
                Detail Buku Publik
              </p>
            </div>
            <p className="text-xs text-[var(--color-ink-subtle)]">
              Katalog Terbuka Open Library
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup panel detail buku publik"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-control)] border border-[var(--color-border)] text-[var(--color-ink-muted)] transition-colors hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-ink)]"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Loading Compartment Skeleton */}
        {isLoading && (
          <div className="mt-4 space-y-4" aria-label="Memuat detail buku publik">
            <div className="flex gap-4">
              <Skeleton className="h-40 w-28 shrink-0 rounded-[var(--radius-cover)]" />
              <div className="flex-1 space-y-2.5 pt-1">
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-6 w-28 rounded-full" />
              </div>
            </div>
            <Skeleton className="h-20 w-full rounded-[var(--radius-control)]" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-11/12" />
              <Skeleton className="h-3.5 w-4/5" />
            </div>
          </div>
        )}

        {/* Error State (e.g. 502 UPSTREAM_API_ERROR / Timeout) */}
        {isError && !isLoading && (
          <div
            role="alert"
            className="mt-4 rounded-[var(--radius-control)] border border-[var(--color-danger-border)] bg-[var(--color-danger-surface)] p-4"
          >
            <div className="flex items-start gap-2.5">
              <AlertCircle
                className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-danger)]"
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-bold text-[var(--color-ink)]">
                  Gagal Memuat Detail Buku Publik
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-[var(--color-ink-muted)]">
                  {error instanceof Error
                    ? error.message
                    : 'Terjadi gangguan saat mengambil data dari upstream Open Library (502 / Upstream Timeout).'}
                </p>
                <div className="mt-3.5 flex flex-wrap gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
                    onClick={() => void refetch()}
                  >
                    Coba Lagi
                  </Button>
                  <Button variant="secondary" size="sm" onClick={onClose}>
                    Tutup Panel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Detail Content */}
        {detail && !isLoading && !isError && (
          <div className="mt-4 space-y-4">
            <div className="flex items-start gap-4">
              <BookCover
                src={detail.coverUrl}
                title={detail.title}
                category={detail.subjects?.[0] || 'PUBLIK'}
                code={detail.workId}
                size="lg"
              />

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5 pb-1">
                  <span className="inline-flex items-center rounded bg-[var(--color-primary-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--color-primary)]">
                    Buku Publik
                  </span>
                  {detail.inReadlist && (
                    <span className="inline-flex items-center gap-1 rounded bg-[var(--color-status-available-bg)] px-2 py-0.5 text-[10px] font-semibold text-[var(--color-status-available-ink)] border border-[var(--color-status-available-border)]">
                      <BookmarkCheck className="h-3 w-3" />
                      Di Readlist
                    </span>
                  )}
                </div>

                <h2 className="text-base leading-snug font-bold text-[var(--color-ink)] sm:text-lg">
                  {detail.title}
                </h2>

                <p className="mt-1 text-xs sm:text-sm text-[var(--color-ink-muted)]">
                  {formatAuthors(detail.authors)}
                </p>

                <div className="mt-2 space-y-0.5 text-xs text-[var(--color-ink-subtle)]">
                  {detail.firstPublishYear && (
                    <p>
                      Tahun Terbit:{' '}
                      <span className="font-mono font-medium text-[var(--color-ink)] tabular-nums">
                        {detail.firstPublishYear}
                      </span>
                    </p>
                  )}
                  <p>
                    Work ID:{' '}
                    <span className="font-mono font-medium text-[var(--color-ink)]">
                      {detail.workId}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* Hard Domain Partition Callout: Tidak bisa dipinjam */}
            <div className="rounded-[var(--radius-control)] border border-[var(--color-primary-border)] bg-[var(--color-primary-soft)]/50 p-3 text-xs leading-relaxed text-[var(--color-ink)]">
              <p className="font-semibold text-[var(--color-primary)]">
                Domain Referensi Publik (Open Library)
              </p>
              <p className="mt-1 text-[var(--color-ink-muted)]">
                Koleksi ini bersumber dari katalog literatur terbuka global. Buku Publik dikhususkan untuk referensi bacaan mandiri dan <strong>tidak memiliki stok fisik ataupun layanan peminjaman kampus</strong>.
              </p>
            </div>

            {/* Aksi Readlist Publik */}
            {canShowAction && (
              <div className="space-y-2 pt-1">
                {detail.inReadlist ? (
                  <Button
                    type="button"
                    variant="secondary"
                    size="md"
                    className="w-full text-sm font-semibold text-[var(--color-danger)] border-[var(--color-danger-border)] hover:bg-[var(--color-danger-surface)]"
                    isLoading={isActionLoading}
                    leftIcon={<Trash2 className="h-4 w-4 text-[var(--color-danger)]" />}
                    onClick={handleRemove}
                  >
                    Hapus dari Readlist
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="primary"
                    size="md"
                    className="w-full text-sm font-bold shadow-xs"
                    isLoading={isActionLoading}
                    leftIcon={<BookmarkPlus className="h-4 w-4" />}
                    onClick={handleAdd}
                  >
                    + Readlist
                  </Button>
                )}
                {actor === 'guest' && !detail.inReadlist && (
                  <p className="text-center text-[11px] text-[var(--color-ink-muted)]">
                    Masuk dengan NIM/Email untuk menyimpan buku ke Readlist Saya.
                  </p>
                )}
              </div>
            )}

            {/* Subjek / Topik */}
            {detail.subjects && detail.subjects.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-[var(--color-ink)] uppercase tracking-wider">
                  Subjek & Kategori
                </h4>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {detail.subjects.map((subj) => (
                    <span
                      key={subj}
                      className="rounded bg-[var(--color-surface-subtle)] border border-[var(--color-border)] px-2 py-0.5 text-xs text-[var(--color-ink-muted)]"
                    >
                      {subj}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Deskripsi dengan Fallback */}
            <div>
              <h4 className="text-xs font-semibold text-[var(--color-ink)] uppercase tracking-wider">
                Deskripsi
              </h4>
              <div className="mt-2 text-xs sm:text-sm leading-relaxed">
                {detail.description ? (
                  <p className="text-[var(--color-ink-muted)] whitespace-pre-line">
                    {detail.description}
                  </p>
                ) : (
                  <div
                    data-testid="description-fallback-container"
                    className="rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-surface-subtle)] p-3.5 text-xs text-[var(--color-ink-muted)] space-y-1.5"
                  >
                    <p className="font-semibold text-[var(--color-ink)]">
                      Ringkasan Informasi Open Library
                    </p>
                    <p className="leading-relaxed">
                      {detail.descriptionFallback ||
                        'Deskripsi naratif belum tersedia di Open Library untuk entri buku ini.'}
                    </p>
                    {detail.firstPublishYear && (
                      <p className="font-mono text-[11px] text-[var(--color-ink-subtle)]">
                        Terbitan pertama: {detail.firstPublishYear}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
