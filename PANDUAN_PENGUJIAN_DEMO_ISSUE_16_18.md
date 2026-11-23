# Panduan Skenario Demo Interaktif (UAT)
## Pengujian Fitur Frontend Issue #16, #17, & #18
### Proyek: Sistem Informasi Perpustakaan JejakBaca UNTAD

Dokumen ini merupakan panduan skenario pengujian interaktif (*User Acceptance Testing* / UAT) langkah-demi-langkah berbasis antarmuka grafis browser untuk memverifikasi tiga issue utama frontend:
* **Issue #16:** Aksi Peminjaman Mandiri di Katalog & Intent Pasca-Login
* **Issue #17:** Peminjaman Saya: Ringkasan GraphQL, Status Terlambat, & Pengembalian Buku
* **Issue #18:** Jelajah Buku Publik: Pencarian Open Library, Chip Topik UNTAD, & Lazy Fetch Deskripsi

---

## 🛠️ 1. Persiapan Lingkungan Pengujian (Dual Mode)

Aplikasi JejakBaca dirancang mendukung dua mode pengujian. Pilih salah satu mode sesuai kebutuhan Anda:

### Opsi A: Mode Mock Instan (Rekomendasi untuk Latihan / Uji Cepat Mandiri)
Mode ini berjalan secara *standalone* di sisi frontend tanpa memerlukan server backend Node.js maupun koneksi internet luar:
1. Buka file `.env` pada folder `frontend/` dan pastikan konfigurasi:
   ```env
   VITE_USE_MOCK=true
   VITE_API_BASE_URL=http://localhost:3000
   ```
2. Jalankan development server frontend:
   ```bash
   npm --prefix frontend run dev
   ```
3. Buka browser pada URL: `http://localhost:5173`. Indikator **"Mode Mock"** akan menyala pada header.

---

### Opsi B: Mode Real Full-Stack (Untuk Live Demo di Depan Dosen / Penguji)
Mode ini menghubungkan frontend secara nyata ke server HTTP Node.js native, basis data SQLite, dan proxy upstream Open Library:
1. Jalankan server Backend pada Terminal 1:
   ```bash
   npm --prefix backend start
   ```
   *(Server berjalan pada `http://localhost:3000` dengan seeding admin dan katalog otomatis).*
2. Pada file `frontend/.env`, set:
   ```env
   VITE_USE_MOCK=false
   VITE_API_BASE_URL=http://localhost:3000
   ```
3. Jalankan Frontend pada Terminal 2:
   ```bash
   npm --prefix frontend run dev
   ```
4. Buka browser pada `http://localhost:5173`.

---

## 👥 2. Kredensial Akun & Karakter Data Seed

| Persona | Email / Identifier | Password | Role | Data Awal Bawaan (Seed) |
| :--- | :--- | :--- | :--- | :--- |
| **Tamu (Guest)** | *(Tanpa Login)* | *(Tanpa Login)* | `guest` | Belum terautentikasi; penjelajah katalog & publik. |
| **Mahasiswa (Andi)** | `andi@untad.ac.id`<br>atau NIM: `F55122001` | `mahasiswa123` | `user` | • Memiliki 2 pinjaman aktif (Buku ID 1 normal, Buku ID 2 **Terlambat 3 hari**).<br>• 1 riwayat pengembalian.<br>• 2 buku tersimpan di Readlist. |
| **Mahasiswa (Siti)** | `siti@untad.ac.id`<br>atau NIM: `F55122045` | `mahasiswa123` | `user` | • Meminjam Buku ID 3 hingga stok fisik habis (0 eksemplar). |
| **Admin Kampus** | `admin@untad.ac.id` | `admin123` | `admin` | Pengelola koleksi; dialihkan ke Workspace Admin. |

---

## 📋 3. Skenario Pengujian Interaktif Langkah-demi-Langkah

---

### Skenario Bagian I: Persona TAMU (Guest / Tanpa Login)

#### Uji 1.1 — Akses Katalog & Tampilan Tombol Pinjam (Issue #16)
* **Tujuan:** Memastikan Tamu dapat melihat katalog buku fisik dan melihat tombol pinjam sirkulasi.
* **Langkah:**
  1. Akses halaman beranda `http://localhost:5173/`.
  2. Klik kartu buku **"Struktur Data dan Algoritma"** (ID: 1).
* **Expected Visual Checkpoint:**
  - [ ] Panel sisi kanan terbuka dengan URL tersinkronisasi `/?bookId=1`.
  - [ ] Muncul tombol sirkulasi berwarna merah kritis (`#D90000`) dengan label **"Pinjam Buku Ini"**.
  - [ ] Status stok menampilkan angka rasio dengan format font monospace tabular (`tabular-nums`), mis. `3/5 tersedia`.

#### Uji 1.2 — Intent Preservasi URL Pasca-Login (Issue #16)
* **Tujuan:** Memastikan Tamu yang menekan tombol Pinjam diarahkan login tanpa kehilangan konteks buku yang ingin dipinjam.
* **Langkah:**
  1. Pada panel detail buku ID 1 yang terbuka, klik tombol **"Pinjam Buku Ini"**.
* **Expected Visual Checkpoint:**
  - [ ] Halaman langsung beralih ke form Login (`/login`).
  - [ ] Perhatikan query string URL pada address bar: `/login?redirect=/?bookId=1`.
  - [ ] Konteks buku ID 1 tetap tersimpan rapi untuk dieksekusi setelah login berhasil.

#### Uji 1.3 — Route Guard Halaman Peminjaman Saya (Issue #17)
* **Tujuan:** Memastikan Tamu dilarang mengakses data peminjaman pribadi dan dicegat ke login.
* **Langkah:**
  1. Pada navbar atas atau ketik langsung di URL: `http://localhost:5173/loans`.
* **Expected Visual Checkpoint:**
  - [ ] Tamu dicegat oleh `UserRouteGuard` dan dialihkan ke `/login?redirect=/loans`.

#### Uji 1.4 — Akses Bebas Jelajah Buku Publik & Hard Domain Partition (Issue #18)
* **Tujuan:** Memastikan Buku Publik dapat diakses bebas tanpa login dan terpisah tegas dari domain peminjaman fisik.
* **Langkah:**
  1. Klik menu navigasi **"Jelajah Buku Publik"** (`/public-books`).
* **Expected Visual Checkpoint:**
  - [ ] Halaman terbuka tanpa meminta login.
  - [ ] Muncul tajuk zona berwarna biru struktural (`#007DCC`) dengan penanda: *"Zona Referensi Digital Eksternal"* dan keterangan bahwa koleksi ini **tidak dapat dipinjam secara fisik**.
  - [ ] Chip topik **"Ilmu Komputer"** terpilih secara default (`aria-selected="true"`).
  - [ ] **Aturan Partisi Domain (PENTING):** Periksa seluruh kartu buku publik; **SAMA SEKALI TIDAK ADA** tombol Pinjam dan tidak ada informasi stok eksemplar.

---

### Skenario Bagian II: Persona MAHASISWA (User: Andi Pratama)

#### Uji 2.1 — Login Mahasiswa & Eksekusi Intent Pasca-Login (Issue #16)
* **Tujuan:** Memverifikasi mahasiswa dapat login menggunakan NIM atau Email dan kembali ke halaman asal.
* **Langkah:**
  1. Buka `/login?redirect=/?bookId=1`.
  2. Masukkan NIM `F55122001` (atau email `andi@untad.ac.id`) dan password `mahasiswa123`.
  3. Klik tombol **"Masuk ke Akun"**.
* **Expected Visual Checkpoint:**
  - [ ] Berhasil masuk; nama **Andi Pratama** dan NIM **F55122001** tampil di header pojok kanan atas.
  - [ ] Aplikasi otomatis mengembalikan pengguna ke Katalog dengan panel detail buku ID 1 langsung terbuka (`/?bookId=1`).

#### Uji 2.2 — Validasi Buku yang Sedang Dipinjam Sendiri (Issue #16)
* **Tujuan:** Mencegah peminjaman ganda pada buku yang sama oleh pengguna yang sama (`DUPLICATE_ACTIVE_LOAN`).
* **Langkah:**
  1. Di Katalog Perpustakaan, cari dan pilih buku **"Basis Data Lanjut & Transaksi"** (ID: 2).
* **Expected Visual Checkpoint:**
  - [ ] Tombol sirkulasi merah berubah menjadi tombol non-aktif (disabled) berwarna abu-abu/biru soft.
  - [ ] Label tombol tertulis **"Sedang Anda Pinjam"**.
  - [ ] Muncul kotak keterangan: *"Buku ini sedang dalam masa peminjaman aktif Anda. Cek sisa hari di halaman Peminjaman Saya"*.

#### Uji 2.3 — Validasi Buku dengan Stok Fisik Habis (Issue #16)
* **Tujuan:** Memastikan buku tanpa stok fisik tidak dapat diklik pinjam (`OUT_OF_STOCK`).
* **Langkah:**
  1. Di Katalog Perpustakaan, pilih buku **"Jaringan Komputer dan Komunikasi Data"** (ID: 3) yang telah dipinjam habis oleh Siti.
* **Expected Visual Checkpoint:**
  - [ ] Lencana stok berwarna merah kritis bertuliskan **"Stok Habis"** (`0/2 tersedia`).
  - [ ] Tombol pinjam non-aktif (disabled) dengan label tegas **"Stok Habis"**.

#### Uji 2.4 — Eksekusi Peminjaman Mandiri Sukses (Issue #16)
* **Tujuan:** Menguji peminjaman buku yang stoknya tersedia.
* **Langkah:**
  1. Pilih buku yang tersedia dan belum dipinjam Andi (misal Buku ID: 5 **"Sistem Operasi Modern"**).
  2. Klik tombol merah **"Pinjam Buku Ini"**.
* **Expected Visual Checkpoint:**
  - [ ] Tombol menampilkan spinner loading sejenak.
  - [ ] Muncul notifikasi Toast sukses berwarna hijau: *"Peminjaman buku berhasil dicatat"*.
  - [ ] Tombol pada buku tersebut seketika berganti menjadi **"Sedang Anda Pinjam"** (disabled).
  - [ ] Angka stok fisik berkurang 1 secara reaktif tanpa perlu reload browser.

#### Uji 2.5 — Validasi Batas Kuota Maksimal 3 Buku Aktif (Issue #16)
* **Tujuan:** Memastikan aturan sirkulasi kampus (kuota maks 3 buku aktif) ditegakkan oleh sistem (`LOAN_LIMIT_EXCEEDED`).
* **Langkah:**
  1. Karena Andi kini telah meminjam 3 buku (Buku ID 1, 2, dan 5), coba pilih buku lain yang tersedia (misal Buku ID 4 **"Kalkulus dan Geometri Analitik Jilid 1"**).
  2. Klik tombol **"Pinjam Buku Ini"**.
* **Expected Visual Checkpoint:**
  - [ ] Peminjaman ditolak oleh sistem.
  - [ ] Muncul notifikasi Toast error / pesan peringatan: *"Batas maksimal peminjaman aktif tercapai (maksimal 3 buku). Harap kembalikan buku yang sedang dipinjam terlebih dahulu."*

#### Uji 2.6 — Halaman Peminjaman Saya & Strip Ringkasan GraphQL (Issue #17)
* **Tujuan:** Memverifikasi query GraphQL `myOverview` menyajikan metrik sirkulasi secara akurat.
* **Langkah:**
  1. Klik menu navigasi **"Peminjaman Saya"** (`/loans`).
* **Expected Visual Checkpoint:**
  - [ ] Muncul strip ringkasan 3-kompartemen di bagian atas:
    1. **Buku Dipinjam:** Menampilkan kuota format tabular `3/3 aktif` (atau `2/3 aktif` sebelum Uji 2.4).
    2. **Status Terlambat:** Menampilkan badge perhatian kuning/merah bertuliskan `1 buku`.
    3. **Readlist Saya:** Menampilkan jumlah `2 referensi`.
  - [ ] Seluruh angka metrik menggunakan font monospace dengan format `tabular-nums`.

#### Uji 2.7 — Indikator Keterlambatan Temporal Tanpa Denda Uang (Issue #17)
* **Tujuan:** Memastikan kepatuhan terhadap aturan desain `DESIGN.md`: status terlambat disajikan secara temporal tanpa menyebut denda uang/rupiah.
* **Langkah:**
  1. Pada daftar buku yang dipinjam, cari kartu buku **"Basis Data Lanjut & Transaksi"**.
* **Expected Visual Checkpoint:**
  - [ ] Muncul lencana status kritis merah: **"Terlambat 3 hari"**.
  - [ ] **Verifikasi Larangan Kata:** Periksa teks di seluruh halaman; **TIDAK BOLEH ADA KATA** *"denda"*, *"penalti"*, *"Rp"*, ataupun *"rupiah"*.

#### Uji 2.8 — Interaktivitas Tab Filter Status Pinjaman (Issue #17)
* **Tujuan:** Memverifikasi penyaringan daftar pinjaman berdasarkan status.
* **Langkah:**
  1. Klik tab **"Terlambat"**: Hanya buku yang lewat jatuh tempo yang tampil (1 buku).
  2. Klik tab **"Dipinjam"**: Seluruh buku yang sedang berstatus aktif tampil.
  3. Klik tab **"Dikembalikan"**: Menampilkan riwayat buku yang sudah dikembalikan beserta tanggal pengembaliannya.
  4. Klik tab **"Semua"**: Menampilkan seluruh riwayat pinjaman Andi.

#### Uji 2.9 — Alur Pengembalian Buku Mandiri dengan Dialog Konfirmasi (Issue #17)
* **Tujuan:** Menguji pengembalian buku mandiri via `PATCH /api/v1/loans/:id/return`.
* **Langkah:**
  1. Pada kartu buku **"Struktur Data dan Algoritma"**, klik tombol **"Kembalikan"**.
  2. Muncul dialog modal konfirmasi: *"Apakah Anda yakin ingin mengembalikan buku ini?"*.
  3. Klik tombol konfirmasi **"Ya, Kembalikan"**.
* **Expected Visual Checkpoint:**
  - [ ] Modal tertutup dan muncul Toast notifikasi sukses pengembalian.
  - [ ] Buku berpindah status ke tab "Dikembalikan".
  - [ ] Strip ringkasan GraphQL otomatis diperbarui: kuota aktif berkurang menjadi `2/3 aktif`.
  - [ ] Jika Anda kembali ke Katalog (`/`), stok buku tersebut telah bertambah kembali 1 eksemplar.

#### Uji 2.10 — Navigasi 6 Chip Topik Akademik UNTAD (Issue #18)
* **Tujuan:** Memverifikasi pengelompokan buku publik berdasarkan bidang ilmu kampus UNTAD.
* **Langkah:**
  1. Buka halaman **"Jelajah Buku Publik"** (`/public-books`).
  2. Klik chip topik secara bergantian:
     - **Ilmu Komputer** (`computer_science`)
     - **Teknik** (`engineering`)
     - **Ekonomi** (`economics`)
     - **Pertanian** (`agriculture`)
     - **Hukum** (`law`)
     - **Kedokteran** (`medicine`)
* **Expected Visual Checkpoint:**
  - [ ] Chip yang sedang dipilih memiliki latar belakang warna primer `#007DCC` dengan teks putih tebal.
  - [ ] Parameter URL tersinkron otomatis: `?subject=engineering`, `?subject=economics`, dst.
  - [ ] Daftar buku berganti sesuai bidang ilmu yang dipilih.

#### Uji 2.11 — Pencarian Kata Kunci & Paginasi Buku Publik (Issue #18)
* **Tujuan:** Memverifikasi pencarian kata kunci dan paginasi URL-synchronized.
* **Langkah:**
  1. Pada bilah pencarian, ketik kata kunci: `Clean Code`.
  2. Klik tombol **"Cari"** atau tekan tombol `Enter`.
* **Expected Visual Checkpoint:**
  - [ ] Query string URL diperbarui menjadi `/public-books?q=Clean+Code`.
  - [ ] Tampil buku *"Clean Code: A Handbook of Agile Software Craftsmanship"* karya Robert C. Martin.
  - [ ] Di bagian bawah halaman, navigasi paginasi menampilkan: *"Menampilkan halaman 1 dari X (Total Y buku publik)"*.
  - [ ] Tombol ikon `X` pada bilah pencarian dapat diklik untuk mengosongkan kata kunci pencarian.

#### Uji 2.12 — Verifikasi Lazy Fetching Deskripsi Buku Publik (Issue #18)
* **Tujuan:** Membuktikan bahwa endpoint detail (`/api/v1/public-books/{workId}`) hanya dipanggil saat buku dipilih, bukan saat daftar dibuka (mencegah *N+1 query*).
* **Langkah:**
  1. Tekan tombol `F12` pada keyboard untuk membuka Developer Tools browser, lalu pilih tab **Network**.
  2. Muat ulang halaman `/public-books`.
  3. Perhatikan daftar request: Hanya ada request list `/api/v1/public-books?subject=...`. Belum ada request dengan workId spesifik.
  4. Klik tombol **"Lihat Detail"** pada buku **Clean Code** (`OL82563W`).
* **Expected Visual Checkpoint:**
  - [ ] Pada tab Network, seketika muncul 1 request baru: `GET /api/v1/public-books/OL82563W`.
  - [ ] Panel samping kanan terbuka menampilkan detail lengkap buku dan URL browser berubah menjadi `?workId=OL82563W`.
  - [ ] Tekan tombol `Esc` pada keyboard atau klik tanda silang (`X`): Panel tertutup dan parameter `workId` hilang dari URL.

#### Uji 2.13 — Fallback Deskripsi Informatif Saat Metadata Kosong (Issue #18)
* **Tujuan:** Memastikan UI tidak menampilkan ruang kosong bila Open Library tidak memiliki teks deskripsi.
* **Langkah:**
  1. Pada pencarian atau URL, buka buku **"Structure and Interpretation of Computer Programs"** (`OL262421W`).
  2. URL: `http://localhost:5173/public-books?workId=OL262421W`.
* **Expected Visual Checkpoint:**
  - [ ] Karena buku ini memiliki `description: null` pada katalog Open Library, panel detail menampilkan kotak informatif **"Ringkasan Informasi Open Library"**.
  - [ ] Teks fallback memuat ringkasan tahun terbit pertama (1984) dan daftar subjek terkait.
  - [ ] Area deskripsi tidak terlihat rusak atau kosong melompong.

---

### Skenario Bagian III: Persona ADMINISTRATOR KAMPUS (Admin)

#### Uji 3.1 — Redireksi Khusus Admin Pasca-Login
* **Tujuan:** Memastikan akun ber-role Admin tidak diarahkan ke alur peminjaman mahasiswa.
* **Langkah:**
  1. Lakukan logout dari akun Andi, lalu buka `/login`.
  2. Masukkan email `admin@untad.ac.id` dan password `admin123`.
  3. Klik **"Masuk ke Akun"**.
* **Expected Visual Checkpoint:**
  - [ ] Admin dialihkan ke Workspace Admin (`/admin/books`).
  - [ ] Lencana peran **Admin** berwarna khusus muncul di header.

#### Uji 3.2 — Perilaku Khusus Admin di Katalog Perpustakaan (Issue #16)
* **Tujuan:** Memastikan Admin tidak dapat melakukan peminjaman mandiri mahasiswa dan diarahkan ke workspace pengelolaan.
* **Langkah:**
  1. Sebagai Admin, navigasikan browser ke Katalog Perpustakaan (`/`).
  2. Klik salah satu buku perpustakaan untuk membuka panel detail.
* **Expected Visual Checkpoint:**
  - [ ] Tombol merah "Pinjam Buku Ini" **TIDAK MUNCUL**.
  - [ ] Digantikan oleh kotak pesan administratif: *"Anda masuk sebagai Admin. Pengelolaan koleksi buku dilakukan di Workspace Admin"*.
  - [ ] Tersedia tombol tautan langsung: **"Kelola Buku di Workspace Admin"** (`/admin/books`).

#### Uji 3.3 — Proteksi Halaman Peminjaman Saya bagi Admin (Issue #17)
* **Tujuan:** Memastikan Admin yang mencoba membuka `/loans` langsung dialihkan ke area kerja admin.
* **Langkah:**
  1. Ketik URL `/loans` pada browser saat login sebagai Admin.
* **Expected Visual Checkpoint:**
  - [ ] Guard peran mendeteksi role `admin` dan seketika mengarahkan kembali ke `/admin/books`.

---

## ⚡ 4. Tabel Ringkas Checklist Pengujian (Cheat Sheet untuk Demo)

Gunakan tabel centang ini saat melakukan demonstrasi di hadapan penguji:

| No | Kategori Uji | Aksi Singkat | Target Hasil Utama | Status |
| :---: | :--- | :--- | :--- | :---: |
| **1** | **Issue 16 (Tamu)** | Buka detail buku di `/` lalu klik "Pinjam" | Redirect ke `/login?redirect=/?bookId=1` | [ ] |
| **2** | **Issue 16 (User)** | Login Mahasiswa Andi | Auto-redirect kembali ke buku yang ingin dipinjam | [ ] |
| **3** | **Issue 16 (User)** | Buka buku ID 2 yang sedang dipinjam | Tombol disabled bertuliskan "Sedang Anda Pinjam" | [ ] |
| **4** | **Issue 16 (User)** | Buka buku ID 3 dengan stok 0 | Lencana & tombol disabled bertuliskan "Stok Habis" | [ ] |
| **5** | **Issue 16 (User)** | Pinjam buku ID 5 yang stoknya tersedia | Toast sukses muncul, kuota bertambah, stok berkurang | [ ] |
| **6** | **Issue 16 (User)** | Coba pinjam buku ke-4 saat kuota penuh | Muncul penolakan batas maksimal 3 buku aktif | [ ] |
| **7** | **Issue 17 (User)** | Buka menu `/loans` | Strip GraphQL 3-metrik tampil (`tabular-nums`) | [ ] |
| **8** | **Issue 17 (User)** | Cek kartu pinjaman ID 2 di `/loans` | Badge "Terlambat 3 hari" tanpa istilah denda uang | [ ] |
| **9** | **Issue 17 (User)** | Klik tab "Terlambat", "Dipinjam", "Dikembalikan" | Daftar pinjaman terfilter sesuai status tab | [ ] |
| **10** | **Issue 17 (User)** | Klik "Kembalikan" pada buku pinjaman aktif | Dialog konfirmasi muncul -> Ya -> status jadi kembali | [ ] |
| **11** | **Issue 18 (Publik)** | Buka `/public-books` tanpa login | Akses terbuka bebas, banner biru partisi domain | [ ] |
| **12** | **Issue 18 (Publik)** | Cek seluruh kartu buku publik | Tidak ada tombol pinjam dan tidak ada info stok fisik | [ ] |
| **13** | **Issue 18 (Publik)** | Klik 6 chip topik UNTAD (Teknik, Ekonomi, dll) | Topik aktif berganti, URL tersinkron `?subject=...` | [ ] |
| **14** | **Issue 18 (Publik)** | Cari buku `Clean Code` di search bar | Filter judul instan dan paginasi berfungsi | [ ] |
| **15** | **Issue 18 (Publik)** | Buka detail buku sambil cek tab Network browser | Endpoint detail hanya dipanggil saat buku diklik (*lazy*) | [ ] |
| **16** | **Issue 18 (Publik)** | Buka detail buku `OL262421W` (SICP) | Tampil wadah fallback informatif (bukan area kosong) | [ ] |
| **17** | **Issue 16/17 (Admin)**| Login Admin & buka Katalog / Loans | Tombol pinjam diganti tautan Admin, loans dialihkan | [ ] |

---

## 🧪 5. Verifikasi Pengujian Otomatis via Terminal

Untuk membuktikan ke penguji bahwa kode telah memiliki validasi unit test otomatis yang andal, Anda dapat menjalankan perintah berikut di terminal:

```bash
# 1. Menjalankan seluruh pengujian unit frontend (10 file, 66 test cases)
npm --prefix frontend test -- --run

# 2. Menjalankan pengujian khusus Issue #16, #17, dan #18 saja
npm --prefix frontend test -- borrow-action.test.tsx loans.test.tsx public-books.test.tsx --run

# 3. Memverifikasi build produksi frontend (0 TypeScript / Vite error)
npm --prefix frontend run build

# 4. Menjalankan seluruh pengujian backend (119 test cases)
npm --prefix backend test
```
Semua perintah di atas telah terverifikasi menghasilkan status **100% Pass** tanpa kendala teknis.
