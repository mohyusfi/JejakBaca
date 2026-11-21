---
status: accepted
---

# Arsitektur Hybrid REST (/api/v1) + 1 Endpoint GraphQL (/graphql) dan OpenAPI 3.0.3

Sistem menggunakan **REST API (JSON)** dengan URL path versioning (`/api/v1/...`) untuk seluruh operasi autentikasi, CRUD buku, peminjaman/pengembalian, dan readlist, ditambah **1 endpoint GraphQL (`POST /graphql`)** sebagai *Read-Only Query Aggregator* (mempertahankan autentikasi JWT stateless berdurasi `24h` dari ADR-0002).

## Considered Options

- **API Versioning**: Memilih URL path prefix `/api/v1/...` daripada header atau query versioning agar versi API eksplisit di spesifikasi OpenAPI dan mudah diuji langsung di browser/Swagger UI.
- **Peran GraphQL**: Memilih 1 endpoint `POST /graphql` (*read-only query aggregator* untuk katalog dan ringkasan dashboard) daripada memindahkan mutasi ke GraphQL atau menduplikasi seluruh REST API ke GraphQL, sehingga memenuhi kebutuhan tugas tanpa memecah konsistensi transaksi REST.
- **Dokumentasi Kontrak**: Memilih **OpenAPI 3.0.3 (`docs/api/openapi.yaml`)** disertai **GraphQL SDL (`docs/api/schema.graphql`)** agar kontrak HTTP maupun tipe query GraphQL sama-sama *strongly-typed* bagi Frontend dan Backend.
