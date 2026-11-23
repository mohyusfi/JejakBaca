import { useCallback, useState, type ChangeEvent, type FormEvent } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import {
  AlertCircle,
  BookOpen,
  Compass,
  Library,
  RefreshCw,
  Search,
} from 'lucide-react';
import {
  PublicBookCard,
  PublicBookDetailPanel,
  PublicBooksPagination,
  PublicBookTopicChips,
} from '../components/public-books';
import { Button } from '../components/ui/Button';
import { SearchInput } from '../components/ui/Input';
import { Skeleton } from '../components/ui/Skeleton';
import { usePublicBooks } from '../hooks/usePublicBooks';
import { cn } from '../lib/cn';
import {
  DEFAULT_PUBLIC_TOPIC,
  UNTAD_ACADEMIC_TOPICS,
  type UntadTopicId,
} from '../services/public-book-service';

export interface PublicBooksSearchParams {
  q?: string;
  subject?: string;
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

export function validatePublicBooksSearch(
  raw: Record<string, unknown>,
): PublicBooksSearchParams {
  const q = typeof raw.q === 'string' && raw.q.trim() !== '' ? raw.q.trim() : undefined;
  const subject =
    typeof raw.subject === 'string' && raw.subject.trim() !== ''
      ? raw.subject.trim()
      : undefined;

  const parsedPage = parsePositiveInt(raw.page);
  const page = parsedPage && parsedPage > 1 ? parsedPage : undefined;

  const parsedLimit = parsePositiveInt(raw.limit);
  const limit = parsedLimit && parsedLimit > 0 && parsedLimit !== 10 ? parsedLimit : undefined;

  const workId =
    typeof raw.workId === 'string' && raw.workId.trim() !== ''
      ? raw.workId.trim()
      : undefined;

  return {
    q,
    subject,
    page,
    limit,
    workId,
  };
}

export const Route = createFileRoute('/public-books')({
  validateSearch: validatePublicBooksSearch,
  component: PublicBooksPage,
});

function PublicBooksPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  const rawQ = search.q ?? '';
  const rawSubject = search.subject ?? '';
  const currentPage = search.page ?? 1;
  const currentLimit = search.limit ?? 10;
  const selectedWorkId = search.workId ?? null;

  // Topik default aktif adalah 'computer_science' jika tidak ada pencarian q dan tidak ada subject spesifik di URL
  const activeTopic: UntadTopicId | null =
    !rawQ.trim()
      ? (rawSubject as UntadTopicId) || DEFAULT_PUBLIC_TOPIC
      : null;

  const [inputQ, setInputQ] = useState(rawQ);

  const updateSearch = useCallback(
    (patch: Partial<PublicBooksSearchParams>, replace = true) => {
      void navigate({
        replace,
        resetScroll: false,
        search: (prev) => {
          const next: PublicBooksSearchParams = { ...prev, ...patch };
          return validatePublicBooksSearch({
            q: next.q,
            subject: next.subject,
            page: next.page,
            limit: next.limit,
            workId: next.workId,
          });
        },
      });
    },
    [navigate],
  );

  const queryParams = {
    q: rawQ || undefined,
    subject: rawSubject || undefined,
    page: currentPage,
    limit: currentLimit,
  };

  const booksQuery = usePublicBooks(queryParams);

  const books = booksQuery.data?.data ?? [];
  const meta = booksQuery.data?.meta;
  const totalItems = meta?.total ?? 0;
  const totalPages = meta?.totalPages ?? 1;

  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = inputQ.trim();
    if (trimmed) {
      updateSearch({ q: trimmed, subject: undefined, page: undefined }, true);
    } else {
      updateSearch({ q: undefined, page: undefined }, true);
    }
  };

  const handleClearSearch = () => {
    setInputQ('');
    updateSearch({ q: undefined, page: undefined }, true);
  };

  const handleSelectTopic = (topicId: UntadTopicId) => {
    setInputQ('');
    updateSearch(
      {
        subject: topicId,
        q: undefined,
        page: undefined,
      },
      true,
    );
  };

  const handleSelectBook = (workId: string) => {
    updateSearch({ workId }, false);
  };

  const handleCloseDetail = () => {
    updateSearch({ workId: undefined }, true);
  };

  const handlePageChange = (nextPage: number) => {
    updateSearch({ page: nextPage > 1 ? nextPage : undefined }, false);
  };

  const isDetailOpen = Boolean(selectedWorkId);

  const activeTopicLabel = activeTopic
    ? UNTAD_ACADEMIC_TOPICS.find((t) => t.id === activeTopic)?.label ?? activeTopic
    : null;

  return (
    <div>
      {/* Zone Header - Hard Domain Partition */}
      <section
        aria-label="Zona Buku Publik"
        className="border-b border-[var(--color-primary-border)] bg-[var(--color-primary)] text-white"
      >
        <div className="mx-auto flex max-w-4xl flex-col items-center px-4 py-10 text-center sm:px-6 sm:py-14">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold tracking-wide text-white">
            <Compass className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Zona Referensi Digital Eksternal</span>
          </div>

          <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
            Jelajah Buku Publik
          </h1>

          <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/90 sm:text-base">
            Telusuri literatur global dari Open Library untuk referensi belajar mandiri.
            Koleksi publik ini <strong>tidak dapat dipinjam secara fisik</strong> di perpustakaan kampus.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/"
              className="inline-flex min-h-[38px] items-center gap-2 rounded-[var(--radius-control)] border border-white/40 bg-white/10 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/20"
            >
              <Library className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Buka Katalog Perpustakaan UNTAD</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Main Container */}
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
        {/* Search & Topic Filters */}
        <section
          aria-label="Pencarian dan Filter Buku Publik"
          className="space-y-4 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-2xs"
        >
          {/* Search bar */}
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <div className="flex-1">
              <SearchInput
                value={inputQ}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setInputQ(e.target.value)}
                onClear={handleClearSearch}
                placeholder="Cari judul atau topik di Open Library (mis. algorithms, distributed systems)..."
                aria-label="Cari buku publik di Open Library"
              />
            </div>
            <Button
              type="submit"
              variant="primary"
              size="md"
              leftIcon={<Search className="h-4 w-4" />}
            >
              Cari
            </Button>
          </form>

          {/* Academic Topic Chips */}
          <PublicBookTopicChips
            activeTopic={activeTopic}
            onSelectTopic={handleSelectTopic}
            disabled={booksQuery.isLoading}
          />
        </section>

        {/* Content Section */}
        <div
          className={cn(
            isDetailOpen
              ? 'grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[minmax(0,1fr)_420px] lg:items-start'
              : 'block',
          )}
        >
          <div className="min-w-0 space-y-4">
            {/* Context status header */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border)] pb-2.5">
              <div className="text-xs text-[var(--color-ink-muted)]">
                {rawQ ? (
                  <span>
                    Hasil pencarian kata kunci: <strong>"{rawQ}"</strong>
                  </span>
                ) : activeTopicLabel ? (
                  <span>
                    Topik Akademik: <strong>{activeTopicLabel}</strong>
                  </span>
                ) : (
                  <span>Semua Koleksi Publik</span>
                )}
                {!booksQuery.isLoading && !booksQuery.isError && (
                  <span className="ml-1 text-[var(--color-ink-subtle)] font-mono tabular-nums">
                    ({totalItems} buku)
                  </span>
                )}
              </div>

              {(rawQ || (rawSubject && rawSubject !== DEFAULT_PUBLIC_TOPIC)) && (
                <button
                  type="button"
                  onClick={() => {
                    setInputQ('');
                    updateSearch({ q: undefined, subject: undefined, page: undefined }, true);
                  }}
                  className="text-xs font-semibold text-[var(--color-primary)] hover:underline"
                >
                  Reset ke Topik Default
                </button>
              )}
            </div>

            {/* Loading skeletons */}
            {booksQuery.isLoading && (
              <div
                aria-label="Memuat buku publik"
                className={cn(
                  'grid grid-cols-1 gap-4 sm:grid-cols-2',
                  isDetailOpen ? 'lg:grid-cols-2' : 'lg:grid-cols-3',
                )}
              >
                {Array.from({ length: 6 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="flex gap-3.5 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
                  >
                    <Skeleton className="h-28 w-20 shrink-0 rounded-[var(--radius-cover)]" />
                    <div className="flex-1 space-y-2 pt-1">
                      <Skeleton className="h-4 w-1/3" />
                      <Skeleton className="h-4 w-5/6" />
                      <Skeleton className="h-3 w-1/2" />
                      <Skeleton className="mt-2 h-7 w-full rounded-[var(--radius-control)]" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Error state (e.g. 502 UPSTREAM_API_ERROR) */}
            {booksQuery.isError && (
              <section
                aria-label="Gagal memuat buku publik"
                className="rounded-[var(--radius-card)] border border-[var(--color-danger-border)] bg-[var(--color-surface)] p-6 text-center"
              >
                <AlertCircle
                  className="mx-auto h-8 w-8 text-[var(--color-danger)]"
                  aria-hidden="true"
                />
                <h2 className="mt-2.5 text-base font-bold text-[var(--color-ink)]">
                  Gagal Memuat Buku Publik
                </h2>
                <p className="mx-auto mt-1 max-w-md text-sm text-[var(--color-ink-muted)]">
                  {booksQuery.error instanceof Error
                    ? booksQuery.error.message
                    : 'Layanan Open Library sedang tidak dapat dijangkau atau mengalami timeout (Upstream Error 502).'}
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

            {/* Empty state */}
            {!booksQuery.isLoading && !booksQuery.isError && books.length === 0 && (
              <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center">
                <BookOpen className="mx-auto h-10 w-10 text-[var(--color-ink-subtle)]" />
                <h3 className="mt-2.5 text-base font-bold text-[var(--color-ink)]">
                  Tidak Ada Buku Publik Ditemukan
                </h3>
                <p className="mt-1 text-xs text-[var(--color-ink-muted)]">
                  Coba gunakan kata kunci pencarian lain atau pilih salah satu topik akademik UNTAD di atas.
                </p>
                <div className="mt-4">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setInputQ('');
                      updateSearch({ q: undefined, subject: DEFAULT_PUBLIC_TOPIC, page: undefined }, true);
                    }}
                  >
                    Muat Topik Ilmu Komputer
                  </Button>
                </div>
              </div>
            )}

            {/* Books Grid */}
            {!booksQuery.isLoading && !booksQuery.isError && books.length > 0 && (
              <>
                <div
                  className={cn(
                    'grid grid-cols-1 gap-4 sm:grid-cols-2',
                    isDetailOpen ? 'lg:grid-cols-2' : 'lg:grid-cols-3',
                  )}
                >
                  {books.map((book) => (
                    <PublicBookCard
                      key={book.workId}
                      book={book}
                      isSelected={selectedWorkId === book.workId}
                      onSelect={handleSelectBook}
                    />
                  ))}
                </div>

                {/* Pagination */}
                <PublicBooksPagination
                  page={currentPage}
                  totalPages={totalPages}
                  total={totalItems}
                  onPageChange={handlePageChange}
                  isLoading={booksQuery.isFetching}
                />
              </>
            )}
          </div>

          {/* Lazy Detail Panel */}
          {isDetailOpen && (
            <PublicBookDetailPanel
              workId={selectedWorkId}
              onClose={handleCloseDetail}
            />
          )}
        </div>
      </div>
    </div>
  );
}
