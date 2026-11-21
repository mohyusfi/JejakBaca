import { useCallback, useEffect, useMemo, useRef } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { AlertCircle, ChevronDown, RefreshCw } from 'lucide-react';
import {
  CatalogEmptyState,
  CatalogFilterBar,
  CatalogSkeleton,
  LibraryBookDetailPanel,
  LibraryBookRow,
} from '../components/catalog';
import { ZoneHeader } from '../components/layout/ZoneHeader';
import { Button } from '../components/ui/Button';
import { BookCompartmentSkeleton } from '../components/ui/Skeleton';
import { useInfiniteLibraryBooks } from '../hooks/useLibraryBooks';
import { cn } from '../lib/cn';
import {
  CATALOG_LIMIT_OPTIONS,
  DEFAULT_CATALOG_LIMIT,
} from '../services/book-service';

export interface CatalogSearchParams {
  q?: string;
  category?: string;
  availableOnly?: boolean;
  page?: number;
  limit?: number;
  bookId?: number;
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

export function validateCatalogSearch(
  raw: Record<string, unknown>,
): CatalogSearchParams {
  const q = typeof raw.q === 'string' && raw.q.trim() !== '' ? raw.q.trim() : undefined;
  const category =
    typeof raw.category === 'string' && raw.category.trim() !== ''
      ? raw.category.trim()
      : undefined;
  const availableOnly =
    raw.availableOnly === true || raw.availableOnly === 'true' ? true : undefined;

  const parsedPage = parsePositiveInt(raw.page);
  const page = parsedPage && parsedPage > 1 ? parsedPage : undefined;

  const parsedLimit = parsePositiveInt(raw.limit);
  const clampedLimit = parsedLimit ? Math.min(50, Math.max(1, parsedLimit)) : undefined;
  const limit =
    clampedLimit && clampedLimit !== DEFAULT_CATALOG_LIMIT ? clampedLimit : undefined;

  const bookId = parsePositiveInt(raw.bookId);

  return {
    q,
    category,
    availableOnly,
    page,
    limit,
    bookId,
  };
}

export const Route = createFileRoute('/')({
  validateSearch: validateCatalogSearch,
  component: LibraryCatalogPage,
});

function LibraryCatalogPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  const q = search.q ?? '';
  const category = search.category ?? '';
  const availableOnly = Boolean(search.availableOnly);
  const targetPage = search.page ?? 1;
  const limit = search.limit ?? DEFAULT_CATALOG_LIMIT;
  const selectedBookId = search.bookId ?? null;
  const hasActiveFilters = Boolean(q || category || availableOnly);

  const updateSearch = useCallback(
    (patch: Partial<CatalogSearchParams>, replace = true) => {
      void navigate({
        replace,
        search: (prev) => {
          const next: CatalogSearchParams = { ...prev, ...patch };
          return validateCatalogSearch({
            q: next.q,
            category: next.category,
            availableOnly: next.availableOnly,
            page: next.page,
            limit: next.limit,
            bookId: next.bookId,
          });
        },
      });
    },
    [navigate],
  );

  const booksQuery = useInfiniteLibraryBooks({
    q,
    category,
    availableOnly,
    limit,
  });

  const pages = useMemo(() => booksQuery.data?.pages ?? [], [booksQuery.data]);
  const books = useMemo(() => pages.flatMap((pageData) => pageData.data), [pages]);
  const loadedPages = pages.length;
  const firstMeta = pages[0]?.meta;
  const totalItems = firstMeta?.total ?? 0;
  const totalPages = firstMeta?.totalPages ?? 1;

  const {
    isLoading,
    isError,
    hasNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
    fetchNextPage,
  } = booksQuery;

  // Pulihkan seluruh halaman 1..targetPage saat reload/buka URL ?page=N dan jaga batas totalPages
  useEffect(() => {
    if (isLoading || isError || loadedPages === 0) return;

    if (targetPage > totalPages) {
      updateSearch({ page: totalPages > 1 ? totalPages : undefined }, true);
      return;
    }

    if (
      loadedPages < targetPage &&
      hasNextPage &&
      !isFetchingNextPage &&
      !isFetchNextPageError
    ) {
      void fetchNextPage();
    }
  }, [
    fetchNextPage,
    hasNextPage,
    isError,
    isFetchNextPageError,
    isFetchingNextPage,
    isLoading,
    loadedPages,
    targetPage,
    totalPages,
    updateSearch,
  ]);

  const handleLoadMore = useCallback(async () => {
    if (!hasNextPage || isFetchingNextPage) return;
    const result = await fetchNextPage();
    if (!result.isError && result.data) {
      const nextCount = result.data.pages.length;
      if (nextCount !== targetPage) {
        updateSearch({ page: nextCount > 1 ? nextCount : undefined }, true);
      }
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, targetPage, updateSearch]);

  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') return;
    if (
      !hasNextPage ||
      isFetchingNextPage ||
      isFetchNextPageError ||
      loadedPages < targetPage
    ) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) {
          void handleLoadMore();
        }
      },
      { rootMargin: '160px 0px' },
    );

    observer.observe(node);
    return () => {
      observer.disconnect();
    };
  }, [
    handleLoadMore,
    hasNextPage,
    isFetchNextPageError,
    isFetchingNextPage,
    loadedPages,
    targetPage,
  ]);

  const handleQueryChange = useCallback(
    (nextQ: string) => {
      updateSearch({ q: nextQ || undefined, page: undefined }, true);
    },
    [updateSearch],
  );

  const handleCategoryChange = useCallback(
    (nextCategory: string) => {
      updateSearch({ category: nextCategory || undefined, page: undefined }, true);
    },
    [updateSearch],
  );

  const handleAvailableOnlyChange = useCallback(
    (nextAvailable: boolean) => {
      updateSearch(
        { availableOnly: nextAvailable ? true : undefined, page: undefined },
        true,
      );
    },
    [updateSearch],
  );

  const handleLimitChange = useCallback(
    (nextLimit: number) => {
      updateSearch(
        {
          limit: nextLimit === DEFAULT_CATALOG_LIMIT ? undefined : nextLimit,
          page: undefined,
        },
        true,
      );
    },
    [updateSearch],
  );

  const handleResetFilters = useCallback(() => {
    updateSearch(
      {
        q: undefined,
        category: undefined,
        availableOnly: undefined,
        page: undefined,
      },
      true,
    );
  }, [updateSearch]);

  const handleSelectBook = useCallback(
    (bookId: number) => {
      updateSearch({ bookId }, false);
    },
    [updateSearch],
  );

  const handleCloseDetail = useCallback(() => {
    updateSearch({ bookId: undefined }, true);
  }, [updateSearch]);

  const limitOptions = useMemo(() => {
    const options = new Set<number>(CATALOG_LIMIT_OPTIONS);
    options.add(limit);
    return Array.from(options).sort((a, b) => a - b);
  }, [limit]);

  const isDetailOpen = selectedBookId !== null;

  return (
    <div>
      <ZoneHeader
        kicker="Koleksi Sirkulasi UNTAD"
        title="Katalog Perpustakaan"
        description="Telusuri Buku Perpustakaan UNTAD yang tersedia untuk Peminjaman mandiri (kuota maks 3 buku, jatuh tempo 7 hari)."
        rightSlot={
          <div className="inline-flex items-center gap-3 rounded-[var(--radius-control)] border border-white/20 bg-white/10 px-3.5 py-2 text-xs text-white">
            <div>
              <p className="text-white/75">Koleksi Terindeks</p>
              <p className="font-mono text-sm font-bold tabular-nums">
                {booksQuery.isLoading ? '...' : `${totalItems} judul`}
              </p>
            </div>
            <span className="h-6 w-px bg-white/20" aria-hidden="true" />
            <div>
              <p className="text-white/75">Akses Tamu</p>
              <p className="font-semibold">Baca &amp; Telusuri</p>
            </div>
          </div>
        }
      />

      <div className="mx-auto max-w-6xl space-y-4 px-4 py-5 sm:px-6">
        <CatalogFilterBar
          q={q}
          category={category}
          availableOnly={availableOnly}
          onQueryChange={handleQueryChange}
          onCategoryChange={handleCategoryChange}
          onAvailableOnlyChange={handleAvailableOnlyChange}
        />

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-xs text-[var(--color-ink-muted)]">
          <p className="tabular-nums">
            {booksQuery.isLoading ? (
              'Memuat daftar Buku Perpustakaan...'
            ) : (
              <>
                Menampilkan{' '}
                <span className="font-semibold text-[var(--color-ink)]">
                  {books.length}
                </span>{' '}
                dari{' '}
                <span className="font-semibold text-[var(--color-ink)]">
                  {totalItems}
                </span>{' '}
                buku
                {totalPages > 1 && (
                  <span className="ml-1.5 text-[var(--color-ink-subtle)]">
                    (halaman <span className="font-mono">{loadedPages}/{totalPages}</span>)
                  </span>
                )}
              </>
            )}
          </p>

          <div className="flex items-center gap-2">
            <label
              htmlFor="catalog-limit-select"
              className="font-medium text-[var(--color-ink-muted)]"
            >
              Per muat
            </label>
            <select
              id="catalog-limit-select"
              value={String(limit)}
              onChange={(e) => handleLimitChange(Number(e.target.value))}
              className="min-h-[32px] rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-2.5 py-1 font-mono text-xs font-semibold text-[var(--color-ink)] tabular-nums focus:border-[var(--color-primary)] focus:outline-none"
            >
              {limitOptions.map((option) => (
                <option key={option} value={String(option)}>
                  {option} buku
                </option>
              ))}
            </select>
          </div>
        </div>

        <div
          className={cn(
            isDetailOpen
              ? 'grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[minmax(0,1fr)_420px] lg:items-start'
              : 'block',
          )}
        >
          <div className="min-w-0 space-y-3">
            {booksQuery.isLoading && <CatalogSkeleton count={5} />}

            {booksQuery.isError && books.length === 0 && (
              <section
                aria-label="Gagal memuat Katalog Perpustakaan"
                className="rounded-[var(--radius-card)] border border-[var(--color-danger-border)] bg-[var(--color-surface)] p-6 text-center"
              >
                <AlertCircle
                  className="mx-auto h-8 w-8 text-[var(--color-danger)]"
                  aria-hidden="true"
                />
                <h2 className="mt-2.5 text-base font-bold text-[var(--color-ink)]">
                  Gagal memuat Katalog Perpustakaan
                </h2>
                <p className="mx-auto mt-1 max-w-md text-sm text-[var(--color-ink-muted)]">
                  {booksQuery.error instanceof Error
                    ? booksQuery.error.message
                    : 'Terjadi gangguan saat mengambil daftar Buku Perpustakaan.'}
                </p>
                <div className="mt-4">
                  <Button
                    variant="primary"
                    size="md"
                    leftIcon={<RefreshCw className="h-4 w-4" />}
                    onClick={() => void booksQuery.refetch()}
                  >
                    Coba Lagi
                  </Button>
                </div>
              </section>
            )}

            {!booksQuery.isLoading && !booksQuery.isError && books.length === 0 && (
              <CatalogEmptyState
                hasActiveFilters={hasActiveFilters}
                onResetFilters={handleResetFilters}
              />
            )}

            {books.length > 0 && (
              <>
                <div className="space-y-3">
                  {books.map((book) => (
                    <LibraryBookRow
                      key={book.id}
                      book={book}
                      isSelected={selectedBookId === book.id}
                      onSelect={handleSelectBook}
                    />
                  ))}
                </div>

                {booksQuery.isFetchingNextPage && (
                  <div className="pt-1" aria-label="Memuat buku berikutnya">
                    <BookCompartmentSkeleton />
                  </div>
                )}

                {booksQuery.isFetchNextPageError && (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-card)] border border-[var(--color-danger-border)] bg-[var(--color-danger-surface)] px-4 py-3 text-xs">
                    <span className="font-medium text-[var(--color-ink)]">
                      Gagal memuat halaman berikutnya.
                    </span>
                    <Button
                      variant="secondary"
                      size="sm"
                      leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
                      onClick={() => void handleLoadMore()}
                    >
                      Coba Muat Lagi
                    </Button>
                  </div>
                )}

                {booksQuery.hasNextPage && !booksQuery.isFetchNextPageError && (
                  <div className="flex flex-col items-center gap-2 pt-2">
                    <div
                      ref={sentinelRef}
                      aria-hidden="true"
                      className="h-1 w-full"
                    />
                    <Button
                      variant="secondary"
                      size="md"
                      isLoading={booksQuery.isFetchingNextPage}
                      rightIcon={<ChevronDown className="h-4 w-4" />}
                      onClick={() => void handleLoadMore()}
                    >
                      Muat Lebih Banyak
                    </Button>
                  </div>
                )}

                {!booksQuery.hasNextPage && !booksQuery.isFetchingNextPage && (
                  <p className="pt-2 text-center font-mono text-xs text-[var(--color-ink-subtle)] tabular-nums">
                    Semua {totalItems} Buku Perpustakaan telah ditampilkan.
                  </p>
                )}
              </>
            )}
          </div>

          {isDetailOpen && (
            <LibraryBookDetailPanel
              bookId={selectedBookId}
              onClose={handleCloseDetail}
            />
          )}
        </div>
      </div>
    </div>
  );
}
