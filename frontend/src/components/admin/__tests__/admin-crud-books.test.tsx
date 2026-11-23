// @vitest-environment jsdom
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
import { bookService } from '../../../services/book-service';

function renderAppAt(initialUrl = '/admin/books') {
  const history = createMemoryHistory({ initialEntries: [initialUrl] });
  const router = createRouter({
    routeTree,
    history,
  });

  const view = render(<RouterProvider router={router} />);
  return { ...view, router };
}

function loginAsMockAdmin() {
  setAuthToken('mock-jwt-1');
}

describe('Workspace Admin: CRUD Buku Perpustakaan — Issue #22', () => {
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
    loginAsMockAdmin();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('1. Validasi Form & Pratinjau Sampul (Zod)', () => {
    it('membuka side drawer tambah buku dan memvalidasi input wajib pada form klien', async () => {
      const user = userEvent.setup();
      renderAppAt('/admin/books');

      // Pastikan halaman admin books termuat
      expect(await screen.findByRole('heading', { name: /Daftar Koleksi Buku/i })).toBeInTheDocument();

      // Klik tombol Tambah Buku
      const addBtn = screen.getByRole('button', { name: /Tambah Buku/i });
      await user.click(addBtn);

      // Drawer terbuka
      const drawer = screen.getByRole('dialog', { name: /Tambah Buku Perpustakaan/i });
      expect(drawer).toBeInTheDocument();

      // Submit form kosong
      const submitBtn = within(drawer).getByRole('button', { name: /^Tambah Buku$/i });
      await user.click(submitBtn);

      // Validasi error field wajib muncul
      expect(await within(drawer).findByText(/Judul buku wajib diisi/i)).toBeInTheDocument();
      expect(within(drawer).getByText(/Penulis wajib diisi/i)).toBeInTheDocument();
      expect(within(drawer).getByText(/Deskripsi buku wajib diisi/i)).toBeInTheDocument();
    });

    it('memvalidasi total stok minimal 1 saat tambah buku dan memvalidasi format URI URL cover', async () => {
      const user = userEvent.setup();
      renderAppAt('/admin/books');

      await screen.findByRole('heading', { name: /Daftar Koleksi Buku/i });
      await user.click(screen.getByRole('button', { name: /Tambah Buku/i }));

      const drawer = screen.getByRole('dialog', { name: /Tambah Buku Perpustakaan/i });

      // Isi stok 0
      const stockInput = within(drawer).getByLabelText(/Total Stok/i);
      await user.clear(stockInput);
      await user.type(stockInput, '0');

      // Isi URL cover tidak valid
      const coverInput = within(drawer).getByLabelText(/URL Sampul Buku/i);
      await user.type(coverInput, 'bukan-url-yang-sah');

      // Submit
      const submitBtn = within(drawer).getByRole('button', { name: /^Tambah Buku$/i });
      await user.click(submitBtn);

      expect(await within(drawer).findByText(/Total stok minimal 1 eksemplar/i)).toBeInTheDocument();
      expect(within(drawer).getByText(/Format URL sampul tidak valid/i)).toBeInTheDocument();
    });

    it('menampilkan pratinjau sampul 2:3 dinamis saat coverUrl diisi dan fallback saat kosong', async () => {
      const user = userEvent.setup();
      renderAppAt('/admin/books');

      await screen.findByRole('heading', { name: /Daftar Koleksi Buku/i });
      await user.click(screen.getByRole('button', { name: /Tambah Buku/i }));

      const drawer = screen.getByRole('dialog', { name: /Tambah Buku Perpustakaan/i });
      const coverInput = within(drawer).getByLabelText(/URL Sampul Buku/i);

      // Saat kosong -> pesan fallback
      expect(within(drawer).getByText(/URL sampul kosong\. Sistem otomatis menampilkan sampul tipografis/i)).toBeInTheDocument();

      // Ketik URL valid
      await user.type(coverInput, 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c');

      // Keterangan pratinjau berubah
      expect(
        within(drawer).getByText(/Pratinjau visual langsung dari tautan gambar yang diisi/i),
      ).toBeInTheDocument();
    });
  });

  describe('2. Tambah Buku (POST /api/v1/books)', () => {
    it('berhasil menambahkan buku baru, menutup drawer, menampilkan toast, dan memperbarui daftar koleksi', async () => {
      const user = userEvent.setup();
      renderAppAt('/admin/books');

      await screen.findByRole('heading', { name: /Daftar Koleksi Buku/i });
      await user.click(screen.getByRole('button', { name: /Tambah Buku/i }));

      const drawer = screen.getByRole('dialog', { name: /Tambah Buku Perpustakaan/i });

      // Isi form buku baru
      await user.type(within(drawer).getByLabelText(/Judul Buku \*/i), 'Jaringan Komputer Lanjut UNTAD');
      await user.type(within(drawer).getByLabelText(/Penulis \*/i), 'Dr. Ir. Ahmad Dahlan');
      await user.type(within(drawer).getByLabelText(/ISBN/i), '978-602-9999-00-1');
      await user.type(within(drawer).getByLabelText(/Tahun Terbit/i), '2024');

      // Pilih saran kategori Informatika
      await user.click(within(drawer).getByRole('button', { name: 'Informatika' }));

      // Isi total stok
      const stockInput = within(drawer).getByLabelText(/Total Stok \*/i);
      await user.clear(stockInput);
      await user.type(stockInput, '7');

      // Isi deskripsi
      await user.type(
        within(drawer).getByLabelText(/Deskripsi Buku \*/i),
        'Buku teks ajar jaringan komputer berbasis topologi kampus dan routing BGP.',
      );

      // Submit Tambah Buku
      await user.click(within(drawer).getByRole('button', { name: /^Tambah Buku$/i }));

      // Toast sukses muncul
      expect(await screen.findByText('Buku Berhasil Ditambahkan')).toBeInTheDocument();

      // Drawer otomatis tertutup
      await waitFor(() => {
        expect(screen.queryByRole('dialog', { name: /Tambah Buku Perpustakaan/i })).not.toBeInTheDocument();
      });

      // Buku baru muncul di tabel koleksi buku
      const table = await screen.findByRole('table');
      expect(within(table).getAllByText('Jaringan Komputer Lanjut UNTAD').length).toBeGreaterThanOrEqual(1);
      expect(within(table).getByText(/Dr\. Ir\. Ahmad Dahlan/i)).toBeInTheDocument();
    });
  });

  describe('3. Edit Buku & Penanganan Error STOCK_BELOW_BORROWED (PUT /api/v1/books/{id})', () => {
    it('berhasil membuka drawer edit dengan isian terpopulasi dan menyimpan perubahan', async () => {
      const user = userEvent.setup();
      renderAppAt('/admin/books');

      await screen.findByRole('heading', { name: /Daftar Koleksi Buku/i });

      // Temukan tombol Edit buku "Struktur Data dan Algoritma" (id: 1)
      const editButtons = await screen.findAllByRole('button', {
        name: /Edit Struktur Data dan Algoritma/i,
      });
      await user.click(editButtons[0]);

      // Drawer terbuka dalam mode Edit
      const drawer = screen.getByRole('dialog', { name: /Edit Buku Perpustakaan/i });
      expect(drawer).toBeInTheDocument();

      // Nilai form sudah terisi dengan data buku yang dipilih
      const titleInput = within(drawer).getByLabelText(/Judul Buku \*/i);
      expect(titleInput).toHaveValue('Struktur Data dan Algoritma');

      // Edit judul buku
      await user.clear(titleInput);
      await user.type(titleInput, 'Struktur Data dan Algoritma Edisi Revisi UNTAD');

      // Simpan Perubahan
      await user.click(within(drawer).getByRole('button', { name: /Simpan Perubahan/i }));

      // Toast sukses muncul
      expect(await screen.findByText('Buku Berhasil Diperbarui')).toBeInTheDocument();

      // Drawer tertutup dan judul terbarui di tabel
      await waitFor(() => {
        expect(screen.queryByRole('dialog', { name: /Edit Buku Perpustakaan/i })).not.toBeInTheDocument();
      });

      const table = await screen.findByRole('table');
      expect(
        within(table).getAllByText('Struktur Data dan Algoritma Edisi Revisi UNTAD').length,
      ).toBeGreaterThanOrEqual(1);
    });

    it('menangani error 409 STOCK_BELOW_BORROWED saat total stok diedit di bawah jumlah yang sedang dipinjam', async () => {
      const user = userEvent.setup();
      renderAppAt('/admin/books');

      // Buku ID 1 (Struktur Data dan Algoritma) pada mock seed sedang dipinjam aktif 1 eksemplar
      const editButtons = await screen.findAllByRole('button', {
        name: /Edit Struktur Data dan Algoritma/i,
      });
      await user.click(editButtons[0]);

      const drawer = screen.getByRole('dialog', { name: /Edit Buku Perpustakaan/i });

      // Ubah total stok menjadi 0 (kurang dari 1 yang sedang dipinjam)
      const stockInput = within(drawer).getByLabelText(/Total Stok \*/i);
      await user.clear(stockInput);
      await user.type(stockInput, '0');

      // Submit
      await user.click(within(drawer).getByRole('button', { name: /Simpan Perubahan/i }));

      // Pesan error STOCK_BELOW_BORROWED tampil di dalam form
      const errorElements = await within(drawer).findAllByText(
        /Stok total tidak boleh lebih kecil dari jumlah buku yang sedang dipinjam/i,
      );
      expect(errorElements.length).toBeGreaterThanOrEqual(1);

      // Form tidak tertutup dan input Admin tetap ada
      expect(drawer).toBeInTheDocument();
      expect(within(drawer).getByLabelText(/Judul Buku \*/i)).toHaveValue('Struktur Data dan Algoritma');
    });
  });

  describe('4. Konfirmasi Hapus & Penanganan BOOK_IN_ACTIVE_LOAN (DELETE /api/v1/books/{id})', () => {
    it('menampilkan dialog konfirmasi hapus dan berhasil menghapus buku yang tidak sedang dipinjam', async () => {
      const user = userEvent.setup();

      // Buat buku contoh yang tidak dipinjam
      await bookService.create({
        title: 'Buku Arsip Sementara',
        author: 'Penulis Arsip',
        stockTotal: 3,
        description: 'Buku uji coba untuk penghapusan.',
      });

      renderAppAt('/admin/books');

      // Cari tombol Hapus pada buku arsip
      const deleteButtons = await screen.findAllByRole('button', {
        name: /Hapus Buku Arsip Sementara/i,
      });
      await user.click(deleteButtons[0]);

      // Dialog konfirmasi terbuka
      const dialog = screen.getByRole('dialog', { name: /Hapus Buku Perpustakaan/i });
      expect(dialog).toBeInTheDocument();
      expect(
        within(dialog).getByText(/Apakah Anda yakin ingin menghapus buku/i),
      ).toBeInTheDocument();
      expect(within(dialog).getByText(/"Buku Arsip Sementara"/i)).toBeInTheDocument();

      // Klik tombol konfirmasi Hapus Buku (berwarna destruktif)
      const confirmBtn = within(dialog).getByRole('button', { name: /^Hapus Buku$/i });
      await user.click(confirmBtn);

      // Toast sukses hapus muncul
      expect(await screen.findByText('Buku Berhasil Dihapus')).toBeInTheDocument();

      // Dialog tertutup dan buku hilang dari daftar
      await waitFor(() => {
        expect(screen.queryByRole('dialog', { name: /Hapus Buku Perpustakaan/i })).not.toBeInTheDocument();
      });
      expect(screen.queryByText('Buku Arsip Sementara')).not.toBeInTheDocument();
    });

    it('menampilkan pesan informatif saat menghapus buku yang masih dalam peminjaman aktif (409 BOOK_IN_ACTIVE_LOAN)', async () => {
      const user = userEvent.setup();
      renderAppAt('/admin/books');

      // Buku ID 1 (Struktur Data dan Algoritma) sedang dipinjam aktif pada mock seed
      const deleteButtons = await screen.findAllByRole('button', {
        name: /Hapus Struktur Data dan Algoritma/i,
      });
      await user.click(deleteButtons[0]);

      const dialog = screen.getByRole('dialog', { name: /Hapus Buku Perpustakaan/i });
      const confirmBtn = within(dialog).getByRole('button', { name: /^Hapus Buku$/i });

      await user.click(confirmBtn);

      // Toast error penolakan 409 BOOK_IN_ACTIVE_LOAN muncul
      expect(await screen.findByText('Gagal Menghapus Buku')).toBeInTheDocument();
      expect(
        screen.getByText(/Buku sedang dipinjam oleh mahasiswa dan tidak dapat dihapus/i),
      ).toBeInTheDocument();

      // Buku tetap ada di tabel
      const table = await screen.findByRole('table');
      expect(within(table).getByText('Struktur Data dan Algoritma')).toBeInTheDocument();
    });
  });
});
