import type { ReactNode } from 'react';
import { Navigate, useRouterState } from '@tanstack/react-router';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export function UserRouteGuard({ children }: { children: ReactNode }) {
  const { actor, isHydrating } = useAuth();
  const pathname = useRouterState({
    select: (s) => s.location.pathname,
  });

  if (isHydrating) {
    return (
      <div
        role="status"
        aria-label="Memverifikasi sesi pengguna"
        className="flex min-h-[360px] flex-col items-center justify-center gap-3 p-8 text-center"
      >
        <Loader2 className="h-6 w-6 animate-spin text-[var(--color-primary)]" />
        <p className="text-sm font-medium text-[var(--color-ink-subtle)]">
          Memverifikasi sesi pengguna...
        </p>
      </div>
    );
  }

  if (actor === 'guest') {
    if (pathname === '/login') {
      return null;
    }
    return <Navigate to="/login" search={{ redirect: pathname }} replace />;
  }

  if (actor === 'admin') {
    if (pathname === '/admin/books') {
      return null;
    }
    return <Navigate to="/admin/books" replace />;
  }

  return <>{children}</>;
}

export function AdminRouteGuard({ children }: { children: ReactNode }) {
  const { actor, isHydrating } = useAuth();
  const pathname = useRouterState({
    select: (s) => s.location.pathname,
  });

  if (isHydrating) {
    return (
      <div
        role="status"
        aria-label="Memverifikasi sesi admin"
        className="flex min-h-[360px] flex-col items-center justify-center gap-3 p-8 text-center"
      >
        <Loader2 className="h-6 w-6 animate-spin text-[var(--color-primary)]" />
        <p className="text-sm font-medium text-[var(--color-ink-subtle)]">
          Memverifikasi hak akses admin...
        </p>
      </div>
    );
  }

  if (actor === 'guest') {
    if (pathname === '/login') {
      return null;
    }
    return <Navigate to="/login" search={{ redirect: pathname }} replace />;
  }

  if (actor === 'user') {
    if (pathname === '/') {
      return null;
    }
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
