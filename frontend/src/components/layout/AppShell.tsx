import type { ReactNode } from 'react';
import { Link, useRouterState } from '@tanstack/react-router';
import { BookOpen, LogIn, LogOut } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { cn } from '../../lib/cn';
import { MockRolePopover } from './MockRolePopover';
import { getVisibleNavItems, isNavItemActive } from './navigation';

const AUTH_ROUTES_WITHOUT_BOTTOM_NAV = ['/login', '/register'];

export function AppShell({ children }: { children: ReactNode }) {
  const { user, actor, logout } = useAuth();
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });

  const navItems = getVisibleNavItems(actor);
  const hideBottomNav = AUTH_ROUTES_WITHOUT_BOTTOM_NAV.includes(pathname);

  return (
    <div className="flex min-h-dvh flex-col bg-[var(--color-canvas)] text-[var(--color-ink)]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-[var(--radius-control)] focus:bg-[var(--color-surface)] focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-[var(--color-primary)] focus:shadow-md"
      >
        Langsung ke konten utama
      </a>

      <header className="sticky top-0 z-30 border-b border-white/15 bg-[var(--color-primary)] text-white">
        <div className="mx-auto grid h-14 max-w-6xl grid-cols-[auto_1fr_auto] items-center gap-4 px-4 sm:h-16 sm:px-6">
          <Link
            to="/"
            className="flex shrink-0 items-center gap-2.5 rounded-[var(--radius-control)] py-1 text-white focus-visible:outline-white"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-control)] border border-white/25 bg-white/10">
              <BookOpen className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="flex flex-col leading-none">
              <span className="text-base font-bold tracking-tight">JejakBaca</span>
              <span className="hidden text-[11px] font-medium text-white/80 sm:block">
                Perpustakaan UNTAD
              </span>
            </span>
          </Link>

          <nav
            aria-label="Navigasi utama"
            className="hidden min-w-0 items-center justify-center gap-1 lg:flex"
          >
            {navItems.map((item, index) => {
              const active = isNavItemActive(item, pathname);
              return (
                <div key={item.id} className="flex items-center">
                  {index > 0 && (
                    <span
                      aria-hidden="true"
                      className="mx-1.5 select-none text-white/40"
                    >
                      ·
                    </span>
                  )}
                  <Link
                    to={item.to}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'inline-flex min-h-[34px] items-center rounded-[var(--radius-control)] px-2.5 py-1 text-xs font-semibold tracking-wide whitespace-nowrap uppercase transition-colors duration-150 focus-visible:outline-white',
                      active
                        ? 'bg-white text-[var(--color-primary)]'
                        : 'text-white/90 hover:bg-white/15 hover:text-white',
                    )}
                  >
                    <span>{item.label}</span>
                  </Link>
                </div>
              );
            })}
          </nav>

          <div className="flex shrink-0 items-center justify-end gap-2">
            <MockRolePopover />

            {user ? (
              <div className="flex items-center gap-2">
                <div className="hidden text-right leading-tight sm:block">
                  <p className="max-w-[140px] truncate text-xs font-semibold text-white">
                    {user.name}
                  </p>
                  <p className="font-mono text-[11px] text-white/80 tabular-nums">
                    {user.role === 'admin' ? 'Admin' : user.nim ?? user.email}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={logout}
                  aria-label="Keluar dari akun"
                  className="inline-flex min-h-[36px] items-center gap-1.5 rounded-[var(--radius-control)] border border-white/25 bg-white/10 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-white/20 focus-visible:outline-white"
                >
                  <LogOut className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>Keluar</span>
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="inline-flex min-h-[36px] items-center gap-1.5 rounded-[var(--radius-control)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--color-primary)] transition-colors hover:bg-white/90 focus-visible:outline-white"
              >
                <LogIn className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>Masuk</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      <main
        id="main-content"
        className={cn('flex-1', hideBottomNav ? 'pb-8' : 'pb-20 lg:pb-10')}
      >
        {children}
      </main>

      {!hideBottomNav && (
        <nav
          aria-label="Navigasi seluler"
          className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--color-border)] bg-[var(--color-surface)] pb-[env(safe-area-inset-bottom)] lg:hidden"
        >
          <div
            className={cn(
              'grid',
              navItems.length === 3 ? 'grid-cols-3' : 'grid-cols-4',
            )}
          >
            {navItems.map((item) => {
              const active = isNavItemActive(item, pathname);
              const Icon = item.icon;
              return (
                <Link
                  key={item.id}
                  to={item.to}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'relative flex min-h-[56px] flex-col items-center justify-center gap-1 px-1 py-1.5 text-[11px] leading-tight transition-colors',
                    active
                      ? 'font-semibold text-[var(--color-primary)]'
                      : 'font-medium text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]',
                  )}
                >
                  {active && (
                    <span
                      aria-hidden="true"
                      className="absolute inset-x-3 top-0 h-0.5 bg-[var(--color-primary)]"
                    />
                  )}
                  <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                  <span className="max-w-full truncate">{item.mobileLabel}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
