# Issue #16: [Frontend] Aksi Peminjaman Mandiri (Self-Service) di Katalog Perpustakaan & Intent Pasca-Login

## What to build

Menghidupkan alur transaksi **Peminjaman** *self-service* langsung dari **Katalog Perpustakaan** (`/`) beserta penanganan intent pasca-login bagi **Tamu** dan pembedaan peran bagi **Admin**.

**User** yang sudah masuk dapat meminjam **Buku Perpustakaan** dengan satu klik tombol merah sirkulasi **Pinjam**, melihat stok dan status kepemilikan pinjaman terbarui otomatis, serta menerima pesan jelas bila menyentuh batas kuota 3 buku, duplikasi judul aktif, atau stok habis. **Tamu** diarahkan ke `/login` lalu dikembalikan ke detail buku yang sama untuk menyelesaikan aksi secara eksplisit, sementara **Admin** diarahkan ke **Workspace Admin**.

## Acceptance criteria

- [ ] Tombol aksi sirkulasi merah (`#D90000`) **Pinjam** tersedia pada item dan panel detail **Buku Perpustakaan** yang stoknya tersedia.
- [ ] Saat **Tamu** menekan **Pinjam**, aplikasi mengarahkan ke `/login?redirect=/?bookId=<id>` (mempertahankan konteks buku); setelah berhasil masuk sebagai **User**, aplikasi kembali ke `/` dengan panel detail buku tersebut terbuka tanpa mengeksekusi peminjaman otomatis.
- [ ] Saat **User** menekan **Pinjam**, aplikasi memanggil `POST /api/v1/loans`, menampilkan *loading state* di tombol, memunculkan *toast* keberhasilan (informasi jatuh tempo 7 hari), dan menyegarkan daftar katalog, detail buku (`stockAvailable`, `isBorrowedByMe`), serta ringkasan peminjaman.
- [ ] Buku yang sedang dipinjam oleh **User** (`isBorrowedByMe: true`) menampilkan indikator status *Sedang Anda Pinjam* dan menonaktifkan tombol **Pinjam**; buku dengan `stockAvailable === 0` menampilkan status *Stok Habis* dan tombol nonaktif.
- [ ] Error aturan bisnis dari backend (`LOAN_LIMIT_EXCEEDED`, `DUPLICATE_ACTIVE_LOAN`, `OUT_OF_STOCK`) ditampilkan sebagai umpan balik Bahasa Indonesia yang jelas dan informatif (termasuk menyebut batas maksimal 3 buku aktif tanpa menyebut denda uang).
- [ ] Saat pengguna berrole **Admin** melihat **Katalog Perpustakaan**, tombol **Pinjam** tidak ditampilkan dan diganti tautan/aksi untuk mengelola buku di **Workspace Admin** (`/admin/books`).
- [ ] Tersedia test otomatis (Vitest + React Testing Library) untuk alur Tamu → redirect intent, User meminjam sukses, penanganan error kuota/duplikat/stok habis, dan tampilan peran Admin.

## Blocked by

- #14
- #15
