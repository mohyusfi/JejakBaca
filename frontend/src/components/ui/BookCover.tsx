import { useState } from 'react';
import { cn } from '../../lib/cn';

export interface BookCoverProps {
  src?: string | null;
  title: string;
  category?: string | null;
  code?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<BookCoverProps['size']>, string> = {
  sm: 'w-14',
  md: 'w-20',
  lg: 'w-28',
};

function buildCategoryCode(category?: string | null, code?: string | null): string {
  if (code) return code.slice(0, 8);
  if (!category) return 'UNTAD';
  const words = category.trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 4).toUpperCase();
  return words
    .slice(0, 3)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase();
}

export function BookCover({
  src,
  title,
  category,
  code,
  size = 'md',
  className,
}: BookCoverProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const hasError = Boolean(src && failedSrc === src);
  const showImage = Boolean(src && !hasError);
  const shortTag = buildCategoryCode(category, code);

  return (
    <div
      className={cn(
        'relative aspect-[2/3] shrink-0 overflow-hidden rounded-[var(--radius-cover)] border border-[var(--color-border)] bg-[var(--color-surface-subtle)]',
        SIZE_CLASSES[size],
        className,
      )}
    >
      {showImage ? (
        <img
          src={src ?? undefined}
          alt={`Sampul buku ${title}`}
          loading="lazy"
          onError={() => setFailedSrc(src ?? null)}
          className="h-full w-full object-cover"
        />
      ) : (
        <div
          aria-label={`Sampul tipografis ${title}`}
          className="flex h-full w-full flex-col justify-between bg-[var(--color-surface-subtle)] p-2"
        >
          <span className="block truncate font-mono text-[9px] font-medium tracking-wider text-[var(--color-ink-subtle)] uppercase">
            {shortTag}
          </span>
          <p className="line-clamp-3 text-[11px] leading-snug font-medium text-[var(--color-ink-muted)]">
            {title}
          </p>
        </div>
      )}
    </div>
  );
}
