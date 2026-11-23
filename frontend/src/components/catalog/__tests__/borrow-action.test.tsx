import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setAuthToken } from '../../../lib/api-client';
import { buildMockToken, resetMockState } from '../../../lib/mock/mock-transport';
import { queryClient } from '../../../lib/query-client';
import { routeTree } from '../../../routeTree.gen';
import { loanService } from '../../../services/loan-service';

function renderAppAt(initialUrl = '/') {
  const history = createMemoryHistory({ initialEntries: [initialUrl] });
  const router = createRouter({
    routeTree,
    history,
  });

  const view = render(<RouterProvider router={router} />);
  return { ...view, router };
}

describe('Aksi Peminjaman Mandiri & Intent Pasca-Login — Issue #16', () => {
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

  it('saat Tamu menekan tombol Pinjam di detail buku, aplikasi mengarahkan ke /login?redirect=/?bookId=<id>', async () => {
    const user = userEvent.setup();
    const { router } = renderAppAt('/?bookId=1');

    const detailAside = await screen.findByRole('complementary', {
      name: 'Detail Buku Perpustakaan',
    });
    expect(
      await within(detailAside).findByRole('heading', {
        name: 'Struktur Data dan Algoritma',
      }),
    ).toBeInTheDocument();

    const borrowBtn = within(detailAside).getByRole('button', {
      name: /Pinjam Buku Sekarang/i,
    });
    expect(borrowBtn).toBeInTheDocument();

    await user.click(borrowBtn);

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/login');
      expect(router.state.location.search).toEqual({ redirect: '/?bookId=1' });
    });
  });

  it('saat User menekan tombol Pinjam pada buku yang tersedia, peminjaman berhasil, toast sukses muncul, dan tombol menjadi Sedang Anda Pinjam', async () => {
    // Sesi login User (id: 2 - Andi Pratama)
    // Book 4 (Basis Data Relasional) tersedia dan belum dipinjam aktif oleh Andi
    setAuthToken(buildMockToken(2));
    const user = userEvent.setup();
    renderAppAt('/?bookId=4');

    const detailAside = await screen.findByRole('complementary', {
      name: 'Detail Buku Perpustakaan',
    });
    expect(
      await within(detailAside).findByRole('heading', {
        name: 'Kalkulus dan Geometri Analitik Jilid 1',
      }),
    ).toBeInTheDocument();

    const borrowBtn = within(detailAside).getByRole('button', {
      name: /Pinjam Buku Sekarang/i,
    });
    await user.click(borrowBtn);

    // Toast sukses muncul
    expect(await screen.findByText('Peminjaman Berhasil')).toBeInTheDocument();
    expect(screen.getByText(/Jatuh tempo: 7 hari ke depan/i)).toBeInTheDocument();

    // Tombol di panel detail berubah menjadi status nonaktif Sedang Anda Pinjam
    expect(
      await within(detailAside).findByRole('button', { name: 'Sedang Anda Pinjam' }),
    ).toBeDisabled();
  });

  it('menonaktifkan tombol Pinjam pada buku yang stoknya habis (=0)', async () => {
    // Book ID 3 pada mock seed memiliki stockAvailable: 0 (Rekayasa Perangkat Lunak Modern)
    setAuthToken(buildMockToken(2));
    renderAppAt('/?bookId=3');

    const detailAside = await screen.findByRole('complementary', {
      name: 'Detail Buku Perpustakaan',
    });
    expect(
      await within(detailAside).findByRole('heading', {
        name: 'Rekayasa Perangkat Lunak Modern',
      }),
    ).toBeInTheDocument();

    const outOfStockBtn = within(detailAside).getByRole('button', { name: 'Stok Habis' });
    expect(outOfStockBtn).toBeDisabled();
    expect(
      within(detailAside).getByText(
        'Seluruh eksemplar buku ini sedang dipinjam oleh mahasiswa lain.',
      ),
    ).toBeInTheDocument();
  });

  it('menampilkan status Sedang Anda Pinjam dan menonaktifkan tombol jika User sedang meminjam buku tersebut', async () => {
    // Andi (id: 2) sudah memiliki peminjaman aktif untuk Book 1 pada mock seed
    setAuthToken(buildMockToken(2));
    renderAppAt('/?bookId=1');

    const detailAside = await screen.findByRole('complementary', {
      name: 'Detail Buku Perpustakaan',
    });
    expect(
      await within(detailAside).findByRole('heading', {
        name: 'Struktur Data dan Algoritma',
      }),
    ).toBeInTheDocument();

    // Tombol sudah berstatus Sedang Anda Pinjam
    const disabledBtn = within(detailAside).getByRole('button', {
      name: 'Sedang Anda Pinjam',
    });
    expect(disabledBtn).toBeDisabled();
  });

  it('menampilkan pesan error yang jelas saat menyentuh batas kuota 3 buku aktif', async () => {
    setAuthToken(buildMockToken(2));
    const user = userEvent.setup();

    // Andi sudah meminjam book 1 dan 2 (2 aktif). Pinjam book 4 sehingga mencapai kuota 3 buku.
    await loanService.borrowBook(4);

    // Coba pinjam buku ke-4 (Book ID 5)
    renderAppAt('/?bookId=5');
    const detailAside = await screen.findByRole('complementary', {
      name: 'Detail Buku Perpustakaan',
    });
    expect(
      await within(detailAside).findByRole('heading', {
        name: 'Metodologi Penelitian Kuantitatif & Kualitatif',
      }),
    ).toBeInTheDocument();

    const borrowBtn = within(detailAside).getByRole('button', {
      name: /Pinjam Buku Sekarang/i,
    });
    await user.click(borrowBtn);

    expect(await screen.findByText('Gagal Meminjam Buku')).toBeInTheDocument();
    expect(
      screen.getByText(/Batas maksimal 3 peminjaman aktif tercapai/i),
    ).toBeInTheDocument();
  });

  it('saat akun berrole Admin melihat katalog, tombol Pinjam diganti dengan aksi ke Workspace Admin', async () => {
    // Sesi login Admin (id: 1)
    setAuthToken(buildMockToken(1));
    renderAppAt('/?bookId=1');

    const detailAside = await screen.findByRole('complementary', {
      name: 'Detail Buku Perpustakaan',
    });
    expect(
      await within(detailAside).findByRole('heading', {
        name: 'Struktur Data dan Algoritma',
      }),
    ).toBeInTheDocument();

    // Tombol Pinjam tidak boleh ada untuk Admin
    expect(
      within(detailAside).queryByRole('button', { name: /Pinjam Buku/i }),
    ).not.toBeInTheDocument();

    // Muncul tautan ke Workspace Admin
    const adminLink = within(detailAside).getByRole('link', {
      name: /Kelola Buku di Workspace Admin/i,
    });
    expect(adminLink).toBeInTheDocument();
    expect(adminLink).toHaveAttribute('href', '/admin/books');
  });
});
