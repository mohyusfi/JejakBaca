import { cn } from '../../lib/cn';
import { getStockSummary } from '../../lib/format';
import type { LibraryBook } from '../../types/domain';
import { BookCover } from '../ui/BookCover';
import { StatusBadge } from '../ui/StatusBadge';

interface AdminBooksTableProps {
  books: LibraryBook[];
}

function StockVisualScale({
  stockAvailable,
  stockTotal,
}: {
  stockAvailable: number;
  stockTotal: number;
}) {
  const ratio = stockTotal > 0 ? Math.min(1, Math.max(0, stockAvailable / stockTotal)) : 0;
  const percent = Math.round(ratio * 100);
  const stockSummary = getStockSummary(stockAvailable, stockTotal);
  const badgeTone =
    stockSummary.health === 'empty'
      ? 'critical'
      : stockSummary.health === 'low'
        ? 'low'
        : 'available';

  const barToneClass =
    badgeTone === 'critical'
      ? 'bg-[var(--color-danger)]'
      : badgeTone === 'low'
        ? 'bg-[var(--color-warning)]'
        : 'bg-[var(--color-success)]';

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-xs font-semibold tabular-nums text-[var(--color-ink)]">
          {stockAvailable} / {stockTotal}
        </span>
        <StatusBadge tone={badgeTone}>{stockSummary.label}</StatusBadge>
      </div>
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-surface-subtle)]"
        role="progressbar"
        aria-label={`Proporsi stok tersedia ${stockAvailable} dari ${stockTotal}`}
        aria-valuemin={0}
        aria-valuemax={stockTotal}
        aria-valuenow={stockAvailable}
      >
        <div
          className={cn('h-full rounded-full transition-all', barToneClass)}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

export function AdminBooksTable({ books }: AdminBooksTableProps) {
  return (
    <div>
      {/* Desktop Table */}
      <div className="hidden overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] md:block">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-subtle)] text-xs font-semibold tracking-wide text-[var(--color-ink-muted)]">
                <th scope="col" className="px-4 py-3">
                  Buku
                </th>
                <th scope="col" className="px-4 py-3">
                  Kategori
                </th>
                <th scope="col" className="w-64 px-4 py-3">
                  Stok (Tersedia / Total)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {books.map((book) => (
                <tr
                  key={book.id}
                  className="transition-colors hover:bg-[var(--color-surface-subtle)]/60"
                >
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <BookCover
                        title={book.title}
                        src={book.coverUrl}
                        size="sm"
                        className="shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-[var(--color-ink)]">
                          {book.title}
                        </p>
                        <p className="truncate text-xs text-[var(--color-ink-muted)]">
                          {book.author}
                          {book.publishedYear ? ` • ${book.publishedYear}` : ''}
                          {book.isbn ? ` • ISBN ${book.isbn}` : ''}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-xs font-medium text-[var(--color-ink-muted)]">
                    {book.category ?? 'Umum'}
                  </td>
                  <td className="px-4 py-3.5">
                    <StockVisualScale
                      stockAvailable={book.stockAvailable}
                      stockTotal={book.stockTotal}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="grid gap-3 md:hidden">
        {books.map((book) => (
          <article
            key={book.id}
            className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
          >
            <div className="flex gap-3">
              <BookCover
                title={book.title}
                src={book.coverUrl}
                size="sm"
                className="shrink-0"
              />
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-bold text-[var(--color-ink)]">{book.title}</h3>
                <p className="mt-0.5 text-xs text-[var(--color-ink-muted)]">{book.author}</p>
                <p className="mt-1 text-xs text-[var(--color-ink-muted)]">
                  {book.category ?? 'Umum'}
                  {book.publishedYear ? ` • ${book.publishedYear}` : ''}
                </p>
              </div>
            </div>
            <div className="mt-3 border-t border-[var(--color-border)] pt-3">
              <StockVisualScale
                stockAvailable={book.stockAvailable}
                stockTotal={book.stockTotal}
              />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
