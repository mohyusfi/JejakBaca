import { useEffect, useRef, useState } from 'react';
import { ChevronDown, FlaskConical, RotateCcw } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { cn } from '../../lib/cn';
import { isMockModeEnabled } from '../../lib/env';
import type { ActorState } from '../../types/domain';

const ROLE_OPTIONS: Array<{ value: ActorState; label: string; hint: string }> = [
  { value: 'guest', label: 'Tamu', hint: 'Akses publik read-only' },
  { value: 'user', label: 'User (Andi)', hint: 'NIM F55122001' },
  { value: 'admin', label: 'Admin', hint: 'Petugas Perpustakaan' },
];

export function MockRolePopover() {
  const { actor, switchMockRole, resetMockData } = useAuth();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  if (!isMockModeEnabled()) {
    return null;
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="inline-flex min-h-[32px] items-center gap-1.5 rounded-full border border-white/35 bg-white/15 px-2.5 py-1 text-xs font-semibold text-white transition-colors hover:bg-white/25"
      >
        <FlaskConical className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>Mode Mock</span>
        <ChevronDown className="h-3 w-3 shrink-0 opacity-85" aria-hidden="true" />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Simulasi peran Mode Mock"
          className="absolute right-0 z-50 mt-2 w-60 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-2 text-[var(--color-ink)] shadow-lg"
        >
          <div className="border-b border-[var(--color-border)] px-2 pb-1.5">
            <p className="text-xs font-bold text-[var(--color-ink)]">
              Simulasi Peran Mock
            </p>
            <p className="text-[11px] text-[var(--color-ink-muted)]">
              Uji navigasi & data seed lokal
            </p>
          </div>
          <div className="mt-1.5 flex flex-col gap-1">
            {ROLE_OPTIONS.map((option) => {
              const isSelected = actor === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="menuitemradio"
                  aria-checked={isSelected}
                  onClick={() => {
                    void switchMockRole(option.value);
                    setOpen(false);
                  }}
                  className={cn(
                    'flex w-full items-center justify-between rounded-[4px] px-2.5 py-1.5 text-left text-xs transition-colors',
                    isSelected
                      ? 'bg-[var(--color-primary-soft)] font-semibold text-[var(--color-primary)]'
                      : 'text-[var(--color-ink)] hover:bg-[var(--color-surface-subtle)]',
                  )}
                >
                  <span>{option.label}</span>
                  <span className="font-mono text-[11px] text-[var(--color-ink-muted)]">
                    {option.hint}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="mt-1.5 border-t border-[var(--color-border)] pt-1.5">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                void resetMockData();
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 rounded-[4px] px-2.5 py-1.5 text-xs font-medium text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-ink)]"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Reset Seed Mock</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
