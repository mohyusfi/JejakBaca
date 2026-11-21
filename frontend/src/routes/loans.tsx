import { createFileRoute } from '@tanstack/react-router';
import { RoutePlaceholder } from '../components/layout/RoutePlaceholder';

export const Route = createFileRoute('/loans')({
  component: MyLoansPage,
});

function MyLoansPage() {
  return (
    <RoutePlaceholder
      kicker="Sirkulasi Mahasiswa"
      title="Peminjaman Saya"
      description="Pantau Buku Perpustakaan yang sedang dipinjam, tenggat 7 hari, peringatan Terlambat, serta riwayat pengembalian."
      issueRef="Tahap berikutnya: #14 & #17"
      summary="Halaman khusus User terautentikasi. Guard peran akan aktif pada Issue #14, sedangkan ringkasan GraphQL myOverview dan tombol pengembalian buku akan dibangun di Issue #17."
      action={{
        label: 'Masuk ke Akun',
        to: '/login',
      }}
    />
  );
}
