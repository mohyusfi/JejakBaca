---
status: superseded by ADR-0003
---

# REST JSON dan Autentikasi JWT Stateless pada Satu Pintu Login

Backend mengekspos **REST API (JSON)** di atas `node:http` bawaan Node.js dengan autentikasi **JWT stateless** (`Authorization: Bearer`) dan hashing `crypto.scrypt`, menggunakan satu halaman `/login` (menerima Email atau NIM) serta *auto-login* setelah registrasi User, sementara akun Admin dibuat melalui *seed* sistem.

## Considered Options

- **Protokol API**: Memilih **REST JSON** daripada GraphQL (`graphql`) karena integrasinya dengan `fetch` + TanStack Query di frontend lebih langsung dan lebih ringkas diuji per resource.
- **Mekanisme Sesi**: Memilih **JWT stateless** daripada session cookie `HttpOnly` di SQLite untuk menghindari kerumitan konfigurasi cookie lintas-port (`5173` ↔ backend) dan memudahkan pengujian API langsung.
- **Alur Login**: Memilih satu titik `/login` dengan *auto-redirect* berdasarkan `role` dan *seed* akun Admin daripada halaman login Admin terpisah atau registrasi Admin publik demi keamanan peran.
