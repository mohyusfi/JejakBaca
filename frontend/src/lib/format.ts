import type { LoanItem } from '../types/domain';

export type StockHealth = 'available' | 'low' | 'empty';

export interface StockSummary {
  health: StockHealth;
  label: string;
  ratioText: string;
}

const DATE_FORMATTER = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

/**
 * Mengklasifikasikan status ketersediaan stok Buku Perpustakaan.
 * Stok menipis didefinisikan sebagai 1 eksemplar tersisa (<= 1 dan > 0).
 */
export function getStockSummary(stockAvailable: number, stockTotal: number): StockSummary {
  const safeAvailable = Math.max(0, stockAvailable);
  const safeTotal = Math.max(0, stockTotal);
  const ratioText = `${safeAvailable}/${safeTotal} tersedia`;

  if (safeAvailable === 0) {
    return {
      health: 'empty',
      label: 'Stok Habis',
      ratioText,
    };
  }

  if (safeAvailable <= 1) {
    return {
      health: 'low',
      label: 'Stok Menipis',
      ratioText,
    };
  }

  return {
    health: 'available',
    label: 'Tersedia',
    ratioText,
  };
}

/**
 * Memformat tanggal ISO ke format ringkas Bahasa Indonesia (mis. "21 Nov 2026").
 */
export function formatDateId(isoDate: string | null | undefined): string {
  if (!isoDate) return '-';
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) return '-';
  return DATE_FORMATTER.format(parsed);
}

/**
 * Memformat label sisa hari jatuh tempo atau keterlambatan secara objektif tanpa istilah denda.
 */
export function formatLoanDueLabel(loan: Pick<LoanItem, 'status' | 'isOverdue' | 'daysRemaining' | 'returnedAt'>): string {
  if (loan.status === 'returned') {
    return loan.returnedAt
      ? `Dikembalikan ${formatDateId(loan.returnedAt)}`
      : 'Sudah Dikembalikan';
  }

  if (loan.isOverdue || loan.daysRemaining < 0) {
    const lateDays = Math.abs(loan.daysRemaining);
    return lateDays > 0
      ? `Terlambat ${lateDays} hari`
      : 'Terlambat (lewat jatuh tempo)';
  }

  if (loan.daysRemaining === 0) {
    return 'Jatuh tempo hari ini';
  }

  return `${loan.daysRemaining} hari lagi`;
}

/**
 * Memformat daftar penulis Buku Publik dari Open Library.
 */
export function formatAuthors(authors: string[] | null | undefined): string {
  if (!authors || authors.length === 0) {
    return 'Penulis tidak diketahui';
  }
  return authors.join(', ');
}

/**
 * Memformat kuota peminjaman aktif User terhadap batas maksimum 3 buku.
 */
export function formatLoanQuota(activeCount: number, maxQuota = 3): string {
  return `${Math.max(0, activeCount)}/${maxQuota} aktif`;
}
