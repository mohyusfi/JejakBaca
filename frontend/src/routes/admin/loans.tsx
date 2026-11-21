import { createFileRoute } from '@tanstack/react-router';
import { StatusBadge } from '../../components/ui/StatusBadge';

export const Route = createFileRoute('/admin/loans')({
  component: AdminLoansPage,
});

function AdminLoansPage() {
  return (
    <section className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border)] pb-3">
        <h2 className="text-base font-bold text-[var(--color-ink)]">
          Pantau Peminjaman Mahasiswa
        </h2>
        <StatusBadge tone="info">Tahap berikutnya: #23</StatusBadge>
      </div>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--color-ink-muted)]">
        Tabel pantauan peminjaman seluruh mahasiswa beserta identitas NIM, filter status (Aktif/Terlambat/Dikembalikan), dan pencarian akan dibangun pada Issue #23.
      </p>
    </section>
  );
}
