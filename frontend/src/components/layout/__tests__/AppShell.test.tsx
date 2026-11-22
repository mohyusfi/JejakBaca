import { QueryClientProvider } from '@tanstack/react-query';
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from '@tanstack/react-router';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAppQueryClient } from '../../../lib/query-client';
import { ToastProvider } from '../../ui/Toast';
import { AppShell } from '../AppShell';
import { AuthProvider } from '../AuthProvider';

function renderShellAt(initialPath = '/') {
  const rootRoute = createRootRoute({
    component: () => (
      <QueryClientProvider client={createAppQueryClient()}>
        <ToastProvider>
          <AuthProvider>
            <AppShell>
              <Outlet />
            </AppShell>
          </AuthProvider>
        </ToastProvider>
      </QueryClientProvider>
    ),
  });

  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => <div>Halaman Katalog</div>,
  });

  const publicBooksRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/public-books',
    component: () => <div>Halaman Buku Publik</div>,
  });

  const loansRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/loans',
    component: () => <div>Halaman Peminjaman</div>,
  });

  const readlistRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/readlist',
    component: () => <div>Halaman Readlist</div>,
  });

  const loginRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/login',
    component: () => <div>Halaman Login</div>,
  });

  const adminBooksRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/admin/books',
    component: () => <div>Halaman Admin</div>,
  });

  const routeTree = rootRoute.addChildren([
    indexRoute,
    publicBooksRoute,
    loansRoute,
    readlistRoute,
    loginRoute,
    adminBooksRoute,
  ]);

  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [initialPath] }),
  });

  return render(<RouterProvider router={router} />);
}

describe('AppShell & Navigasi Responsif', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.stubEnv('VITE_USE_MOCK', 'false');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('menampilkan header, tautan domain Tamu/User, dan bottom bar mobile tanpa Mode Mock saat default', async () => {
    renderShellAt('/');

    await waitFor(() => {
      expect(screen.getByText('Halaman Katalog')).toBeInTheDocument();
    });

    const desktopNav = screen.getByRole('navigation', { name: 'Navigasi utama' });
    expect(desktopNav).toHaveTextContent('Katalog Perpustakaan');
    expect(desktopNav).toHaveTextContent('Jelajah Buku Publik');
    expect(desktopNav).toHaveTextContent('Peminjaman Saya');
    expect(desktopNav).toHaveTextContent('Readlist Saya');
    expect(desktopNav).not.toHaveTextContent('Workspace Admin');

    const mobileNav = screen.getByRole('navigation', { name: 'Navigasi seluler' });
    expect(mobileNav).toBeInTheDocument();
    expect(screen.queryByText('Mode Mock')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Masuk' })).toBeInTheDocument();
  });

  it('menampilkan badge Mode Mock & simulasi peran Admin saat VITE_USE_MOCK=true', async () => {
    vi.stubEnv('VITE_USE_MOCK', 'true');
    const user = userEvent.setup();
    renderShellAt('/');

    await waitFor(() => {
      expect(screen.getByText('Mode Mock')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /Mode Mock/i }));
    await user.click(screen.getByRole('menuitemradio', { name: /Admin/i }));

    await waitFor(() => {
      const desktopNav = screen.getByRole('navigation', { name: 'Navigasi utama' });
      expect(desktopNav).toHaveTextContent('Workspace Admin');
      expect(desktopNav).not.toHaveTextContent('Peminjaman Saya');
      expect(desktopNav).not.toHaveTextContent('Readlist Saya');
    });
  });

  it('menyembunyikan mobile bottom nav pada rute /login', async () => {
    renderShellAt('/login');

    await waitFor(() => {
      expect(screen.getByText('Halaman Login')).toBeInTheDocument();
    });

    expect(
      screen.queryByRole('navigation', { name: 'Navigasi seluler' }),
    ).not.toBeInTheDocument();
  });
});
