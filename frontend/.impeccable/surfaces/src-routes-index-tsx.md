---
version: 1
slug: "src-routes-index-tsx"
primary_target: "src/routes/index.tsx"
related_targets: []
---

# Surface Brief: Katalog Perpustakaan (`src/routes/index.tsx`)

- **Scope:** Halaman utama publik dan terautentikasi untuk menelusuri **Buku Perpustakaan** UNTAD, memeriksa ketersediaan stok, membaca deskripsi, dan melakukan **Peminjaman** (*self-service*).
- **Visitor Mode:** `Operate`
- **Audience & Job:** **Tamu** menelusuri katalog dan membaca deskripsi tanpa login (diarahkan ke `/login` hanya saat klik **Pinjam**); **User** (mahasiswa UNTAD) mencari buku, memverifikasi stok & kuota (maks 3 aktif, tanpa duplikasi judul, jatuh tempo 7 hari), lalu meminjam; **Admin** juga dapat melihat katalog atau beralih ke **Workspace Admin** (`/admin`).
- **Content, States & Constraints:**
  - Data dari `libraryBooks` (`POST /graphql`) / `GET /api/v1/books` dengan pencarian (`q`), filter `category`, sakelar `availableOnly`, dan paginasi (`page`, `limit`).
  - Mutasi **Pinjam** via REST `/api/v1/loans`; menangani status stok tersedia penuh, menipis (≤1), stok habis (`stockAvailable === 0`), sedang dipinjam oleh saya (`isBorrowedByMe === true`), kuota penuh (3/3), status memuat (*skeleton*), kosong (*empty state*), dan galat jaringan.
  - Wajib mematuhi glosarium `CONTEXT.md` dan komitmen warna 60-30-10 (`#EEEEEE`, `#007DCC`, `#D90000`).
- **Memorable Moment:** Mengklik judul buku membuka panel detail deskripsi secara *inline*/sisi tanpa kehilangan posisi daftar, sementara skala bobot ketersediaan stok dan kolom angka tabular membuat status siap-pinjam terbaca seketika di seluruh halaman.
- **Unresolved Decisions:** Font sans-serif spesifik, token angka ukuran/radius/spasi aktual, serta aset logo resmi JejakBaca/UNTAD (ditetapkan saat implementasi; re-run `/impeccable document` setelah kode dibangun).

## Direction contract

- **THESIS:** Katalog Perpustakaan beroperasi sebagai direktori modul kampus yang presisi dan langsung dapat ditindaklanjuti—menolak tampilan etalase toko buku e-commerce bershadow maupun hero pemasaran yang memisahkan pengguna dari pencarian buku.
- **OWN-WORLD:** Kanvas matte `#EEEEEE` (60%) membingkai kompartemen buku datar bergaris tipis, kerangka navigasi dan tajuk zona biru solid `#007DCC` (30%) dengan pemisahan keras terhadap **Jelajah Buku Publik**, serta merah `#D90000` (10%) khusus aksi **Pinjam** dan penanda kritis; angka stok tabular sejajar dengan skala bobot visual ketersediaan.
- **STORY:** Pengunjung langsung memahami bahwa halaman ini khusus koleksi **Buku Perpustakaan** UNTAD yang bisa dipinjam mandiri, melihat ketersediaan stok secara pasti tanpa perlu masuk terlebih dahulu, membaca deskripsi buku di tempat, dan meminjam dalam satu klik (atau diarahkan mulus ke `/login` bila masih Tamu).
- **FIRST VIEWPORT:** Bilah navigasi atas biru `#007DCC` memuat identitas **JejakBaca**, pemisah domain tegas (**Katalog Perpustakaan** aktif vs **Jelajah Buku Publik**), tautan peran (**Peminjaman Saya** / **Readlist Saya** / **Workspace Admin**), dan status akun/Masuk; tepat di bawahnya strip pencarian + filter kategori + toggle "Hanya yang tersedia" menempel rapi di atas kisi/daftar kompartemen buku dengan sampul (atau *fallback* tipografis), judul, penulis, kategori, indikator bobot stok terkunci sejajar, dan tombol **Pinjam** merah `#D90000` (berubah ke status nonaktif/info saat habis atau sudah dipinjam), plus panel detail samping/inline saat satu buku dipilih.
- **FORM:** Direktori Modul Kampus (candidate 4 of 7, raised by Star Atlas, Vertical Media Feed, Cassette J-Card, and Split-Flap); `seed:7f85aa374b3396fe`.
- **FINISH:** unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
