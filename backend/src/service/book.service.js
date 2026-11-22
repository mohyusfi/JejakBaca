import { getDb } from '../app/database.js';
import { ValidationError, NotFoundError, ConflictError } from '../middleware/errorHandler.js';

/**
 * Memformat baris database menjadi objek LibraryBook sesuai kontrak OpenAPI
 * @param {object} row
 * @param {boolean} [isBorrowedByMe=false]
 * @returns {object}
 */
export function formatLibraryBook(row, isBorrowedByMe = false) {
  return {
    id: row.id,
    title: row.title,
    author: row.author,
    isbn: row.isbn || null,
    category: row.category || null,
    publishedYear: row.published_year !== undefined && row.published_year !== null ? Number(row.published_year) : null,
    stockTotal: Number(row.stock_total),
    stockAvailable: Number(row.stock_available),
    description: row.description,
    coverUrl: row.cover_url || null,
    isBorrowedByMe,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const sampleBooks = [
  {
    title: 'Struktur Data dan Algoritma',
    author: 'Rinaldi Munir',
    isbn: '978-602-1234-56-7',
    category: 'Informatika',
    publishedYear: 2021,
    stockTotal: 5,
    description: 'Buku referensi utama mata kuliah Struktur Data untuk mahasiswa Teknik Informatika UNTAD.',
    coverUrl: 'https://covers.openlibrary.org/b/id/123456-M.jpg',
  },
  {
    title: 'Basis Data: Teori dan Perancangan',
    author: 'Fathansyah',
    isbn: '978-602-6232-24-3',
    category: 'Sistem Informasi',
    publishedYear: 2020,
    stockTotal: 3,
    description: 'Membahas konsep pemodelan relasional, normalisasi, dan implementasi SQL pada sistem basis data modern.',
    coverUrl: 'https://covers.openlibrary.org/b/id/234567-M.jpg',
  },
  {
    title: 'Jaringan Komputer Berbasis IP',
    author: 'Iwan Sofana',
    isbn: '978-602-8758-82-6',
    category: 'Jaringan',
    publishedYear: 2019,
    stockTotal: 4,
    description: 'Panduan praktis perancangan topologi, subnetting IPv4/IPv6, dan administrasi routing jaringan kampus.',
    coverUrl: null,
  },
  {
    title: 'Rekayasa Perangkat Lunak',
    author: 'Rosa A.S. & M. Shalahuddin',
    isbn: '978-602-6232-15-1',
    category: 'Informatika',
    publishedYear: 2022,
    stockTotal: 2,
    description: 'Panduan metodologi SDLC, perancangan UML, arsitektur perangkat lunak, dan pengujian kualitas sistem.',
    coverUrl: null,
  },
  {
    title: 'Kecerdasan Buatan dan Pembelajaran Mesin',
    author: 'Suyanto',
    isbn: '978-602-6232-68-7',
    category: 'Kecerdasan Buatan',
    publishedYear: 2023,
    stockTotal: 3,
    description: 'Konsep dasar agen cerdas, algoritma optimasi, deep learning, dan aplikasi klasifikasi data modern.',
    coverUrl: null,
  },
];

export const bookService = {
  /**
   * Mengambil daftar buku perpustakaan dengan filter dan paginasi
   * @param {{ q?: string, category?: string, availableOnly?: boolean | string, page?: number | string, limit?: number | string }} query
   * @param {number|null} [userId]
   * @returns {{ items: object[], meta: { page: number, limit: number, total: number, totalPages: number } }}
   */
  getBooks(query = {}, userId = null) {
    const db = getDb();

    let page = Number.parseInt(query.page || '1', 10);
    if (Number.isNaN(page) || page < 1) page = 1;

    let limit = Number.parseInt(query.limit || '10', 10);
    if (Number.isNaN(limit) || limit < 1) limit = 10;
    if (limit > 50) limit = 50;

    const conditions = ['deleted_at IS NULL'];
    const params = [];

    if (query.q && typeof query.q === 'string' && query.q.trim()) {
      const keyword = `%${query.q.trim()}%`;
      conditions.push('(title LIKE ? OR author LIKE ? OR isbn LIKE ?)');
      params.push(keyword, keyword, keyword);
    }

    if (query.category && typeof query.category === 'string' && query.category.trim()) {
      conditions.push('category = ?');
      params.push(query.category.trim());
    }

    if (query.availableOnly === true || query.availableOnly === 'true' || query.availableOnly === '1') {
      conditions.push('stock_available > 0');
    }

    const whereClause = conditions.join(' AND ');

    // Hitung total data
    const countStmt = db.prepare(`SELECT COUNT(*) as total FROM books WHERE ${whereClause};`);
    const countResult = countStmt.get(...params);
    const total = countResult ? countResult.total : 0;
    const totalPages = Math.ceil(total / limit) || 1;

    // Ambil data buku dengan limit & offset
    const offset = (page - 1) * limit;
    const selectStmt = db.prepare(`
      SELECT * FROM books
      WHERE ${whereClause}
      ORDER BY id DESC
      LIMIT ? OFFSET ?;
    `);

    const rows = selectStmt.all(...params, limit, offset);

    // Periksa status peminjaman pengguna jika userId tersedia
    let userBorrowedBookIds = new Set();
    if (userId) {
      try {
        const loansStmt = db.prepare(`
          SELECT book_id FROM loans WHERE user_id = ? AND status = 'borrowed';
        `);
        const loans = loansStmt.all(userId);
        userBorrowedBookIds = new Set(loans.map((l) => l.book_id));
      } catch {
        // Tabel loans belum dibuat sebelum Issue #7
      }
    }

    const items = rows.map((row) =>
      formatLibraryBook(row, userBorrowedBookIds.has(row.id))
    );

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  },

  /**
   * Mengambil detail buku berdasarkan ID
   * @param {number|string} id
   * @param {number|null} [userId]
   * @returns {object}
   */
  getBookById(id, userId = null) {
    const bookId = Number(id);
    if (Number.isNaN(bookId)) {
      throw new NotFoundError('Buku tidak ditemukan');
    }

    const db = getDb();
    const stmt = db.prepare('SELECT * FROM books WHERE id = ? AND deleted_at IS NULL;');
    const row = stmt.get(bookId);

    if (!row) {
      throw new NotFoundError('Buku tidak ditemukan');
    }

    let isBorrowedByMe = false;
    if (userId) {
      try {
        const loanStmt = db.prepare(`
          SELECT id FROM loans WHERE user_id = ? AND book_id = ? AND status = 'borrowed' LIMIT 1;
        `);
        const loan = loanStmt.get(userId, bookId);
        isBorrowedByMe = Boolean(loan);
      } catch {
        // Tabel loans belum ada
      }
    }

    return formatLibraryBook(row, isBorrowedByMe);
  },

  /**
   * Menambahkan buku perpustakaan baru (khusus Admin)
   * @param {{ title?: string, author?: string, description?: string, stockTotal?: number, isbn?: string, category?: string, publishedYear?: number, coverUrl?: string }} payload
   * @returns {object}
   */
  createBook(payload = {}) {
    const details = [];

    if (!payload.title || typeof payload.title !== 'string' || !payload.title.trim()) {
      details.push({ field: 'title', message: 'Judul buku wajib diisi' });
    }

    if (!payload.author || typeof payload.author !== 'string' || !payload.author.trim()) {
      details.push({ field: 'author', message: 'Penulis buku wajib diisi' });
    }

    if (!payload.description || typeof payload.description !== 'string' || !payload.description.trim()) {
      details.push({ field: 'description', message: 'Deskripsi buku wajib diisi' });
    }

    const stockTotal = Number(payload.stockTotal);
    if (Number.isNaN(stockTotal) || stockTotal < 1) {
      details.push({ field: 'stockTotal', message: 'Stok total minimal bernilai 1' });
    }

    if (details.length > 0) {
      throw new ValidationError('Validasi penambahan buku gagal', details);
    }

    const db = getDb();
    const stmt = db.prepare(`
      INSERT INTO books (
        title, author, isbn, category, published_year,
        stock_total, stock_available, description, cover_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
    `);

    const result = stmt.run(
      payload.title.trim(),
      payload.author.trim(),
      payload.isbn ? payload.isbn.trim() : null,
      payload.category ? payload.category.trim() : null,
      payload.publishedYear ? Number(payload.publishedYear) : null,
      stockTotal,
      stockTotal, // stockAvailable = stockTotal
      payload.description.trim(),
      payload.coverUrl ? payload.coverUrl.trim() : null
    );

    const insertedId = Number(result.lastInsertRowid);
    return this.getBookById(insertedId);
  },

  /**
   * Memperbarui data buku perpustakaan (khusus Admin)
   * @param {number|string} id
   * @param {object} payload
   * @returns {object}
   */
  updateBook(id, payload = {}) {
    const bookId = Number(id);
    if (Number.isNaN(bookId)) {
      throw new NotFoundError('Buku tidak ditemukan');
    }

    const db = getDb();
    const current = db.prepare('SELECT * FROM books WHERE id = ? AND deleted_at IS NULL;').get(bookId);

    if (!current) {
      throw new NotFoundError('Buku tidak ditemukan');
    }

    const details = [];
    if (payload.title !== undefined && (typeof payload.title !== 'string' || !payload.title.trim())) {
      details.push({ field: 'title', message: 'Judul buku tidak boleh kosong' });
    }
    if (payload.author !== undefined && (typeof payload.author !== 'string' || !payload.author.trim())) {
      details.push({ field: 'author', message: 'Penulis buku tidak boleh kosong' });
    }
    if (payload.description !== undefined && (typeof payload.description !== 'string' || !payload.description.trim())) {
      details.push({ field: 'description', message: 'Deskripsi buku tidak boleh kosong' });
    }

    let newStockTotal = current.stock_total;
    let newStockAvailable = current.stock_available;

    if (payload.stockTotal !== undefined) {
      const parsedStock = Number(payload.stockTotal);
      if (Number.isNaN(parsedStock) || parsedStock < 0) {
        details.push({ field: 'stockTotal', message: 'Stok total tidak boleh negatif' });
      } else {
        newStockTotal = parsedStock;
        const activeLoanRow = db
          .prepare("SELECT COUNT(*) AS total FROM loans WHERE book_id = ? AND status = 'borrowed';")
          .get(bookId);
        const currentlyBorrowed = activeLoanRow ? Number(activeLoanRow.total) : 0;
        if (newStockTotal < currentlyBorrowed) {
          throw new ConflictError(
            `Stok total (${newStockTotal}) tidak boleh kurang dari buku yang sedang dipinjam (${currentlyBorrowed})`,
            'STOCK_BELOW_BORROWED'
          );
        }
        newStockAvailable = newStockTotal - currentlyBorrowed;
      }
    }

    if (details.length > 0) {
      throw new ValidationError('Validasi pembaruan buku gagal', details);
    }

    const title = payload.title !== undefined ? payload.title.trim() : current.title;
    const author = payload.author !== undefined ? payload.author.trim() : current.author;
    const description = payload.description !== undefined ? payload.description.trim() : current.description;
    const isbn = payload.isbn !== undefined ? (payload.isbn ? payload.isbn.trim() : null) : current.isbn;
    const category = payload.category !== undefined ? (payload.category ? payload.category.trim() : null) : current.category;
    const publishedYear = payload.publishedYear !== undefined ? (payload.publishedYear ? Number(payload.publishedYear) : null) : current.published_year;
    const coverUrl = payload.coverUrl !== undefined ? (payload.coverUrl ? payload.coverUrl.trim() : null) : current.cover_url;

    const updateStmt = db.prepare(`
      UPDATE books
      SET title = ?, author = ?, isbn = ?, category = ?, published_year = ?,
          stock_total = ?, stock_available = ?, description = ?, cover_url = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?;
    `);

    updateStmt.run(
      title, author, isbn, category, publishedYear,
      newStockTotal, newStockAvailable, description, coverUrl,
      bookId
    );

    return this.getBookById(bookId);
  },

  /**
   * Menghapus buku secara soft-delete (khusus Admin)
   * @param {number|string} id
   * @returns {{ id: number }}
   */
  deleteBook(id) {
    const bookId = Number(id);
    if (Number.isNaN(bookId)) {
      throw new NotFoundError('Buku tidak ditemukan');
    }

    const db = getDb();
    const current = db.prepare('SELECT * FROM books WHERE id = ? AND deleted_at IS NULL;').get(bookId);

    if (!current) {
      throw new NotFoundError('Buku tidak ditemukan');
    }

    const activeLoanRow = db
      .prepare("SELECT COUNT(*) AS total FROM loans WHERE book_id = ? AND status = 'borrowed';")
      .get(bookId);
    if (activeLoanRow && Number(activeLoanRow.total) > 0) {
      throw new ConflictError(
        'Buku tidak dapat dihapus karena masih memiliki peminjaman aktif',
        'BOOK_IN_ACTIVE_LOAN'
      );
    }

    const deleteStmt = db.prepare(`
      UPDATE books
      SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?;
    `);
    deleteStmt.run(bookId);

    return { id: bookId };
  },

  /**
   * Mengisi data contoh buku perpustakaan secara idempoten
   * @param {object} [dbInstance]
   * @returns {number} Jumlah buku baru yang disemai
   */
  seedBooks(dbInstance) {
    const db = dbInstance || getDb();
    let seededCount = 0;

    const checkStmt = db.prepare('SELECT id FROM books WHERE isbn = ? LIMIT 1;');
    const insertStmt = db.prepare(`
      INSERT INTO books (
        title, author, isbn, category, published_year,
        stock_total, stock_available, description, cover_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
    `);

    for (const book of sampleBooks) {
      const existing = checkStmt.get(book.isbn);
      if (!existing) {
        insertStmt.run(
          book.title,
          book.author,
          book.isbn,
          book.category,
          book.publishedYear,
          book.stockTotal,
          book.stockTotal,
          book.description,
          book.coverUrl
        );
        seededCount += 1;
      }
    }

    return seededCount;
  },
};

export default bookService;
