import { config } from '../config/index.js';
import { getDb } from '../app/database.js';
import { ValidationError, NotFoundError, UpstreamError } from '../middleware/errorHandler.js';

export const WORK_ID_PATTERN = /^OL[0-9]+W$/;
const AUTHOR_KEY_PATTERN = /^\/authors\/(OL[0-9]+A)$/;
const DEFAULT_SUBJECT = 'computer_science';
const DEFAULT_DESCRIPTION_FALLBACK = 'Deskripsi belum tersedia di Open Library.';
const MAX_AUTHORS = 3;
const MAX_SUBJECTS = 10;
const MAX_LIMIT = 20;

const responseCache = new Map();

/**
 * Mengambil nilai dari cache memori jika belum kedaluwarsa
 * @param {string} key
 * @param {number} [now]
 * @returns {any | undefined}
 */
function getCachedValue(key, now = Date.now()) {
  const entry = responseCache.get(key);
  if (!entry) {
    return undefined;
  }

  if (now >= entry.expiresAt) {
    responseCache.delete(key);
    return undefined;
  }

  return entry.value;
}

/**
 * Menyimpan nilai ke cache memori dengan TTL tertentu
 * @param {string} key
 * @param {any} value
 * @param {number} [ttlMs]
 * @param {number} [now]
 */
function setCachedValue(key, value, ttlMs = config.openLibraryCacheTtlMs, now = Date.now()) {
  responseCache.set(key, {
    value,
    expiresAt: now + ttlMs,
  });
}

/**
 * Menghapus seluruh cache in-memory Buku Publik
 */
export function clearPublicBookCache() {
  responseCache.clear();
}

/**
 * Mem-parsing parameter paginasi page & limit (maks 20)
 * @param {{ page?: number | string, limit?: number | string }} query
 * @returns {{ page: number, limit: number }}
 */
function parsePagination(query) {
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

  return { page, limit };
}

/**
 * Mengekstrak workId berpola ^OL[0-9]+W$ dari key Open Library
 * @param {string | undefined | null} key
 * @returns {string | null}
 */
function extractWorkId(key) {
  if (typeof key !== 'string') {
    return null;
  }

  const trimmed = key.trim();
  const rawId = trimmed.startsWith('/works/') ? trimmed.slice('/works/'.length) : trimmed;
  return WORK_ID_PATTERN.test(rawId) ? rawId : null;
}

/**
 * Membentuk URL cover Open Library ukuran medium (-M.jpg)
 * @param {number | string | undefined | null} coverId
 * @returns {string | null}
 */
function buildCoverUrl(coverId) {
  const id = Number(coverId);
  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }
  return `https://covers.openlibrary.org/b/id/${id}-M.jpg`;
}

/**
 * Menormalisasi daftar subject maksimal 10 item
 * @param {unknown} subjects
 * @returns {string[]}
 */
function normalizeSubjects(subjects) {
  if (!Array.isArray(subjects)) {
    return [];
  }

  return subjects
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean)
    .slice(0, MAX_SUBJECTS);
}

/**
 * Menormalisasi deskripsi work Open Library (mendukung string atau { type, value })
 * @param {unknown} rawDescription
 * @returns {string | null}
 */
function normalizeDescription(rawDescription) {
  if (typeof rawDescription === 'string') {
    return rawDescription.trim() || null;
  }

  if (rawDescription && typeof rawDescription === 'object' && typeof rawDescription.value === 'string') {
    return rawDescription.value.trim() || null;
  }

  return null;
}

/**
 * Mengekstrak tahun terbit pertama dari metadata work Open Library
 * @param {object} work
 * @returns {number | null}
 */
function extractFirstPublishYear(work) {
  if (Number.isInteger(work?.first_publish_year)) {
    return work.first_publish_year;
  }

  if (typeof work?.first_publish_date === 'string') {
    const match = work.first_publish_date.match(/\b(\d{4})\b/);
    if (match) {
      return Number.parseInt(match[1], 10);
    }
  }

  return null;
}

/**
 * Mengambil himpunan workId yang sudah disimpan User pada tabel readlist_items
 * Mengembalikan Set kosong untuk Tamu, Admin, atau bila tabel belum tersedia
 * @param {object | null} authUser
 * @returns {Set<string>}
 */
function getUserReadlistWorkIds(authUser) {
  const userId = authUser?.sub || authUser?.id || null;
  if (!userId || authUser?.role !== 'user') {
    return new Set();
  }

  try {
    const db = getDb();
    const stmt = db.prepare('SELECT work_id FROM readlist_items WHERE user_id = ?;');
    const rows = stmt.all(userId);
    return new Set(rows.map((row) => row.work_id));
  } catch {
    // Tabel readlist_items belum dibuat sebelum Issue #9
    return new Set();
  }
}

/**
 * Melakukan HTTP GET JSON ke Open Library API dengan User-Agent dan timeout 8 detik
 * @param {string} url
 * @param {{ allowNotFound?: boolean, timeoutMs?: number, fetchFn?: Function }} [options]
 * @returns {Promise<any | null>}
 */
async function fetchOpenLibraryJson(url, options = {}) {
  const {
    allowNotFound = false,
    timeoutMs = config.openLibraryTimeoutMs,
    fetchFn = globalThis.fetch,
  } = options;

  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort(new Error('Open Library API request timeout'));
  }, timeoutMs);

  try {
    const response = await fetchFn(url, {
      method: 'GET',
      headers: {
        'User-Agent': config.openLibraryUserAgent,
        Accept: 'application/json',
      },
      signal: controller.signal,
    });

    if (allowNotFound && response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new UpstreamError(`Open Library API merespons dengan status ${response.status}`);
    }

    try {
      return await response.json();
    } catch {
      throw new UpstreamError('Format JSON dari Open Library API tidak valid');
    }
  } catch (err) {
    if (err instanceof UpstreamError) {
      throw err;
    }
    if (err?.name === 'AbortError' || err?.name === 'TimeoutError' || controller.signal.aborted) {
      throw new UpstreamError('Open Library API tidak merespons (timeout)');
    }
    throw new UpstreamError('Gagal menghubungi Open Library API');
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Me-resolve maksimal 3 nama author pertama dari /authors/{id}.json dengan fallback
 * @param {unknown} workAuthors
 * @param {{ baseUrl: string, ttlMs: number, now: number, timeoutMs?: number, fetchFn?: Function }} options
 * @returns {Promise<string[]>}
 */
async function resolveAuthors(workAuthors, options) {
  if (!Array.isArray(workAuthors) || workAuthors.length === 0) {
    return ['Unknown Author'];
  }

  const candidates = workAuthors.slice(0, MAX_AUTHORS);
  const resolvedNames = await Promise.all(
    candidates.map(async (entry) => {
      if (typeof entry?.name === 'string' && entry.name.trim()) {
        return entry.name.trim();
      }

      const rawKey = entry?.author?.key || entry?.key;
      if (typeof rawKey !== 'string' || !AUTHOR_KEY_PATTERN.test(rawKey.trim())) {
        return null;
      }

      const authorKey = rawKey.trim();
      const cacheKey = `author:${authorKey}`;
      const cachedName = getCachedValue(cacheKey, options.now);
      if (cachedName !== undefined) {
        return cachedName;
      }

      try {
        const authorData = await fetchOpenLibraryJson(`${options.baseUrl}${authorKey}.json`, {
          allowNotFound: true,
          timeoutMs: options.timeoutMs,
          fetchFn: options.fetchFn,
        });
        const name = typeof authorData?.name === 'string' ? authorData.name.trim() : '';
        if (!name) {
          return null;
        }
        setCachedValue(cacheKey, name, options.ttlMs, options.now);
        return name;
      } catch {
        // Kegagalan resolve author individual tidak boleh menggagalkan detail buku
        return null;
      }
    }),
  );

  const validNames = resolvedNames.filter(Boolean);
  return validNames.length > 0 ? validNames : ['Unknown Author'];
}

export const publicBookService = {
  /**
   * Mencari Buku Publik melalui proxy Open Library API
   * @param {{ q?: string, subject?: string, page?: number | string, limit?: number | string }} [query]
   * @param {object | null} [authUser]
   * @param {{ baseUrl?: string, timeoutMs?: number, ttlMs?: number, now?: number, fetchFn?: Function }} [options]
   * @returns {Promise<{ items: object[], meta: { page: number, limit: number, total: number, totalPages: number } }>}
   */
  async searchPublicBooks(query = {}, authUser = null, options = {}) {
    const baseUrl = (options.baseUrl || config.openLibraryBaseUrl).replace(/\/+$/, '');
    const ttlMs = options.ttlMs ?? config.openLibraryCacheTtlMs;
    const now = options.now ?? Date.now();

    const { page, limit } = parsePagination(query);
    const q = typeof query.q === 'string' ? query.q.trim() : '';
    const rawSubject = typeof query.subject === 'string' ? query.subject.trim() : '';
    const subject = q ? rawSubject : rawSubject || DEFAULT_SUBJECT;

    const cacheKey = `search:${q.toLowerCase()}|${subject.toLowerCase()}|${page}|${limit}`;
    let cachedResult = getCachedValue(cacheKey, now);

    if (!cachedResult) {
      const searchParams = new URLSearchParams();
      if (q) {
        searchParams.set('q', q);
      }
      if (subject) {
        searchParams.set('subject', subject);
      }
      searchParams.set('page', String(page));
      searchParams.set('limit', String(limit));

      const data = await fetchOpenLibraryJson(`${baseUrl}/search.json?${searchParams.toString()}`, {
        timeoutMs: options.timeoutMs,
        fetchFn: options.fetchFn,
      });

      const docs = Array.isArray(data?.docs) ? data.docs : [];
      const normalizedItems = [];

      for (const doc of docs) {
        const workId = extractWorkId(doc?.key);
        if (!workId) {
          continue;
        }

        const authors = Array.isArray(doc.author_name)
          ? doc.author_name.map((name) => String(name).trim()).filter(Boolean)
          : [];

        normalizedItems.push({
          workId,
          title: typeof doc.title === 'string' && doc.title.trim() ? doc.title.trim() : 'Tanpa Judul',
          authors: authors.length > 0 ? authors : ['Unknown Author'],
          firstPublishYear: Number.isInteger(doc.first_publish_year)
            ? doc.first_publish_year
            : Number(doc.first_publish_year) || null,
          coverUrl: buildCoverUrl(doc.cover_i),
          subjects: normalizeSubjects(doc.subject),
        });
      }

      const total = Number(data?.numFound) || 0;
      const totalPages = Math.ceil(total / limit) || 1;

      cachedResult = {
        items: normalizedItems,
        meta: {
          page,
          limit,
          total,
          totalPages,
        },
      };
      setCachedValue(cacheKey, cachedResult, ttlMs, now);
    }

    const readlistWorkIds = getUserReadlistWorkIds(authUser);
    const items = cachedResult.items.map((item) => ({
      ...item,
      inReadlist: readlistWorkIds.has(item.workId),
    }));

    return {
      items,
      meta: cachedResult.meta,
    };
  },

  /**
   * Mengambil detail & deskripsi Buku Publik secara lazy dari Open Library API
   * @param {string} workId
   * @param {object | null} [authUser]
   * @param {{ baseUrl?: string, timeoutMs?: number, ttlMs?: number, now?: number, fetchFn?: Function }} [options]
   * @returns {Promise<object>}
   */
  async getPublicBookById(workId, authUser = null, options = {}) {
    const normalizedWorkId = typeof workId === 'string' ? workId.trim() : '';
    if (!WORK_ID_PATTERN.test(normalizedWorkId)) {
      throw new ValidationError('Format workId tidak valid', [
        { field: 'workId', message: 'workId harus sesuai pola ^OL[0-9]+W$' },
      ]);
    }

    const baseUrl = (options.baseUrl || config.openLibraryBaseUrl).replace(/\/+$/, '');
    const ttlMs = options.ttlMs ?? config.openLibraryCacheTtlMs;
    const now = options.now ?? Date.now();

    const cacheKey = `work:${normalizedWorkId}`;
    let cachedDetail = getCachedValue(cacheKey, now);

    if (!cachedDetail) {
      const work = await fetchOpenLibraryJson(`${baseUrl}/works/${normalizedWorkId}.json`, {
        allowNotFound: true,
        timeoutMs: options.timeoutMs,
        fetchFn: options.fetchFn,
      });

      if (!work) {
        throw new NotFoundError(`Buku publik dengan workId ${normalizedWorkId} tidak ditemukan`);
      }

      const authors = await resolveAuthors(work.authors, {
        baseUrl,
        ttlMs,
        now,
        timeoutMs: options.timeoutMs,
        fetchFn: options.fetchFn,
      });

      const coverId = Array.isArray(work.covers)
        ? work.covers.find((id) => Number.isInteger(Number(id)) && Number(id) > 0)
        : null;

      cachedDetail = {
        workId: normalizedWorkId,
        title: typeof work.title === 'string' && work.title.trim() ? work.title.trim() : 'Tanpa Judul',
        authors,
        firstPublishYear: extractFirstPublishYear(work),
        coverUrl: buildCoverUrl(coverId),
        subjects: normalizeSubjects(work.subjects),
        description: normalizeDescription(work.description),
        descriptionFallback: DEFAULT_DESCRIPTION_FALLBACK,
      };

      setCachedValue(cacheKey, cachedDetail, ttlMs, now);
    }

    const readlistWorkIds = getUserReadlistWorkIds(authUser);

    return {
      ...cachedDetail,
      inReadlist: readlistWorkIds.has(normalizedWorkId),
    };
  },
};

export default publicBookService;
