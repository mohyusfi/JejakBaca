// @vitest-environment jsdom
import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setAuthToken } from '../../../lib/api-client';
import { ApiError } from '../../../lib/api-error';
import { buildMockToken, resetMockState } from '../../../lib/mock/mock-transport';
import { queryClient } from '../../../lib/query-client';
import { routeTree } from '../../../routeTree.gen';
import { readlistService } from '../../../services/readlist-service';

function renderAppAt(initialUrl = '/public-books') {
  const history = createMemoryHistory({ initialEntries: [initialUrl] });
  const router = createRouter({
    routeTree,
    history,
  });

  const view = render(<RouterProvider router={router} />);
  return { ...view, router };
}

describe('Aksi Tambah/Hapus Readlist di Jelajah Buku Publik & Intent Pasca-Login — Issue #19', () => {
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

  describe('1. Alur Tamu & Intent Pasca-Login', () => {
    it('saat Tamu menekan tombol + Readlist di kartu buku, aplikasi mengarahkan ke /login?redirect=/public-books?workId=<workId>', async () => {
      const user = userEvent.setup();
      const { router } = renderAppAt('/public-books');

      // Kartu buku Designing Data-Intensive Applications (workId: OL17860744W)
      const card = await screen.findByTestId('public-book-card-OL17860744W');
      expect(card).toBeInTheDocument();

      const addBtn = within(card).getByRole('button', { name: /\+ Readlist/i });
      expect(addBtn).toBeInTheDocument();

      await user.click(addBtn);

      await waitFor(() => {
        expect(router.state.location.pathname).toBe('/login');
        expect(router.state.location.search).toEqual({
          redirect: '/public-books?workId=OL17860744W',
        });
      });
    });

    it('saat Tamu menekan tombol + Readlist di panel detail buku publik, aplikasi mengarahkan ke /login?redirect=/public-books?workId=<workId>', async () => {
      const user = userEvent.setup();
      const { router } = renderAppAt('/public-books?workId=OL17860744W');

      const panel = await screen.findByRole('region', {
        name: /Panel Detail Buku Publik/i,
      });
      expect(panel).toBeInTheDocument();

      const addBtn = await within(panel).findByRole('button', { name: /\+ Readlist/i });
      expect(addBtn).toBeInTheDocument();

      await user.click(addBtn);

      await waitFor(() => {
        expect(router.state.location.pathname).toBe('/login');
        expect(router.state.location.search).toEqual({
          redirect: '/public-books?workId=OL17860744W',
        });
      });
    });

    it('setelah Tamu login sebagai User, aplikasi kembali ke /public-books dengan panel detail terbuka tanpa otomatis menyimpan ke Readlist', async () => {
      const user = userEvent.setup();
      // Tamu berniat menyimpan buku OL17860744W yang belum ada di Readlist Andi
      const { router } = renderAppAt('/login?redirect=/public-books?workId=OL17860744W');

      await screen.findByRole('heading', { name: /Masuk ke JejakBaca/i });

      // Isi form login dengan kredensial User demo (Andi Pratama)
      const idInput = screen.getByLabelText(/Email atau NIM/i);
      const passInput = screen.getByLabelText(/Kata Sandi/i);
      const submitBtn = screen.getByRole('button', { name: /Masuk ke Akun/i });

      await user.type(idInput, 'F55122001');
      await user.type(passInput, 'mahasiswa123');
      await user.click(submitBtn);

      // Kembali ke /public-books dengan query param workId=OL17860744W
      await waitFor(() => {
        expect(router.state.location.pathname).toBe('/public-books');
        expect(router.state.location.search).toEqual({
          workId: 'OL17860744W',
        });
      });

      // Panel detail buku otomatis terbuka
      const panel = await screen.findByRole('region', {
        name: /Panel Detail Buku Publik/i,
      });
      expect(panel).toBeInTheDocument();
      expect(
        await within(panel).findByRole('heading', {
          name: /Designing Data-Intensive Applications/i,
        }),
      ).toBeInTheDocument();

      // Memastikan buku TIDAK otomatis tersimpan ke Readlist (tombol tetap "+ Readlist", tidak ada badge "Di Readlist")
      expect(
        within(panel).getByRole('button', { name: /\+ Readlist/i }),
      ).toBeInTheDocument();
      expect(within(panel).queryByText('Di Readlist')).not.toBeInTheDocument();
      expect(
        within(panel).queryByRole('button', { name: /Hapus dari Readlist/i }),
      ).not.toBeInTheDocument();
    });
  });

  describe('2. Aksi User: Tambah & Hapus Readlist', () => {
    it('saat User menekan + Readlist pada kartu buku, memanggil POST /api/v1/readlist, status inReadlist aktif, dan toast muncul', async () => {
      // Login sebagai User (Andi Pratama)
      setAuthToken(buildMockToken(2));
      const user = userEvent.setup();
      renderAppAt('/public-books');

      // Buku OL17860744W (Designing Data-Intensive Applications) belum ada di Readlist Andi
      const card = await screen.findByTestId('public-book-card-OL17860744W');
      expect(card).toBeInTheDocument();

      // Belum ada badge Di Readlist
      expect(within(card).queryByText('Di Readlist')).not.toBeInTheDocument();

      const addBtn = within(card).getByRole('button', { name: /\+ Readlist/i });
      await user.click(addBtn);

      // Toast sukses muncul
      expect(await screen.findByText('Berhasil Ditambahkan ke Readlist')).toBeInTheDocument();
      expect(
        screen.getByText(/berhasil disimpan ke Readlist Anda/i),
      ).toBeInTheDocument();

      // Tombol pada kartu berubah menjadi "Hapus dari Readlist"
      expect(
        await within(card).findByRole('button', { name: /Hapus dari Readlist/i }),
      ).toBeInTheDocument();

      // Badge Di Readlist muncul pada kartu
      expect(within(card).getByText('Di Readlist')).toBeInTheDocument();
    });

    it('saat User menekan Hapus dari Readlist pada kartu buku, memanggil DELETE /api/v1/readlist/{workId}, status inReadlist nonaktif, dan toast muncul', async () => {
      setAuthToken(buildMockToken(2));
      const user = userEvent.setup();

      // Buku OL82563W (Clean Code) sudah ada di Readlist Andi secara default seed
      renderAppAt('/public-books');

      const card = await screen.findByTestId('public-book-card-OL82563W');
      expect(card).toBeInTheDocument();

      // Sudah ada badge Di Readlist dan tombol Hapus dari Readlist
      expect(within(card).getByText('Di Readlist')).toBeInTheDocument();
      const removeBtn = within(card).getByRole('button', { name: /Hapus dari Readlist/i });

      await user.click(removeBtn);

      // Toast sukses hapus muncul
      expect(await screen.findByText('Berhasil Dihapus dari Readlist')).toBeInTheDocument();

      // Tombol kembali menjadi "+ Readlist"
      expect(
        await within(card).findByRole('button', { name: /\+ Readlist/i }),
      ).toBeInTheDocument();

      // Badge Di Readlist hilang
      expect(within(card).queryByText('Di Readlist')).not.toBeInTheDocument();
    });

    it('User dapat menambah dan menghapus Readlist melalui panel detail buku', async () => {
      setAuthToken(buildMockToken(2));
      const user = userEvent.setup();
      // Gunakan OL17860744W yang belum ada di Readlist Andi
      renderAppAt('/public-books?workId=OL17860744W');

      const panel = await screen.findByRole('region', {
        name: /Panel Detail Buku Publik/i,
      });
      expect(panel).toBeInTheDocument();

      // 1. Tambah dari panel detail
      const addBtn = await within(panel).findByRole('button', { name: /\+ Readlist/i });
      await user.click(addBtn);

      expect(await screen.findByText('Berhasil Ditambahkan ke Readlist')).toBeInTheDocument();

      // Tombol di panel detail berubah menjadi "Hapus dari Readlist"
      const removeBtn = await within(panel).findByRole('button', {
        name: /Hapus dari Readlist/i,
      });
      expect(removeBtn).toBeInTheDocument();
      expect(within(panel).getByText('Di Readlist')).toBeInTheDocument();

      // 2. Hapus dari panel detail
      await user.click(removeBtn);

      expect(await screen.findByText('Berhasil Dihapus dari Readlist')).toBeInTheDocument();
      expect(
        await within(panel).findByRole('button', { name: /\+ Readlist/i }),
      ).toBeInTheDocument();
      expect(within(panel).queryByText('Di Readlist')).not.toBeInTheDocument();
    });
  });

  describe('3. Penanganan Error Backend', () => {
    it('menangani error ALREADY_IN_READLIST dengan pesan ramah tanpa merusak tampilan daftar buku', async () => {
      setAuthToken(buildMockToken(2));
      const user = userEvent.setup();

      // Mock readlistService.add agar melempar ApiError ALREADY_IN_READLIST
      vi.spyOn(readlistService, 'add').mockRejectedValueOnce(
        new ApiError('Buku sudah tersimpan di Readlist.', 409, 'ALREADY_IN_READLIST'),
      );

      renderAppAt('/public-books');

      const card = await screen.findByTestId('public-book-card-OL17860744W');
      const addBtn = within(card).getByRole('button', { name: /\+ Readlist/i });

      await user.click(addBtn);

      // Toast error muncul dengan pesan jelas
      expect(await screen.findByText('Gagal Menambahkan ke Readlist')).toBeInTheDocument();
      expect(
        screen.getByText(/Buku ini sudah tersimpan di Readlist Anda/i),
      ).toBeInTheDocument();

      // Tampilan daftar buku tetap utuh dan berfungsi
      expect(screen.getByTestId('public-book-card-OL17860744W')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /Jelajah Buku Publik/i })).toBeInTheDocument();
    });

    it('menangani error UPSTREAM_API_ERROR dengan pesan ramah tanpa merusak tampilan daftar buku', async () => {
      setAuthToken(buildMockToken(2));
      const user = userEvent.setup();

      vi.spyOn(readlistService, 'add').mockRejectedValueOnce(
        new ApiError(
          'Upstream Open Library service unavailable (502)',
          502,
          'UPSTREAM_API_ERROR',
        ),
      );

      renderAppAt('/public-books');

      const card = await screen.findByTestId('public-book-card-OL17860744W');
      const addBtn = within(card).getByRole('button', { name: /\+ Readlist/i });

      await user.click(addBtn);

      // Toast error muncul dengan pesan upstream error
      expect(await screen.findByText('Gagal Menambahkan ke Readlist')).toBeInTheDocument();
      expect(
        screen.getByText(/Layanan Open Library sedang tidak dapat dijangkau/i),
      ).toBeInTheDocument();

      // Tampilan daftar tetap utuh
      expect(screen.getByTestId('public-book-card-OL17860744W')).toBeInTheDocument();
    });
  });

  describe('4. Peran Admin: Penyembunyian Tombol Readlist', () => {
    it('pengguna berrole Admin TIDAK melihat tombol + Readlist maupun Hapus dari Readlist di kartu buku dan panel detail', async () => {
      // Sesi login Admin (id: 1)
      setAuthToken(buildMockToken(1));
      renderAppAt('/public-books?workId=OL82563W');

      // Periksa kartu buku
      const card = await screen.findByTestId('public-book-card-OL82563W');
      expect(card).toBeInTheDocument();

      expect(
        within(card).queryByRole('button', { name: /\+ Readlist/i }),
      ).not.toBeInTheDocument();
      expect(
        within(card).queryByRole('button', { name: /Hapus dari Readlist/i }),
      ).not.toBeInTheDocument();

      // Tombol Lihat Detail tetap ada untuk Admin
      expect(
        within(card).getByRole('button', { name: /Sedang Dilihat|Lihat Detail/i }),
      ).toBeInTheDocument();

      // Periksa panel detail
      const panel = await screen.findByRole('region', {
        name: /Panel Detail Buku Publik/i,
      });
      expect(panel).toBeInTheDocument();

      expect(
        within(panel).queryByRole('button', { name: /\+ Readlist/i }),
      ).not.toBeInTheDocument();
      expect(
        within(panel).queryByRole('button', { name: /Hapus dari Readlist/i }),
      ).not.toBeInTheDocument();
    });
  });
});
