import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Link, createFileRoute } from '@tanstack/react-router';
import { AlertCircle, ChevronDown, Compass, Library, RefreshCw } from 'lucide-react';
import {
  CatalogEmptyState,
  CatalogFilterBar,
  CatalogSkeleton,
  LibraryBookDetailPanel,
  LibraryBookRow,
} from '../components/catalog';
import { Button } from '../components/ui/Button';
import { BookCompartmentSkeleton } from '../components/ui/Skeleton';
import { useInfiniteLibraryBooks } from '../hooks/useLibraryBooks';
import { cn } from '../lib/cn';
import { DEFAULT_CATALOG_LIMIT } from '../services/book-service';

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
        resetScroll: false,
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

  const isDetailOpen = selectedBookId !== null;

  return (
    <div>
      <section
        aria-label="Katalog Perpustakaan"
        className="bg-[var(--color-primary)] text-white"
      >
        <div className="mx-auto flex max-w-3xl flex-col items-center px-4 py-12 text-center sm:px-6 sm:py-16">
          <h1 className="text-3xl leading-tight font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
            Selamat Datang di
            <br />
            JejakBaca
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/85 sm:text-base">
            Telusuri Buku Perpustakaan UNTAD yang tersedia untuk Peminjaman mandiri
            (kuota maks 3 buku, jatuh tempo 7 hari).
          </p>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <a
              href="#katalog-buku"
              className="inline-flex min-h-[42px] items-center gap-2 rounded-[var(--radius-control)] bg-white px-5 py-2.5 text-sm font-semibold text-[var(--color-primary)] transition-colors hover:bg-white/90"
            >
              <Library className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="tabular-nums">
                {booksQuery.isLoading ? 'Memuat Katalog...' : `${totalItems} Judul Tersedia`}
              </span>
            </a>
            <Link
              to="/public-books"
              className="inline-flex min-h-[42px] items-center gap-2 rounded-[var(--radius-control)] border border-white/30 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/20"
            >
              <Compass className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Jelajah Buku Publik</span>
            </Link>
          </div>
        </div>
      </section>

      <div id="katalog-buku" className="mx-auto max-w-6xl space-y-5 px-4 py-6 sm:px-6">
        <CatalogFilterBar
          q={q}
          category={category}
          availableOnly={availableOnly}
          onQueryChange={handleQueryChange}
          onCategoryChange={handleCategoryChange}
          onAvailableOnlyChange={handleAvailableOnlyChange}
        />

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
                <div
                  className={cn(
                    'grid grid-cols-1 gap-4 md:grid-cols-2',
                    isDetailOpen ? 'lg:grid-cols-2' : 'lg:grid-cols-3',
                  )}
                >
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
