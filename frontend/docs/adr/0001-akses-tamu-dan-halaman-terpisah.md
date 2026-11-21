---
status: accepted
---

# Halaman Katalog Terpisah, Akses Tamu Read-Only, dan Lazy Fetch Deskripsi Publik

Frontend memisahkan **Katalog Perpustakaan** dan **Jelajah Buku Publik** pada rute terpisah, mengizinkan Tamu melihat daftar serta deskripsi buku sebelum masuk, dan hanya memanggil detail deskripsi Open Library (`/works/{id}.json`) secara *lazy* saat pengguna membuka detail buku.

## Considered Options

- **Pemisahan Halaman**: Memilih rute terpisah daripada satu feed gabungan agar perbedaan aksi (*Pinjam* vs *Readlist*) dan sumber paginasi (SQLite vs Open Library) terlihat tegas.
- **Akses Awal**: Memilih mode *read-only* untuk Tamu (mengarahkan ke `/login` hanya saat klik *Pinjam* atau *+ Readlist*) daripada mengunci seluruh situs di balik layar Login agar demo dan penelusuran katalog langsung nyaman.
- **Pengambilan Deskripsi**: Memilih *lazy fetch* saat detail buku dibuka daripada memanggil `/works/{id}.json` untuk seluruh hasil pencarian sekaligus agar terhindar dari masalah *N+1 requests* dan *rate limit* Open Library.
