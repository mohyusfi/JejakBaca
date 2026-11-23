import { useNavigate } from '@tanstack/react-router';
import { useAuth } from './useAuth';
import { useBorrowBook } from './useLoans';
import { useToast } from './useToast';
import { isApiError } from '../lib/api-error';

export interface UseBorrowActionParams {
  id: number;
  title: string;
  stockAvailable: number;
  isBorrowedByMe?: boolean;
}

export function useBorrowAction(book: UseBorrowActionParams) {
  const { actor } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const borrowMutation = useBorrowBook();

  const handleBorrow = (e?: React.MouseEvent) => {
    e?.stopPropagation();

    // 1. Jika Tamu, arahkan ke login dengan intent redirect kembali ke buku ini
    if (actor === 'guest') {
      void navigate({
        to: '/login',
        search: { redirect: `/?bookId=${book.id}` },
      });
      return;
    }

    // 2. Jika Admin, tidak ada aksi pinjam (admin mengelola di /admin/books)
    if (actor === 'admin') {
      void navigate({ to: '/admin/books' });
      return;
    }

    // 3. Jika User, eksekusi peminjaman mandiri
    borrowMutation.mutate(book.id, {
      onSuccess: () => {
        showToast({
          tone: 'success',
          title: 'Peminjaman Berhasil',
          description: `Buku "${book.title}" berhasil dipinjam. Jatuh tempo: 7 hari ke depan.`,
        });
      },
      onError: (err) => {
        let message = 'Terjadi kesalahan saat memproses peminjaman buku.';
        if (isApiError(err)) {
          if (err.code === 'LOAN_LIMIT_EXCEEDED') {
            message = 'Batas maksimal 3 peminjaman aktif tercapai. Harap kembalikan buku terlebih dahulu.';
          } else if (err.code === 'DUPLICATE_ACTIVE_LOAN') {
            message = 'Anda masih meminjam judul buku yang sama.';
          } else if (err.code === 'OUT_OF_STOCK') {
            message = 'Stok buku ini sedang habis.';
          } else {
            message = err.message || message;
          }
        } else if (err instanceof Error) {
          message = err.message;
        }

        showToast({
          tone: 'error',
          title: 'Gagal Meminjam Buku',
          description: message,
        });
      },
    });
  };

  const isBorrowed = Boolean(book.isBorrowedByMe);
  const isOutOfStock = book.stockAvailable <= 0;
  const isDisabled = isBorrowed || isOutOfStock || borrowMutation.isPending;

  let buttonLabel = 'Pinjam';
  if (isBorrowed) {
    buttonLabel = 'Sedang Anda Pinjam';
  } else if (isOutOfStock) {
    buttonLabel = 'Stok Habis';
  }

  return {
    actor,
    handleBorrow,
    isLoading: borrowMutation.isPending,
    isBorrowed,
    isOutOfStock,
    isDisabled,
    buttonLabel,
  };
}
