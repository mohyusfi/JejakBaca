import { cn } from '../../lib/cn';

export interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'animate-pulse rounded-[4px] bg-[#e2e5e9]',
        className,
      )}
    />
  );
}

export function BookCompartmentSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="flex gap-3.5 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
    >
      <Skeleton className="h-24 w-16 shrink-0 rounded-[var(--radius-cover)]" />
      <div className="flex min-w-0 flex-1 flex-col justify-between gap-2">
        <div className="space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3.5 w-1/2" />
        </div>
        <div className="flex items-center justify-between gap-2 pt-1">
          <Skeleton className="h-5 w-24 rounded-full" />
          <Skeleton className="h-8 w-20 rounded-[var(--radius-control)]" />
        </div>
      </div>
    </div>
  );
}
