---
status: accepted
---

# Pemisahan Ketat Buku Perpustakaan vs Buku Publik dan Proxy Open Library

Aplikasi memisahkan secara ketat **Buku Perpustakaan** (inputan Admin di SQLite yang hanya untuk fitur pinjam/kembali *self-service*) dengan **Buku Publik** dari Open Library API (hanya untuk dilihat deskripsinya dan disimpan ke Readlist), di mana seluruh pemanggilan Open Library diproksi oleh Backend dan data Readlist disimpan sebagai *snapshot* metadata di SQLite.

## Considered Options

- **Public API**: Memilih **Open Library API** (`openlibrary.org`) karena 100% gratis tanpa API key maupun risiko kuota harian habis saat pengujian, dibandingkan Google Books API (wajib API key Google Cloud dengan kuota 1.000 request/hari) dan Gutendex (terbatas pada buku domain publik klasik tanpa endpoint cover seragam).
- **Cakupan Readlist**: Memilih pemisahan ketat (Buku Perpustakaan = pinjam/kembali; Buku Publik = Readlist saja) daripada mengizinkan Buku Perpustakaan masuk Readlist agar batas kedua domain jelas sesuai kebutuhan.
- **Arsitektur Fetch & Penyimpanan**: Memilih Backend Proxy + *snapshot* metadata di SQLite daripada pemanggilan langsung dari browser ke Open Library atau hanya menyimpan `work_id`, sehingga header `User-Agent` yang disarankan Open Library dapat dikirim dari server, terhindar dari isu CORS, dan halaman Readlist terbuka instan.

## Consequences

- Sebagian judul di Open Library tidak memiliki `description` pada `/works/{id}.json`; UI dan API harus menyediakan *fallback* informatif berbasis metadata subjek/tahun terbit.
- Perubahan data di Open Library tidak otomatis memperbarui item Readlist yang sudah disimpan karena memakai *snapshot* metadata.
