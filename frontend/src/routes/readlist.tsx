import { createFileRoute } from '@tanstack/react-router';
import { UserRouteGuard } from '../components/layout/RouteGuard';
import { RoutePlaceholder } from '../components/layout/RoutePlaceholder';

export const Route = createFileRoute('/readlist')({
  component: MyReadlistPage,
});

function MyReadlistPage() {
  return (
    <UserRouteGuard>
      <RoutePlaceholder
        kicker="Referensi Tersimpan"
        title="Readlist Saya"
        description="Daftar snapshot metadata Buku Publik yang Anda tandai dari Jelajah Buku Publik untuk dibaca ulang atau dihapus."
        issueRef="Tahap berikutnya: #14 & #20"
        summary="Halaman khusus User terautentikasi. Guard peran telah aktif pada Issue #14, sedangkan daftar snapshot Readlist, pencarian, panel detail, dan aksi hapus akan dibangun di Issue #20."
        action={{
          label: 'Jelajah Buku Publik',
          to: '/public-books',
        }}
      />
    </UserRouteGuard>
  );
}
