import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { StatusBadge } from '../ui/StatusBadge';
import { ZoneHeader } from './ZoneHeader';

export interface RoutePlaceholderProps {
  kicker: string;
  title: string;
  description: string;
  issueRef: string;
  summary: string;
  rightSlot?: ReactNode;
  bottomSlot?: ReactNode;
  action?: {
    label: string;
    to: '/' | '/public-books' | '/loans' | '/readlist' | '/login' | '/register' | '/admin/books' | '/admin/loans';
  };
}

export function RoutePlaceholder({
  kicker,
  title,
  description,
  issueRef,
  summary,
  rightSlot,
  bottomSlot,
  action,
}: RoutePlaceholderProps) {
  return (
    <div>
      <ZoneHeader
        kicker={kicker}
        title={title}
        description={description}
        rightSlot={rightSlot}
        bottomSlot={bottomSlot}
      />

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <section className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border)] pb-3">
            <h2 className="text-base font-bold text-[var(--color-ink)]">
              Fondasi Rute Siap
            </h2>
            <StatusBadge tone="info">{issueRef}</StatusBadge>
          </div>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--color-ink-muted)]">
            {summary}
          </p>
          {action && (
            <div className="mt-4">
              <Link
                to={action.to}
                className="inline-flex min-h-[40px] items-center rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-4 py-2 text-sm font-semibold text-[var(--color-primary)] transition-colors hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-soft)]"
              >
                {action.label}
              </Link>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
