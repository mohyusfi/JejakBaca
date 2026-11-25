import { config } from '../config/index.js';
import { ValidationError, UpstreamError } from '../middleware/errorHandler.js';

const DEFAULT_QUERY = 'computer science';
const MAX_LIMIT = 20;
const MAX_OFFSET = 10000;
const SELECT_FIELDS = 'DOI,title,author,published,issued,container-title,publisher,type,URL,is-referenced-by-count';

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
function setCachedValue(key, value, ttlMs = config.crossrefCacheTtlMs, now = Date.now()) {
  responseCache.set(key, {
    value,
    expiresAt: now + ttlMs,
  });
}

/**
 * Menghapus seluruh cache in-memory Jurnal Publik
 */
export function clearPublicJournalCache() {
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
 * Menormalisasi nilai string atau array string dengan mengambil elemen non-kosong pertama
 * @param {unknown} value
 * @returns {string | null}
 */
function normalizeFirstString(value) {
  if (typeof value === 'string') {
    return value.trim() || null;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      if (typeof item === 'string' && item.trim()) {
        return item.trim();
      }
    }
  }

  return null;
}

/**
 * Menormalisasi daftar penulis dari metadata Crossref (perorangan maupun organisasi)
 * @param {unknown} rawAuthors
 * @returns {string[]}
 */
function normalizeAuthors(rawAuthors) {
  if (!Array.isArray(rawAuthors) || rawAuthors.length === 0) {
    return ['Unknown Author'];
  }

  const authors = rawAuthors
    .map((entry) => {
      if (!entry || typeof entry !== 'object') {
        return '';
      }

      const given = typeof entry.given === 'string' ? entry.given.trim() : '';
      const family = typeof entry.family === 'string' ? entry.family.trim() : '';
      const fullName = [given, family].filter(Boolean).join(' ').trim();
      if (fullName) {
        return fullName;
      }

      return typeof entry.name === 'string' ? entry.name.trim() : '';
    })
    .filter(Boolean);

  return authors.length > 0 ? authors : ['Unknown Author'];
}

/**
 * Mengekstrak tahun integer positif dari struktur date-parts Crossref
 * @param {unknown} dateObject
 * @returns {number | null}
 */
function extractYearFromDateParts(dateObject) {
  const rawYear = dateObject?.['date-parts']?.[0]?.[0];
  const year = Number(rawYear);
  return Number.isInteger(year) && year > 0 ? year : null;
}

/**
 * Mengekstrak tahun terbit dari field published dengan fallback ke issued
 * @param {object} item
 * @returns {number | null}
 */
function extractPublishedYear(item) {
  return extractYearFromDateParts(item?.published) ?? extractYearFromDateParts(item?.issued);
}

/**
 * Menormalisasi URL referensi karya ilmiah dengan fallback ke URL resolver DOI
 * @param {object} item
 * @param {string} doi
 * @returns {string}
 */
function normalizeUrl(item, doi) {
  if (typeof item?.URL === 'string' && item.URL.trim()) {
    return item.URL.trim();
  }
  return `https://doi.org/${doi}`;
}

/**
 * Melakukan HTTP GET JSON ke Crossref API dengan User-Agent polite pool dan timeout 8 detik
 * @param {string} url
 * @param {{ timeoutMs?: number, fetchFn?: Function }} [options]
 * @returns {Promise<any>}
 */
async function fetchCrossrefJson(url, options = {}) {
  const {
    timeoutMs = config.crossrefTimeoutMs,
    fetchFn = globalThis.fetch,
  } = options;

  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort(new Error('Crossref API request timeout'));
  }, timeoutMs);

  try {
    const response = await fetchFn(url, {
      method: 'GET',
      headers: {
        'User-Agent': config.crossrefUserAgent,
        Accept: 'application/json',
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new UpstreamError(`Crossref API merespons dengan status ${response.status}`);
    }

    try {
      return await response.json();
    } catch {
      throw new UpstreamError('Format JSON dari Crossref API tidak valid');
    }
  } catch (err) {
    if (err instanceof UpstreamError) {
      throw err;
    }
    if (err?.name === 'AbortError' || err?.name === 'TimeoutError' || controller.signal.aborted) {
      throw new UpstreamError('Crossref API tidak merespons (timeout)');
    }
    throw new UpstreamError('Gagal menghubungi Crossref API');
  } finally {
    clearTimeout(timer);
  }
}

export const publicJournalService = {
  /**
   * Mencari referensi jurnal dan karya ilmiah publik melalui proxy Crossref API
   * @param {{ q?: string, page?: number | string, limit?: number | string }} [query]
   * @param {{ baseUrl?: string, timeoutMs?: number, ttlMs?: number, now?: number, fetchFn?: Function }} [options]
   * @returns {Promise<{ items: object[], meta: { page: number, limit: number, total: number, totalPages: number } }>}
   */
  async searchPublicJournals(query = {}, options = {}) {
    const { page, limit } = parsePagination(query);
    const offset = (page - 1) * limit;

    if (offset > MAX_OFFSET) {
      throw new ValidationError('Parameter paginasi melebihi batas offset Crossref', [
        {
          field: 'page',
          message: 'Kombinasi page dan limit tidak boleh menghasilkan offset lebih dari 10000',
        },
      ]);
    }

    const baseUrl = (options.baseUrl || config.crossrefBaseUrl).replace(/\/+$/, '');
    const ttlMs = options.ttlMs ?? config.crossrefCacheTtlMs;
    const now = options.now ?? Date.now();

    const q = (typeof query.q === 'string' ? query.q.trim() : '') || DEFAULT_QUERY;
    const cacheKey = `search:${q.toLowerCase()}|${page}|${limit}`;
    let cachedResult = getCachedValue(cacheKey, now);

    if (!cachedResult) {
      const searchParams = new URLSearchParams({
        query: q,
        rows: String(limit),
        offset: String(offset),
        select: SELECT_FIELDS,
      });

      const data = await fetchCrossrefJson(`${baseUrl}/works?${searchParams.toString()}`, {
        timeoutMs: options.timeoutMs,
        fetchFn: options.fetchFn,
      });

      const rawItems = Array.isArray(data?.message?.items) ? data.message.items : [];
      const normalizedItems = [];

      for (const item of rawItems) {
        const doi = typeof item?.DOI === 'string' ? item.DOI.trim() : '';
        if (!doi) {
          continue;
        }

        const citationCount = Number.isInteger(item['is-referenced-by-count']) && item['is-referenced-by-count'] >= 0
          ? item['is-referenced-by-count']
          : 0;

        normalizedItems.push({
          doi,
          title: normalizeFirstString(item.title) || 'Tanpa Judul',
          authors: normalizeAuthors(item.author),
          journal: normalizeFirstString(item['container-title']),
          publisher: typeof item.publisher === 'string' && item.publisher.trim() ? item.publisher.trim() : null,
          publishedYear: extractPublishedYear(item),
          type: typeof item.type === 'string' && item.type.trim() ? item.type.trim() : null,
          citationCount,
          url: normalizeUrl(item, doi),
        });
      }

      const total = Number(data?.message?.['total-results']) || 0;
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

    return {
      items: cachedResult.items,
      meta: cachedResult.meta,
    };
  },
};

export default publicJournalService;
