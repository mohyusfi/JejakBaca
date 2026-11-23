# Issue #17: [Frontend] Peminjaman Saya: Ringkasan GraphQL, Daftar Aktif/Terlambat/Riwayat, & Pengembalian Buku

## What to build

Membangun halaman khusus **User** terautentikasi di `/loans` (**Peminjaman Saya**) untuk memantau seluruh **Peminjaman** aktif, status **Terlambat**, riwayat pengembalian, serta melakukan pengembalian buku secara *self-service*.

Bagian atas halaman menampilkan strip ringkasan kuota peminjaman yang diambil melalui endpoint agregator GraphQL (`POST /graphql` query `myOverview`), sementara daftar transaksi dan aksi pengembalian menggunakan endpoint REST `/api/v1/loans/my` dan `/api/v1/loans/{id}/return`.

## Acceptance criteria

- [ ] Rute `/loans` hanya dapat diakses oleh **User** terautentikasi (**Tamu** diarahkan ke `/login?redirect=/loans`, **Admin** diarahkan ke `/admin/books`).
- [ ] Strip ringkasan di bagian atas halaman memuat data dari `POST /graphql` (`myOverview`) untuk menampilkan kuota peminjaman aktif (`x/3 aktif`), jumlah pinjaman **Terlambat**, dan ringkasan jumlah **Readlist** dengan angka `tabular-nums`.
- [ ] Daftar peminjaman dimuat dari `GET /api/v1/loans/my` dengan tab filter status (`Semua`, `Dipinjam`, `Terlambat`, `Dikembalikan` memetakan ke `all`, `borrowed`, `overdue`, `returned`) serta paginasi yang tersinkron di URL search params.
- [ ] Setiap baris/kartu menampilkan judul buku, penulis, tanggal pinjam, tanggal jatuh tempo (7 hari), sisa hari (`daysRemaining` dengan `tabular-nums`), dan badge merah peringatan **Terlambat** ketika `isOverdue` bernilai `true` — tanpa pernah menampilkan istilah denda atau penalti uang.
- [ ] Peminjaman berstatus `borrowed` (termasuk yang **Terlambat**) menyediakan tombol **Kembalikan** yang membuka dialog konfirmasi ringkas sebelum memanggil `PATCH /api/v1/loans/{id}/return`.
- [ ] Setelah pengembalian berhasil, aplikasi menampilkan *toast* konfirmasi dan otomatis menyegarkan daftar `/loans`, ringkasan `myOverview`, serta cache stok **Katalog Perpustakaan**.
- [ ] Tersedia *skeleton loading* dan *empty state* yang mengarahkan **User** ke **Katalog Perpustakaan** (`/`) bila belum ada peminjaman.
- [ ] Tersedia test otomatis (Vitest + React Testing Library) untuk render ringkasan GraphQL, filter tab status, indikator **Terlambat** tanpa denda, serta alur konfirmasi & eksekusi pengembalian buku.

## Blocked by

- #14
