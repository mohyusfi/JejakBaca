import { BookCompartmentSkeleton } from '../ui/Skeleton';

export interface CatalogSkeletonProps {
  count?: number;
}

export function CatalogSkeleton({ count = 5 }: CatalogSkeletonProps) {
  return (
    <div
      role="status"
      aria-label="Memuat Katalog Perpustakaan"
      className="space-y-3"
    >
      {Array.from({ length: count }, (_, idx) => (
        <BookCompartmentSkeleton key={idx} />
      ))}
    </div>
  );
}
