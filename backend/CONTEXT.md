# Backend

Layanan API untuk autentikasi pengguna dan admin, manajemen Buku Perpustakaan, transaksi Peminjaman, Readlist pengguna, serta integrasi Open Library API dan Crossref API.

## Language

### Aktor & Akses

**User**:
Pengguna terdaftar (mahasiswa/anggota perpustakaan) yang teridentifikasi oleh NIM serta email unik, dan berhak meminjam Buku Perpustakaan serta mengelola Readlist.
_Avoid_: Member, customer, peminjam

**Admin**:
Petugas perpustakaan yang akunnya disediakan melalui *seed* sistem untuk melakukan CRUD Buku Perpustakaan dan memantau seluruh Peminjaman, tanpa memiliki fitur meminjam buku atau Readlist.
_Avoid_: Superadmin, operator, staff

**Tamu**:
Pengunjung tanpa token autentikasi yang hanya dapat membaca katalog serta deskripsi buku tanpa hak melakukan Peminjaman atau mengubah Readlist.
_Avoid_: Guest user, anonim

### Katalog & Transaksi

**Buku Perpustakaan**:
Judul buku milik perpustakaan UNTAD yang dibuat dan dikelola oleh Admin dengan jumlah stok eksemplar tertentu serta deskripsi wajib; satu-satunya jenis buku yang dapat dipinjam dan dikembalikan.
_Avoid_: Buku lokal, koleksi internal

**Buku Publik**:
Data referensi buku eksternal dari satu sumber Public API (Open Library) yang hanya dapat dilihat deskripsinya dan disimpan ke Readlist, serta tidak dapat dipinjam maupun dikembalikan.
_Avoid_: Buku eksternal, buku gratis

**Jurnal Publik**:
Data referensi artikel dan karya ilmiah eksternal dari Crossref API (`GET /api/v1/public-journals`) yang bersifat *read-only* dan terpisah sepenuhnya dari transaksi Peminjaman maupun Readlist.
_Avoid_: Buku Perpustakaan, item Readlist

**Peminjaman**:
Transaksi pengambilan satu eksemplar Buku Perpustakaan secara *self-service* oleh User dengan kuota maksimal 3 buku aktif bersamaan, larangan duplikasi judul aktif, dan jatuh tempo 7 hari.
_Avoid_: Sewa, booking, pemesanan

**Terlambat**:
Status Peminjaman aktif yang telah melewati tanggal jatuh tempo pengembalian, ditandai sebagai indikator peringatan tanpa perhitungan denda uang.
_Avoid_: Denda, penalti

**Readlist**:
Daftar bacaan pribadi milik User yang secara eksklusif menyimpan snapshot metadata Buku Publik sebagai penanda referensi, terpisah sepenuhnya dari transaksi Peminjaman.
_Avoid_: Wishlist, keranjang pinjam, favorit perpus
