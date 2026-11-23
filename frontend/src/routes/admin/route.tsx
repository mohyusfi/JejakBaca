import { createFileRoute, Link, Outlet, useRouterState } from '@tanstack/react-router';
import { AdminOverviewStrip } from '../../components/admin/AdminOverviewStrip';
import { AdminRouteGuard } from '../../components/layout/RouteGuard';
import { ZoneHeader } from '../../components/layout/ZoneHeader';
import { cn } from '../../lib/cn';

export const Route = createFileRoute('/admin')({
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <AdminRouteGuard>
      <AdminLayoutContent />
    </AdminRouteGuard>
  );
}

function AdminLayoutContent() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });

  const subTabs = [
    { label: 'Kelola Koleksi', to: '/admin/books' as const },
    { label: 'Pantau Peminjaman', to: '/admin/loans' as const },
  ];

  return (
    <div>
      <ZoneHeader
        kicker="Operasional Petugas"
        title="Workspace Admin"
        description="Kelola data koleksi Buku Perpustakaan UNTAD dan pantau seluruh peminjaman aktif maupun Terlambat beserta NIM peminjam."
      />

      <div className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <nav
          aria-label="Sub-navigasi Workspace Admin"
          className="mx-auto flex max-w-6xl gap-6 px-4 sm:px-6"
        >
          {subTabs.map((tab) => {
            const active = pathname === tab.to || pathname.startsWith(`${tab.to}/`);
            return (
              <Link
                key={tab.to}
                to={tab.to}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'inline-flex min-h-[44px] items-center border-b-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]',
                  active
                    ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                    : 'border-transparent text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]',
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
        <AdminOverviewStrip />
        <Outlet />
      </div>
    </div>
  );
}
