import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

export interface ZoneHeaderProps {
  kicker: string;
  title: string;
  description: string;
  rightSlot?: ReactNode;
  bottomSlot?: ReactNode;
  className?: string;
}

export function ZoneHeader({
  kicker,
  title,
  description,
  rightSlot,
  bottomSlot,
  className,
}: ZoneHeaderProps) {
  return (
    <section
      aria-label={title}
      className={cn(
        'border-t border-white/20 bg-[var(--color-primary)] text-white',
        className,
      )}
    >
      <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6 sm:py-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="font-mono text-[11px] font-semibold tracking-wider text-white/80 uppercase">
              {kicker}
            </p>
            <h1 className="mt-0.5 text-xl font-bold tracking-tight text-white sm:text-2xl">
              {title}
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-white/85">
              {description}
            </p>
          </div>
          {rightSlot && <div className="shrink-0">{rightSlot}</div>}
        </div>
        {bottomSlot && (
          <div className="mt-4 border-t border-white/20 pt-3">{bottomSlot}</div>
        )}
      </div>
    </section>
  );
}
