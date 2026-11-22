import type {
  AdminLoanItem,
  LibraryBook,
  PublicBookDetail,
  ReadlistItem,
  UserProfile,
} from '../../types/domain';

export interface MockUserRecord extends UserProfile {
  password: string;
}

export interface MockState {
  users: MockUserRecord[];
  books: LibraryBook[];
  loans: AdminLoanItem[];
  publicBooks: PublicBookDetail[];
  readlistByUser: Record<number, ReadlistItem[]>;
  nextUserId: number;
  nextBookId: number;
  nextLoanId: number;
  nextReadlistId: number;
}

const NOW_ISO = '2026-11-21T08:00:00.000Z';
const DAYS_MS = 86_400_000;

function daysOffsetIso(daysFromNow: number): string {
  return new Date(Date.parse(NOW_ISO) + daysFromNow * DAYS_MS).toISOString();
}

export function createInitialMockState(): MockState {
  const andiUser: MockUserRecord = {
    id: 2,
    name: 'Andi Pratama',
    nim: 'F55122001',
    email: 'andi@untad.ac.id',
    role: 'user',
    password: 'mahasiswa123',
    createdAt: '2026-09-01T08:00:00.000Z',
  };

  const sitiUser: MockUserRecord = {
    id: 3,
    name: 'Siti Rahmawati',
    nim: 'F55122018',
    email: 'siti@untad.ac.id',
    role: 'user',
    password: 'mahasiswa123',
    createdAt: '2026-09-05T08:00:00.000Z',
  };

  const adminUser: MockUserRecord = {
    id: 1,
    name: 'Petugas Perpustakaan UNTAD',
    nim: null,
    email: 'admin@untad.ac.id',
    role: 'admin',
    password: 'admin123',
    createdAt: '2026-08-15T08:00:00.000Z',
  };

  const books: LibraryBook[] = [
    {
      id: 1,
      title: 'Struktur Data dan Algoritma',
      author: 'Rinaldi Munir',
      isbn: '978-602-1234-56-7',
      category: 'Informatika',
      publishedYear: 2021,
      stockTotal: 5,
      stockAvailable: 4,
      description:
        'Buku referensi utama mata kuliah Struktur Data untuk mahasiswa Teknik Informatika UNTAD. Membahas senarai berantai, tumpukan, antrean, pohon biner, graf, dan analisis kompleksitas algoritma.',
      coverUrl: '/books.png',
      createdAt: '2026-08-20T08:00:00.000Z',
      updatedAt: '2026-10-12T08:00:00.000Z',
    },
    {
      id: 2,
      title: 'Basis Data Lanjut & Transaksi',
      author: 'Abraham Silberschatz',
      isbn: '978-007-8022-15-9',
      category: 'Sistem Informasi',
      publishedYear: 2020,
      stockTotal: 3,
      stockAvailable: 1,
      description:
        'Pembahasan konsep perancangan basis data relasional, normalisasi hingga BCNF, pengindeksan B+ Tree, pengendalian konkurensi, dan pemulihan transaksi.',
      coverUrl: '/books.png',
      createdAt: '2026-08-21T08:00:00.000Z',
      updatedAt: '2026-10-15T08:00:00.000Z',
    },
    {
      id: 3,
      title: 'Rekayasa Perangkat Lunak Modern',
      author: 'Ian Sommerville',
      isbn: '978-013-3943-03-0',
      category: 'Informatika',
      publishedYear: 2019,
      stockTotal: 2,
      stockAvailable: 0,
      description:
        'Panduan komprehensif proses pengembangan perangkat lunak tangkas, arsitektur sistem terdistribusi, pengujian otomatis, dan pemeliharaan kode jangka panjang.',
      coverUrl: null,
      createdAt: '2026-08-22T08:00:00.000Z',
      updatedAt: '2026-10-18T08:00:00.000Z',
    },
    {
      id: 4,
      title: 'Kalkulus dan Geometri Analitik Jilid 1',
      author: 'Edwin J. Purcell & Dale Varberg',
      isbn: '978-979-0339-31-6',
      category: 'Matematika',
      publishedYear: 2018,
      stockTotal: 6,
      stockAvailable: 5,
      description:
        'Materi dasar limit, turunan, aplikasi diferensial, integral tentu, serta pengantar fungsi transenden untuk mahasiswa sains dan teknik.',
      coverUrl: null,
      createdAt: '2026-08-23T08:00:00.000Z',
      updatedAt: '2026-09-29T08:00:00.000Z',
    },
    {
      id: 5,
      title: 'Metodologi Penelitian Kuantitatif & Kualitatif',
      author: 'Sugiyono',
      isbn: '978-602-2893-73-8',
      category: 'Metodologi Penelitian',
      publishedYear: 2022,
      stockTotal: 4,
      stockAvailable: 1,
      description:
        'Rujukan penyusunan proposal skripsi, perumusan masalah, teknik sampling, validitas instrumen, dan analisis data penelitian mahasiswa.',
      coverUrl: null,
      createdAt: '2026-08-25T08:00:00.000Z',
      updatedAt: '2026-10-05T08:00:00.000Z',
    },
    {
      id: 6,
      title: 'Mekanika Tanah & Teknik Pondasi',
      author: 'Hary Christady Hardiyatmo',
      isbn: '978-602-3860-44-9',
      category: 'Teknik Sipil',
      publishedYear: 2020,
      stockTotal: 4,
      stockAvailable: 4,
      description:
        'Membahas klasifikasi tanah, permeabilitas, konsolidasi, kuat geser tanah, serta perhitungan daya dukung pondasi dangkal dan dalam.',
      coverUrl: null,
      createdAt: '2026-08-26T08:00:00.000Z',
      updatedAt: '2026-09-30T08:00:00.000Z',
    },
    {
      id: 7,
      title: 'Jaringan Komputer & Protokol TCP/IP',
      author: 'Onno W. Purbo',
      isbn: '978-602-0487-12-4',
      category: 'Informatika',
      publishedYear: 2022,
      stockTotal: 4,
      stockAvailable: 3,
      description:
        'Pengenalan arsitektur OSI dan TCP/IP, pengalamatan IPv4/IPv6, routing statis dan dinamis, serta pemecahan masalah jaringan kampus.',
      coverUrl: null,
      createdAt: '2026-08-27T08:00:00.000Z',
      updatedAt: '2026-10-01T08:00:00.000Z',
    },
    {
      id: 8,
      title: 'Analisis dan Perancangan Sistem Informasi',
      author: 'Jogiyanto Hartono',
      isbn: '978-979-2951-20-2',
      category: 'Sistem Informasi',
      publishedYear: 2019,
      stockTotal: 5,
      stockAvailable: 2,
      description:
        'Metodologi SDLC, pemodelan DFD dan UML, perancangan antarmuka sistem informasi organisasi, serta evaluasi kelayakan sistem.',
      coverUrl: null,
      createdAt: '2026-08-28T08:00:00.000Z',
      updatedAt: '2026-10-02T08:00:00.000Z',
    },
    {
      id: 9,
      title: 'Statistika Terapan untuk Penelitian',
      author: 'Sudjana',
      isbn: '978-979-5034-18-6',
      category: 'Matematika',
      publishedYear: 2017,
      stockTotal: 3,
      stockAvailable: 1,
      description:
        'Distribusi probabilitas, uji hipotesis parametrik dan non-parametrik, analisis varians, serta regresi linear berganda.',
      coverUrl: null,
      createdAt: '2026-08-29T08:00:00.000Z',
      updatedAt: '2026-10-03T08:00:00.000Z',
    },
    {
      id: 10,
      title: 'Struktur Beton Bertulang Lanjut',
      author: 'Wahyudi & Triwiyono',
      isbn: '978-602-3862-11-5',
      category: 'Teknik Sipil',
      publishedYear: 2021,
      stockTotal: 2,
      stockAvailable: 0,
      description:
        'Perencanaan elemen balok, kolom, pelat lantai, dan dinding geser tahan gempa mengacu pada standar SNI bangunan gedung.',
      coverUrl: null,
      createdAt: '2026-08-30T08:00:00.000Z',
      updatedAt: '2026-10-04T08:00:00.000Z',
    },
    {
      id: 11,
      title: 'Kecerdasan Buatan & Pembelajaran Mesin',
      author: 'Suyanto',
      isbn: '978-602-6232-91-7',
      category: 'Informatika',
      publishedYear: 2023,
      stockTotal: 4,
      stockAvailable: 4,
      description:
        'Konsep pencarian heuristik, representasi pengetahuan, klasifikasi, klastering, jaringan saraf tiruan, serta evaluasi model prediktif.',
      coverUrl: null,
      createdAt: '2026-08-31T08:00:00.000Z',
      updatedAt: '2026-10-06T08:00:00.000Z',
    },
    {
      id: 12,
      title: 'Tata Kelola TI & Audit Sistem Informasi',
      author: 'Eko Nugroho',
      isbn: '978-602-4012-77-3',
      category: 'Sistem Informasi',
      publishedYear: 2021,
      stockTotal: 3,
      stockAvailable: 3,
      description:
        'Kerangka kerja COBIT, manajemen risiko teknologi informasi, kontrol akses aplikasi, dan penyusunan laporan audit sistem.',
      coverUrl: null,
      createdAt: '2026-09-01T08:00:00.000Z',
      updatedAt: '2026-10-07T08:00:00.000Z',
    },
    {
      id: 13,
      title: 'Teknik Penulisan Karya Ilmiah & Skripsi',
      author: 'Dalman',
      isbn: '978-979-7698-41-0',
      category: 'Metodologi Penelitian',
      publishedYear: 2020,
      stockTotal: 6,
      stockAvailable: 5,
      description:
        'Pedoman praktis menyusun latar belakang, tinjauan pustaka, sitasi akademik, parafrase bebas plagiarisme, dan publikasi jurnal.',
      coverUrl: null,
      createdAt: '2026-09-02T08:00:00.000Z',
      updatedAt: '2026-10-08T08:00:00.000Z',
    },
    {
      id: 14,
      title: 'Aljabar Linear Elementer & Aplikasi',
      author: 'Howard Anton & Chris Rorres',
      isbn: '978-979-0759-64-0',
      category: 'Matematika',
      publishedYear: 2019,
      stockTotal: 4,
      stockAvailable: 2,
      description:
        'Sistem persamaan linear, determinan, ruang vektor Euclidean, transformasi linear, nilai eigen, dan penerapannya pada komputasi.',
      coverUrl: null,
      createdAt: '2026-09-03T08:00:00.000Z',
      updatedAt: '2026-10-09T08:00:00.000Z',
    },
  ];

  const loans: AdminLoanItem[] = [
    // Peminjaman aktif (normal) untuk Andi
    {
      id: 101,
      bookId: 1,
      bookTitle: books[0].title,
      bookAuthor: books[0].author,
      bookCoverUrl: books[0].coverUrl,
      status: 'borrowed',
      borrowedAt: daysOffsetIso(-3),
      dueDate: daysOffsetIso(4),
      returnedAt: null,
      isOverdue: false,
      daysRemaining: 4,
      borrower: {
        id: andiUser.id,
        name: andiUser.name,
        nim: andiUser.nim,
        email: andiUser.email,
      },
    },
    // Peminjaman Terlambat untuk Andi
    {
      id: 102,
      bookId: 2,
      bookTitle: books[1].title,
      bookAuthor: books[1].author,
      bookCoverUrl: books[1].coverUrl,
      status: 'borrowed',
      borrowedAt: daysOffsetIso(-10),
      dueDate: daysOffsetIso(-3),
      returnedAt: null,
      isOverdue: true,
      daysRemaining: -3,
      borrower: {
        id: andiUser.id,
        name: andiUser.name,
        nim: andiUser.nim,
        email: andiUser.email,
      },
    },
    // Peminjaman sudah dikembalikan untuk Andi
    {
      id: 103,
      bookId: 4,
      bookTitle: books[3].title,
      bookAuthor: books[3].author,
      bookCoverUrl: books[3].coverUrl,
      status: 'returned',
      borrowedAt: daysOffsetIso(-20),
      dueDate: daysOffsetIso(-13),
      returnedAt: daysOffsetIso(-14),
      isOverdue: false,
      daysRemaining: 0,
      borrower: {
        id: andiUser.id,
        name: andiUser.name,
        nim: andiUser.nim,
        email: andiUser.email,
      },
    },
    // Peminjaman aktif oleh Siti (membuat buku id=3 stok habis)
    {
      id: 104,
      bookId: 3,
      bookTitle: books[2].title,
      bookAuthor: books[2].author,
      bookCoverUrl: books[2].coverUrl,
      status: 'borrowed',
      borrowedAt: daysOffsetIso(-2),
      dueDate: daysOffsetIso(5),
      returnedAt: null,
      isOverdue: false,
      daysRemaining: 5,
      borrower: {
        id: sitiUser.id,
        name: sitiUser.name,
        nim: sitiUser.nim,
        email: sitiUser.email,
      },
    },
  ];

  const publicBooks: PublicBookDetail[] = [
    {
      workId: 'OL82563W',
      title: 'Clean Code: A Handbook of Agile Software Craftsmanship',
      authors: ['Robert C. Martin'],
      firstPublishYear: 2008,
      coverUrl: null,
      subjects: ['computer_science', 'software_engineering', 'Programming'],
      inReadlist: true,
      description:
        'Panduan praktik penulisan kode yang mudah dibaca, dipelihara, dan diuji. Menekankan penamaan bermakna, fungsi ringkas, dan pemisahan tanggung jawab.',
      descriptionFallback: 'Deskripsi belum tersedia di Open Library.',
    },
    {
      workId: 'OL17860744W',
      title: 'Designing Data-Intensive Applications',
      authors: ['Martin Kleppmann'],
      firstPublishYear: 2017,
      coverUrl: null,
      subjects: ['computer_science', 'data_science', 'Distributed systems'],
      inReadlist: false,
      description:
        'Eksplorasi arsitektur sistem data modern mencakup replikasi, partisi, konsistensi terdistribusi, pemrosesan batch, dan streaming.',
      descriptionFallback: 'Deskripsi belum tersedia di Open Library.',
    },
    {
      workId: 'OL262421W',
      title: 'Structure and Interpretation of Computer Programs',
      authors: ['Harold Abelson', 'Gerald Jay Sussman'],
      firstPublishYear: 1984,
      coverUrl: null,
      subjects: ['computer_science', 'Computer programming'],
      inReadlist: true,
      description: null,
      descriptionFallback:
        'Deskripsi belum tersedia di Open Library. Terbit pertama kali pada 1984 dengan subjek: computer_science, Computer programming.',
    },
    {
      workId: 'OL5735363W',
      title: 'The Pragmatic Programmer',
      authors: ['Andrew Hunt', 'David Thomas'],
      firstPublishYear: 1999,
      coverUrl: null,
      subjects: ['software_engineering', 'computer_science'],
      inReadlist: false,
      description: null,
      descriptionFallback:
        'Deskripsi belum tersedia di Open Library. Terbit pertama kali pada 1999 dengan subjek: software_engineering, computer_science.',
    },
    {
      workId: 'OL45804W',
      title: 'Introduction to Linear Algebra',
      authors: ['Gilbert Strang'],
      firstPublishYear: 1993,
      coverUrl: null,
      subjects: ['mathematics', 'Linear algebra'],
      inReadlist: false,
      description:
        'Pengantar aljabar linear klasik mencakup eliminasi Gaussian, ruang vektor, nilai eigen, dan aplikasinya pada komputasi ilmiah.',
      descriptionFallback: 'Deskripsi belum tersedia di Open Library.',
    },
  ];

  const readlistByUser: Record<number, ReadlistItem[]> = {
    [andiUser.id]: [
      {
        id: 201,
        workId: publicBooks[0].workId,
        title: publicBooks[0].title,
        authors: publicBooks[0].authors,
        firstPublishYear: publicBooks[0].firstPublishYear,
        coverUrl: publicBooks[0].coverUrl,
        description: publicBooks[0].description,
        createdAt: daysOffsetIso(-6),
      },
      {
        id: 202,
        workId: publicBooks[2].workId,
        title: publicBooks[2].title,
        authors: publicBooks[2].authors,
        firstPublishYear: publicBooks[2].firstPublishYear,
        coverUrl: publicBooks[2].coverUrl,
        description: null,
        createdAt: daysOffsetIso(-2),
      },
    ],
  };

  return {
    users: [adminUser, andiUser, sitiUser],
    books,
    loans,
    publicBooks,
    readlistByUser,
    nextUserId: 4,
    nextBookId: 15,
    nextLoanId: 105,
    nextReadlistId: 203,
  };
}
