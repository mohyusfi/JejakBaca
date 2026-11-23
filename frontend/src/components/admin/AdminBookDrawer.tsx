import { useEffect, useState, type FormEvent } from 'react';
import { AlertCircle, BookPlus, Pencil, Sparkles, X } from 'lucide-react';
import { z } from 'zod';
import { useCreateLibraryBook, useUpdateLibraryBook } from '../../hooks/useLibraryBooks';
import { useToast } from '../../hooks/useToast';
import { isApiError } from '../../lib/api-error';
import { cn } from '../../lib/cn';
import { CATALOG_CATEGORIES } from '../../services/book-service';
import type { CreateLibraryBookRequest, LibraryBook, UpdateLibraryBookRequest } from '../../types/domain';
import { BookCover } from '../ui/BookCover';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

export interface AdminBookDrawerProps {
  open: boolean;
  mode: 'create' | 'edit';
  initialData?: LibraryBook | null;
  onClose: () => void;
  onSuccess?: () => void;
}

const isValidCoverUrl = (val: unknown) => {
  if (val === null || val === undefined || val === '') return true;
  if (typeof val !== 'string') return false;
  const trimmed = val.trim();
  if (trimmed.startsWith('/') || trimmed.startsWith('./')) return true;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

const createBookSchema = z.object({
  title: z.string().trim().min(1, 'Judul buku wajib diisi'),
  author: z.string().trim().min(1, 'Penulis wajib diisi'),
  isbn: z.preprocess((val) => {
    if (typeof val === 'string' && val.trim() === '') return null;
    return val;
  }, z.string().trim().nullable().optional()),
  category: z.preprocess((val) => {
    if (typeof val === 'string' && val.trim() === '') return null;
    return val;
  }, z.string().trim().nullable().optional()),
  publishedYear: z.preprocess((val) => {
    if (val === '' || val === null || val === undefined) return null;
    const num = Number(val);
    return isNaN(num) ? val : num;
  }, z.number('Tahun terbit harus berupa angka').int('Tahun terbit harus berupa bilangan bulat').min(1000, 'Tahun terbit minimal tahun 1000').max(2100, 'Tahun terbit maksimal tahun 2100').nullable().optional()),
  stockTotal: z.preprocess((val) => {
    if (val === '' || val === null || val === undefined) return undefined;
    const num = Number(val);
    return isNaN(num) ? val : num;
  }, z.number('Total stok wajib diisi').int('Total stok harus berupa bilangan bulat').min(1, 'Total stok minimal 1 eksemplar saat menambah buku')),
  description: z.string().trim().min(1, 'Deskripsi buku wajib diisi'),
  coverUrl: z.preprocess((val) => {
    if (typeof val === 'string' && val.trim() === '') return null;
    return val;
  }, z.string().nullable().optional().refine((val) => isValidCoverUrl(val), {
    message: 'Format URL sampul tidak valid (harus berupa URL http/https atau path /...)',
  })),
});

const editBookSchema = z.object({
  title: z.string().trim().min(1, 'Judul buku wajib diisi'),
  author: z.string().trim().min(1, 'Penulis wajib diisi'),
  isbn: z.preprocess((val) => {
    if (typeof val === 'string' && val.trim() === '') return null;
    return val;
  }, z.string().trim().nullable().optional()),
  category: z.preprocess((val) => {
    if (typeof val === 'string' && val.trim() === '') return null;
    return val;
  }, z.string().trim().nullable().optional()),
  publishedYear: z.preprocess((val) => {
    if (val === '' || val === null || val === undefined) return null;
    const num = Number(val);
    return isNaN(num) ? val : num;
  }, z.number('Tahun terbit harus berupa angka').int('Tahun terbit harus berupa bilangan bulat').min(1000, 'Tahun terbit minimal tahun 1000').max(2100, 'Tahun terbit maksimal tahun 2100').nullable().optional()),
  stockTotal: z.preprocess((val) => {
    if (val === '' || val === null || val === undefined) return undefined;
    const num = Number(val);
    return isNaN(num) ? val : num;
  }, z.number('Total stok wajib diisi').int('Total stok harus berupa bilangan bulat').min(0, 'Total stok minimal 0 eksemplar')),
  description: z.string().trim().min(1, 'Deskripsi buku wajib diisi'),
  coverUrl: z.preprocess((val) => {
    if (typeof val === 'string' && val.trim() === '') return null;
    return val;
  }, z.string().nullable().optional().refine((val) => isValidCoverUrl(val), {
    message: 'Format URL sampul tidak valid (harus berupa URL http/https atau path /...)',
  })),
});

export function AdminBookDrawer({
  open,
  mode,
  initialData,
  onClose,
  onSuccess,
}: AdminBookDrawerProps) {
  const { showToast } = useToast();
  const createMutation = useCreateLibraryBook();
  const updateMutation = useUpdateLibraryBook();

  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [isbn, setIsbn] = useState('');
  const [category, setCategory] = useState('');
  const [publishedYear, setPublishedYear] = useState('');
  const [stockTotal, setStockTotal] = useState('1');
  const [description, setDescription] = useState('');
  const [coverUrl, setCoverUrl] = useState('');

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    if (mode === 'edit' && initialData) {
      setTitle(initialData.title ?? '');
      setAuthor(initialData.author ?? '');
      setIsbn(initialData.isbn ?? '');
      setCategory(initialData.category ?? '');
      setPublishedYear(initialData.publishedYear !== null ? String(initialData.publishedYear) : '');
      setStockTotal(String(initialData.stockTotal ?? 0));
      setDescription(initialData.description ?? '');
      setCoverUrl(initialData.coverUrl ?? '');
    } else {
      setTitle('');
      setAuthor('');
      setIsbn('');
      setCategory('');
      setPublishedYear('');
      setStockTotal('1');
      setDescription('');
      setCoverUrl('');
    }

    setFieldErrors({});
    setFormError(null);
  }, [open, mode, initialData]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !createMutation.isPending && !updateMutation.isPending) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose, createMutation.isPending, updateMutation.isPending]);

  if (!open) return null;

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    setFieldErrors({});

    const rawValues = {
      title,
      author,
      isbn: isbn.trim() || null,
      category: category.trim() || null,
      publishedYear: publishedYear.trim() || null,
      stockTotal,
      description,
      coverUrl: coverUrl.trim() || null,
    };

    const schema = mode === 'create' ? createBookSchema : editBookSchema;
    const validation = schema.safeParse(rawValues);

    if (!validation.success) {
      const errors: Record<string, string> = {};
      for (const issue of validation.error.issues) {
        const fieldName = String(issue.path[0]);
        if (!errors[fieldName]) {
          errors[fieldName] = issue.message;
        }
      }
      setFieldErrors(errors);
      return;
    }

    const validData = validation.data;

    if (mode === 'create') {
      const payload: CreateLibraryBookRequest = {
        title: validData.title,
        author: validData.author,
        isbn: validData.isbn ?? null,
        category: validData.category ?? null,
        publishedYear: validData.publishedYear ?? null,
        stockTotal: validData.stockTotal,
        description: validData.description,
        coverUrl: validData.coverUrl ?? null,
      };

      createMutation.mutate(payload, {
        onSuccess: () => {
          showToast({
            tone: 'success',
            title: 'Buku Berhasil Ditambahkan',
            description: `Buku "${payload.title}" berhasil disimpan ke koleksi perpustakaan.`,
          });
          onSuccess?.();
          onClose();
        },
        onError: (err) => {
          if (isApiError(err)) {
            if (err.code === 'VALIDATION_ERROR' && err.details && err.details.length > 0) {
              const backendErrors: Record<string, string> = {};
              for (const detail of err.details) {
                backendErrors[detail.field] = detail.message;
              }
              setFieldErrors(backendErrors);
            }
            setFormError(err.message || 'Gagal menambahkan buku baru.');
          } else if (err instanceof Error) {
            setFormError(err.message);
          } else {
            setFormError('Terjadi kesalahan saat menambahkan buku.');
          }

          showToast({
            tone: 'error',
            title: 'Gagal Menambah Buku',
            description: 'Periksa kembali isian form Anda.',
          });
        },
      });
    } else {
      if (!initialData) return;

      const payload: UpdateLibraryBookRequest = {
        title: validData.title,
        author: validData.author,
        isbn: validData.isbn ?? null,
        category: validData.category ?? null,
        publishedYear: validData.publishedYear ?? null,
        stockTotal: validData.stockTotal,
        description: validData.description,
        coverUrl: validData.coverUrl ?? null,
      };

      updateMutation.mutate(
        { id: initialData.id, payload },
        {
          onSuccess: () => {
            showToast({
              tone: 'success',
              title: 'Buku Berhasil Diperbarui',
              description: `Perubahan pada buku "${payload.title}" berhasil disimpan.`,
            });
            onSuccess?.();
            onClose();
          },
          onError: (err) => {
            if (isApiError(err)) {
              if (err.code === 'STOCK_BELOW_BORROWED') {
                const stockMsg =
                  err.message ||
                  'Stok total tidak boleh lebih kecil dari jumlah buku yang sedang dipinjam.';
                setFormError(stockMsg);
                setFieldErrors((prev) => ({ ...prev, stockTotal: stockMsg }));
              } else if (err.code === 'VALIDATION_ERROR' && err.details && err.details.length > 0) {
                const backendErrors: Record<string, string> = {};
                for (const detail of err.details) {
                  backendErrors[detail.field] = detail.message;
                }
                setFieldErrors(backendErrors);
                setFormError(err.message || 'Terdapat kesalahan pada isian form.');
              } else {
                setFormError(err.message || 'Gagal memperbarui buku.');
              }
            } else if (err instanceof Error) {
              setFormError(err.message);
            } else {
              setFormError('Terjadi kesalahan saat memperbarui buku.');
            }

            showToast({
              tone: 'error',
              title: 'Gagal Memperbarui Buku',
              description: 'Periksa kembali isian form Anda.',
            });
          },
        },
      );
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs transition-opacity"
        onClick={() => {
          if (!isSubmitting) onClose();
        }}
        aria-hidden="true"
      />

      {/* Drawer Container */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-heading"
        className={cn(
          'fixed z-50 flex flex-col bg-[var(--color-surface)] shadow-2xl transition-transform duration-200',
          // Mobile: Bottom Sheet
          'inset-x-0 bottom-0 max-h-[92vh] rounded-t-2xl border-t border-[var(--color-border)]',
          // Desktop: Side Drawer
          'sm:inset-y-0 sm:right-0 sm:left-auto sm:h-full sm:max-h-none sm:w-[460px] lg:w-[500px] sm:rounded-none sm:border-t-0 sm:border-l',
        )}
      >
        {/* Mobile drag handle */}
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-[var(--color-border-strong)] sm:hidden" />

        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-control)] bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
              {mode === 'create' ? (
                <BookPlus className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Pencil className="h-4 w-4" aria-hidden="true" />
              )}
            </span>
            <div>
              <h2 id="drawer-heading" className="text-base font-bold text-[var(--color-ink)]">
                {mode === 'create' ? 'Tambah Buku Perpustakaan' : 'Edit Buku Perpustakaan'}
              </h2>
              <p className="text-xs text-[var(--color-ink-muted)]">
                {mode === 'create'
                  ? 'Daftarkan koleksi buku fisik baru ke katalog UNTAD.'
                  : `Sunting metadata atau sesuaikan stok buku #${initialData?.id}.`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Tutup form buku"
            className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-control)] border border-[var(--color-border)] text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-ink)] disabled:opacity-50"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Drawer Form Body */}
        <form onSubmit={handleSubmit} noValidate className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 space-y-4 overflow-y-auto p-5">
            {/* General form alert banner */}
            {formError && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-[var(--radius-control)] border border-[var(--color-danger-border)] bg-[var(--color-danger-surface)] p-3 text-xs leading-relaxed text-[var(--color-danger)]"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <div className="flex-1">
                  <p className="font-semibold">Kesalahan Formulir</p>
                  <p className="mt-0.5">{formError}</p>
                </div>
              </div>
            )}

            {/* Judul Buku */}
            <Input
              label="Judul Buku *"
              placeholder="Contoh: Algoritma dan Pemrograman Modern"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              error={fieldErrors.title}
              disabled={isSubmitting}
              required
            />

            {/* Penulis Buku */}
            <Input
              label="Penulis *"
              placeholder="Contoh: Rinaldi Munir, Dr. Eng."
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              error={fieldErrors.author}
              disabled={isSubmitting}
              required
            />

            {/* Dua Kolom: ISBN & Tahun Terbit */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input
                label="ISBN (Opsional)"
                placeholder="Contoh: 978-602-1234-56-7"
                value={isbn}
                onChange={(e) => setIsbn(e.target.value)}
                error={fieldErrors.isbn}
                disabled={isSubmitting}
              />

              <Input
                type="number"
                label="Tahun Terbit (Opsional)"
                placeholder="Contoh: 2023"
                value={publishedYear}
                onChange={(e) => setPublishedYear(e.target.value)}
                error={fieldErrors.publishedYear}
                disabled={isSubmitting}
                min={1000}
                max={2100}
              />
            </div>

            {/* Kategori dengan Saran Preset Kampus UNTAD + Bebas Ketik */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="book-category" className="text-sm font-medium text-[var(--color-ink)]">
                Kategori (Opsional)
              </label>
              <input
                id="book-category"
                list="category-suggestions"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Pilih saran preset UNTAD atau ketik bebas..."
                disabled={isSubmitting}
                className={cn(
                  'min-h-[44px] sm:min-h-[40px] w-full rounded-[var(--radius-control)] border bg-[var(--color-surface)] px-3 py-2 text-base sm:text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-subtle)] transition-colors duration-150',
                  'focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20',
                  'disabled:cursor-not-allowed disabled:bg-[var(--color-surface-subtle)] disabled:text-[var(--color-ink-subtle)]',
                  fieldErrors.category
                    ? 'border-[var(--color-danger)] focus:border-[var(--color-danger)]'
                    : 'border-[var(--color-border)] hover:border-[var(--color-border-strong)]',
                )}
              />
              <datalist id="category-suggestions">
                {CATALOG_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat} />
                ))}
              </datalist>

              {/* Quick suggestion pills */}
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                <span className="text-[11px] font-medium text-[var(--color-ink-subtle)]">Saran:</span>
                {CATALOG_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    disabled={isSubmitting}
                    className={cn(
                      'rounded px-2 py-0.5 text-[11px] transition-colors',
                      category === cat
                        ? 'bg-[var(--color-primary)] font-semibold text-white'
                        : 'border border-[var(--color-border)] bg-[var(--color-surface-subtle)] text-[var(--color-ink-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]',
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              {fieldErrors.category && (
                <p className="text-xs font-medium text-[var(--color-danger)]" role="alert">
                  {fieldErrors.category}
                </p>
              )}
            </div>

            {/* Total Stok */}
            <div className="flex flex-col gap-1.5">
              <Input
                type="number"
                label={mode === 'create' ? 'Total Stok * (Minimal 1)' : 'Total Stok * (Minimal 0)'}
                placeholder="Jumlah total eksemplar"
                value={stockTotal}
                onChange={(e) => setStockTotal(e.target.value)}
                error={fieldErrors.stockTotal}
                disabled={isSubmitting}
                min={mode === 'create' ? 1 : 0}
                required
              />
              {mode === 'edit' && initialData && (
                <p className="text-[11px] text-[var(--color-ink-muted)]">
                  Stok tersedia saat ini:{' '}
                  <span className="font-mono font-semibold text-[var(--color-ink)] tabular-nums">
                    {initialData.stockAvailable}
                  </span>{' '}
                  / {initialData.stockTotal} eksemplar (
                  {initialData.stockTotal - initialData.stockAvailable} sedang dipinjam).
                </p>
              )}
            </div>

            {/* Deskripsi Buku */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="book-description" className="text-sm font-medium text-[var(--color-ink)]">
                Deskripsi Buku *
              </label>
              <textarea
                id="book-description"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tuliskan ringkasan sinopsis atau deskripsi buku..."
                disabled={isSubmitting}
                aria-invalid={fieldErrors.description ? 'true' : undefined}
                className={cn(
                  'w-full rounded-[var(--radius-control)] border bg-[var(--color-surface)] px-3 py-2 text-base sm:text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-subtle)] transition-colors duration-150',
                  'focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20',
                  'disabled:cursor-not-allowed disabled:bg-[var(--color-surface-subtle)] disabled:text-[var(--color-ink-subtle)]',
                  fieldErrors.description
                    ? 'border-[var(--color-danger)] focus:border-[var(--color-danger)]'
                    : 'border-[var(--color-border)] hover:border-[var(--color-border-strong)]',
                )}
                required
              />
              {fieldErrors.description && (
                <p className="text-xs font-medium text-[var(--color-danger)]" role="alert">
                  {fieldErrors.description}
                </p>
              )}
            </div>

            {/* URL Cover & Live Preview Rasio 2:3 */}
            <div className="space-y-2.5">
              <Input
                label="URL Sampul Buku (Opsional)"
                placeholder="https://contoh.untad.ac.id/cover.jpg"
                value={coverUrl}
                onChange={(e) => setCoverUrl(e.target.value)}
                error={fieldErrors.coverUrl}
                disabled={isSubmitting}
              />

              {/* Kompartemen Pratinjau Sampul 2:3 */}
              <div className="flex items-center gap-4 rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-surface-subtle)] p-3">
                <BookCover
                  src={coverUrl.trim() || null}
                  title={title || 'Pratinjau Sampul'}
                  category={category || 'UNTAD'}
                  size="md"
                  className="shrink-0 shadow-2xs"
                />
                <div className="min-w-0 flex-1 text-xs text-[var(--color-ink-muted)]">
                  <p className="flex items-center gap-1 font-semibold text-[var(--color-ink)]">
                    <Sparkles className="h-3.5 w-3.5 text-[var(--color-primary)]" aria-hidden="true" />
                    Pratinjau Sampul (2:3)
                  </p>
                  <p className="mt-1 leading-relaxed">
                    {coverUrl.trim()
                      ? 'Pratinjau visual langsung dari tautan gambar yang diisi.'
                      : 'URL sampul kosong. Sistem otomatis menampilkan sampul tipografis bernuansa akademis UNTAD.'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Drawer Actions Footer */}
          <div className="flex items-center justify-end gap-3 border-t border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-3.5">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
            >
              {mode === 'create' ? 'Tambah Buku' : 'Simpan Perubahan'}
            </Button>
          </div>
        </form>
      </aside>
    </>
  );
}
