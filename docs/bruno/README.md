# Koleksi API Testing Bruno — Perpustakaan UNTAD

Koleksi ini mencakup seluruh endpoint REST (`/api/v1/*`), dokumentasi (`/api/docs`, `/api/openapi.yaml`), dan GraphQL (`POST /graphql`) dari `backend/`.

## Cara Menggunakan
1. Buka aplikasi **Bruno**.
2. Pilih **Open Collection** → arahkan ke folder `docs/bruno`.
3. Pilih environment **Local** di pojok kanan atas.
   - Semua variabel di `environments/Local.bru` bersifat *editable* langsung dari tab **Environments** di Bruno maupun dengan mengedit file `.bru`.
4. Jalankan request secara berurutan:
   - `01-System-and-Docs/Health Check` (v1 dengan header `Sunset`) dan `Health Check v2` untuk memastikan server backend menyala (`http://localhost:3000`).
   - `02-Auth/Login Admin` untuk mengisi `adminToken` secara otomatis.
   - `02-Auth/Register User` (atau `Login User` jika sudah terdaftar) untuk mengisi `userToken` secara otomatis.
   - Lanjutkan ke `03-Library-Books`, `04-Admin-Books`, `05-Loans`, `06-Public-Books`, `07-Readlist`, `08-GraphQL`, dan `09-Public-Journals`.
