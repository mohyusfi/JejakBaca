import { createFileRoute } from '@tanstack/react-router';
import { RoutePlaceholder } from '../components/layout/RoutePlaceholder';

export const Route = createFileRoute('/public-books')({
  component: PublicBooksPage,
});

function PublicBooksPage() {
  return (
    <RoutePlaceholder
      kicker="Referensi Open Library"
      title="Jelajah Buku Publik"
      description="Cari referensi Buku Publik melalui proxy Open Library dan simpan ke Readlist pribadi. Buku Publik tidak untuk dipinjam."
      issueRef="Tahap berikutnya: #18 & #19"
      summary="Zona terpisah untuk Buku Publik siap digunakan. Pencarian Open Library, chip topik UNTAD, pengambilan deskripsi secara lazy, dan aksi + Readlist akan dibangun di Issue #18 dan #19."
      action={{
        label: 'Kembali ke Katalog Perpustakaan',
        to: '/',
      }}
    />
  );
}
