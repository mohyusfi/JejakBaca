import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

export type StatusTone = 'available' | 'low' | 'critical' | 'info' | 'neutral';

export interface StatusBadgeProps {
  tone?: StatusTone;
  icon?: ReactNode;
  showDot?: boolean;
  children: ReactNode;
  className?: string;
}

const TONE_CLASSES: Record<StatusTone, string> = {
  available:
    'bg-[var(--color-status-available-bg)] text-[var(--color-status-available-ink)] border-[var(--color-status-available-border)]',
  low: 'bg-[var(--color-status-low-bg)] text-[var(--color-status-low-ink)] border-[var(--color-status-low-border)]',
  critical:
    'bg-[var(--color-status-critical-bg)] text-[var(--color-status-critical-ink)] border-[var(--color-status-critical-border)]',
  info: 'bg-[var(--color-primary-soft)] text-[var(--color-primary)] border-[var(--color-primary-border)]',
  neutral:
    'bg-[var(--color-surface-subtle)] text-[var(--color-ink-muted)] border-[var(--color-border)]',
};

const DOT_CLASSES: Record<StatusTone, string> = {
  available: 'bg-[var(--color-status-available-ink)]',
  low: 'bg-[var(--color-status-low-ink)]',
  critical: 'bg-[var(--color-status-critical-ink)]',
  info: 'bg-[var(--color-primary)]',
  neutral: 'bg-[var(--color-ink-subtle)]',
};

export function StatusBadge({
  tone = 'neutral',
  icon,
  showDot = true,
  children,
  className,
}: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap',
        TONE_CLASSES[tone],
        className,
      )}
    >
      {icon ? (
        <span className="shrink-0" aria-hidden="true">
          {icon}
        </span>
      ) : showDot ? (
        <span
          className={cn('h-1.5 w-1.5 shrink-0 rounded-full', DOT_CLASSES[tone])}
          aria-hidden="true"
        />
      ) : null}
      <span>{children}</span>
    </span>
  );
}
