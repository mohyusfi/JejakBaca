import { createFileRoute } from '@tanstack/react-router';
import { RoutePlaceholder } from '../components/layout/RoutePlaceholder';

export const Route = createFileRoute('/register')({
  component: RegisterPage,
});

function RegisterPage() {
  return (
    <RoutePlaceholder
      kicker="Pendaftaran Mahasiswa"
      title="Daftar Akun JejakBaca"
      description="Buat akun User baru menggunakan Nama, NIM, Email, dan Kata Sandi untuk langsung masuk otomatis."
      issueRef="Tahap berikutnya: #14"
      summary="Form registrasi dengan validasi zod, penanganan konflik Email/NIM (409), dan auto-login pasca daftar akan dibangun pada Issue #14."
      action={{
        label: 'Sudah Punya Akun? Masuk',
        to: '/login',
      }}
    />
  );
}
