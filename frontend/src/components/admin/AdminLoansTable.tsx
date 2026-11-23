import { cn } from '../../lib/cn';
import { formatDateId, formatLoanDueLabel } from '../../lib/format';
import type { AdminLoanItem } from '../../types/domain';
import { BookCover } from '../ui/BookCover';
import { StatusBadge } from '../ui/StatusBadge';

interface AdminLoansTableProps {
  loans: AdminLoanItem[];
}

function getLoanStatusBadge(loan: AdminLoanItem) {
  if (loan.status === 'returned') {
    return <StatusBadge tone="available">Dikembalikan</StatusBadge>;
  }
  if (loan.isOverdue) {
    return <StatusBadge tone="critical">Terlambat</StatusBadge>;
  }
  return <StatusBadge tone="info">Dipinjam</StatusBadge>;
}

export function AdminLoansTable({ loans }: AdminLoansTableProps) {
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
                  Peminjam
                </th>
                <th scope="col" className="px-4 py-3">
                  Tanggal
                </th>
                <th scope="col" className="px-4 py-3">
                  Status &amp; Tenggat
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {loans.map((loan) => {
                const overdue = loan.status !== 'returned' && loan.isOverdue;
                return (
                  <tr
                    key={loan.id}
                    className={cn(
                      'transition-colors hover:bg-[var(--color-surface-subtle)]/60',
                      overdue && 'bg-[var(--color-danger-surface)]/40',
                    )}
                  >
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <BookCover
                          title={loan.bookTitle}
                          src={loan.bookCoverUrl}
                          size="sm"
                          className="shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-[var(--color-ink)]">
                            {loan.bookTitle}
                          </p>
                          <p className="truncate text-xs text-[var(--color-ink-muted)]">
                            {loan.bookAuthor}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="min-w-0 space-y-0.5">
                        <p className="truncate font-semibold text-[var(--color-ink)]">
                          {loan.borrower.name}
                        </p>
                        <p className="font-mono text-xs font-medium text-[var(--color-ink)] tabular-nums">
                          {loan.borrower.nim ?? '-'}
                        </p>
                        <p className="truncate text-xs text-[var(--color-ink-muted)]">
                          {loan.borrower.email}
                        </p>
                      </div>
                    </td>

                    <td className="px-4 py-3.5 text-xs text-[var(--color-ink-muted)] tabular-nums">
                      <div className="space-y-1">
                        <p>
                          <span className="text-[var(--color-ink-subtle)]">Pinjam:</span>{' '}
                          <span className="font-medium text-[var(--color-ink)]">
                            {formatDateId(loan.borrowedAt)}
                          </span>
                        </p>
                        <p>
                          <span className="text-[var(--color-ink-subtle)]">Jatuh tempo:</span>{' '}
                          <span
                            className={cn(
                              'font-medium',
                              overdue ? 'text-[var(--color-danger)]' : 'text-[var(--color-ink)]',
                            )}
                          >
                            {formatDateId(loan.dueDate)}
                          </span>
                        </p>
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="flex flex-col items-start gap-1">
                        {getLoanStatusBadge(loan)}
                        <span
                          className={cn(
                            'text-xs font-medium tabular-nums',
                            overdue ? 'text-[var(--color-danger)]' : 'text-[var(--color-ink-muted)]',
                          )}
                        >
                          {formatLoanDueLabel(loan)}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="grid gap-3 md:hidden">
        {loans.map((loan) => {
          const overdue = loan.status !== 'returned' && loan.isOverdue;
          return (
            <article
              key={loan.id}
              className={cn(
                'rounded-[var(--radius-card)] border bg-[var(--color-surface)] p-4',
                overdue
                  ? 'border-[var(--color-danger-border)] bg-[var(--color-danger-surface)]/30'
                  : 'border-[var(--color-border)]',
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 gap-3">
                  <BookCover
                    title={loan.bookTitle}
                    src={loan.bookCoverUrl}
                    size="sm"
                    className="shrink-0"
                  />
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-[var(--color-ink)]">{loan.bookTitle}</h3>
                    <p className="mt-0.5 text-xs text-[var(--color-ink-muted)]">
                      {loan.bookAuthor}
                    </p>
                  </div>
                </div>
                {getLoanStatusBadge(loan)}
              </div>

              <div className="mt-3 grid gap-2 border-t border-[var(--color-border)] pt-3 text-xs">
                <div>
                  <p className="font-semibold text-[var(--color-ink)]">{loan.borrower.name}</p>
                  <p className="font-mono font-medium text-[var(--color-ink)] tabular-nums">
                    {loan.borrower.nim ?? '-'}
                  </p>
                  <p className="truncate text-[var(--color-ink-muted)]">{loan.borrower.email}</p>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--color-border)] pt-2 text-[var(--color-ink-muted)] tabular-nums">
                  <span>Pinjam: {formatDateId(loan.borrowedAt)}</span>
                  <span>Tempo: {formatDateId(loan.dueDate)}</span>
                </div>

                <p
                  className={cn(
                    'font-medium tabular-nums',
                    overdue ? 'text-[var(--color-danger)]' : 'text-[var(--color-ink-muted)]',
                  )}
                >
                  {formatLoanDueLabel(loan)}
                </p>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
