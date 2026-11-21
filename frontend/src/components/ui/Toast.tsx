import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';
import {
  ToastContext,
  type ToastInput,
  type ToastTone,
} from '../../hooks/useToast';
import { cn } from '../../lib/cn';

interface ToastRecord extends ToastInput {
  id: string;
  tone: ToastTone;
}

const TONE_BORDER: Record<ToastTone, string> = {
  info: 'border-l-4 border-l-[var(--color-primary)]',
  success: 'border-l-4 border-l-[var(--color-status-available-ink)]',
  warning: 'border-l-4 border-l-[var(--color-status-low-ink)]',
  error: 'border-l-4 border-l-[var(--color-danger)]',
};

function ToastIcon({ tone }: { tone: ToastTone }) {
  if (tone === 'success') {
    return (
      <CheckCircle2
        className="h-4 w-4 shrink-0 text-[var(--color-status-available-ink)]"
        aria-hidden="true"
      />
    );
  }
  if (tone === 'warning') {
    return (
      <TriangleAlert
        className="h-4 w-4 shrink-0 text-[var(--color-status-low-ink)]"
        aria-hidden="true"
      />
    );
  }
  if (tone === 'error') {
    return (
      <AlertCircle
        className="h-4 w-4 shrink-0 text-[var(--color-danger)]"
        aria-hidden="true"
      />
    );
  }
  return (
    <Info
      className="h-4 w-4 shrink-0 text-[var(--color-primary)]"
      aria-hidden="true"
    />
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (input: ToastInput) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const tone = input.tone ?? 'info';
      const durationMs = input.durationMs ?? 4500;

      setToasts((prev) => [...prev.slice(-3), { ...input, id, tone }]);

      if (durationMs > 0) {
        window.setTimeout(() => {
          dismissToast(id);
        }, durationMs);
      }
    },
    [dismissToast],
  );

  const value = useMemo(
    () => ({ showToast, dismissToast }),
    [showToast, dismissToast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-label="Notifikasi sistem"
        className="pointer-events-none fixed right-4 bottom-20 left-4 z-50 flex flex-col gap-2 sm:top-20 sm:right-4 sm:bottom-auto sm:left-auto sm:w-96"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role={toast.tone === 'error' ? 'alert' : 'status'}
            className={cn(
              'pointer-events-auto flex items-start gap-3 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5 shadow-md',
              TONE_BORDER[toast.tone],
            )}
          >
            <div className="pt-0.5">
              <ToastIcon tone={toast.tone} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-[var(--color-ink)]">
                {toast.title}
              </p>
              {toast.description && (
                <p className="mt-0.5 text-xs text-[var(--color-ink-muted)]">
                  {toast.description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              aria-label="Tutup notifikasi"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[4px] text-[var(--color-ink-subtle)] hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-ink)]"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
