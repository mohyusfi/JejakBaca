## Aturan teknis

- **HTTP server**: Wajib menggunakan modul `http` bawaan Node.js (tanpa framework seperti Express, Fastify, Hono, dll.).
- **GraphQL**: Jika menggunakan GraphQL, gunakan library `graphql` secara langsung.
- **Database**: Gunakan SQLite secara langsung tanpa ORM atau ODM (seperti Prisma, Sequelize, TypeORM, Mongoose, dll.).
- **Arsitektur**: Gunakan pemisahan layer berikut:
  - `controller/`: menangani HTTP request/response dan validasi input.
  - `service/`: berisi logika bisnis dan akses data (query SQLite).
  - `middleware/`: menangani proses sebelum/sesudah controller (auth, error handling, logging request, dll.).
  - `app/`: inisialisasi dan instance inti aplikasi (logger, koneksi database SQLite, dll.).
  - `config/`: konfigurasi aplikasi dan environment.

## Agent skills

### Issue tracker

Issue dan spesifikasi dilacak di GitHub Issues menggunakan `gh` CLI (Bahasa Indonesia). Lihat `docs/agents/issue-tracker.md`.

### Triage labels

Menggunakan 5 label triage default (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). Lihat `docs/agents/triage-labels.md`.

### Domain docs

Single-context (`CONTEXT.md` dan `docs/adr/` di root repo). Lihat `docs/agents/domain.md`.
