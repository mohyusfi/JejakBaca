import {
  createMemoryHistory,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setAuthToken } from '../../../lib/api-client';
import { resetMockState } from '../../../lib/mock/mock-transport';
import { queryClient } from '../../../lib/query-client';
import { routeTree } from '../../../routeTree.gen';
import { adminService } from '../../../services/admin-service';

function renderAppAt(initialUrl = '/admin') {
  const history = createMemoryHistory({ initialEntries: [initialUrl] });
  const router = createRouter({
    routeTree,
    history,
  });

  const view = render(<RouterProvider router={router} />);
  return { ...view, router };
}

function loginAsMockUser() {
  setAuthToken('mock-jwt-2');
}

function loginAsMockAdmin() {
  setAuthToken('mock-jwt-1');
}

describe('Workspace Admin: Layout Shell, GraphQL adminOverview, & Daftar Koleksi — Issue #21', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_USE_MOCK', 'true');
    window.localStorage.clear();
    queryClient.clear();
    resetMockState();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('1. Proteksi Rute & Redirect /admin', () => {
    it('mengarahkan Tamu yang mengakses /admin ke /login dengan query redirect', async () => {
      const { router } = renderAppAt('/admin');

      await waitFor(() => {
        expect(router.state.location.pathname).toBe('/login');
        expect(router.state.location.searchStr).toContain('redirect=');
      });
    });

    it('mengarahkan User biasa yang mengakses /admin/books ke /', async () => {
      loginAsMockUser();
      const { router } = renderAppAt('/admin/books');

      await waitFor(() => {
        expect(router.state.location.pathname).toBe('/');
      });
    });

    it('otomatis mengarahkan Admin dari /admin ke /admin/books', async () => {
      loginAsMockAdmin();
      const { router } = renderAppAt('/admin');

      await waitFor(() => {
        expect(router.state.location.pathname).toBe('/admin/books');
      });
      expect(await screen.findByRole('heading', { name: /Workspace Admin/i })).toBeInTheDocument();
    });
  });

  describe('2. Navigasi Tab Workspace Admin', () => {
    it('menampilkan tab Kelola Koleksi dan Pantau Peminjaman dengan aria-current yang sesuai', async () => {
      loginAsMockAdmin();
      const user = userEvent.setup();
      const { router } = renderAppAt('/admin/books');

      const nav = await screen.findByRole('navigation', { name: /Sub-navigasi Workspace Admin/i });
      const booksTab = within(nav).getByRole('link', { name: /Kelola Koleksi/i });
      const loansTab = within(nav).getByRole('link', { name: /Pantau Peminjaman/i });

      expect(booksTab).toHaveAttribute('aria-current', 'page');
      expect(loansTab).not.toHaveAttribute('aria-current', 'page');

      await user.click(loansTab);

      await waitFor(() => {
        expect(router.state.location.pathname).toBe('/admin/loans');
        expect(loansTab).toHaveAttribute('aria-current', 'page');
      });
    });
  });

  describe('3. Strip Ringkasan GraphQL adminOverview', () => {
    it('menampilkan metrik adminOverview dengan tabular-nums dan sorotan merah hanya saat overdueLoansCount > 0', async () => {
      loginAsMockAdmin();
      renderAppAt('/admin/books');

      const totalBooksCard = await screen.findByTestId('admin-metric-total-books');
      const lowStockCard = screen.getByTestId('admin-metric-low-stock');
      const activeLoansCard = screen.getByTestId('admin-metric-active-loans');
      const overdueCard = screen.getByTestId('admin-metric-overdue-loans');

      expect(totalBooksCard).toHaveTextContent('Total Judul');
      expect(lowStockCard).toHaveTextContent('Stok Menipis');
      expect(activeLoansCard).toHaveTextContent('Peminjaman Aktif');
      expect(overdueCard).toHaveTextContent('Terlambat');

      // Angka menggunakan tabular-nums
      expect(totalBooksCard.querySelector('.tabular-nums')).toBeInTheDocument();
      expect(overdueCard.querySelector('.tabular-nums')).toBeInTheDocument();

      // Pada seed default ada 1 pinjaman overdue -> sorot danger
      expect(overdueCard.className).toContain('border-[var(--color-danger-border)]');
      expect(totalBooksCard.className).not.toContain('border-[var(--color-danger-border)]');
    });

    it('tidak menyorot merah ketika overdueLoansCount === 0', async () => {
      loginAsMockAdmin();
      vi.spyOn(adminService, 'getOverview').mockResolvedValueOnce({
        totalBooks: 12,
        lowStockBooksCount: 2,
        activeLoansCount: 4,
        overdueLoansCount: 0,
        recentLoans: [],
      });

      renderAppAt('/admin/books');

      const overdueCard = await screen.findByTestId('admin-metric-overdue-loans');
      expect(overdueCard).toHaveTextContent('0');
      expect(overdueCard.className).not.toContain('border-[var(--color-danger-border)]');
    });
  });

  describe('4. Daftar Koleksi /admin/books (Filter, Skala Stok, Paginasi, Empty State)', () => {
    it('menampilkan daftar buku dengan skala bobot visual stok dan mendukung pencarian + reset filter', async () => {
      loginAsMockAdmin();
      const user = userEvent.setup();
      const { router } = renderAppAt('/admin/books');

      expect(await screen.findByRole('heading', { name: /Daftar Koleksi Buku/i })).toBeInTheDocument();

      // Pastikan tabel/kartu buku muncul beserta progressbar skala stok
      const progressBars = await screen.findAllByRole('progressbar', {}, { timeout: 3000 });
      expect(progressBars.length).toBeGreaterThan(0);

      // Cari kata kunci yang tidak ada -> empty state + tombol Reset Filter
      const searchInput = screen.getByPlaceholderText(/Cari judul, penulis, atau ISBN/i);
      await user.type(searchInput, 'judul-yang-pasti-tidak-ada-xyz');

      expect(
        await screen.findByText(/Tidak ada buku yang cocok dengan filter/i),
      ).toBeInTheDocument();
      expect(router.state.location.searchStr).toContain('q=judul-yang-pasti-tidak-ada-xyz');

      const resetButton = screen.getByRole('button', { name: /Reset Filter/i });
      await user.click(resetButton);

      await waitFor(() => {
        expect(router.state.location.searchStr).toBe('');
      });
      expect(await screen.findAllByRole('progressbar')).not.toHaveLength(0);
    });

    it('mendukung filter kategori dan paginasi tersinkron URL', async () => {
      loginAsMockAdmin();
      const user = userEvent.setup();
      const { router } = renderAppAt('/admin/books?limit=10');

      await screen.findByRole('heading', { name: /Daftar Koleksi Buku/i });

      await user.click(screen.getByRole('button', { name: /Filter koleksi/i }));
      const categorySelect = await screen.findByLabelText(/Kategori/i);
      await user.selectOptions(categorySelect, 'Informatika');

      await waitFor(() => {
        expect(router.state.location.searchStr).toContain('category=Informatika');
      });
    });
  });
});
