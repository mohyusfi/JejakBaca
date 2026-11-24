import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { Plus, RefreshCw } from 'lucide-react';
import {
  AdminBookDrawer,
  AdminBooksEmptyState,
  AdminBooksFilterBar,
  AdminBooksPagination,
  AdminBooksSkeleton,
  AdminBooksTable,
} from '../../components/admin';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useDeleteLibraryBook, useLibraryBooks } from '../../hooks/useLibraryBooks';
import { useToast } from '../../hooks/useToast';
import { isApiError } from '../../lib/api-error';
import { DEFAULT_CATALOG_LIMIT } from '../../services/book-service';
import type { LibraryBook } from '../../types/domain';

interface AdminBooksSearch {
  q?: string;
  category?: string;
  availableOnly?: boolean;
  page?: number;
  limit?: number;
}

const ALLOWED_LIMITS = [10, 20, 50];

function parsePositiveInt(value: unknown, fallback: number): number {
  const num = typeof value === 'number' ? value : Number(value);
  return Number.isInteger(num) && num > 0 ? num : fallback;
}

export const Route = createFileRoute('/admin/books')({
  validateSearch: (search: Record<string, unknown>): AdminBooksSearch => {
    const q = typeof search.q === 'string' && search.q.trim() ? search.q : undefined;
    const category =
      typeof search.category === 'string' && search.category.trim() ? search.category : undefined;
    const availableOnly =
      search.availableOnly === true || search.availableOnly === 'true' ? true : undefined;
    const pageNum = parsePositiveInt(search.page, 1);
    const limitNum = parsePositiveInt(search.limit, DEFAULT_CATALOG_LIMIT);
    const limit = ALLOWED_LIMITS.includes(limitNum) ? limitNum : DEFAULT_CATALOG_LIMIT;

    return {
      q,
      category,
      availableOnly,
      page: pageNum > 1 ? pageNum : undefined,
      limit: limit !== DEFAULT_CATALOG_LIMIT ? limit : undefined,
    };
  },
  component: AdminBooksPage,
});

function AdminBooksPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  const q = search.q ?? '';
  const category = search.category ?? '';
  const availableOnly = Boolean(search.availableOnly);
  const page = search.page ?? 1;
  const limit = search.limit ?? DEFAULT_CATALOG_LIMIT;

  const hasActiveFilters = Boolean(q.trim() || category.trim() || availableOnly);

  const { showToast } = useToast();
  const deleteMutation = useDeleteLibraryBook();

  const [drawerState, setDrawerState] = useState<{
    open: boolean;
    mode: 'create' | 'edit';
    initialData: LibraryBook | null;
  }>({
    open: false,
    mode: 'create',
    initialData: null,
  });

  const [deletingBook, setDeletingBook] = useState<LibraryBook | null>(null);

  const handleOpenCreateDrawer = () => {
    setDrawerState({
      open: true,
      mode: 'create',
      initialData: null,
    });
  };

  const handleOpenEditDrawer = (book: LibraryBook) => {
    setDrawerState({
      open: true,
      mode: 'edit',
      initialData: book,
    });
  };

  const handleCloseDrawer = () => {
    setDrawerState((prev) => ({ ...prev, open: false }));
  };

  const handleDeleteBook = (book: LibraryBook) => {
    setDeletingBook(book);
  };

  const handleConfirmDelete = () => {
    if (!deletingBook) return;

    deleteMutation.mutate(deletingBook.id, {
      onSuccess: () => {
        showToast({
          tone: 'success',
          title: 'Buku Berhasil Dihapus',
          description: `Buku "${deletingBook.title}" berhasil dihapus dari katalog perpustakaan.`,
        });
        setDeletingBook(null);
      },
      onError: (err) => {
        let message = 'Gagal menghapus buku perpustakaan.';
        if (isApiError(err)) {
          if (err.code === 'BOOK_IN_ACTIVE_LOAN') {
            message = 'Buku sedang dipinjam oleh mahasiswa dan tidak dapat dihapus.';
          } else {
            message = err.message || message;
          }
        } else if (err instanceof Error) {
          message = err.message;
        }

        showToast({
          tone: 'error',
          title: 'Gagal Menghapus Buku',
          description: message,
        });
        setDeletingBook(null);
      },
    });
  };

  const { data, isLoading, isError, isFetching, refetch } = useLibraryBooks({
    q,
    category,
    availableOnly,
    page,
    limit,
  });

  const updateSearch = (patch: Partial<AdminBooksSearch>, resetPage = true) => {
    void navigate({
      search: (prev) => {
        const next: AdminBooksSearch = {
          ...prev,
          ...patch,
        };
        if (resetPage) {
          next.page = undefined;
        }
        return {
          q: next.q?.trim() ? next.q : undefined,
          category: next.category?.trim() ? next.category : undefined,
          availableOnly: next.availableOnly ? true : undefined,
          page: next.page && next.page > 1 ? next.page : undefined,
          limit: next.limit && next.limit !== DEFAULT_CATALOG_LIMIT ? next.limit : undefined,
        };
      },
      replace: true,
    });
  };

  const resetFilters = () => {
    void navigate({
      search: {
        limit: limit !== DEFAULT_CATALOG_LIMIT ? limit : undefined,
      },
      replace: true,
    });
  };

  const books = data?.data ?? [];
  const meta = data?.meta ?? {
    page,
    limit,
    total: 0,
    totalPages: 1,
  };

  return (
    <section aria-label="Daftar Koleksi Buku Perpustakaan" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[var(--color-ink)]">Daftar Koleksi Buku</h2>
          <p className="text-xs text-[var(--color-ink-muted)]">
            Pantau ketersediaan stok, kategori, dan detail bibliografi seluruh koleksi perpustakaan.
          </p>
        </div>
        <Button
          type="button"
          variant="primary"
          size="sm"
          leftIcon={<Plus className="h-4 w-4" aria-hidden="true" />}
          onClick={handleOpenCreateDrawer}
        >
          Buku
        </Button>
      </div>

      <AdminBooksFilterBar
        q={q}
        category={category}
        availableOnly={availableOnly}
        limit={limit}
        hasActiveFilters={hasActiveFilters}
        onQueryChange={(nextQ) => updateSearch({ q: nextQ })}
        onCategoryChange={(nextCategory) => updateSearch({ category: nextCategory })}
        onAvailableOnlyChange={(nextAvailable) => updateSearch({ availableOnly: nextAvailable })}
        onLimitChange={(nextLimit) => updateSearch({ limit: nextLimit })}
        onResetFilters={resetFilters}
      />

      {isLoading ? (
        <AdminBooksSkeleton />
      ) : isError ? (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-card)] border border-[var(--color-danger-border)] bg-[var(--color-danger-surface)] px-4 py-3 text-sm text-[var(--color-danger)]"
        >
          <span>Gagal memuat daftar koleksi buku perpustakaan.</span>
          <Button type="button" variant="secondary" size="sm" onClick={() => void refetch()}>
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            Coba Lagi
          </Button>
        </div>
      ) : books.length === 0 ? (
        <AdminBooksEmptyState hasActiveFilters={hasActiveFilters} onResetFilters={resetFilters} />
      ) : (
        <>
          <AdminBooksTable
            books={books}
            onEdit={handleOpenEditDrawer}
            onDelete={handleDeleteBook}
          />
          <AdminBooksPagination
            page={meta.page}
            totalPages={meta.totalPages}
            isFetching={isFetching}
            onPageChange={(nextPage) => updateSearch({ page: nextPage }, false)}
          />
        </>
      )}

      {/* Drawer Tambah / Edit Buku */}
      <AdminBookDrawer
        open={drawerState.open}
        mode={drawerState.mode}
        initialData={drawerState.initialData}
        onClose={handleCloseDrawer}
      />

      {/* Dialog Konfirmasi Hapus Buku */}
      <ConfirmDialog
        open={Boolean(deletingBook)}
        onClose={() => setDeletingBook(null)}
        onConfirm={handleConfirmDelete}
        title="Hapus Buku Perpustakaan"
        description={
          deletingBook ? (
            <p>
              Apakah Anda yakin ingin menghapus buku{' '}
              <strong className="text-[var(--color-ink)]">"{deletingBook.title}"</strong> dari katalog perpustakaan?
              Tindakan ini tidak dapat dibatalkan.
            </p>
          ) : (
            ''
          )
        }
        confirmLabel="Hapus Buku"
        confirmTone="circulation"
        cancelLabel="Batal"
        isLoading={deleteMutation.isPending}
      />
    </section>
  );
}
