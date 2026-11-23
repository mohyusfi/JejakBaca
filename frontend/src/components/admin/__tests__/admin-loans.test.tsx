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
import { loanService } from '../../../services/loan-service';
import type { AdminLoanItem } from '../../../types/domain';

function renderAppAt(initialUrl = '/admin/loans') {
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

describe('Workspace Admin: Pantau Peminjaman Mahasiswa & Identitas NIM — Issue #23', () => {
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

  it('menggunakan filter default borrowed, menampilkan identitas peminjam (Nama, NIM tabular-nums, Email), dan menyorot Terlambat tanpa denda', async () => {
    loginAsMockAdmin();
    renderAppAt('/admin/loans');

    const borrowedTab = await screen.findByRole('tab', { name: 'Dipinjam' });
    expect(borrowedTab).toHaveAttribute('aria-selected', 'true');

    // Pinjaman aktif & terlambat tampil, pinjaman returned (#103 "Kalkulus dan Geometri Analitik Jilid 1") tidak tampil
    expect(await screen.findAllByText('Struktur Data dan Algoritma')).not.toHaveLength(0);
    expect(screen.getAllByText('Basis Data Lanjut & Transaksi').length).toBeGreaterThan(0);
    expect(screen.queryByText('Kalkulus dan Geometri Analitik Jilid 1')).not.toBeInTheDocument();

    // Identitas peminjam: Nama, NIM (font-mono tabular-nums), Email
    const nimElements = screen.getAllByText('F55122001');
    expect(nimElements.length).toBeGreaterThan(0);
    expect(nimElements[0].className).toContain('font-mono');
    expect(nimElements[0].className).toContain('tabular-nums');
    expect(screen.getAllByText('andi@untad.ac.id').length).toBeGreaterThan(0);
    expect(screen.getAllByText('siti@untad.ac.id').length).toBeGreaterThan(0);

    // Sorotan status Terlambat dengan badge merah (#D90000 / critical) tanpa istilah denda
    const overdueBadges = screen
      .getAllByText('Terlambat', { selector: 'span' })
      .map((el) => el.closest('span.rounded-full'))
      .filter((el): el is HTMLElement => el !== null);
    expect(overdueBadges.length).toBeGreaterThan(0);
    expect(overdueBadges[0].className).toContain('text-[var(--color-status-critical-ink)]');

    expect(screen.queryByText(/denda|rupiah|rp\b/i)).not.toBeInTheDocument();
  });

  it('menyinkronkan filter status (overdue, returned, all) ke URL search params', async () => {
    loginAsMockAdmin();
    const user = userEvent.setup();
    const { router } = renderAppAt('/admin/loans');

    await screen.findAllByText('Struktur Data dan Algoritma');

    await user.click(screen.getByRole('tab', { name: 'Terlambat' }));
    await waitFor(() => {
      expect(router.state.location.searchStr).toContain('status=overdue');
    });
    expect(screen.getAllByText('Basis Data Lanjut & Transaksi').length).toBeGreaterThan(0);
    expect(screen.queryByText('Struktur Data dan Algoritma')).not.toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Dikembalikan' }));
    await waitFor(() => {
      expect(router.state.location.searchStr).toContain('status=returned');
    });
    expect(await screen.findAllByText('Kalkulus dan Geometri Analitik Jilid 1')).not.toHaveLength(0);

    await user.click(screen.getByRole('tab', { name: 'Semua' }));
    await waitFor(() => {
      expect(router.state.location.searchStr).toContain('status=all');
    });
    expect(await screen.findAllByText('Struktur Data dan Algoritma')).not.toHaveLength(0);
    expect(screen.getAllByText('Kalkulus dan Geometri Analitik Jilid 1').length).toBeGreaterThan(0);
  });

  it('mendukung pencarian berdasarkan NIM, nama peminjam, dan judul buku serta menampilkan empty state', async () => {
    loginAsMockAdmin();
    const user = userEvent.setup();
    const { router } = renderAppAt('/admin/loans');

    await screen.findAllByText('Struktur Data dan Algoritma');

    const searchInput = screen.getByLabelText('Cari judul buku, nama mahasiswa, atau NIM');

    // Cari berdasarkan NIM Siti (F55122018)
    await user.type(searchInput, 'F55122018{enter}');
    await waitFor(() => {
      expect(router.state.location.searchStr).toContain('q=F55122018');
    });
    expect(await screen.findAllByText('Siti Rahmawati')).not.toHaveLength(0);
    expect(screen.queryByText('Andi Pratama')).not.toBeInTheDocument();

    // Cari NIM yang tidak ada -> empty state
    await user.clear(searchInput);
    await user.type(searchInput, 'F55199999{enter}');
    expect(
      await screen.findByText('Tidak ada peminjaman yang cocok dengan pencarian'),
    ).toBeInTheDocument();

    // Reset filter mengembalikan daftar
    await user.click(screen.getByRole('button', { name: /Reset Filter/i }));
    await waitFor(() => {
      expect(router.state.location.searchStr).toBe('');
    });
    expect(await screen.findAllByText('Struktur Data dan Algoritma')).not.toHaveLength(0);
  });

  it('menampilkan skeleton loading saat memuat dan mendukung paginasi tersinkron URL', async () => {
    loginAsMockAdmin();
    const user = userEvent.setup();

    const makeLoan = (id: number): AdminLoanItem => ({
      id,
      bookId: id,
      bookTitle: `Buku Uji ${id}`,
      bookAuthor: `Penulis ${id}`,
      bookCoverUrl: null,
      status: 'borrowed',
      borrowedAt: '2026-11-10T08:00:00.000Z',
      dueDate: '2026-11-30T08:00:00.000Z',
      returnedAt: null,
      isOverdue: false,
      daysRemaining: 7,
      borrower: {
        id: 10 + id,
        name: `Mahasiswa ${id}`,
        nim: `F551220${String(id).padStart(2, '0')}`,
        email: `mhs${id}@untad.ac.id`,
      },
    });

    const spy = vi.spyOn(loanService, 'getAdminLoans').mockImplementation(async (params) => {
      const page = params?.page ?? 1;
      if (page === 1) {
        return {
          success: true,
          message: 'OK',
          data: [makeLoan(1)],
          meta: { page: 1, limit: 10, total: 15, totalPages: 2 },
        };
      }
      return {
        success: true,
        message: 'OK',
        data: [makeLoan(2)],
        meta: { page: 2, limit: 10, total: 15, totalPages: 2 },
      };
    });

    const { router } = renderAppAt('/admin/loans');

    // Skeleton tampil saat initial load
    expect(await screen.findByLabelText('Memuat daftar peminjaman mahasiswa')).toBeInTheDocument();

    expect(await screen.findAllByText('Buku Uji 1')).not.toHaveLength(0);

    const pagination = screen.getByRole('navigation', { name: 'Paginasi Daftar Peminjaman Admin' });
    const nextButton = within(pagination).getByRole('button', { name: /Berikutnya/i });
    await user.click(nextButton);

    await waitFor(() => {
      expect(router.state.location.searchStr).toContain('page=2');
    });
    expect(await screen.findAllByText('Buku Uji 2')).not.toHaveLength(0);
    expect(spy).toHaveBeenCalledTimes(2);
  });
});
