import { useState, type FormEvent } from 'react';
import {
  createFileRoute,
  Link,
  Navigate,
  useNavigate,
} from '@tanstack/react-router';
import { AlertCircle, ArrowRight, IdCard, Lock, Mail, User, UserPlus } from 'lucide-react';
import { z } from 'zod';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { isApiError } from '../lib/api-error';
import { getPostLoginRedirect } from '../lib/auth-redirect';
import { authService } from '../services/auth-service';

const registerSchema = z.object({
  name: z.string().trim().min(1, 'Nama lengkap wajib diisi'),
  nim: z.string().trim().min(1, 'NIM wajib diisi'),
  email: z.string().trim().min(1, 'Email wajib diisi').email('Format email tidak valid'),
  password: z.string().min(6, 'Kata sandi minimal 6 karakter'),
});

type RegisterErrors = Partial<Record<'name' | 'nim' | 'email' | 'password', string>>;

export const Route = createFileRoute('/register')({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search.redirect === 'string' ? search.redirect : undefined,
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { user, isHydrating, setSession } = useAuth();
  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [nim, setNim] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<RegisterErrors>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Jika sudah memiliki sesi aktif dan tidak sedang hidrasi, alihkan otomatis
  if (!isHydrating && user) {
    const destination = getPostLoginRedirect(user.role, search.redirect);
    return <Navigate to={destination as never} replace />;
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setGeneralError(null);

    const validation = registerSchema.safeParse({ name, nim, email, password });
    if (!validation.success) {
      const fieldErrors: RegisterErrors = {};
      for (const issue of validation.error.issues) {
        const fieldName = issue.path[0] as keyof RegisterErrors;
        if (!fieldErrors[fieldName]) {
          fieldErrors[fieldName] = issue.message;
        }
      }
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      const payload = await authService.register({
        name: validation.data.name,
        nim: validation.data.nim,
        email: validation.data.email,
        password: validation.data.password,
      });

      // Auto-login langsung pasca-registrasi berhasil
      setSession(payload);
      showToast({
        title: 'Pendaftaran Berhasil',
        description: `Selamat datang di JejakBaca, ${payload.user.name}. Sesi Anda telah aktif.`,
        tone: 'success',
      });

      const destination = getPostLoginRedirect(payload.user.role, search.redirect);
      await navigate({ to: destination as never });
    } catch (err) {
      if (isApiError(err)) {
        if (err.status === 409) {
          setGeneralError(err.message || 'Pendaftaran gagal karena data sudah terdaftar.');
          if (err.details && err.details.length > 0) {
            const fieldErrors: RegisterErrors = {};
            for (const d of err.details) {
              if (d.field in registerSchema.shape) {
                fieldErrors[d.field as keyof RegisterErrors] = d.message;
              }
            }
            setErrors(fieldErrors);
          }
        } else {
          setGeneralError(err.message || 'Gagal mendaftar akun baru. Silakan coba kembali.');
        }
      } else {
        setGeneralError('Tidak dapat terhubung ke server. Silakan periksa koneksi Anda.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-md flex-col justify-center px-4 py-8 sm:px-6">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-[var(--radius-control)] border border-[var(--color-primary-border)] bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
          <UserPlus className="h-6 w-6" aria-hidden="true" />
        </div>
        <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-primary)]">
          Pendaftaran Mahasiswa
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-[var(--color-ink)]">
          Daftar Akun JejakBaca
        </h1>
        <p className="mt-1.5 text-xs text-[var(--color-ink-subtle)]">
          Daftarkan akun User untuk meminjam Buku Perpustakaan dan menyimpan referensi di Readlist.
        </p>
      </div>

      <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-xs sm:p-8">
        {generalError && (
          <div
            role="alert"
            aria-live="assertive"
            className="mb-5 flex items-start gap-2.5 rounded-[var(--radius-control)] border border-[var(--color-danger-border)] bg-[var(--color-danger-surface)] p-3 text-xs font-medium text-[var(--color-danger)]"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <div className="leading-snug">{generalError}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <Input
            id="name"
            name="name"
            type="text"
            label="Nama Lengkap"
            placeholder="mis. Budi Santoso"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (errors.name) {
                setErrors((prev) => ({ ...prev, name: undefined }));
              }
            }}
            error={errors.name}
            leadingIcon={<User className="h-4 w-4" />}
            autoComplete="name"
            disabled={isSubmitting}
          />

          <Input
            id="nim"
            name="nim"
            type="text"
            label="NIM (Nomor Induk Mahasiswa)"
            placeholder="mis. F55122099"
            value={nim}
            onChange={(e) => {
              setNim(e.target.value);
              if (errors.nim) {
                setErrors((prev) => ({ ...prev, nim: undefined }));
              }
            }}
            error={errors.nim}
            leadingIcon={<IdCard className="h-4 w-4" />}
            disabled={isSubmitting}
          />

          <Input
            id="email"
            name="email"
            type="email"
            label="Email Kampus / Pribadi"
            placeholder="mis. budi@untad.ac.id"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errors.email) {
                setErrors((prev) => ({ ...prev, email: undefined }));
              }
            }}
            error={errors.email}
            leadingIcon={<Mail className="h-4 w-4" />}
            autoComplete="email"
            disabled={isSubmitting}
          />

          <Input
            id="password"
            name="password"
            type="password"
            label="Kata Sandi"
            placeholder="Minimal 6 karakter"
            helperText="Gunakan minimal 6 karakter kombinasi alfanumerik."
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (errors.password) {
                setErrors((prev) => ({ ...prev, password: undefined }));
              }
            }}
            error={errors.password}
            leadingIcon={<Lock className="h-4 w-4" />}
            autoComplete="new-password"
            disabled={isSubmitting}
          />

          <Button
            type="submit"
            variant="primary"
            size="md"
            className="w-full justify-center"
            isLoading={isSubmitting}
            rightIcon={<ArrowRight className="h-4 w-4" />}
          >
            Daftar & Masuk Otomatis
          </Button>
        </form>

        <div className="mt-6 border-t border-[var(--color-border)] pt-4 text-center text-xs text-[var(--color-ink-subtle)]">
          Sudah memiliki akun mahasiswa?{' '}
          <Link
            to="/login"
            search={{ redirect: search.redirect }}
            className="font-semibold text-[var(--color-primary)] hover:underline"
          >
            Masuk ke Akun
          </Link>
        </div>
      </div>
    </div>
  );
}
