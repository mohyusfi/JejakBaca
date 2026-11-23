# Issue #18: [Frontend] Jelajah Buku Publik: Pencarian Open Library, Chip Topik UNTAD, & Lazy Fetch Deskripsi

## What to build

Membangun halaman terpisah `/public-books` (**Jelajah Buku Publik**) agar **Tamu**, **User**, maupun **Admin** dapat menelusuri referensi buku eksternal dari Open Library melalui proxy backend, dengan pemisahan visual domain yang tegas dari **Katalog Perpustakaan**.

Halaman diawali 6 chip topik akademik relevan kampus UNTAD (default `computer_science`), mendukung pencarian kata kunci dan paginasi, serta menerapkan *lazy fetch* deskripsi (`/api/v1/public-books/{workId}`) hanya ketika pengguna membuka detail buku tertentu agar hemat permintaan dan tangguh terhadap metadata Open Library yang tidak lengkap.

## Acceptance criteria

- [ ] Halaman `/public-books` dapat diakses bebas oleh **Tamu** tanpa login, dengan penanda tajuk zona domain yang membedakan secara tegas bahwa koleksi ini adalah referensi **Buku Publik** (Open Library) dan tidak dapat dipinjam.
- [ ] Tersedia 6 chip topik cepat akademik kampus UNTAD: Ilmu Komputer (`computer_science`, default aktif saat pertama dibuka tanpa `q`), Teknik (`engineering`), Ekonomi (`economics`), Pertanian (`agriculture`), Hukum (`law`), dan Kedokteran (`medicine`), plus bilah pencarian (`q`) dan paginasi tersinkron URL melalui `GET /api/v1/public-books`.
- [ ] Setiap item menampilkan sampul rasio `2:3` (dengan *fallback* tipografis bila `coverUrl` kosong/gagal muat), judul, daftar penulis, tahun terbit (`tabular-nums`), dan subjek ringkas — tanpa informasi stok ataupun tombol Pinjam.
- [ ] Detail buku dibuka di panel sisi kanan (desktop `lg+`) atau sheet/ekspansi (mobile) tersinkron `workId` di URL, dan **hanya** memanggil `GET /api/v1/public-books/{workId}` secara *lazy* saat buku tersebut dipilih (tidak melakukan *N+1 requests* pada daftar pencarian).
- [ ] Bila `description` dari Open Library bernilai `null`, panel detail menampilkan `descriptionFallback` dan metadata subjek/tahun terbit secara informatif (bukan area kosong).
- [ ] Bila proxy Open Library mengembalikan `502 UPSTREAM_API_ERROR` atau timeout, UI menampilkan pesan error yang ramah disertai tombol **Coba Lagi** yang memicu ulang query.
- [ ] Tersedia *skeleton loading* berbentuk kompartemen untuk daftar maupun panel detail.
- [ ] Tersedia test otomatis (Vitest + React Testing Library) yang memastikan topik default `computer_science`, *lazy fetch* deskripsi hanya dipanggil saat detail dibuka, tampilan *fallback* deskripsi kosong, dan pemulihan error `502`.

## Blocked by

- #13
