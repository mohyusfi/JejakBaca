# Frontend

Antarmuka web SPA untuk menelusuri Buku Perpustakaan UNTAD dan Buku Publik, melakukan Peminjaman dan pengelolaan Readlist bagi User, serta mengelola koleksi dan memantau peminjaman bagi Admin.

## Language

**Katalog Perpustakaan**:
Halaman publik berisi daftar Buku Perpustakaan yang dikelola Admin lengkap dengan informasi stok tersedia, deskripsi, dan aksi Peminjaman bagi User yang sudah masuk.
_Avoid_: Daftar buku utama, etalase

**Jelajah Buku Publik**:
Halaman terpisah untuk menelusuri Buku Publik dari Open Library (diawali chip topik default) yang hanya menyediakan tampilan deskripsi secara *lazy* dan tombol tambah/hapus Readlist.
_Avoid_: Pencarian eksternal, katalog gabungan

**Peminjaman Saya**:
Halaman khusus User terautentikasi yang menampilkan daftar Peminjaman aktif beserta status Terlambat dan tombol pengembalian buku, serta riwayat buku yang telah dikembalikan.
_Avoid_: Riwayat transaksi, keranjang pinjam

**Readlist Saya**:
Halaman khusus User terautentikasi untuk melihat kembali deskripsi dan menghapus Buku Publik yang telah ditandai.
_Avoid_: Koleksi favorit, bookmark

**Workspace Admin**:
Area rute `/admin` terpisah bagi Admin yang berisi menu pengelolaan CRUD Buku Perpustakaan (dengan URL cover opsional) dan menu pemantauan Buku yang Dipinjam beserta identitas NIM peminjam.
_Avoid_: Backoffice, panel operator
