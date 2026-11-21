import { createFileRoute } from '@tanstack/react-router';
import { RoutePlaceholder } from '../components/layout/RoutePlaceholder';

export const Route = createFileRoute('/login')({
  component: LoginPage,
});

function LoginPage() {
  return (
    <RoutePlaceholder
      kicker="Autentikasi Satu Pintu"
      title="Masuk ke JejakBaca"
      description="Masuk menggunakan Email atau NIM untuk meminjam Buku Perpustakaan, mengelola Readlist, atau membuka Workspace Admin."
      issueRef="Tahap berikutnya: #14"
      summary="Form login validasi zod, tombol pengisi kredensial cepat pada Mode Mock, serta auto-redirect sesuai peran User/Admin akan dibangun pada Issue #14."
      action={{
        label: 'Daftar Akun User Baru',
        to: '/register',
      }}
    />
  );
}
