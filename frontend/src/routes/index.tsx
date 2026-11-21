import { createFileRoute } from '@tanstack/react-router';
import { RoutePlaceholder } from '../components/layout/RoutePlaceholder';

export const Route = createFileRoute('/')({
  component: LibraryCatalogPage,
});

function LibraryCatalogPage() {
  return (
    <RoutePlaceholder
      kicker="Koleksi Sirkulasi UNTAD"
      title="Katalog Perpustakaan"
      description="Telusuri Buku Perpustakaan UNTAD yang tersedia untuk Peminjaman mandiri (kuota maks 3 buku, jatuh tempo 7 hari)."
      issueRef="Tahap berikutnya: #15 & #16"
      summary="Cangkang navigasi, token desain 60-30-10, dan klien REST/GraphQL telah siap. Daftar koleksi Buku Perpustakaan, filter ketersediaan stok, panel detail inline, dan aksi Pinjam akan dibangun di Issue #15 dan #16."
      action={{
        label: 'Lihat Jelajah Buku Publik',
        to: '/public-books',
      }}
    />
  );
}
