// @vitest-environment jsdom
import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetMockState } from '../../../lib/mock/mock-transport';
import { queryClient } from '../../../lib/query-client';
import { routeTree } from '../../../routeTree.gen';
import { publicBookService } from '../../../services/public-book-service';

function renderAppAt(initialUrl = '/public-books') {
  const history = createMemoryHistory({ initialEntries: [initialUrl] });
  const router = createRouter({
    routeTree,
    history,
  });

  const view = render(<RouterProvider router={router} />);
  return { ...view, router };
}

describe('Jelajah Buku Publik: Pencarian Open Library, Chip Topik UNTAD, & Lazy Fetch Deskripsi — Issue #18', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_USE_MOCK', 'true');
    window.localStorage.clear();
    queryClient.clear();
    queryClient.setDefaultOptions({
      queries: {
        retry: false,
      },
    });
    resetMockState();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('dapat diakses bebas oleh Tamu tanpa login, dengan tajuk zona domain publik dan topik Ilmu Komputer aktif secara default', async () => {
    const { router } = renderAppAt('/public-books');

    // Memastikan tidak ada redirect ke /login
    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/public-books');
    });

    // Heading zona domain publik
    expect(await screen.findByRole('heading', { name: /Jelajah Buku Publik/i })).toBeInTheDocument();
    expect(screen.getByText(/Zona Referensi Digital Eksternal/i)).toBeInTheDocument();
    expect(screen.getByText(/tidak dapat dipinjam secara fisik/i)).toBeInTheDocument();

    // Chip topik Ilmu Komputer (computer_science) berstatus terpilih (default)
    const csChip = screen.getByRole('tab', { name: 'Ilmu Komputer' });
    expect(csChip).toHaveAttribute('aria-selected', 'true');

    // Menampilkan buku topik ilmu komputer dari mock seed
    expect(await screen.findByRole('heading', { name: /Clean Code/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Designing Data-Intensive Applications/i })).toBeInTheDocument();

    // Hard Domain Partition Rule: Memastikan TIDAK ADA tombol Pinjam atau informasi stok eksemplar
    expect(screen.queryByRole('button', { name: /^Pinjam/i })).not.toBeInTheDocument();
    expect(document.body).not.toHaveTextContent(/stok habis/i);
    expect(document.body).not.toHaveTextContent(/tersedia \d+\/\d+/i);
  });

  it('mendukung pergantian chip topik akademik UNTAD dan menyinkronkan ke URL', async () => {
    const user = userEvent.setup();
    const { router } = renderAppAt('/public-books');

    expect(await screen.findByRole('heading', { name: /Jelajah Buku Publik/i })).toBeInTheDocument();

    // Klik chip 'Teknik'
    const engineeringChip = screen.getByRole('tab', { name: 'Teknik' });
    await user.click(engineeringChip);

    await waitFor(() => {
      expect(router.state.location.search).toEqual(
        expect.objectContaining({ subject: 'engineering' }),
      );
    });

    expect(engineeringChip).toHaveAttribute('aria-selected', 'true');
    const csChip = screen.getByRole('tab', { name: 'Ilmu Komputer' });
    expect(csChip).toHaveAttribute('aria-selected', 'false');
  });

  it('mendukung pencarian kata kunci q dan menyinkronkannya ke URL', async () => {
    const user = userEvent.setup();
    const { router } = renderAppAt('/public-books');

    expect(await screen.findByRole('heading', { name: /Jelajah Buku Publik/i })).toBeInTheDocument();

    const searchInput = screen.getByRole('searchbox', { name: /Cari buku publik di Open Library/i });
    await user.type(searchInput, 'Clean Code');

    const searchBtn = screen.getByRole('button', { name: /^Cari$/i });
    await user.click(searchBtn);

    await waitFor(() => {
      expect(router.state.location.search).toEqual(
        expect.objectContaining({ q: 'Clean Code' }),
      );
    });

    expect(await screen.findByRole('heading', { name: /Clean Code: A Handbook of Agile Software Craftsmanship/i })).toBeInTheDocument();
  });

  it('menerapkan lazy fetch: publicBookService.detail TIDAK dipanggil saat daftar dibuka, hanya dipanggil saat detail buku diklik', async () => {
    const detailSpy = vi.spyOn(publicBookService, 'detail');
    const user = userEvent.setup();
    const { router } = renderAppAt('/public-books');

    // Tunggu daftar buku selesai dimuat
    expect(await screen.findByRole('heading', { name: /Clean Code/i })).toBeInTheDocument();

    // Verifikasi publicBookService.detail BELUM dipanggil sama sekali (lazy fetch)
    expect(detailSpy).not.toHaveBeenCalled();

    // Klik tombol 'Lihat Detail' pada buku Clean Code (workId: OL82563W)
    const card = screen.getByTestId('public-book-card-OL82563W');
    const detailButton = within(card).getByRole('button', { name: /Lihat Detail/i });
    await user.click(detailButton);

    // URL tersinkron dengan ?workId=OL82563W
    await waitFor(() => {
      expect(router.state.location.search).toEqual(
        expect.objectContaining({ workId: 'OL82563W' }),
      );
    });

    // publicBookService.detail HANYA dipanggil sekarang dengan workId yang dipilih
    expect(detailSpy).toHaveBeenCalledTimes(1);
    expect(detailSpy).toHaveBeenCalledWith('OL82563W', expect.anything());

    // Panel detail terbuka di aside
    const panel = screen.getByRole('region', { name: /Panel Detail Buku Publik/i });
    expect(panel).toBeInTheDocument();
    expect(await within(panel).findByText(/Robert C. Martin/i)).toBeInTheDocument();
    expect(within(panel).getByText(/Domain Referensi Publik \(Open Library\)/i)).toBeInTheDocument();

    // Menutup panel dengan tombol close (X)
    const closeBtn = within(panel).getByRole('button', { name: /Tutup panel detail buku publik/i });
    await user.click(closeBtn);

    await waitFor(() => {
      expect(router.state.location.search).not.toHaveProperty('workId');
      expect(screen.queryByRole('region', { name: /Panel Detail Buku Publik/i })).not.toBeInTheDocument();
    });
  });

  it('menampilkan descriptionFallback dan metadata subjek/tahun secara informatif bila description bernilai null', async () => {
    // Buku OL262421W ("Structure and Interpretation of Computer Programs") pada mock seed memiliki description: null
    renderAppAt('/public-books?workId=OL262421W');

    // Panel detail terbuka dan memuat data
    const panel = await screen.findByRole('region', { name: /Panel Detail Buku Publik/i });
    expect(panel).toBeInTheDocument();

    // Tunggu hingga detail selesai dimuat
    expect(
      await within(panel).findByRole('heading', {
        name: /Structure and Interpretation of Computer Programs/i,
      }),
    ).toBeInTheDocument();

    // Fallback container muncul dengan ringkasan metadata (bukan area kosong)
    const fallbackBox = await within(panel).findByTestId('description-fallback-container');
    expect(fallbackBox).toBeInTheDocument();
    expect(fallbackBox).toHaveTextContent(/Deskripsi belum tersedia di Open Library/i);
    expect(fallbackBox).toHaveTextContent(/1984/);
  });

  it('menangani kesalahan 502 UPSTREAM_API_ERROR dengan pesan ramah dan tombol Coba Lagi', async () => {
    const user = userEvent.setup();
    let callCount = 0;
    const searchSpy = vi.spyOn(publicBookService, 'search').mockImplementation(async () => {
      callCount++;
      if (callCount === 1) {
        throw new Error('502 Bad Gateway: Upstream Open Library service unavailable');
      }
      return {
        success: true,
        message: 'Buku publik berhasil diambil',
        data: [],
        meta: { page: 1, limit: 10, total: 0, totalPages: 1 },
      };
    });

    renderAppAt('/public-books');

    // Menampilkan kotak error yang ramah
    const errorSection = await screen.findByRole('region', { name: /Gagal memuat buku publik/i });
    expect(errorSection).toBeInTheDocument();
    expect(within(errorSection).getByRole('heading', { name: /Gagal Memuat Buku Publik/i })).toBeInTheDocument();
    expect(within(errorSection).getByText(/502 Bad Gateway/i)).toBeInTheDocument();

    // Tersedia tombol Coba Lagi
    const retryBtn = within(errorSection).getByRole('button', { name: /Coba Lagi/i });
    expect(retryBtn).toBeInTheDocument();

    // Klik tombol Coba Lagi akan memicu pemanggilan ulang
    await user.click(retryBtn);
    await waitFor(() => {
      expect(searchSpy).toHaveBeenCalledTimes(2);
    });
  });
});
