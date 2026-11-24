# Context Map

Sistem informasi peminjaman dan pengembalian buku perpustakaan UNTAD beserta katalog bacaan referensi dari Public API.

## Contexts

- [Backend](./backend/CONTEXT.md): mengelola autentikasi, koleksi buku perpustakaan, transaksi peminjaman dan pengembalian, readlist pengguna, serta proxy ke Open Library API.
- [Frontend](./frontend/CONTEXT.md): menyajikan antarmuka katalog perpustakaan, penjelajahan buku publik, pengelolaan peminjaman dan readlist pengguna, serta workspace admin.

## Relationships

- **Frontend → Backend**: Frontend berkomunikasi dengan Backend melalui REST API (`/api/v1/*`) untuk seluruh transaksi/CRUD dan 1 endpoint GraphQL (`POST /graphql`) untuk *query aggregator* read-only, dengan token JWT pada header `Authorization: Bearer`. Kontrak resmi tercatat di [openapi.yaml](./docs/api/openapi.yaml) dan [schema.graphql](./backend/src/graphql/schema.graphql).
- **Backend → Open Library API**: Backend bertindak sebagai proxy untuk pencarian dan pengambilan deskripsi Buku Publik, lalu menyimpan snapshot metadata saat pengguna menambahkannya ke Readlist.
