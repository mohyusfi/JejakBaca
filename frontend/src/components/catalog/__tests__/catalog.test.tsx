import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetMockState } from '../../../lib/mock/mock-transport';
import { queryClient } from '../../../lib/query-client';
import { routeTree } from '../../../routeTree.gen';
import { bookService } from '../../../services/book-service';

function renderCatalogAt(initialUrl = '/') {
  const history = createMemoryHistory({ initialEntries: [initialUrl] });
  const router = createRouter({
    routeTree,
    history,
  });

  const view = render(<RouterProvider router={router} />);
  return { ...view, router };
}

describe('Katalog Perpustakaan (/) — Issue #15', () => {
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

  it('menampilkan skeleton loading lalu Katalog Perpustakaan bagi Tamu tanpa login dan bebas istilah Readlist', async () => {
    const listOriginal = bookService.list.bind(bookService);
    let resolvePending!: () => void;
    const gate = new Promise<void>((resolve) => {
      resolvePending = resolve;
    });

    vi.spyOn(bookService, 'list').mockImplementation(async (params, signal) => {
      await gate;
      return listOriginal(params, signal);
    });

    const { router } = renderCatalogAt('/');

    expect(
      await screen.findByRole('status', { name: 'Memuat Katalog Perpustakaan' }),
    ).toBeInTheDocument();

    resolvePending();

    expect(
      await screen.findByRole('button', { name: 'Struktur Data dan Algoritma' }),
    ).toBeInTheDocument();

    expect(router.state.location.pathname).toBe('/');
    expect(
      screen.getByRole('heading', { name: /Selamat Datang di\s*JejakBaca/i }),
    ).toBeInTheDocument();
    expect(screen.getByText('14 Judul Tersedia')).toBeInTheDocument();

    const main = screen.getByRole('main');
    expect(main).not.toHaveTextContent(/readlist/i);
  });

  it('menampilkan skala status stok (aman, menipis=1, habis=0) dengan angka tabular-nums dan fallback sampul 2:3', async () => {
    const listSpy = vi.spyOn(bookService, 'list');
    renderCatalogAt('/');

    expect(
      await screen.findByRole('button', { name: 'Struktur Data dan Algoritma' }),
    ).toBeInTheDocument();
    expect(listSpy).toHaveBeenCalled();

    // Stok aman (>1)
    expect(screen.getAllByText('Tersedia').length).toBeGreaterThan(0);
    const safeStock = screen.getByText('4/5 tersedia');
    expect(safeStock).toHaveClass('tabular-nums');

    // Stok menipis (=1)
    expect(screen.getAllByText('Stok Menipis').length).toBeGreaterThan(0);
    const lowStockMatches = screen.getAllByText('1/3 tersedia');
    expect(lowStockMatches.length).toBeGreaterThan(0);
    expect(lowStockMatches[0]).toHaveClass('tabular-nums');

    // Stok habis (=0)
    expect(screen.getAllByText('Stok Habis').length).toBeGreaterThan(0);
    const emptyStockMatches = screen.getAllByText('0/2 tersedia');
    expect(emptyStockMatches.length).toBeGreaterThan(0);
    expect(emptyStockMatches[0]).toHaveClass('tabular-nums');

    // Sampul gambar buku & fallback tipografis saat coverUrl kosong
    const coverImg = screen.getByAltText('Sampul buku Struktur Data dan Algoritma');
    expect(coverImg).toHaveAttribute('src', '/books.png');
    expect(
      screen.getByLabelText('Sampul tipografis Rekayasa Perangkat Lunak Modern'),
    ).toBeInTheDocument();
  });

  it('menampilkan fallback sampul otomatis jika coverUrl gagal dimuat', async () => {
    const listOriginal = bookService.list.bind(bookService);
    vi.spyOn(bookService, 'list').mockImplementation(async (params, signal) => {
      const res = await listOriginal(params, signal);
      return {
        ...res,
        data: res.data.map((book, index) =>
          index === 0 ? { ...book, coverUrl: 'https://invalid.example.test/cover.jpg' } : book,
        ),
      };
    });

    renderCatalogAt('/');

    const img = await screen.findByRole('img', {
      name: 'Sampul buku Struktur Data dan Algoritma',
    });
    fireEvent.error(img);

    expect(
      screen.getByLabelText('Sampul tipografis Struktur Data dan Algoritma'),
    ).toBeInTheDocument();
  });

  it('menyinkronkan pencarian q, filter kategori, dan sakelar Tersedia Saja ke URL serta menampilkan empty state dengan Reset Filter', async () => {
    const user = userEvent.setup();
    const { router } = renderCatalogAt('/');

    expect(
      await screen.findByRole('button', { name: 'Struktur Data dan Algoritma' }),
    ).toBeInTheDocument();

    // Buka modal filter lalu pilih kategori Informatika
    await user.click(screen.getByRole('button', { name: 'Filter katalog' }));
    const categoryGroup = screen.getByRole('group', { name: 'Filter kategori koleksi' });
    await user.click(within(categoryGroup).getByRole('button', { name: 'Informatika' }));

    await waitFor(() => {
      expect(router.state.location.search).toMatchObject({ category: 'Informatika' });
      expect(
        screen.queryByRole('button', { name: 'Mekanika Tanah & Teknik Pondasi' }),
      ).not.toBeInTheDocument();
    });
    expect(
      screen.getByRole('button', { name: 'Rekayasa Perangkat Lunak Modern' }),
    ).toBeInTheDocument();

    // Sakelar Tersedia Saja menyembunyikan stok 0
    await user.click(screen.getByRole('switch', { name: /Tersedia Saja/i }));

    await waitFor(() => {
      expect(router.state.location.search).toMatchObject({
        category: 'Informatika',
        availableOnly: true,
      });
      expect(
        screen.queryByRole('button', { name: 'Rekayasa Perangkat Lunak Modern' }),
      ).not.toBeInTheDocument();
    });

    // Tutup modal filter
    await user.click(screen.getByRole('button', { name: 'Selesai' }));

    // Pencarian yang tidak cocok memunculkan empty state + tombol Reset Filter
    const searchInput = screen.getByLabelText('Cari judul, penulis, atau ISBN');
    await user.type(searchInput, 'BukuFiktifTidakAda{enter}');

    await waitFor(() => {
      expect(screen.getByText('Buku yang cocok tidak ditemukan')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Reset Filter' }));

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Mekanika Tanah & Teknik Pondasi' }),
      ).toBeInTheDocument();
      expect(router.state.location.search).toEqual({});
    });
  });

  it('mendukung infinite scroll (Muat Lebih Banyak & sinkronisasi page/limit ke URL)', async () => {
    const user = userEvent.setup();
    const { router } = renderCatalogAt('/');

    // Halaman 1 default limit=10 memuat 10 dari 14 buku
    expect(
      await screen.findByRole('button', { name: 'Struktur Data dan Algoritma' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Struktur Beton Bertulang Lanjut' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Aljabar Linear Elementer & Aplikasi' }),
    ).not.toBeInTheDocument();

    // Klik Muat Lebih Banyak -> memuat halaman 2 & menyinkronkan page=2 di URL
    await user.click(screen.getByRole('button', { name: /Muat Lebih Banyak/i }));

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Aljabar Linear Elementer & Aplikasi' }),
      ).toBeInTheDocument();
      expect(router.state.location.search).toMatchObject({ page: 2 });
      expect(screen.getByText('Semua 14 Buku Perpustakaan telah ditampilkan.')).toBeInTheDocument();
    });
  });

  it('memulihkan seluruh halaman 1..page saat reload dengan ?page=2&limit=10', async () => {
    renderCatalogAt('/?page=2&limit=10');

    expect(
      await screen.findByRole('button', { name: 'Struktur Data dan Algoritma' }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('button', { name: 'Aljabar Linear Elementer & Aplikasi' }),
    ).toBeInTheDocument();
  });

  it('membuka panel detail via GET /api/v1/books/{id}, menyinkronkan bookId di URL, dan menutup dengan Escape', async () => {
    const user = userEvent.setup();
    const detailSpy = vi.spyOn(bookService, 'detail');
    const { router } = renderCatalogAt('/');

    const bookButton = await screen.findByRole('button', {
      name: 'Struktur Data dan Algoritma',
    });
    await user.click(bookButton);

    await waitFor(() => {
      expect(router.state.location.search).toMatchObject({ bookId: 1 });
      expect(detailSpy).toHaveBeenCalledWith(1, expect.any(AbortSignal));
    });

    const detailAside = await screen.findByRole('complementary', {
      name: 'Detail Buku Perpustakaan',
    });
    expect(within(detailAside).getByText('978-602-1234-56-7')).toBeInTheDocument();
    expect(within(detailAside).getByText(/senarai berantai, tumpukan/i)).toBeInTheDocument();
    expect(within(detailAside).getByText(/Total 5 eksemplar/i)).toBeInTheDocument();

    // Tutup menggunakan Escape -> bookId hilang dari URL
    await user.keyboard('{Escape}');
    await waitFor(() => {
      expect(router.state.location.search).toEqual({});
      expect(
        screen.queryByRole('complementary', { name: 'Detail Buku Perpustakaan' }),
      ).not.toBeInTheDocument();
    });
  });

  it('menangani bookId 404 dengan error state di panel detail dan tombol Tutup Panel', async () => {
    const user = userEvent.setup();
    const { router } = renderCatalogAt('/?bookId=999');

    const detailAside = await screen.findByRole('complementary', {
      name: 'Detail Buku Perpustakaan',
    });
    await waitFor(() => {
      expect(within(detailAside).getByText('Buku tidak ditemukan')).toBeInTheDocument();
    });

    await user.click(within(detailAside).getByRole('button', { name: 'Tutup Panel' }));
    await waitFor(() => {
      expect(router.state.location.search).toEqual({});
    });
  });
});
