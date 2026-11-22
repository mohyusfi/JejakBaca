import {
  createMemoryHistory,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getAuthToken, setAuthToken } from '../../../lib/api-client';
import { resetMockState } from '../../../lib/mock/mock-transport';
import { queryClient } from '../../../lib/query-client';
import { routeTree } from '../../../routeTree.gen';

function renderAppAt(initialUrl = '/') {
  const history = createMemoryHistory({ initialEntries: [initialUrl] });
  const router = createRouter({
    routeTree,
    history,
  });

  const view = render(<RouterProvider router={router} />);
  return { ...view, router };
}

describe('Autentikasi Satu Pintu, Sesi JWT, & Guard Peran — Issue #14', () => {
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

  describe('1. Halaman /login', () => {
    it('memvalidasi kolom identifier dan password dengan Zod saat submit kosong', async () => {
      renderAppAt('/login');

      expect(await screen.findByRole('heading', { name: /Masuk ke JejakBaca/i })).toBeInTheDocument();

      const submitBtn = screen.getByRole('button', { name: /Masuk ke Akun/i });
      fireEvent.click(submitBtn);

      expect(await screen.findByText('Email atau NIM wajib diisi')).toBeInTheDocument();
      expect(screen.getByText('Kata sandi wajib diisi')).toBeInTheDocument();
    });

    it('menampilkan pesan error yang jelas saat kredensial salah (401 UNAUTHORIZED)', async () => {
      const user = userEvent.setup();
      renderAppAt('/login');

      await screen.findByRole('heading', { name: /Masuk ke JejakBaca/i });

      const idInput = screen.getByLabelText(/Email atau NIM/i);
      const passInput = screen.getByLabelText(/Kata Sandi/i);
      const submitBtn = screen.getByRole('button', { name: /Masuk ke Akun/i });

      await user.type(idInput, 'andi@untad.ac.id');
      await user.type(passInput, 'passwordsalah123');
      await user.click(submitBtn);

      expect(
        await screen.findByRole('alert'),
      ).toHaveTextContent(/Email\/NIM atau kata sandi salah/i);
    });

    it('berhasil login menggunakan NIM dan melakukan redirect ke tujuan', async () => {
      const user = userEvent.setup();
      const { router } = renderAppAt('/login?redirect=/loans');

      await screen.findByRole('heading', { name: /Masuk ke JejakBaca/i });

      const idInput = screen.getByLabelText(/Email atau NIM/i);
      const passInput = screen.getByLabelText(/Kata Sandi/i);
      const submitBtn = screen.getByRole('button', { name: /Masuk ke Akun/i });

      // Gunakan NIM demo milik Andi Pratama: F55122001
      await user.type(idInput, 'F55122001');
      await user.type(passInput, 'mahasiswa123');
      await user.click(submitBtn);

      await waitFor(() => {
        expect(router.state.location.pathname).toBe('/loans');
      });

      expect(getAuthToken()).toBeTruthy();
      expect(screen.getByText('Andi Pratama')).toBeInTheDocument();
    });

    it('selalu mengarahkan akun berrole Admin ke /admin/books pasca-login', async () => {
      const user = userEvent.setup();
      const { router } = renderAppAt('/login?redirect=/loans');

      await screen.findByRole('heading', { name: /Masuk ke JejakBaca/i });

      const idInput = screen.getByLabelText(/Email atau NIM/i);
      const passInput = screen.getByLabelText(/Kata Sandi/i);
      const submitBtn = screen.getByRole('button', { name: /Masuk ke Akun/i });

      await user.type(idInput, 'admin@untad.ac.id');
      await user.type(passInput, 'admin123');
      await user.click(submitBtn);

      await waitFor(() => {
        expect(router.state.location.pathname).toBe('/admin/books');
      });

      expect(await screen.findByRole('heading', { name: /Workspace Admin/i })).toBeInTheDocument();
    });

    it('menyediakan tombol cepat isi kredensial demo saat VITE_USE_MOCK=true', async () => {
      const user = userEvent.setup();
      renderAppAt('/login');

      await screen.findByRole('heading', { name: /Masuk ke JejakBaca/i });

      const quickLoginSection = screen.getByTestId('mock-quick-login');
      expect(quickLoginSection).toBeInTheDocument();

      const userDemoBtn = within(quickLoginSection).getByRole('button', {
        name: /Demo User \(Mahasiswa\)/i,
      });
      await user.click(userDemoBtn);

      const idInput = screen.getByLabelText<HTMLInputElement>(/Email atau NIM/i);
      const passInput = screen.getByLabelText<HTMLInputElement>(/Kata Sandi/i);

      expect(idInput.value).toBe('andi@untad.ac.id');
      expect(passInput.value).toBe('mahasiswa123');
    });

    it('tidak merender bagian akun demo saat VITE_USE_MOCK=false', async () => {
      vi.stubEnv('VITE_USE_MOCK', 'false');
      renderAppAt('/login');

      await screen.findByRole('heading', { name: /Masuk ke JejakBaca/i });
      expect(screen.queryByTestId('mock-quick-login')).not.toBeInTheDocument();
    });
  });

  describe('2. Halaman /register', () => {
    it('memvalidasi kolom Nama, NIM, Email, dan Password (min 6 karakter) dengan Zod', async () => {
      const user = userEvent.setup();
      renderAppAt('/register');

      expect(await screen.findByRole('heading', { name: /Daftar Akun JejakBaca/i })).toBeInTheDocument();

      const submitBtn = screen.getByRole('button', { name: /Daftar & Masuk Otomatis/i });
      await user.click(submitBtn);

      expect(await screen.findByText('Nama lengkap wajib diisi')).toBeInTheDocument();
      expect(screen.getByText('NIM wajib diisi')).toBeInTheDocument();
      expect(screen.getByText('Email wajib diisi')).toBeInTheDocument();

      // Uji panjang sandi minimal 6 karakter
      const passInput = screen.getByLabelText(/Kata Sandi/i);
      await user.type(passInput, '12345');
      await user.click(submitBtn);

      expect(await screen.findByText('Kata sandi minimal 6 karakter')).toBeInTheDocument();
    });

    it('menampilkan error konflik 409 bila Email atau NIM sudah terdaftar', async () => {
      const user = userEvent.setup();
      renderAppAt('/register');

      await screen.findByRole('heading', { name: /Daftar Akun JejakBaca/i });

      await user.type(screen.getByLabelText(/Nama Lengkap/i), 'Mahasiswa Duplikat');
      // NIM sudah terdaftar pada mock seed (F55122001)
      await user.type(screen.getByLabelText(/NIM/i), 'F55122001');
      await user.type(screen.getByLabelText(/Email/i), 'unik@untad.ac.id');
      await user.type(screen.getByLabelText(/Kata Sandi/i), 'password123');

      await user.click(screen.getByRole('button', { name: /Daftar & Masuk Otomatis/i }));

      expect(await screen.findByText('NIM sudah terdaftar.')).toBeInTheDocument();
      expect(screen.getByText('NIM sudah digunakan')).toBeInTheDocument();
    });

    it('berhasil mendaftar, langsung menyimpan sesi (auto-login), dan mengarahkan ke beranda', async () => {
      const user = userEvent.setup();
      const { router } = renderAppAt('/register');

      await screen.findByRole('heading', { name: /Daftar Akun JejakBaca/i });

      await user.type(screen.getByLabelText(/Nama Lengkap/i), 'Ahmad Fauzi');
      await user.type(screen.getByLabelText(/NIM/i), 'F55122099');
      await user.type(screen.getByLabelText(/Email/i), 'ahmad@untad.ac.id');
      await user.type(screen.getByLabelText(/Kata Sandi/i), 'ahmadpass123');

      await user.click(screen.getByRole('button', { name: /Daftar & Masuk Otomatis/i }));

      await waitFor(() => {
        expect(router.state.location.pathname).toBe('/');
      });

      expect(getAuthToken()).toBeTruthy();
      expect(screen.getByText('Ahmad Fauzi')).toBeInTheDocument();
    });
  });

  describe('3. Guard Peran & Proteksi Rute', () => {
    it('mengarahkan Tamu yang mengakses /loans ke /login?redirect=/loans', async () => {
      const { router } = renderAppAt('/loans');

      await waitFor(() => {
        expect(router.state.location.pathname).toBe('/login');
        expect(router.state.location.search).toEqual({ redirect: '/loans' });
      });
    });

    it('mengarahkan Tamu yang mengakses /readlist ke /login?redirect=/readlist', async () => {
      const { router } = renderAppAt('/readlist');

      await waitFor(() => {
        expect(router.state.location.pathname).toBe('/login');
        expect(router.state.location.search).toEqual({ redirect: '/readlist' });
      });
    });

    it('mengarahkan Tamu yang mengakses /admin/books ke /login?redirect=/admin/books', async () => {
      const { router } = renderAppAt('/admin/books');

      await waitFor(() => {
        expect(router.state.location.pathname).toBe('/login');
        expect(router.state.location.search).toEqual({ redirect: '/admin/books' });
      });
    });

    it('mengarahkan Admin yang mengakses rute khusus User (/loans) ke /admin/books', async () => {
      // Simulasikan token login admin
      setAuthToken('mock-jwt-1');
      const { router } = renderAppAt('/loans');

      await waitFor(() => {
        expect(router.state.location.pathname).toBe('/admin/books');
      });
    });

    it('mengarahkan User yang mengakses /admin/books ke beranda (/)', async () => {
      // Simulasikan token login user Andi (id: 2)
      setAuthToken('mock-jwt-2');
      const { router } = renderAppAt('/admin/books');

      await waitFor(() => {
        expect(router.state.location.pathname).toBe('/');
      });
    });

    it('mengizinkan User mengakses /loans dan /readlist secara normal', async () => {
      setAuthToken('mock-jwt-2');
      const { router } = renderAppAt('/loans');

      await waitFor(() => {
        expect(router.state.location.pathname).toBe('/loans');
      });

      expect(await screen.findByRole('heading', { name: /Peminjaman Saya/i })).toBeInTheDocument();
    });
  });

  describe('4. Hidrasi Sesi, Pemulihan 401, & Aksi Keluar (Logout)', () => {
    it('menghapus token dan mengarahkan ke /login bila hidrasi GET /api/v1/auth/me menghasilkan 401', async () => {
      // Set token palsu yang tidak ada di mock state (id: 9999)
      setAuthToken('mock-jwt-9999');
      const { router } = renderAppAt('/loans');

      await waitFor(() => {
        expect(router.state.location.pathname).toBe('/login');
      });

      expect(getAuthToken()).toBeNull();
      expect(await screen.findByText('Sesi berakhir')).toBeInTheDocument();
    });

    it('tombol Keluar menghapus token, membersihkan sesi, dan mengembalikan status ke Tamu', async () => {
      const user = userEvent.setup();
      setAuthToken('mock-jwt-2');
      renderAppAt('/');

      expect(await screen.findByText('Andi Pratama')).toBeInTheDocument();

      const logoutBtn = screen.getByRole('button', { name: /Keluar dari akun/i });
      await user.click(logoutBtn);

      await waitFor(() => {
        expect(getAuthToken()).toBeNull();
        expect(screen.getByRole('link', { name: /Masuk/i })).toBeInTheDocument();
      });
    });
  });
});
