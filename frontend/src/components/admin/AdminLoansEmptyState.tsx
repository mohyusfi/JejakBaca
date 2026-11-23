import { BookCheck, RotateCcw } from 'lucide-react';
import type { LoanStatusFilter } from '../../types/domain';
import { Button } from '../ui/Button';

interface AdminLoansEmptyStateProps {
  status: LoanStatusFilter;
  q: string;
  onResetFilters: () => void;
}

function getEmptyCopy(status: LoanStatusFilter, q: string) {
  if (q.trim()) {
    return {
      title: 'Tidak ada peminjaman yang cocok dengan pencarian',
      description: `Tidak ditemukan transaksi peminjaman untuk kata kunci "${q.trim()}". Coba periksa ejaan judul buku, nama mahasiswa, atau NIM.`,
    };
  }

  switch (status) {
    case 'overdue':
      return {
        title: 'Tidak ada peminjaman berstatus Terlambat',
        description: 'Seluruh peminjaman aktif saat ini masih berada dalam batas waktu jatuh tempo.',
      };
    case 'returned':
      return {
        title: 'Belum ada riwayat buku yang dikembalikan',
        description: 'Transaksi pengembalian buku oleh mahasiswa akan tercatat di sini.',
      };
    case 'borrowed':
      return {
        title: 'Tidak ada peminjaman aktif saat ini',
        description: 'Belum ada Buku Perpustakaan yang sedang dipinjam oleh mahasiswa.',
      };
    default:
      return {
        title: 'Belum ada data transaksi peminjaman',
        description: 'Riwayat dan peminjaman aktif mahasiswa akan muncul di sini.',
      };
  }
}

export function AdminLoansEmptyState({
  status,
  q,
  onResetFilters,
}: AdminLoansEmptyStateProps) {
  const copy = getEmptyCopy(status, q);
  const canReset = Boolean(q.trim() || status !== 'borrowed');

  return (
    <div className="flex flex-col items-center justify-center rounded-[var(--radius-card)] border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface)] px-6 py-12 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-surface-subtle)] text-[var(--color-ink-muted)]">
        <BookCheck className="h-5 w-5" aria-hidden="true" />
      </div>
      <h3 className="mt-3 text-base font-bold text-[var(--color-ink)]">{copy.title}</h3>
      <p className="mt-1 max-w-md text-sm text-[var(--color-ink-muted)]">{copy.description}</p>
      {canReset && (
        <Button type="button" variant="secondary" size="sm" className="mt-4" onClick={onResetFilters}>
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          Reset Filter
        </Button>
      )}
    </div>
  );
}
