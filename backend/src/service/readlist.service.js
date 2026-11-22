import { getDb } from '../app/database.js';
import { publicBookService, WORK_ID_PATTERN } from './publicBook.service.js';
import { ValidationError, NotFoundError, ConflictError } from '../middleware/errorHandler.js';

const MAX_LIMIT = 50;

/**
 * Memformat baris database menjadi objek ReadlistItem sesuai kontrak OpenAPI
 * @param {object} row
 * @returns {object}
 */
export function formatReadlistItem(row) {
  let authors = [];
  if (Array.isArray(row.authors)) {
    authors = row.authors;
  } else if (typeof row.authors === 'string') {
    try {
      const parsed = JSON.parse(row.authors);
      authors = Array.isArray(parsed) ? parsed : [row.authors];
    } catch {
      authors = [row.authors];
    }
  }

  return {
    id: Number(row.id),
    userId: Number(row.user_id),
    workId: row.work_id,
    title: row.title,
    authors: authors.length > 0 ? authors : ['Unknown Author'],
    firstPublishYear:
      row.first_publish_year !== null && row.first_publish_year !== undefined
        ? Number(row.first_publish_year)
        : null,
    coverUrl: row.cover_url || null,
    description: row.description || null,
    createdAt: row.created_at,
  };
}

/**
 * Mem-parsing parameter paginasi page & limit (maks 50)
 * @param {{ page?: number | string, limit?: number | string }} query
 * @returns {{ page: number, limit: number, offset: number }}
 */
function parsePagination(query = {}) {
  let page = Number.parseInt(query.page || '1', 10);
  if (Number.isNaN(page) || page < 1) {
    page = 1;
  }

  let limit = Number.parseInt(query.limit || '10', 10);
  if (Number.isNaN(limit) || limit < 1) {
    limit = 10;
  }
  if (limit > MAX_LIMIT) {
    limit = MAX_LIMIT;
  }

  return { page, limit, offset: (page - 1) * limit };
}

export const readlistService = {
  /**
   * Mengambil daftar Readlist milik User dari SQLite dengan pencarian & paginasi
   * @param {number|string} userId
   * @param {{ q?: string, page?: number | string, limit?: number | string }} [query]
   * @returns {{ items: object[], meta: { page: number, limit: number, total: number, totalPages: number } }}
   */
  getReadlist(userId, query = {}) {
    const db = getDb();
    const { page, limit, offset } = parsePagination(query);

    const conditions = ['user_id = ?'];
    const params = [Number(userId)];

    if (query.q && typeof query.q === 'string' && query.q.trim()) {
      const keyword = `%${query.q.trim()}%`;
      conditions.push('(title LIKE ? OR authors LIKE ?)');
      params.push(keyword, keyword);
    }

    const whereClause = conditions.join(' AND ');

    // Hitung total data
    const countStmt = db.prepare(`SELECT COUNT(*) as total FROM readlist_items WHERE ${whereClause};`);
    const countResult = countStmt.get(...params);
    const total = countResult ? Number(countResult.total) : 0;
    const totalPages = Math.ceil(total / limit) || 1;

    // Ambil data snapshot dari SQLite secara instan tanpa memanggil Open Library
    const selectStmt = db.prepare(`
      SELECT * FROM readlist_items
      WHERE ${whereClause}
      ORDER BY id DESC
      LIMIT ? OFFSET ?;
    `);

    const rows = selectStmt.all(...params, limit, offset);
    const items = rows.map(formatReadlistItem);

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
   * Menyimpan Buku Publik ke Readlist User sebagai snapshot metadata dari Open Library
   * @param {number|string} userId
   * @param {{ workId?: string }} payload
   * @returns {Promise<object>}
   */
  async addToReadlist(userId, payload = {}) {
    const rawWorkId = payload?.workId;
    const workId = typeof rawWorkId === 'string' ? rawWorkId.trim() : '';

    if (!workId || !WORK_ID_PATTERN.test(workId)) {
      throw new ValidationError('Format workId tidak valid', [
        { field: 'workId', message: 'workId harus sesuai pola ^OL[0-9]+W$' },
      ]);
    }

    const numericUserId = Number(userId);
    const db = getDb();

    // Periksa apakah sudah ada di readlist
    const existing = db
      .prepare('SELECT id FROM readlist_items WHERE user_id = ? AND work_id = ? LIMIT 1;')
      .get(numericUserId, workId);

    if (existing) {
      throw new ConflictError('Buku sudah tersimpan di dalam readlist', 'ALREADY_IN_READLIST');
    }

    // Ambil metadata terkini melalui proxy Open Library yang sudah ada
    const bookDetail = await publicBookService.getPublicBookById(workId, {
      id: numericUserId,
      role: 'user',
    });

    const authors = Array.isArray(bookDetail.authors) && bookDetail.authors.length > 0
      ? bookDetail.authors
      : ['Unknown Author'];
    const authorsJson = JSON.stringify(authors);
    const title = typeof bookDetail.title === 'string' && bookDetail.title.trim()
      ? bookDetail.title.trim()
      : 'Tanpa Judul';
    const firstPublishYear = bookDetail.firstPublishYear ?? null;
    const coverUrl = bookDetail.coverUrl ?? null;
    const description = bookDetail.description ?? null;
    const createdAt = new Date().toISOString();

    const insertStmt = db.prepare(`
      INSERT INTO readlist_items (
        user_id, work_id, title, authors, first_publish_year, cover_url, description, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);
    `);

    try {
      const result = insertStmt.run(
        numericUserId,
        workId,
        title,
        authorsJson,
        firstPublishYear,
        coverUrl,
        description,
        createdAt
      );

      const insertedId = Number(result.lastInsertRowid);

      return {
        id: insertedId,
        userId: numericUserId,
        workId,
        title,
        authors,
        firstPublishYear,
        coverUrl,
        description,
        createdAt,
      };
    } catch (err) {
      if (err.message && err.message.includes('UNIQUE constraint failed')) {
        throw new ConflictError('Buku sudah tersimpan di dalam readlist', 'ALREADY_IN_READLIST');
      }
      throw err;
    }
  },

  /**
   * Menghapus Buku Publik dari Readlist User
   * @param {number|string} userId
   * @param {string} workId
   * @returns {{ workId: string }}
   */
  removeFromReadlist(userId, workId) {
    const normalizedWorkId = typeof workId === 'string' ? workId.trim() : '';

    if (!normalizedWorkId || !WORK_ID_PATTERN.test(normalizedWorkId)) {
      throw new ValidationError('Format workId tidak valid', [
        { field: 'workId', message: 'workId harus sesuai pola ^OL[0-9]+W$' },
      ]);
    }

    const numericUserId = Number(userId);
    const db = getDb();

    const item = db
      .prepare('SELECT id FROM readlist_items WHERE user_id = ? AND work_id = ? LIMIT 1;')
      .get(numericUserId, normalizedWorkId);

    if (!item) {
      throw new NotFoundError('Buku tidak ditemukan di dalam readlist');
    }

    db.prepare('DELETE FROM readlist_items WHERE id = ?;').run(item.id);

    return {
      workId: normalizedWorkId,
    };
  },
};

export default readlistService;
