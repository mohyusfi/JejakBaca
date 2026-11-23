import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setAuthToken } from '../../../lib/api-client';
import { resetMockState } from '../../../lib/mock/mock-transport';
import { queryClient } from '../../../lib/query-client';
import { routeTree } from '../../../routeTree.gen';
import { readlistService } from '../../../services/readlist-service';

function renderAppAt(initialUrl = '/readlist') {
  const history = createMemoryHistory({ initialEntries: [initialUrl] });
  const router = createRouter({
    routeTree,
    history,
  });

  const view = render(<RouterProvider router={router} />);
  return { ...view, router };
}

describe('Readlist Saya (/readlist) — Issue #20', () => {
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

  describe('1. Proteksi Rute & Guard Peran', () => {
    it('mengarahkan Tamu yang belum login ke /login?redirect=/readlist', async () => {
      const { router } = renderAppAt('/readlist');

      await waitFor(() => {
        expect(router.state.location.pathname).toBe('/login');
        expect(router.state.location.search).toEqual({ redirect: '/readlist' });
      });
    });

    it('mengarahkan Admin yang mengakses /readlist ke /admin/books', async () => {
      setAuthToken('mock-jwt-1'); // Token Admin
      const { router } = renderAppAt('/readlist');

      await waitFor(() => {
        expect(router.state.location.pathname).toBe('/admin/books');
      });
    });
  });

  describe('2. Pemuatan Daftar Snapshot, Skeleton, & Konten Item', () => {
    it('menampilkan skeleton loading saat memuat data, lalu merender daftar snapshot Readlist', async () => {
      setAuthToken('mock-jwt-2'); // User Andi (memiliki 2 item readlist di mock seed)

      const listOriginal = readlistService.list.bind(readlistService);
      let resolvePending!: () => void;
      const gate = new Promise<void>((resolve) => {
        resolvePending = resolve;
      });

      vi.spyOn(readlistService, 'list').mockImplementation(async (params, signal) => {
        await gate;
        return listOriginal(params, signal);
      });

      renderAppAt('/readlist');

      expect(
        await screen.findByRole('status', { name: 'Memuat daftar Readlist' }),
      ).toBeInTheDocument();

      resolvePending();

      // Memastikan data snapshot muncul setelah selesai loading
      expect(
        await screen.findByRole('button', {
          name: 'Clean Code: A Handbook of Agile Software Craftsmanship',
        }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', {
          name: 'Structure and Interpretation of Computer Programs',
        }),
      ).toBeInTheDocument();
      expect(screen.getByText('2 Judul Tersimpan')).toBeInTheDocument();
    });

    it('setiap kompartemen menampilkan sampul 2:3, judul, penulis, tahun terbit (tabular-nums), tanggal disimpan, dan TANPA tombol Pinjam', async () => {
      setAuthToken('mock-jwt-2'); // User Andi
      renderAppAt('/readlist');

      // Tunggu hingga data termuat
      expect(
        await screen.findByRole('button', {
          name: 'Clean Code: A Handbook of Agile Software Craftsmanship',
        }),
      ).toBeInTheDocument();

      // Cek elemen metadata
      expect(screen.getByText('Robert C. Martin')).toBeInTheDocument();
      expect(screen.getByText('Harold Abelson, Gerald Jay Sussman')).toBeInTheDocument();

      // Cek tahun terbit dalam tabular-nums
      const year2008 = screen.getByText('2008');
      expect(year2008).toHaveClass('tabular-nums');
      const year1984 = screen.getByText('1984');
      expect(year1984).toHaveClass('tabular-nums');

      // Cek tanggal disimpan
      expect(screen.getAllByText(/Disimpan/i).length).toBeGreaterThanOrEqual(2);

      // Verifikasi tegas: TIDAK ADA tombol atau teks Pinjam sama sekali di seluruh area konten
      const main = screen.getByRole('main');
      expect(within(main).queryByRole('button', { name: /pinjam/i })).not.toBeInTheDocument();
      expect(main.textContent).not.toMatch(/pinjam buku/i);
    });
  });

  describe('3. Pencarian Kata Kunci (q) & Sinkronisasi URL', () => {
    it('menyaring daftar buku berdasarkan judul atau nama penulis dan menyinkronkan search params URL', async () => {
      const user = userEvent.setup();
      setAuthToken('mock-jwt-2');
      const { router } = renderAppAt('/readlist');

      expect(
        await screen.findByRole('button', {
          name: 'Clean Code: A Handbook of Agile Software Craftsmanship',
        }),
      ).toBeInTheDocument();

      const searchInput = screen.getByLabelText<HTMLInputElement>('Cari buku di Readlist');
      await user.type(searchInput, 'Martin{enter}');

      await waitFor(() => {
        expect(router.state.location.search).toMatchObject({ q: 'Martin' });
      });

      // Buku yang cocok muncul, yang tidak cocok tersembunyi
      expect(
        await screen.findByRole('button', {
          name: 'Clean Code: A Handbook of Agile Software Craftsmanship',
        }),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('button', {
          name: 'Structure and Interpretation of Computer Programs',
        }),
      ).not.toBeInTheDocument();

      expect(screen.getByText('1 Judul Tersimpan')).toBeInTheDocument();
    });

    it('menampilkan empty state pencarian jika tidak ada buku yang cocok dan tombol Reset mengembalikan daftar', async () => {
      const user = userEvent.setup();
      setAuthToken('mock-jwt-2');
      const { router } = renderAppAt('/readlist');

      expect(
        await screen.findByRole('button', {
          name: 'Clean Code: A Handbook of Agile Software Craftsmanship',
        }),
      ).toBeInTheDocument();

      const searchInput = screen.getByLabelText<HTMLInputElement>('Cari buku di Readlist');
      await user.type(searchInput, 'JudulTidakAdaDiDunia{enter}');

      expect(
        await screen.findByRole('heading', { name: 'Buku tidak ditemukan di Readlist' }),
      ).toBeInTheDocument();

      const resetBtn = screen.getByRole('button', { name: 'Reset Pencarian' });
      await user.click(resetBtn);

      await waitFor(() => {
        expect(router.state.location.search).toEqual({});
      });

      expect(
        await screen.findByRole('button', {
          name: 'Clean Code: A Handbook of Agile Software Craftsmanship',
        }),
      ).toBeInTheDocument();
    });
  });

  describe('4. Panel Detail Snapshot & Fallback Deskripsi', () => {
    it('memilih item membuka panel detail sisi kanan dan menyinkronkan workId di URL', async () => {
      const user = userEvent.setup();
      setAuthToken('mock-jwt-2');
      const { router } = renderAppAt('/readlist');

      // Klik judul buku Clean Code untuk membuka panel detail (workId: OL82563W)
      const bookTitleBtn = await screen.findByRole('button', {
        name: 'Clean Code: A Handbook of Agile Software Craftsmanship',
      });
      await user.click(bookTitleBtn);

      await waitFor(() => {
        expect(router.state.location.search).toMatchObject({ workId: 'OL82563W' });
      });

      const detailPanels = await screen.findAllByLabelText('Panel Detail Snapshot Readlist');
      expect(detailPanels.length).toBeGreaterThanOrEqual(1);
      const detailPanel = detailPanels[0];

      // Cek deskripsi yang tersimpan pada Clean Code
      expect(
        within(detailPanel).getByText(/panduan praktik penulisan kode/i),
      ).toBeInTheDocument();

      // Cek tombol tutup panel detail
      const closeBtn = within(detailPanel).getByLabelText('Tutup panel detail');
      await user.click(closeBtn);

      await waitFor(() => {
        expect(screen.queryByLabelText('Panel Detail Snapshot Readlist')).not.toBeInTheDocument();
        expect(router.state.location.search).not.toHaveProperty('workId');
      });
    });

    it('menampilkan teks fallback informatif jika deskripsi tidak tersedia saat disimpan', async () => {
      const user = userEvent.setup();
      setAuthToken('mock-jwt-2');
      renderAppAt('/readlist');

      // Buku Structure and Interpretation of Computer Programs memiliki description: null di mock seed
      const book2Btn = await screen.findByRole('button', {
        name: 'Structure and Interpretation of Computer Programs',
      });
      await user.click(book2Btn);

      const detailPanels = await screen.findAllByLabelText('Panel Detail Snapshot Readlist');
      const detailPanel = detailPanels[0];

      expect(
        within(detailPanel).getByText(
          'Deskripsi tidak tersedia saat buku ini disimpan ke Readlist.',
        ),
      ).toBeInTheDocument();
    });

    it('dapat menutup panel detail menggunakan tombol Escape keyboard', async () => {
      const user = userEvent.setup();
      setAuthToken('mock-jwt-2');
      renderAppAt('/readlist');

      const bookTitleBtn = await screen.findByRole('button', {
        name: 'Clean Code: A Handbook of Agile Software Craftsmanship',
      });
      await user.click(bookTitleBtn);

      expect((await screen.findAllByLabelText('Panel Detail Snapshot Readlist'))[0]).toBeInTheDocument();

      // Tekan tombol Escape
      fireEvent.keyDown(window, { key: 'Escape' });

      await waitFor(() => {
        expect(screen.queryByLabelText('Panel Detail Snapshot Readlist')).not.toBeInTheDocument();
      });
    });
  });

  describe('5. Aksi Hapus dari Readlist', () => {
    it('menghapus buku memanggil DELETE /api/v1/readlist/{workId}, memunculkan toast, dan menyegarkan daftar', async () => {
      const user = userEvent.setup();
      setAuthToken('mock-jwt-2');
      renderAppAt('/readlist');

      expect(
        await screen.findByRole('button', {
          name: 'Clean Code: A Handbook of Agile Software Craftsmanship',
        }),
      ).toBeInTheDocument();
      expect(screen.getByText('2 Judul Tersimpan')).toBeInTheDocument();

      // Klik tombol Hapus pada buku Clean Code
      const deleteButtons = await screen.findAllByRole('button', {
        name: /Hapus Clean Code: A Handbook of Agile Software Craftsmanship dari Readlist/i,
      });
      await user.click(deleteButtons[0]);

      // Muncul dialog konfirmasi
      const confirmDialog = await screen.findByRole('dialog', { name: 'Hapus dari Readlist?' });
      expect(confirmDialog).toBeInTheDocument();

      const confirmBtn = within(confirmDialog).getByRole('button', { name: 'Hapus Buku' });
      await user.click(confirmBtn);

      // Verifikasi buku terhapus dari daftar
      await waitFor(() => {
        expect(
          screen.queryByRole('button', {
            name: 'Clean Code: A Handbook of Agile Software Craftsmanship',
          }),
        ).not.toBeInTheDocument();
      });

      // Total berkurang menjadi 1
      expect(screen.getByText('1 Judul Tersimpan')).toBeInTheDocument();

      // Toast muncul
      expect(await screen.findByText('Buku dihapus dari Readlist')).toBeInTheDocument();
    });
  });

  describe('6. Empty State Readlist Kosong & Navigasi ke /public-books', () => {
    it('menampilkan empty state informatif bagi User yang belum memiliki item dan tombol mengarahkan ke /public-books', async () => {
      setAuthToken('mock-jwt-3'); // User Siti (belum memiliki item Readlist di mock seed)
      renderAppAt('/readlist');

      const emptySection = await screen.findByLabelText('Readlist masih kosong');

      expect(
        within(emptySection).getByRole('heading', { name: 'Readlist Anda Masih Kosong' }),
      ).toBeInTheDocument();

      expect(
        within(emptySection).getByText(/Anda belum menyimpan referensi buku publik/i),
      ).toBeInTheDocument();

      const exploreBtn = within(emptySection).getByRole('button', { name: /Jelajah Buku Publik/i });
      expect(exploreBtn).toBeInTheDocument();

      const exploreLink = within(emptySection).getByRole('link');
      expect(exploreLink).toHaveAttribute('href', '/public-books');
    });
  });
});
