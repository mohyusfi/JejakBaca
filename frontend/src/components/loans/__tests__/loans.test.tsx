import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setAuthToken } from '../../../lib/api-client';
import { buildMockToken, resetMockState } from '../../../lib/mock/mock-transport';
import { queryClient } from '../../../lib/query-client';
import { routeTree } from '../../../routeTree.gen';

function renderAppAt(initialUrl = '/loans') {
  const history = createMemoryHistory({ initialEntries: [initialUrl] });
  const router = createRouter({
    routeTree,
    history,
  });

  const view = render(<RouterProvider router={router} />);
  return { ...view, router };
}

describe('Peminjaman Saya: Ringkasan GraphQL, Status Terlambat, & Pengembalian Buku — Issue #17', () => {
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

  it('mengarahkan Tamu yang mengakses /loans ke /login?redirect=/loans', async () => {
    const { router } = renderAppAt('/loans');

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/login');
      expect(router.state.location.search).toEqual({ redirect: '/loans' });
    });
  });

  it('mengarahkan Admin yang mengakses /loans ke /admin/books', async () => {
    setAuthToken(buildMockToken(1));
    const { router } = renderAppAt('/loans');

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/admin/books');
    });
  });

  it('menampilkan strip ringkasan GraphQL myOverview (kuota aktif, status terlambat, readlist)', async () => {
    // Sesi login User (Andi Pratama - id: 2)
    // Pada mock seed: Andi memiliki 2 pinjaman aktif (1 normal, 1 terlambat) dan 1 readlist
    setAuthToken(buildMockToken(2));
    renderAppAt('/loans');

    expect(await screen.findByRole('heading', { name: /Peminjaman Saya/i })).toBeInTheDocument();

    const summarySection = screen.getByRole('region', { name: /Ringkasan Kuota Peminjaman/i });
    expect(summarySection).toBeInTheDocument();

    // Kuota aktif 2/3
    expect(within(summarySection).getByText('2/3 aktif')).toBeInTheDocument();
    expect(within(summarySection).getByText('Buku Dipinjam')).toBeInTheDocument();

    // Terlambat 1 buku
    expect(within(summarySection).getByText('1 buku')).toBeInTheDocument();

    // Readlist
    expect(within(summarySection).getByText(/2 referensi/i)).toBeInTheDocument();
  });

  it('menampilkan daftar peminjaman dengan indikator Terlambat tanpa memuat istilah denda uang', async () => {
    setAuthToken(buildMockToken(2));
    renderAppAt('/loans');

    expect(await screen.findByRole('heading', { name: /Peminjaman Saya/i })).toBeInTheDocument();

    // Andi meminjam "Struktur Data dan Algoritma" (aktif) dan "Basis Data Lanjut & Transaksi" (terlambat)
    expect(await screen.findByText('Struktur Data dan Algoritma')).toBeInTheDocument();
    expect(screen.getByText('Basis Data Lanjut & Transaksi')).toBeInTheDocument();

    // Indikator Terlambat muncul
    expect(screen.getByText(/Terlambat 3 hari/i)).toBeInTheDocument();

    // Pastikan tidak ada istilah denda uang di seluruh halaman
    const main = screen.getByRole('main');
    expect(main).not.toHaveTextContent(/denda/i);
    expect(main).not.toHaveTextContent(/penalti/i);
    expect(main).not.toHaveTextContent(/\brp\b/i);
    expect(main).not.toHaveTextContent(/rupiah/i);
  });

  it('mendukung pergantian tab filter status (Semua, Dipinjam, Terlambat, Dikembalikan)', async () => {
    setAuthToken(buildMockToken(2));
    const user = userEvent.setup();
    const { router } = renderAppAt('/loans');

    expect(await screen.findByRole('heading', { name: /Peminjaman Saya/i })).toBeInTheDocument();

    // Klik tab Terlambat
    const overdueTab = screen.getByRole('button', { name: 'Terlambat' });
    await user.click(overdueTab);

    await waitFor(() => {
      expect(router.state.location.search).toMatchObject({ status: 'overdue' });
    });

    // Pada filter terlambat, buku yang muncul adalah "Basis Data Lanjut & Transaksi"
    expect(await screen.findByText('Basis Data Lanjut & Transaksi')).toBeInTheDocument();
  });

  it('membuka dialog konfirmasi saat tombol Kembalikan ditekan dan berhasil mengembalikan buku', async () => {
    setAuthToken(buildMockToken(2));
    const user = userEvent.setup();
    renderAppAt('/loans');

    expect(await screen.findByRole('heading', { name: /Peminjaman Saya/i })).toBeInTheDocument();

    // Cari tombol Kembalikan
    const returnButtons = await screen.findAllByRole('button', { name: 'Kembalikan' });
    expect(returnButtons.length).toBeGreaterThan(0);

    // Klik tombol Kembalikan pada pinjaman pertama
    await user.click(returnButtons[0]);

    // Dialog modal konfirmasi terbuka
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('heading', { name: 'Kembalikan Buku Perpustakaan?' })).toBeInTheDocument();

    // Konfirmasi pengembalian
    const confirmBtn = within(dialog).getByRole('button', { name: 'Ya, Kembalikan' });
    await user.click(confirmBtn);

    // Toast sukses muncul
    expect(await screen.findByText('Buku Berhasil Dikembalikan')).toBeInTheDocument();

    // Dialog tertutup
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });
});
