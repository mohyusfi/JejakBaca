import { useState, type FormEvent } from 'react';
import {
  createFileRoute,
  Link,
  Navigate,
  useNavigate,
} from '@tanstack/react-router';
import { AlertCircle, ArrowRight, BookOpen, KeyRound, Lock, Mail, Sparkles, User } from 'lucide-react';
import { z } from 'zod';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { isApiError } from '../lib/api-error';
import { getPostLoginRedirect } from '../lib/auth-redirect';
import { isMockModeEnabled } from '../lib/env';
import { authService } from '../services/auth-service';

const loginSchema = z.object({
  identifier: z.string().trim().min(1, 'Email atau NIM wajib diisi'),
  password: z.string().min(1, 'Kata sandi wajib diisi'),
});

type LoginErrors = Partial<Record<'identifier' | 'password', string>>;

export const Route = createFileRoute('/login')({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search.redirect === 'string' ? search.redirect : undefined,
  }),
  component: LoginPage,
});

function LoginPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { user, isHydrating, setSession } = useAuth();
  const { showToast } = useToast();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<LoginErrors>({});
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

    const validation = loginSchema.safeParse({ identifier, password });
    if (!validation.success) {
      const fieldErrors: LoginErrors = {};
      for (const issue of validation.error.issues) {
        const fieldName = issue.path[0] as keyof LoginErrors;
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
      const payload = await authService.login({
        identifier: validation.data.identifier,
        password: validation.data.password,
      });

      setSession(payload);
      showToast({
        title: 'Berhasil Masuk',
        description: `Selamat datang kembali, ${payload.user.name}.`,
        tone: 'success',
      });

      const destination = getPostLoginRedirect(payload.user.role, search.redirect);
      await navigate({ to: destination as never });
    } catch (err) {
      if (isApiError(err)) {
        if (err.status === 401) {
          setGeneralError(
            err.message || 'Email/NIM atau kata sandi salah. Silakan periksa kembali kredensial Anda.',
          );
        } else {
          setGeneralError(err.message || 'Gagal masuk ke sistem. Silakan coba beberapa saat lagi.');
        }
      } else {
        setGeneralError('Tidak dapat terhubung ke server. Silakan periksa koneksi Anda.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickFill = (demoId: string, demoPass: string) => {
    setIdentifier(demoId);
    setPassword(demoPass);
    setErrors({});
    setGeneralError(null);
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-md flex-col justify-center px-4 py-8 sm:px-6">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-[var(--radius-control)] border border-[var(--color-primary-border)] bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
          <BookOpen className="h-6 w-6" aria-hidden="true" />
        </div>
        <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-primary)]">
          Autentikasi Satu Pintu
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-[var(--color-ink)]">
          Masuk ke JejakBaca
        </h1>
        <p className="mt-1.5 text-xs text-[var(--color-ink-subtle)]">
          Masuk menggunakan Email atau NIM untuk mengakses Peminjaman, Readlist, atau Workspace Admin.
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
            id="identifier"
            name="identifier"
            type="text"
            label="Email atau NIM"
            placeholder="mis. andi@untad.ac.id atau F55122001"
            value={identifier}
            onChange={(e) => {
              setIdentifier(e.target.value);
              if (errors.identifier) {
                setErrors((prev) => ({ ...prev, identifier: undefined }));
              }
            }}
            error={errors.identifier}
            leadingIcon={<Mail className="h-4 w-4" />}
            autoComplete="username"
            disabled={isSubmitting}
          />

          <Input
            id="password"
            name="password"
            type="password"
            label="Kata Sandi"
            placeholder="••••••••"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (errors.password) {
                setErrors((prev) => ({ ...prev, password: undefined }));
              }
            }}
            error={errors.password}
            leadingIcon={<Lock className="h-4 w-4" />}
            autoComplete="current-password"
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
            Masuk ke Akun
          </Button>
        </form>

        {isMockModeEnabled() && (
          <div
            data-testid="mock-quick-login"
            className="mt-6 border-t border-[var(--color-border)] pt-5"
          >
            <div className="mb-2 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" aria-hidden="true" />
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-ink-muted)]">
                Akun Demo (Mode Mock)
              </span>
            </div>
            <p className="mb-3 text-[11px] text-[var(--color-ink-subtle)]">
              Klik salah satu tombol untuk mengisi kredensial demo secara instan:
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => handleQuickFill('andi@untad.ac.id', 'mahasiswa123')}
                className="justify-start text-left"
                leftIcon={<User className="h-3.5 w-3.5 text-[var(--color-primary)]" />}
              >
                <span className="truncate">Demo User (Mahasiswa)</span>
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => handleQuickFill('admin@untad.ac.id', 'admin123')}
                className="justify-start text-left"
                leftIcon={<KeyRound className="h-3.5 w-3.5 text-[var(--color-danger)]" />}
              >
                <span className="truncate">Demo Admin (Petugas)</span>
              </Button>
            </div>
          </div>
        )}

        <div className="mt-6 border-t border-[var(--color-border)] pt-4 text-center text-xs text-[var(--color-ink-subtle)]">
          Belum memiliki akun mahasiswa?{' '}
          <Link
            to="/register"
            search={{ redirect: search.redirect }}
            className="font-semibold text-[var(--color-primary)] hover:underline"
          >
            Daftar Akun User Baru
          </Link>
        </div>
      </div>
    </div>
  );
}
