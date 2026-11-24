# Sistem Informasi Perpustakaan UNTAD

Sistem informasi peminjaman dan pengembalian **Buku Perpustakaan** Universitas Tadulako (UNTAD) yang dilengkapi katalog referensi **Buku Publik** dari Open Library API.

---

## Latar Belakang

Pengelolaan perpustakaan membutuhkan pemisahan yang jelas antara koleksi fisik milik perpustakaan yang memiliki batas stok dan aturan peminjaman, dengan sumber bacaan referensi eksternal yang bersifat terbuka. Proyek ini dibangun untuk menjawab kebutuhan tersebut melalui dua domain terpisah:

1. **Koleksi Buku Perpustakaan (Internal)**
   - Dikelola oleh **Admin** (CRUD buku, stok eksemplar, deskripsi wajib, serta URL cover opsional).
   - Dapat dipinjam secara *self-service* oleh **User** (mahasiswa/anggota terdaftar dengan NIM & email unik).
   - Menerapkan aturan bisnis: maksimal **3 buku aktif** bersamaan per User, larangan duplikasi judul aktif, durasi peminjaman **7 hari**, serta penandaan status **Terlambat** tanpa perhitungan denda uang.
2. **Katalog Buku Publik & Readlist (Eksternal)**
   - Mengambil data referensi buku dari **Open Library API** melalui proxy backend.
   - User dapat membaca deskripsi buku secara *lazy* dan menyimpannya ke daftar bacaan pribadi (**Readlist**) sebagai snapshot metadata, terpisah sepenuhnya dari transaksi peminjaman.

---

## Tech Stack

### Backend
- **Runtime**: Node.js (ES Modules, `node:http`, `node:test`)
- **Database**: SQLite menggunakan modul bawaan `node:sqlite` (`DatabaseSync`)
- **Arsitektur API**: Hybrid **REST API** (`/api/v1/*`) untuk transaksi/CRUD & **GraphQL** (`POST /graphql` dengan `graphql`) untuk *query aggregator* read-only
- **Autentikasi**: JWT (*stateless*) melalui header `Authorization: Bearer`
- **Integrasi Eksternal**: Open Library API (`https://openlibrary.org`)
- **Kontrak & Dokumentasi API**: OpenAPI (`docs/api/openapi.yaml`), GraphQL Schema (`backend/src/graphql/schema.graphql`), dan koleksi Bruno (`docs/bruno`)

### Frontend
- **Framework & Bahasa**: React 19, TypeScript
- **Build Tool**: Vite 8
- **Styling**: Tailwind CSS v4
- **Routing & State Management**: TanStack Router & TanStack Query
- **Validasi & Ikon**: Zod, Lucide React
- **Testing & Linting**: Vitest, React Testing Library, ESLint

---

## Cara Penggunaan

### Prasyarat
- **Node.js** (v22.5+ atau v24+ yang mendukung `node:sqlite`)
- **npm**

### 1. Menjalankan Backend

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

- Server berjalan secara default di `http://localhost:3000`.
- Dokumentasi OpenAPI interaktif: `http://localhost:3000/api/docs`
- Endpoint *health check*: `http://localhost:3000/api/v1/health`
- Akun **Admin** default di-*seed* otomatis dari konfigurasi `.env` (`ADMIN_EMAIL` dan `ADMIN_PASSWORD`, default contoh: `admin@untad.ac.id` / `Admin123!`).
- Menjalankan test backend:
  ```bash
  npm test
  ```

### 2. Menjalankan Frontend

```bash
cd frontend
npm install
cp .env.example .env
```

Sesuaikan file `frontend/.env`:
- Untuk terhubung ke backend lokal, atur `VITE_USE_MOCK=false` dan pastikan `VITE_API_PROXY_TARGET=http://localhost:3000`.
- Untuk mencoba UI tanpa backend (mode data tiruan), atur `VITE_USE_MOCK=true`.

Jalankan server pengembangan:
```bash
npm run dev
```

Perintah lainnya di `frontend`:
- `npm test` — menjalankan unit/component test (Vitest)
- `npm run lint` — memeriksa kualitas kode (ESLint)
- `npm run build` — kompilasi TypeScript & build produksi

### 3. Alur Penggunaan Aplikasi
- **Tamu**: Menjelajahi **Katalog Perpustakaan** dan **Jelajah Buku Publik** tanpa login.
- **User**: Daftar/masuk menggunakan NIM & email, meminjam Buku Perpustakaan (maksimal 3 buku aktif), mengembalikan buku melalui halaman **Peminjaman Saya**, serta menyimpan/menghapus referensi pada **Readlist Saya**.
- **Admin**: Masuk ke **Workspace Admin** (`/admin`) untuk mengelola koleksi Buku Perpustakaan (tambah, ubah, hapus) dan memantau daftar buku yang sedang dipinjam beserta NIM peminjam.

---

## Struktur Direktori

```text
.
├── backend/        # Layanan REST + GraphQL API dan database SQLite
├── frontend/       # Aplikasi web SPA (React + Vite + Tailwind CSS)
├── docs/           # Spesifikasi OpenAPI, skema GraphQL, ADR, dan koleksi Bruno
└── CONTEXT-MAP.md  # Peta konteks dan relasi antar layanan
```
