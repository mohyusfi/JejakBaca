import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import {
  BookCover,
  ConfirmDialog,
  SearchInput,
  StatusBadge,
  ToastProvider,
  useToast,
} from '../index';

function ToastHarness() {
  const { showToast } = useToast();
  return (
    <button
      type="button"
      onClick={() =>
        showToast({
          title: 'Buku berhasil dipinjam',
          description: 'Jatuh tempo 7 hari dari hari ini.',
          tone: 'success',
        })
      }
    >
      Picu Toast
    </button>
  );
}

function SearchHarness() {
  const [value, setValue] = useState('Algoritma');
  return (
    <SearchInput
      label="Cari Buku"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onClear={() => setValue('')}
    />
  );
}

describe('UI Primitives', () => {
  it('BookCover menampilkan fallback tipografis saat coverUrl kosong atau gagal muat', () => {
    const { rerender } = render(
      <BookCover title="Struktur Data" category="Informatika" src={null} />,
    );
    expect(screen.getByLabelText('Sampul tipografis Struktur Data')).toBeInTheDocument();

    rerender(
      <BookCover
        title="Struktur Data"
        category="Informatika"
        src="https://invalid.local/cover.jpg"
      />,
    );
    const img = screen.getByRole('img', { name: 'Sampul buku Struktur Data' });
    fireEvent.error(img);
    expect(screen.getByLabelText('Sampul tipografis Struktur Data')).toBeInTheDocument();
  });

  it('SearchInput membersihkan nilai saat tombol hapus diklik', async () => {
    const user = userEvent.setup();
    render(<SearchHarness />);

    const input = screen.getByLabelText('Cari Buku') as HTMLInputElement;
    expect(input.value).toBe('Algoritma');

    await user.click(screen.getByRole('button', { name: 'Hapus kata kunci pencarian' }));
    expect(input.value).toBe('');
  });

  it('ConfirmDialog menjalankan konfirmasi dan menutup saat Batal atau Escape', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onClose = vi.fn();

    render(
      <ConfirmDialog
        open
        title="Pinjam Buku Ini?"
        description="Batas pengembalian 7 hari."
        confirmLabel="Pinjam"
        confirmTone="circulation"
        onConfirm={onConfirm}
        onClose={onClose}
      />,
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Pinjam' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);

    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('StatusBadge dan ToastProvider bekerja dengan aksesibilitas yang benar', async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <StatusBadge tone="low">Stok Menipis</StatusBadge>
        <ToastHarness />
      </ToastProvider>,
    );

    expect(screen.getByText('Stok Menipis')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Picu Toast' }));
    expect(screen.getByRole('status')).toHaveTextContent('Buku berhasil dipinjam');

    await user.click(screen.getByRole('button', { name: 'Tutup notifikasi' }));
    expect(screen.queryByText('Buku berhasil dipinjam')).not.toBeInTheDocument();
  });
});
