# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **User (Utama):** Mahasiswa atau anggota perpustakaan UNTAD (teridentifikasi melalui NIM dan email unik) yang mengakses dari ponsel maupun laptop untuk mencari ketersediaan Buku Perpustakaan, melakukan Peminjaman dan pengembalian mandiri (*self-service*), memantau tenggat atau status Terlambat, serta menelusuri Buku Publik dari Open Library untuk disimpan ke Readlist pribadi.
- **Tamu:** Pengunjung tanpa akun atau token autentikasi yang menelusuri Katalog Perpustakaan dan Jelajah Buku Publik beserta deskripsinya secara *read-only* sebelum memutuskan masuk atau mendaftar; diarahkan ke `/login` hanya saat memicu aksi *Pinjam* atau *+ Readlist*.
- **Admin:** Petugas perpustakaan (dengan akun hasil *seed* sistem) yang mengelola data Buku Perpustakaan (CRUD beserta URL cover opsional) dan memantau seluruh Peminjaman aktif maupun Terlambat beserta NIM peminjam di Workspace Admin (`/admin`), tanpa memiliki fitur meminjam buku atau Readlist.

## Product Purpose

**JejakBaca** adalah antarmuka web SPA sistem informasi perpustakaan UNTAD yang menggabungkan layanan Peminjaman dan pengembalian Buku Perpustakaan secara mandiri (*self-service*) dengan penjelajahan referensi Buku Publik dari Open Library API dalam batas domain yang tegas.

Keberhasilan produk berarti:
- Tamu dapat menelusuri koleksi dan membaca deskripsi buku langsung tanpa terhalang layar login.
- User dapat memeriksa stok, meminjam dan mengembalikan Buku Perpustakaan tepat waktu, serta mengkurasi Readlist Buku Publik tanpa kebingungan membedakan buku yang bisa dipinjam dan buku referensi.
- Admin dapat memperbarui koleksi Buku Perpustakaan serta memantau peminjaman aktif dan Terlambat beserta identitas NIM secara cepat dan akurat.

## Positioning

JejakBaca secara ketat memisahkan **Buku Perpustakaan UNTAD** (koleksi milik perpustakaan di SQLite untuk transaksi Peminjaman *self-service* berkuota dan berjatuh tempo) dari **Buku Publik** (referensi eksternal melalui proxy Open Library API yang hanya menyediakan deskripsi *lazy* dan penyimpanan *snapshot* metadata ke Readlist), daripada menggabungkan keduanya ke satu feed atau mengunci katalog di balik login.

## Operating Context

- **Perangkat:** Seimbang antara mobile web (mahasiswa memeriksa katalog, Peminjaman Saya, dan Readlist dari HP) dan desktop/laptop (penelusuran di kampus, operasional Workspace Admin, serta sesi demo proyek).
- **Alur & Halaman Utama:**
  - **Katalog Perpustakaan:** Daftar Buku Perpustakaan UNTAD dengan pencarian, filter kategori/ketersediaan stok, deskripsi, dan aksi Peminjaman.
  - **Jelajah Buku Publik:** Halaman terpisah untuk menelusuri Open Library (diawali chip topik default seperti `computer_science`), detail deskripsi diambil secara *lazy* saat buku dibuka, dan aksi tambah/hapus Readlist.
  - **Peminjaman Saya:** Khusus User terautentikasi; daftar Peminjaman aktif, indikator status Terlambat, tombol pengembalian buku, dan riwayat buku yang telah dikembalikan.
  - **Readlist Saya:** Khusus User terautentikasi; daftar *snapshot* metadata Buku Publik tersimpan untuk dilihat kembali deskripsinya atau dihapus.
  - **Workspace Admin (`/admin`):** Khusus Admin; CRUD Buku Perpustakaan (dengan URL cover opsional) dan pemantauan Buku yang Dipinjam beserta identitas NIM peminjam.
  - **Autentikasi Satu Pintu (`/login`):** Menerima Email atau NIM dengan *auto-redirect* sesuai peran (`USER`/`ADMIN`), disertai registrasi User yang langsung *auto-login*.

## Capabilities and Constraints

- **Aturan Bisnis Peminjaman & Readlist:**
  - Peminjaman berlaku eksklusif untuk Buku Perpustakaan secara *self-service*: kuota maksimal 3 buku aktif bersamaan per User, tidak boleh meminjam judul yang sama secara bersamaan, dan jatuh tempo 7 hari.
  - Status **Terlambat** hanya berupa indikator peringatan ketika melewati tanggal jatuh tempo — tidak ada fitur maupun perhitungan denda uang.
  - Pemisahan domain ketat: Buku Perpustakaan tidak dapat dimasukkan ke Readlist; Buku Publik tidak dapat dipinjam atau dikembalikan.
  - Seluruh akses Open Library diproksi oleh Backend; detail deskripsi (`/works/{id}.json`) wajib diambil secara *lazy* saat detail buku dibuka untuk menghindari *N+1 requests* dan *rate limit*.
  - UI wajib menyediakan tampilan *fallback* informatif (berbasis subjek/tahun terbit) untuk Buku Publik yang tidak memiliki deskripsi di Open Library, serta menangani cover buku yang opsional/kosong.
  - Item Readlist disimpan sebagai *snapshot* metadata di SQLite sehingga tidak otomatis berubah mengikuti pembaruan Open Library.
- **Glosarium Domain Wajib (`CONTEXT.md`):**
  - Aktor: **User** (hindari: member, customer, peminjam), **Admin** (hindari: superadmin, operator, staff), **Tamu** (hindari: guest user, anonim).
  - Koleksi & Halaman: **Buku Perpustakaan** (hindari: buku lokal, koleksi internal), **Buku Publik** (hindari: buku eksternal, buku gratis), **Katalog Perpustakaan** (hindari: daftar buku utama, etalase), **Jelajah Buku Publik** (hindari: pencarian eksternal, katalog gabungan).
  - Transaksi & Area Kerja: **Peminjaman** / **Peminjaman Saya** (hindari: sewa, booking, pemesanan, riwayat transaksi, keranjang pinjam), **Terlambat** (hindari: denda, penalti), **Readlist** / **Readlist Saya** (hindari: wishlist, keranjang pinjam, koleksi favorit, bookmark), **Workspace Admin** (hindari: backoffice, panel operator).
- **Kendala Teknis & Kontrak API:**
  - Frontend berada di `frontend/` menggunakan React 19, TypeScript, dan Vite dengan arsitektur *layer-based* (`src/routes/`, `src/components/`, `src/services/`, `src/hooks/`, `src/lib/`, `src/types/`, `src/assets/`) serta stack target TanStack Router, TanStack Query + `fetch`, dan Tailwind CSS (`AGENTS.md`).
  - Integrasi Backend menggunakan arsitektur hybrid: REST API JSON (`/api/v1/*`) untuk autentikasi dan seluruh operasi CRUD/transaksi, ditambah 1 endpoint GraphQL read-only (`POST /graphql`) sebagai *query aggregator*, dengan autentikasi JWT stateless berdurasi 24 jam pada header `Authorization: Bearer`.

## Brand Commitments

- **Nama Produk:** JejakBaca
- **Bahasa & Suara:** Bahasa Indonesia semi-formal yang jelas, lugas, dan taat pada glosarium domain.
- **Batasan Visual Mengikat:** Aturan pewarnaan 60-30-10 menggunakan `#007DCC`, `#D90000`, dan `#EEEEEE` (dicatat sesuai komitmen pemilik produk; pemetaan peran visual dan token desain ditetapkan terpisah saat perancangan tampilan).
- **Aset Identitas:** Belum ada logo khusus JejakBaca maupun aset logo resmi UNTAD saat ini.

## Evidence on Hand

- **Spesifikasi & Dokumentasi Nyata:**
  - `../CONTEXT-MAP.md`
  - `CONTEXT.md` dan `../backend/CONTEXT.md`
  - `docs/adr/0001-akses-tamu-dan-halaman-terpisah.md`
  - `../docs/adr/0001-pemisahan-koleksi-pinjam-dan-readlist-publik.md`
  - `../docs/adr/0003-hybrid-rest-graphql-dan-api-versioning.md`
  - `../docs/api/openapi.yaml` dan `../backend/src/graphql/schema.graphql`
- **Sumber Data Nyata:** Data *seed* backend SQLite (akun Admin dan koleksi Buku Perpustakaan) serta respons Open Library API melalui proxy Backend.
- **Ketiadaan yang Tidak Boleh Dikarang:** Belum ada logo khusus JejakBaca/UNTAD, testimoni pengguna, metrik jumlah mahasiswa/buku fiktif, maupun klaim sertifikasi atau dukungan institusi resmi di luar data yang nyata tersedia.

## Product Principles

1. **Batas Domain Selalu Tegas:** Setiap permukaan dan aksi harus membuat perbedaan antara Buku Perpustakaan (pinjam/kembali berstok) dan Buku Publik (referensi Open Library untuk Readlist) langsung dipahami tanpa ambigu.
2. **Penjelajahan Terbuka Sebelum Masuk:** Tamu bebas menjelajah katalog dan membaca deskripsi; permintaan login hanya muncul tepat pada aksi yang memerlukan akun.
3. **Status Peminjaman Terang Tanpa Denda:** Informasi stok, kuota maksimal 3 buku, tenggat 7 hari, dan peringatan Terlambat disampaikan secara objektif dan membantu tanpa menyiratkan denda uang.
4. **Hemat Permintaan & Tangguh pada Metadata Tak Lengkap:** Deskripsi Buku Publik selalu dimuat secara *lazy* saat detail dibuka, dengan *fallback* informatif ketika deskripsi atau gambar sampul tidak tersedia.
5. **Setara di Ponsel dan Laptop:** Seluruh alur utama bagi Tamu, User, maupun Admin dirancang untuk keterbacaan dan kelancaran operasi yang setara di perangkat mobile dan desktop.
