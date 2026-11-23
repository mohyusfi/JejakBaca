import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { Bookmark, RefreshCw } from 'lucide-react';
import { UserRouteGuard } from '../components/layout/RouteGuard';
import {
  ReadlistCard,
  ReadlistDetailPanel,
  ReadlistEmptyState,
  ReadlistPagination,
  ReadlistSkeleton,
} from '../components/readlist';
import { Button } from '../components/ui/Button';
import { SearchInput } from '../components/ui/Input';
import { useReadlistQuery, useRemoveFromReadlistMutation } from '../hooks/useReadlist';
import { cn } from '../lib/cn';
import { DEFAULT_READLIST_LIMIT } from '../services/readlist-service';

export interface ReadlistSearchParams {
  q?: string;
  page?: number;
  limit?: number;
  workId?: string;
}

function parsePositiveInt(value: unknown): number | undefined {
  if (typeof value === 'number') {
    return Number.isInteger(value) && value > 0 ? value : undefined;
  }
  if (typeof value === 'string' && /^\d+$/.test(value.trim())) {
    const parsed = Number(value.trim());
    return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
  }
  return undefined;
}

export function validateReadlistSearch(
  raw: Record<string, unknown>,
): ReadlistSearchParams {
  const q = typeof raw.q === 'string' && raw.q.trim() !== '' ? raw.q.trim() : undefined;

  const parsedPage = parsePositiveInt(raw.page);
  const page = parsedPage && parsedPage > 1 ? parsedPage : undefined;

  const parsedLimit = parsePositiveInt(raw.limit);
  const clampedLimit = parsedLimit ? Math.min(50, Math.max(1, parsedLimit)) : undefined;
  const limit =
    clampedLimit && clampedLimit !== DEFAULT_READLIST_LIMIT ? clampedLimit : undefined;

  const workId =
    typeof raw.workId === 'string' && /^OL[0-9]+W$/.test(raw.workId.trim())
      ? raw.workId.trim()
      : undefined;

  return {
    q,
    page,
    limit,
    workId,
  };
}

export const Route = createFileRoute('/readlist')({
  validateSearch: validateReadlistSearch,
  component: MyReadlistPage,
});

function MyReadlistPage() {
  return (
    <UserRouteGuard>
      <ReadlistContent />
    </UserRouteGuard>
  );
}

function ReadlistContent() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  const q = search.q ?? '';
  const page = search.page ?? 1;
  const limit = search.limit ?? DEFAULT_READLIST_LIMIT;
  const selectedWorkId = search.workId ?? null;

  const [searchInput, setSearchInput] = useState(q);
  const debounceTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setSearchInput(q);
  }, [q]);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current !== null) {
        window.clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const { data, isLoading, isError, error, refetch, isFetching } = useReadlistQuery({
    q,
    page,
    limit,
  });

  const deleteMutation = useRemoveFromReadlistMutation();

  const updateSearch = useCallback(
    (patch: Partial<ReadlistSearchParams>, replace = true) => {
      void navigate({
        replace,
        resetScroll: false,
        search: (prev) => {
          const next: ReadlistSearchParams = { ...prev, ...patch };
          return validateReadlistSearch({
            q: next.q,
            page: next.page,
            limit: next.limit,
            workId: next.workId,
          });
        },
      });
    },
    [navigate],
  );

  const handleInputChange = (nextValue: string) => {
    setSearchInput(nextValue);
    if (debounceTimerRef.current !== null) {
      window.clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = window.setTimeout(() => {
      const normalized = nextValue.trim();
      if (normalized !== q) {
        updateSearch({ q: normalized || undefined, page: undefined });
      }
    }, 300);
  };

  const handleSearchSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (debounceTimerRef.current !== null) {
      window.clearTimeout(debounceTimerRef.current);
    }
    updateSearch({ q: searchInput.trim() || undefined, page: undefined });
  };

  const handleResetSearch = () => {
    if (debounceTimerRef.current !== null) {
      window.clearTimeout(debounceTimerRef.current);
    }
    setSearchInput('');
    updateSearch({ q: undefined, page: undefined });
  };

  const handlePageChange = (newPage: number) => {
    updateSearch({ page: newPage });
  };

  const handleSelectWork = (workId: string) => {
    if (selectedWorkId === workId) {
      updateSearch({ workId: undefined });
    } else {
      updateSearch({ workId });
    }
  };

  const handleCloseDetail = () => {
    updateSearch({ workId: undefined });
  };

  const handleDeleteItem = async (workId: string) => {
    await deleteMutation.mutateAsync(workId);
    if (selectedWorkId === workId) {
      updateSearch({ workId: undefined });
    }
  };

  const items = data?.data ?? [];
  const meta = data?.meta ?? { page: 1, limit: DEFAULT_READLIST_LIMIT, total: 0, totalPages: 1 };
  const hasActiveFilters = Boolean(q.trim());

  // Cari item yang dipilih dari daftar atau kembalikan null
  const selectedItem = useMemo(() => {
    if (!selectedWorkId) return null;
    return items.find((item) => item.workId === selectedWorkId) ?? null;
  }, [items, selectedWorkId]);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Header Halaman */}
      <div className="border-b border-[var(--color-border)] pb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="flex items-center gap-1.5 font-mono text-xs font-semibold tracking-wider text-[var(--color-primary)] uppercase">
              <Bookmark className="h-4 w-4" aria-hidden="true" />
              <span>Referensi Tersimpan</span>
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-[var(--color-ink)] sm:text-3xl">
              Readlist Saya
            </h1>
            <p className="mt-1.5 text-sm text-[var(--color-ink-muted)]">
              Daftar snapshot metadata Buku Publik yang Anda simpan untuk dibaca ulang secara offline tanpa bergantung pada Open Library.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<RefreshCw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')} />}
              onClick={() => void refetch()}
              disabled={isFetching}
            >
              Segarkan
            </Button>
          </div>
        </div>

        {/* Baris Pencarian */}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <form onSubmit={handleSearchSubmit} className="flex-1 min-w-[240px] max-w-md">
            <SearchInput
              value={searchInput}
              onChange={(e) => handleInputChange(e.target.value)}
              onClear={handleResetSearch}
              placeholder="Cari judul atau nama penulis di Readlist..."
              aria-label="Cari buku di Readlist"
            />
          </form>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={handleResetSearch}>
              Hapus Filter
            </Button>
          )}

          <div className="ml-auto text-xs text-[var(--color-ink-subtle)] font-medium">
            {isLoading
              ? 'Memuat data...'
              : `${meta.total} Judul Tersimpan`}
          </div>
        </div>
      </div>

      {/* Konten Utama */}
      <div className="mt-6">
        {isLoading && <ReadlistSkeleton count={4} />}

        {isError && (
          <div
            role="alert"
            className="rounded-[var(--radius-card)] border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/5 p-6 text-center"
          >
            <h3 className="text-base font-bold text-[var(--color-danger)]">
              Gagal Memuat Readlist
            </h3>
            <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
              {error instanceof Error ? error.message : 'Terjadi kesalahan sistem.'}
            </p>
            <div className="mt-4">
              <Button variant="primary" size="sm" onClick={() => void refetch()}>
                Coba Lagi
              </Button>
            </div>
          </div>
        )}

        {!isLoading && !isError && items.length === 0 && (
          <ReadlistEmptyState
            hasActiveFilters={hasActiveFilters}
            onResetFilters={handleResetSearch}
          />
        )}

        {!isLoading && !isError && items.length > 0 && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Daftar Item */}
            <div
              className={cn(
                'space-y-4 transition-all duration-200',
                selectedItem ? 'lg:col-span-7 xl:col-span-8' : 'lg:col-span-12',
              )}
            >
              <div className="space-y-3">
                {items.map((item) => (
                  <ReadlistCard
                    key={item.workId}
                    item={item}
                    isSelected={item.workId === selectedWorkId}
                    onSelect={handleSelectWork}
                    onDelete={handleDeleteItem}
                    isDeleting={deleteMutation.isPending}
                  />
                ))}
              </div>

              {/* Paginasi */}
              <ReadlistPagination
                page={meta.page}
                totalPages={meta.totalPages}
                total={meta.total}
                onPageChange={handlePageChange}
                isLoading={isFetching}
              />
            </div>

            {/* Panel Detail (Desktop Sticky) */}
            {selectedItem && (
              <div className="hidden lg:col-span-5 lg:block xl:col-span-4">
                <ReadlistDetailPanel
                  item={selectedItem}
                  onClose={handleCloseDetail}
                  onDelete={handleDeleteItem}
                  isDeleting={deleteMutation.isPending}
                />
              </div>
            )}

            {/* Panel Detail (Mobile Overlay Sheet) */}
            {selectedItem && (
              <div className="lg:hidden">
                <ReadlistDetailPanel
                  item={selectedItem}
                  onClose={handleCloseDetail}
                  onDelete={handleDeleteItem}
                  isDeleting={deleteMutation.isPending}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default MyReadlistPage;
