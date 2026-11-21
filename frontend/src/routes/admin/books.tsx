import { createFileRoute } from '@tanstack/react-router';
import { StatusBadge } from '../../components/ui/StatusBadge';

export const Route = createFileRoute('/admin/books')({
  component: AdminBooksPage,
});

function AdminBooksPage() {
  return (
    <section className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border)] pb-3">
        <h2 className="text-base font-bold text-[var(--color-ink)]">
          Kelola Buku Perpustakaan
        </h2>
        <StatusBadge tone="info">Tahap berikutnya: #21 & #22</StatusBadge>
      </div>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--color-ink-muted)]">
        Ringkasan statistik GraphQL adminOverview, daftar koleksi katalog Admin, serta side drawer CRUD Tambah/Edit/Hapus Buku Perpustakaan akan dibangun pada Issue #21 dan #22.
      </p>
    </section>
  );
}
