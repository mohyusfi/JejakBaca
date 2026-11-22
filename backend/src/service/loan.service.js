import { getDb } from '../app/database.js';
import { ValidationError, NotFoundError, ConflictError } from '../middleware/errorHandler.js';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const LOAN_DURATION_DAYS = 7;
const MAX_ACTIVE_LOANS = 3;
const VALID_LOAN_STATUS_FILTERS = new Set(['all', 'borrowed', 'overdue', 'returned']);

/**
 * Menjalankan fungsi sinkron di dalam transaksi SQLite IMMEDIATE
 * @template T
 * @param {import('node:sqlite').DatabaseSync} db
 * @param {() => T} fn
 * @returns {T}
 */
function runInTransaction(db, fn) {
  db.exec('BEGIN IMMEDIATE;');
  try {
    const result = fn();
    db.exec('COMMIT;');
    return result;
  } catch (err) {
    try {
      db.exec('ROLLBACK;');
    } catch {
      // Abaikan error rollback jika transaksi sudah tertutup
    }
    throw err;
  }
}

/**
 * Menghitung indikator keterlambatan (tanpa denda) dan sisa hari peminjaman
 * @param {string} status
 * @param {string} dueDateIso
 * @param {Date} [now]
 * @returns {{ isOverdue: boolean, daysRemaining: number }}
 */
export function calculateLoanTiming(status, dueDateIso, now = new Date()) {
  if (status === 'returned') {
    return { isOverdue: false, daysRemaining: 0 };
  }

  const diffMs = new Date(dueDateIso).getTime() - now.getTime();
  if (diffMs < 0) {
    return {
      isOverdue: true,
      daysRemaining: Math.min(-1, Math.floor(diffMs / MS_PER_DAY)),
    };
  }

  return {
    isOverdue: false,
    daysRemaining: Math.ceil(diffMs / MS_PER_DAY),
  };
}

/**
 * Memformat baris database menjadi objek LoanItem sesuai kontrak OpenAPI
 * @param {object} row
 * @param {Date} [now]
 * @returns {object}
 */
export function formatLoanItem(row, now = new Date()) {
  const { isOverdue, daysRemaining } = calculateLoanTiming(row.status, row.due_date, now);
  return {
    id: row.id,
    bookId: row.book_id,
    bookTitle: row.book_title,
    bookAuthor: row.book_author,
    bookCoverUrl: row.book_cover_url || null,
    status: row.status,
    borrowedAt: row.borrowed_at,
    dueDate: row.due_date,
    returnedAt: row.returned_at || null,
    isOverdue,
    daysRemaining,
  };
}

/**
 * Memformat baris database menjadi objek AdminLoanItem sesuai kontrak OpenAPI
 * @param {object} row
 * @param {Date} [now]
 * @returns {object}
 */
export function formatAdminLoanItem(row, now = new Date()) {
  return {
    ...formatLoanItem(row, now),
    borrower: {
      id: row.borrower_id,
      name: row.borrower_name,
      nim: row.borrower_nim || null,
      email: row.borrower_email,
    },
  };
}

function parsePagination(query = {}) {
  let page = Number.parseInt(query.page || '1', 10);
  if (Number.isNaN(page) || page < 1) page = 1;

  let limit = Number.parseInt(query.limit || '10', 10);
  if (Number.isNaN(limit) || limit < 1) limit = 10;
  if (limit > 50) limit = 50;

  return { page, limit, offset: (page - 1) * limit };
}

function buildStatusCondition(statusFilter, nowIso) {
  if (statusFilter === 'borrowed') {
    return { clause: "loans.status = 'borrowed'", params: [] };
  }
  if (statusFilter === 'overdue') {
    return { clause: "loans.status = 'borrowed' AND loans.due_date < ?", params: [nowIso] };
  }
  if (statusFilter === 'returned') {
    return { clause: "loans.status = 'returned'", params: [] };
  }
  return { clause: null, params: [] };
}

export const loanService = {
  /**
   * Meminjam Buku Perpustakaan secara self-service (khusus User)
   * @param {number} userId
   * @param {{ bookId?: number | string }} payload
   * @returns {object}
   */
  borrowBook(userId, payload = {}) {
    const bookId = Number(payload.bookId);
    if (!Number.isInteger(bookId) || bookId < 1) {
      throw new ValidationError('Validasi peminjaman gagal', [
        { field: 'bookId', message: 'bookId wajib berupa bilangan bulat positif' },
      ]);
    }

    const db = getDb();
    const now = new Date();
    const borrowedAt = now.toISOString();
    const dueDate = new Date(now.getTime() + LOAN_DURATION_DAYS * MS_PER_DAY).toISOString();

    return runInTransaction(db, () => {
      const book = db
        .prepare('SELECT id, title, author, cover_url, stock_available FROM books WHERE id = ? AND deleted_at IS NULL;')
        .get(bookId);

      if (!book) {
        throw new NotFoundError('Buku tidak ditemukan');
      }

      const activeCountRow = db
        .prepare("SELECT COUNT(*) AS total FROM loans WHERE user_id = ? AND status = 'borrowed';")
        .get(userId);
      if (activeCountRow && Number(activeCountRow.total) >= MAX_ACTIVE_LOANS) {
        throw new ConflictError(
          `Batas maksimal peminjaman aktif (${MAX_ACTIVE_LOANS} buku) telah tercapai`,
          'LOAN_LIMIT_EXCEEDED'
        );
      }

      const duplicateRow = db
        .prepare("SELECT id FROM loans WHERE user_id = ? AND book_id = ? AND status = 'borrowed' LIMIT 1;")
        .get(userId, bookId);
      if (duplicateRow) {
        throw new ConflictError(
          'Anda masih memiliki peminjaman aktif untuk buku ini',
          'DUPLICATE_ACTIVE_LOAN'
        );
      }

      if (Number(book.stock_available) <= 0) {
        throw new ConflictError('Stok buku sedang habis', 'OUT_OF_STOCK');
      }

      db.prepare('UPDATE books SET stock_available = stock_available - 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?;')
        .run(bookId);

      const insertResult = db
        .prepare(`
          INSERT INTO loans (user_id, book_id, status, borrowed_at, due_date)
          VALUES (?, ?, 'borrowed', ?, ?);
        `)
        .run(userId, bookId, borrowedAt, dueDate);

      const loanId = Number(insertResult.lastInsertRowid);
      const row = db
        .prepare(`
          SELECT
            loans.id,
            loans.book_id,
            books.title AS book_title,
            books.author AS book_author,
            books.cover_url AS book_cover_url,
            loans.status,
            loans.borrowed_at,
            loans.due_date,
            loans.returned_at
          FROM loans
          JOIN books ON books.id = loans.book_id
          WHERE loans.id = ?;
        `)
        .get(loanId);

      return formatLoanItem(row, now);
    });
  },

  /**
   * Mengembalikan buku yang sedang dipinjam (khusus User pemilik pinjaman)
   * @param {number} userId
   * @param {number | string} id
   * @returns {object}
   */
  returnLoan(userId, id) {
    const loanId = Number(id);
    if (!Number.isInteger(loanId) || loanId < 1) {
      throw new NotFoundError('Data peminjaman tidak ditemukan');
    }

    const db = getDb();
    const now = new Date();
    const returnedAt = now.toISOString();

    return runInTransaction(db, () => {
      const loan = db
        .prepare('SELECT id, book_id, status FROM loans WHERE id = ? AND user_id = ?;')
        .get(loanId, userId);

      if (!loan) {
        throw new NotFoundError('Data peminjaman tidak ditemukan');
      }

      if (loan.status === 'returned') {
        throw new ConflictError('Buku ini sudah dikembalikan sebelumnya', 'CONFLICT');
      }

      db.prepare(`
        UPDATE loans
        SET status = 'returned', returned_at = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?;
      `).run(returnedAt, loanId);

      db.prepare('UPDATE books SET stock_available = stock_available + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?;')
        .run(loan.book_id);

      const row = db
        .prepare(`
          SELECT
            loans.id,
            loans.book_id,
            books.title AS book_title,
            books.author AS book_author,
            books.cover_url AS book_cover_url,
            loans.status,
            loans.borrowed_at,
            loans.due_date,
            loans.returned_at
          FROM loans
          JOIN books ON books.id = loans.book_id
          WHERE loans.id = ?;
        `)
        .get(loanId);

      return formatLoanItem(row, now);
    });
  },

  /**
   * Mengambil daftar peminjaman milik User yang sedang login
   * @param {number} userId
   * @param {{ status?: string, page?: number | string, limit?: number | string }} query
   * @returns {{ items: object[], meta: { page: number, limit: number, total: number, totalPages: number } }}
   */
  getMyLoans(userId, query = {}) {
    const statusFilter = query.status || 'all';
    if (!VALID_LOAN_STATUS_FILTERS.has(statusFilter)) {
      throw new ValidationError('Filter status tidak valid', [
        { field: 'status', message: 'Status harus salah satu dari: all, borrowed, overdue, returned' },
      ]);
    }

    const { page, limit, offset } = parsePagination(query);
    const db = getDb();
    const now = new Date();
    const nowIso = now.toISOString();

    const conditions = ['loans.user_id = ?'];
    const params = [userId];

    const statusCond = buildStatusCondition(statusFilter, nowIso);
    if (statusCond.clause) {
      conditions.push(statusCond.clause);
      params.push(...statusCond.params);
    }

    const whereClause = conditions.join(' AND ');

    const countRow = db
      .prepare(`SELECT COUNT(*) AS total FROM loans WHERE ${whereClause};`)
      .get(...params);
    const total = countRow ? Number(countRow.total) : 0;
    const totalPages = Math.ceil(total / limit) || 1;

    const rows = db
      .prepare(`
        SELECT
          loans.id,
          loans.book_id,
          books.title AS book_title,
          books.author AS book_author,
          books.cover_url AS book_cover_url,
          loans.status,
          loans.borrowed_at,
          loans.due_date,
          loans.returned_at
        FROM loans
        JOIN books ON books.id = loans.book_id
        WHERE ${whereClause}
        ORDER BY loans.borrowed_at DESC, loans.id DESC
        LIMIT ? OFFSET ?;
      `)
      .all(...params, limit, offset);

    return {
      items: rows.map((row) => formatLoanItem(row, now)),
      meta: { page, limit, total, totalPages },
    };
  },

  /**
   * Mengambil daftar seluruh peminjaman untuk pantauan Admin
   * @param {{ status?: string, q?: string, page?: number | string, limit?: number | string }} query
   * @returns {{ items: object[], meta: { page: number, limit: number, total: number, totalPages: number } }}
   */
  getAdminLoans(query = {}) {
    const statusFilter = query.status || 'borrowed';
    if (!VALID_LOAN_STATUS_FILTERS.has(statusFilter)) {
      throw new ValidationError('Filter status tidak valid', [
        { field: 'status', message: 'Status harus salah satu dari: borrowed, overdue, returned, all' },
      ]);
    }

    const { page, limit, offset } = parsePagination(query);
    const db = getDb();
    const now = new Date();
    const nowIso = now.toISOString();

    const conditions = [];
    const params = [];

    const statusCond = buildStatusCondition(statusFilter, nowIso);
    if (statusCond.clause) {
      conditions.push(statusCond.clause);
      params.push(...statusCond.params);
    }

    if (query.q && typeof query.q === 'string' && query.q.trim()) {
      const keyword = `%${query.q.trim()}%`;
      conditions.push('(books.title LIKE ? OR users.name LIKE ? OR users.nim LIKE ?)');
      params.push(keyword, keyword, keyword);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRow = db
      .prepare(`
        SELECT COUNT(*) AS total
        FROM loans
        JOIN books ON books.id = loans.book_id
        JOIN users ON users.id = loans.user_id
        ${whereClause};
      `)
      .get(...params);
    const total = countRow ? Number(countRow.total) : 0;
    const totalPages = Math.ceil(total / limit) || 1;

    const rows = db
      .prepare(`
        SELECT
          loans.id,
          loans.book_id,
          books.title AS book_title,
          books.author AS book_author,
          books.cover_url AS book_cover_url,
          loans.status,
          loans.borrowed_at,
          loans.due_date,
          loans.returned_at,
          users.id AS borrower_id,
          users.name AS borrower_name,
          users.nim AS borrower_nim,
          users.email AS borrower_email
        FROM loans
        JOIN books ON books.id = loans.book_id
        JOIN users ON users.id = loans.user_id
        ${whereClause}
        ORDER BY loans.borrowed_at DESC, loans.id DESC
        LIMIT ? OFFSET ?;
      `)
      .all(...params, limit, offset);

    return {
      items: rows.map((row) => formatAdminLoanItem(row, now)),
      meta: { page, limit, total, totalPages },
    };
  },
};

export default loanService;
