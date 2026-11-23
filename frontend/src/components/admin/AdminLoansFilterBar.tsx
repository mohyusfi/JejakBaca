import { useEffect, useRef, useState, type FormEvent } from 'react';
import { RotateCcw } from 'lucide-react';
import { cn } from '../../lib/cn';
import type { LoanStatusFilter } from '../../types/domain';
import { Button } from '../ui/Button';
import { SearchInput } from '../ui/Input';

interface AdminLoansFilterBarProps {
  status: LoanStatusFilter;
  q: string;
  limit: number;
  hasActiveFilters: boolean;
  onStatusChange: (nextStatus: LoanStatusFilter) => void;
  onQueryChange: (nextQ: string) => void;
  onLimitChange: (nextLimit: number) => void;
  onResetFilters: () => void;
}

const STATUS_TABS: Array<{ id: LoanStatusFilter; label: string }> = [
  { id: 'borrowed', label: 'Dipinjam' },
  { id: 'overdue', label: 'Terlambat' },
  { id: 'returned', label: 'Dikembalikan' },
  { id: 'all', label: 'Semua' },
];

export function AdminLoansFilterBar({
  status,
  q,
  limit,
  hasActiveFilters,
  onStatusChange,
  onQueryChange,
  onLimitChange,
  onResetFilters,
}: AdminLoansFilterBarProps) {
  const [draftQuery, setDraftQuery] = useState(q);
  const [prevQ, setPrevQ] = useState(q);
  const debounceTimerRef = useRef<number | null>(null);

  if (prevQ !== q) {
    setPrevQ(q);
    setDraftQuery(q);
  }

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current !== null) {
        window.clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const clearPendingDebounce = () => {
    if (debounceTimerRef.current !== null) {
      window.clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
  };

  const handleInputChange = (nextValue: string) => {
    setDraftQuery(nextValue);
    clearPendingDebounce();
    debounceTimerRef.current = window.setTimeout(() => {
      const normalized = nextValue.trim();
      if (normalized !== q) {
        onQueryChange(normalized);
      }
    }, 300);
  };

  const handleClearSearch = () => {
    clearPendingDebounce();
    setDraftQuery('');
    if (q !== '') {
      onQueryChange('');
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    clearPendingDebounce();
    const normalized = draftQuery.trim();
    if (normalized !== q) {
      onQueryChange(normalized);
    }
  };

  return (
    <section
      aria-label="Filter Peminjaman Mahasiswa"
      className="space-y-3 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 sm:p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border)] pb-3">
        <div role="tablist" aria-label="Filter status peminjaman" className="flex flex-wrap gap-1.5">
          {STATUS_TABS.map((tab) => {
            const active = status === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onStatusChange(tab.id)}
                className={cn(
                  'inline-flex min-h-[36px] items-center rounded-[var(--radius-control)] border px-3 py-1.5 text-xs font-semibold transition-colors',
                  active
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-primary)]'
                    : 'border-[var(--color-border)] bg-[var(--color-surface-subtle)] text-[var(--color-ink-muted)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-ink)]',
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="admin-loans-limit" className="sr-only">
            Baris per halaman
          </label>
          <select
            id="admin-loans-limit"
            aria-label="Baris per halaman"
            value={String(limit)}
            onChange={(event) => onLimitChange(Number(event.target.value))}
            className="min-h-[36px] rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1.5 text-xs font-medium text-[var(--color-ink)] transition-colors hover:border-[var(--color-border-strong)] focus:border-[var(--color-primary)] focus:outline-none"
          >
            <option value="10">10 baris</option>
            <option value="20">20 baris</option>
            <option value="50">50 baris</option>
          </select>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-2.5">
        <SearchInput
          id="admin-loans-search-input"
          aria-label="Cari judul buku, nama mahasiswa, atau NIM"
          placeholder="Cari judul buku, nama mahasiswa, atau NIM..."
          value={draftQuery}
          onChange={(event) => handleInputChange(event.target.value)}
          onClear={handleClearSearch}
          containerClassName="min-w-[220px] flex-1"
        />

        {hasActiveFilters && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              clearPendingDebounce();
              setDraftQuery('');
              onResetFilters();
            }}
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            Reset
          </Button>
        )}
      </form>
    </section>
  );
}
