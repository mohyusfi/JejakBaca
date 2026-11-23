import { Skeleton } from '../ui/Skeleton';

export interface ReadlistSkeletonProps {
  count?: number;
}

export function ReadlistSkeleton({ count = 4 }: ReadlistSkeletonProps) {
  return (
    <div
      role="status"
      aria-label="Memuat daftar Readlist"
      className="space-y-3"
    >
      {Array.from({ length: count }, (_, idx) => (
        <div
          key={`readlist-skel-${idx}`}
          className="flex items-start gap-4 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
        >
          <Skeleton className="h-28 w-20 shrink-0 rounded-[var(--radius-cover)]" />
          <div className="flex-1 space-y-2.5 pt-1">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3.5 w-1/3" />
            <Skeleton className="h-3 w-1/4 pt-2" />
          </div>
        </div>
      ))}
    </div>
  );
}
