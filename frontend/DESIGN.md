---
name: JejakBaca
description: Sistem informasi peminjaman buku perpustakaan UNTAD dan penjelajahan Buku Publik Open Library.
---

<!-- SEED: established with the user before implementation; re-run /impeccable document once there's code to capture the actual tokens and components. -->

# Design System: JejakBaca

## Overview

**Creative North Star: "Direktori Modul Kampus"**

JejakBaca mengadopsi disiplin papan pengumuman fakultas dan modul jadwal akademik kampus Indonesia: permukaan kerja yang terstruktur, terang di bawah cahaya ruang baca maupun koridor kampus, dan langsung terbaca dalam sekali sapuan mata baik di ponsel maupun laptop. Dunia visual ini tidak menyamar sebagai toko buku ritel maupun perpustakaan klasik berkertas krem—ia beroperasi sebagai direktori sirkulasi kampus yang presisi, di mana batas antara **Buku Perpustakaan** (dapat dipinjam *self-service*) dan **Buku Publik** (referensi Open Library untuk **Readlist**) selalu tampak tegas sejak pandangan pertama.

Komitmen warna **60-30-10** menggerakkan seluruh arsitektur antarmuka secara fungsional: kanvas abu-abu matte terang (`#EEEEEE`, 60%) menjadi latar tenang bagi kompartemen informasi, biru institusional solid (`#007DCC`, 30%) memegang kerangka navigasi, tajuk zona domain, dan struktur filter aktif, sementara merah tegas (`#D90000`, 10%) dikunci ketat untuk aksi utama sirkulasi dan indikator kritis seperti stok habis atau status **Terlambat**.

Karena seluruh halaman inti JejakBaca berada pada mode *Operate*, kontrol antarmuka selalu menggunakan komponen web standar yang akrab (navigasi, input pencarian, chip/filter, tombol, daftar/tabel) sementara dunia visual hadir melalui tipografi, palet yang berkomitmen, kepadatan terukur, dan *signature move* berupa **kompartemen buku bergaris tegas dengan kolom status/stok sejajar serta ekspansi detail inline tanpa modal penuh**. Gerakan antarmuka singkat dan fungsional (150–250 ms) semata untuk mengonfirmasi perubahan status, pemuatan skeleton, atau bukaan panel detail—tanpa animasi dekoratif saat halaman dibuka. Gambar sampul buku diperlakukan sebagai artefak katalog berukuran konsisten dengan *fallback* tipografis struktural ketika URL cover kosong.

**Key Characteristics:**
- Mode terang (*light-first*) yang optimal dibaca pada siang hari di ponsel mahasiswa maupun laptop petugas perpustakaan.
- Komitmen warna 60-30-10 fungsional: `#EEEEEE` sebagai bidang dasar (60%), `#007DCC` sebagai kerangka struktur & navigasi (30%), dan `#D90000` ketat untuk aksi utama & peringatan kritis (10%).
- Kompartemen berstruktur tegas dengan kesejajaran kolom tetap untuk angka stok, status peminjaman, dan tenggat 7 hari.
- Pemisahan visual domain yang keras antara **Katalog Perpustakaan** dan **Jelajah Buku Publik**.
- Skala bobot visual ketersediaan stok yang langsung membedakan stok aman, menipis (≤1), dan habis.
- Detail buku terbuka *inline* atau di panel samping tanpa memutus konteks pencarian dan penyaringan pengguna.

## Colors

Palet menggunakan strategi **Committed** berbasis aturan **60-30-10** yang ditetapkan pemilik produk: dominasi netral terang matte, kerangka struktural biru solid, dan aksen merah hemat berintensitas tinggi.

### Primary
- **Biru Modul Kampus** (`#007DCC`): Memegang sekitar **30%** komposisi visual sebagai warna kerangka struktural—bilah navigasi utama, tajuk zona domain aktif, indikator tab terpilih, rel filter aktif, dan aksen fokus/tautan interaktif.

### Secondary
- **Merah Sirkulasi & Peringatan** (`#D90000`): Dibatasi ketat pada **≤10%** permukaan layar untuk dua peran berprioritas tertinggi: tombol aksi utama sirkulasi (seperti **Pinjam** pada Buku Perpustakaan) serta indikator kritis (status **Terlambat**, stok habis, atau aksi destruktif seperti hapus koleksi/Readlist).

### Neutral
- **Kanvas Plaster Terang** (`#EEEEEE`): Memegang sekitar **60%** permukaan layar sebagai latar halaman utama yang meredam silau sekaligus memberi kontras bersih terhadap bidang kompartemen konten.
- **Permukaan Kompartemen / Kartu** (`[to be resolved during implementation]`): Bidang putih bersih atau sangat terang di atas `#EEEEEE` agar judul buku, metadata, dan tabel terbaca tajam.
- **Tinta Utama & Sekunder** (`[to be resolved during implementation]`): Tinta gelap berkontras tinggi untuk judul dan tubuh teks serta abu-abu gelap untuk metadata sekunder (penulis, ISBN, tahun terbit).
- **Garis Batas Kompartemen & Pembagi** (`[to be resolved during implementation]`): Garis tipis (*hairline*) berstruktur tegas untuk memisahkan sel katalog, kolom tabel, dan panel detail.
- **Warna Status Pendukung** (`[to be resolved during implementation]`): Nada semantik tambahan yang terkendali untuk status **Tersedia** dan **Stok Menipis** tanpa menyaingi dominasi `#007DCC` dan `#D90000`.

### Named Rules
- **The 60-30-10 Commitment Rule.** Pertahankan proporsi visual `#EEEEEE` (~60%), `#007DCC` (~30%), dan `#D90000` (~10%) pada skala halaman penuh; warna biru hadir sebagai struktur nyata pada shell dan tajuk zona, bukan sekadar titik dekoratif di atas halaman abu-abu kosong.
- **The Red-Is-Action-Or-Alert Rule.** `#D90000` tidak pernah dipakai untuk hiasan, latar blok besar, atau elemen pasif; setiap kemunculan merah berarti aksi sirkulasi utama atau kondisi mendesak (habis / **Terlambat** / hapus).
- **The Hard Domain Partition Rule.** Penanda zona **Katalog Perpustakaan** dan **Jelajah Buku Publik** harus tampil sebagai dua ruang kerja terpisah secara visual agar pengguna tidak pernah menyangka Buku Publik dapat dipinjam.

## Typography

**Display / Heading Font:** `[to be resolved during implementation]` — satu keluarga *workhorse sans-serif* kontemporer yang tegas, bersih, dan optimal untuk antarmuka produktivitas (*Operate*), menghindari *display serif* bergaya toko buku antik.
**Body Font:** `[to be resolved during implementation]` — keluarga *sans-serif* yang sama dengan tajuk demi keterpaduan antarmuka aplikasi.
**Label / Data / Mono Font:** `[to be resolved during implementation]` — angka tabular (*tabular-nums*) wajib aktif pada seluruh informasi stok (`3/5 tersedia`), ISBN, NIM, dan hitungan sisa hari jatuh tempo; gaya monospasi opsional hanya untuk kode teknis seperti ISBN atau `workId`.

**Character:** Lugas, modern, dan akademis—mudah dipindai cepat di layar ponsel maupun daftar padat di laptop tanpa gaya hias yang memperlambat pembacaan judul buku berbahasa Indonesia.

### Hierarchy
- **Headline** (`[to be resolved during implementation]`): Judul permukaan utama (mis. **Katalog Perpustakaan**, **Jelajah Buku Publik**, **Peminjaman Saya**, **Workspace Admin**) menggunakan skala `rem` tetap dengan rasio rapat (*tight Operate scale*, ~1.125–1.2 antar tingkat).
- **Title** (`[to be resolved during implementation]`): Judul buku dan tajuk sub-panel; bobot tebal-menengah agar mendominasi setiap kompartemen tanpa huruf kapital penuh.
- **Body** (`[to be resolved during implementation]`): Deskripsi buku dan informasi *fallback* Open Library; panjang baris dibatasi ideal ~65–75 karakter untuk kenyamanan membaca.
- **Label** (`[to be resolved during implementation]`): Label kategori, chip filter, header kolom, dan badge status ketersediaan/peminjaman; ringkas, berjarak rapi, dan tidak memakai font dekoratif.

### Named Rules
- **The Fixed-Scale Operate Rule.** Gunakan skala `rem` tetap dengan rasio rapat, bukan judul cair (*fluid clamp*) berlebihan, agar kepadatan informasi konsisten antara panel sempit dan layar lebar.
- **The Tabular Circulation Rule.** Setiap angka stok, kuota (`2/3 aktif`), NIM, tahun terbit, dan sisa hari jatuh tempo wajib memakai `tabular-nums` dan disejajarkan pada kolom yang terkunci.

## Layout

Tata letak mengikuti gramatika **kompartemen modular berstruktur**:
- **Cangkang Aplikasi Konsisten:** Navigasi utama berbasis struktur biru `#007DCC` di bagian atas (dengan penyesuaian responsif yang nyaman dijangkau di ponsel) memisahkan rute inti sesuai peran (**Katalog Perpustakaan**, **Jelajah Buku Publik**, **Peminjaman Saya**, **Readlist Saya**, serta **Workspace Admin** di `/admin`).
- **Kontrol di Atas Ruang Kerja:** Bilah pencarian, filter kategori, dan sakelar ketersediaan berada langsung di atas daftar koleksi yang disaring sehingga hubungan sebab-akibat langsung terlihat.
- **Kesejajaran Kolom Tetap & Detail Tanpa Putus Konteks:** Di setiap item katalog maupun baris peminjaman, posisi angka stok, indikator status, dan tombol aksi terkunci secara konsisten agar pemindaian vertikal berlangsung cepat. Membuka detail buku menampilkan deskripsi lengkap di panel sisi (desktop) atau ekspansi *inline* / lembar bawah (mobile) tanpa memaksa modal layar penuh yang memutus konteks pencarian.
- **Adaptasi Struktural Responsif:** Perubahan antara ponsel dan laptop bersifat struktural (penyesuaian jumlah kolom, pergeseran panel detail dari samping ke *inline*, serta tata letak tabel responsif di Workspace Admin), dengan target sentuh yang memadai di perangkat mobile.

## Elevation & Depth

Sistem ini menganut prinsip **datar secara bawaan (*flat-by-default*)** dengan pemisahan bidang melalui kontras tonal (`#EEEEEE` terhadap permukaan kompartemen terang) dan garis tepi tipis (*hairline borders*) yang tegas. Kedalaman tidak diciptakan dengan bayangan tebal dekoratif pada kartu diam; bayangan ringan hanya digunakan pada elemen melayang sementara (seperti *dropdown*, *popover*, atau panel laci detail saat terbuka di atas konten).

### Named Rules
- **The Flat-Compartment Rule.** Kompartemen dan kartu katalog duduk datar dengan garis batas tipis dan kontras bidang tonal; hindari bayangan drop-shadow lembut ala kartu e-commerce pada kondisi diam.

## Shapes

Bahasa bentuk bersifat **arsitektural, ringkas, dan utilitarian**: sudut membulat kecil dan terkendali (`[to be resolved during implementation]`) yang menyatukan kesan modul akademik modern tanpa terlihat kaku mentah maupun terlalu bulat seperti aplikasi hiburan. Garis pembagi lurus dan proporsi sampul buku vertikal seragam (`2:3` atau sejenisnya, ditetapkan saat implementasi) menjaga ritme kisi tetap rapi bahkan saat sebagian buku tidak memiliki URL cover. Bentuk kapsul (*pill*) kecil hanya dipakai secara hemat untuk chip topik/filter dan badge status sirkulasi.

## Do's and Don'ts

### Do:
- **Do** pertahankan komposisi warna 60-30-10 (`#EEEEEE` kanvas ~60%, `#007DCC` struktur/navigasi/filter ~30%, `#D90000` aksi utama & status kritis ≤10%) di seluruh permukaan JejakBaca.
- **Do** bedakan secara visual dan terminologis antara **Katalog Perpustakaan** (stok & aksi **Pinjam**) dan **Jelajah Buku Publik** (topik Open Library & aksi **+ Readlist**).
- **Do** gunakan skala bobot visual yang langsung membedakan stok tersedia penuh, stok menipis (≤1), dan stok habis, serta kunci kesejajaran kolom angka dengan `tabular-nums`.
- **Do** tampilkan detail deskripsi buku secara *inline* atau lewat panel sisi agar pengguna tidak kehilangan posisi pencarian dan filter.
- **Do** sediakan *fallback* visual sampul berbasis tipografi/kode kategori saat `coverUrl` kosong dan *fallback* deskripsi informatif bila Open Library tidak menyediakan deskripsi.
- **Do** gunakan *skeleton loading* yang mengikuti bentuk kompartemen, bukan *spinner* tunggal di tengah layar kosong.

### Don't:
- **Don't** menggunakan tema kertas krem + *display serif* bergaya toko buku antik ataupun gradien mencolok di hero.
- **Don't** mencampur **Buku Perpustakaan** dan **Buku Publik** ke dalam satu feed atau menampilkan tombol **Pinjam** pada Buku Publik maupun **Readlist** pada Buku Perpustakaan.
- **Don't** menggunakan `#D90000` untuk dekorasi latar, badge kategori pasif, atau ikon tidak interaktif.
- **Don't** menampilkan istilah denda uang atau penalti finansial pada indikator **Terlambat**.
- **Don't** menggunakan komponen kontrol tidak standar atau animasi masuk berlebihan yang menunda pengguna menyelesaikan tugas pencarian dan peminjaman.
