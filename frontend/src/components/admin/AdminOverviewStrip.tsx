import { AlertTriangle, BookOpen, Clock, Layers, RefreshCw } from 'lucide-react';
import { useAdminOverview } from '../../hooks/useAdminOverview';
import { cn } from '../../lib/cn';
import { Button } from '../ui/Button';
import { Skeleton } from '../ui/Skeleton';

interface MetricCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  danger?: boolean;
  testId?: string;
}

function MetricCard({ label, value, icon, danger = false, testId }: MetricCardProps) {
  return (
    <div
      data-testid={testId}
      className={cn(
        'rounded-[var(--radius-card)] border px-4 py-3.5 transition-colors',
        danger
          ? 'border-[var(--color-danger-border)] bg-[var(--color-danger-surface)]'
          : 'border-[var(--color-border)] bg-[var(--color-surface)]',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={cn(
            'text-xs font-semibold tracking-wide',
            danger ? 'text-[var(--color-danger)]' : 'text-[var(--color-ink-muted)]',
          )}
        >
          {label}
        </span>
        <span
          className={cn(
            'inline-flex h-7 w-7 items-center justify-center rounded-[var(--radius-control)]',
            danger
              ? 'bg-white/80 text-[var(--color-danger)]'
              : 'bg-[var(--color-surface-subtle)] text-[var(--color-ink-muted)]',
          )}
          aria-hidden="true"
        >
          {icon}
        </span>
      </div>
      <p
        className={cn(
          'mt-2 font-mono text-2xl font-bold tabular-nums',
          danger ? 'text-[var(--color-danger)]' : 'text-[var(--color-ink)]',
        )}
      >
        {value}
      </p>
    </div>
  );
}

export function AdminOverviewSkeleton() {
  return (
    <div
      aria-label="Memuat ringkasan statistik admin"
      className="grid grid-cols-2 gap-3 lg:grid-cols-4"
    >
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3.5"
        >
          <div className="flex items-center justify-between gap-2">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-7 w-7 rounded-[var(--radius-control)]" />
          </div>
          <Skeleton className="mt-2.5 h-7 w-14" />
        </div>
      ))}
    </div>
  );
}

export function AdminOverviewStrip() {
  const { data, isLoading, isError, refetch } = useAdminOverview();

  if (isLoading) {
    return <AdminOverviewSkeleton />;
  }

  if (isError || !data) {
    return (
      <div
        role="alert"
        className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-card)] border border-[var(--color-danger-border)] bg-[var(--color-danger-surface)] px-4 py-3 text-sm text-[var(--color-danger)]"
      >
        <span>Gagal memuat ringkasan statistik perpustakaan.</span>
        <Button type="button" variant="secondary" size="sm" onClick={() => void refetch()}>
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
          Muat Ulang
        </Button>
      </div>
    );
  }

  const hasOverdue = data.overdueLoansCount > 0;

  return (
    <section aria-label="Ringkasan Statistik Admin" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <MetricCard
        label="Total Judul"
        value={data.totalBooks}
        icon={<BookOpen className="h-4 w-4" />}
        testId="admin-metric-total-books"
      />
      <MetricCard
        label="Stok Menipis"
        value={data.lowStockBooksCount}
        icon={<Layers className="h-4 w-4" />}
        testId="admin-metric-low-stock"
      />
      <MetricCard
        label="Peminjaman Aktif"
        value={data.activeLoansCount}
        icon={<Clock className="h-4 w-4" />}
        testId="admin-metric-active-loans"
      />
      <MetricCard
        label="Terlambat"
        value={data.overdueLoansCount}
        icon={<AlertTriangle className="h-4 w-4" />}
        danger={hasOverdue}
        testId="admin-metric-overdue-loans"
      />
    </section>
  );
}
