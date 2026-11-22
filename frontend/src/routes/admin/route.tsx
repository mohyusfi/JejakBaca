import { createFileRoute, Link, Outlet, useRouterState } from '@tanstack/react-router';
import { ZoneHeader } from '../../components/layout/ZoneHeader';
import { cn } from '../../lib/cn';

export const Route = createFileRoute('/admin')({
  component: AdminLayout,
});

function AdminLayout() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });

  const subTabs = [
    { label: 'Koleksi Buku', to: '/admin/books' as const },
    { label: 'Pantau Peminjaman', to: '/admin/loans' as const },
  ];

  return (
    <div>
      <ZoneHeader
        kicker="Operasional Petugas"
        title="Workspace Admin"
        description="Kelola data koleksi Buku Perpustakaan UNTAD dan pantau seluruh peminjaman aktif maupun Terlambat beserta NIM peminjam."
        bottomSlot={
          <nav aria-label="Sub-navigasi Workspace Admin" className="flex gap-2">
            {subTabs.map((tab) => {
              const active = pathname === tab.to || pathname.startsWith(`${tab.to}/`);
              return (
                <Link
                  key={tab.to}
                  to={tab.to}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'inline-flex min-h-[36px] items-center rounded-[var(--radius-control)] px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-white',
                    active
                      ? 'bg-white text-[var(--color-primary)]'
                      : 'border border-white/25 bg-white/10 text-white hover:bg-white/20',
                  )}
                >
                  {tab.label}
                </Link>
              );
            })}
          </nav>
        }
      />

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <Outlet />
      </div>
    </div>
  );
}
