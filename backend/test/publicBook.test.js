import { test, describe, before, after, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createApp } from '../src/app/index.js';
import { closeDb, getDb } from '../src/app/database.js';
import { config } from '../src/config/index.js';
import { clearPublicBookCache, publicBookService } from '../src/service/publicBook.service.js';

describe('Proxy Buku Publik Open Library API (Issue #8)', () => {
  let server;
  let baseUrl;
  let adminToken;
  let userToken;
  const originalFetch = globalThis.fetch;

  /**
   * Helper untuk me-mock panggilan fetch ke Open Library sementara request lokal diteruskan ke server uji
   * @param {(url: string, init?: RequestInit) => Promise<Response>} upstreamHandler
   */
  function mockOpenLibraryFetch(upstreamHandler) {
    globalThis.fetch = async (input, init) => {
      const url = typeof input === 'string' ? input : input.url;
      if (url.startsWith(config.openLibraryBaseUrl)) {
        return upstreamHandler(url, init);
      }
      return originalFetch(input, init);
    };
  }

  function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  before(async () => {
    process.env.NODE_ENV = 'test';
    const { requestHandler } = createApp({ dbPath: ':memory:' });
    server = http.createServer(requestHandler);

    await new Promise((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const address = server.address();
        baseUrl = `http://127.0.0.1:${address.port}`;
        resolve();
      });
    });

    const adminRes = await originalFetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: config.adminEmail,
        password: config.adminPassword,
      }),
    });
    const adminBody = await adminRes.json();
    adminToken = adminBody.data.token;

    const userRes = await originalFetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Siti Referensi',
        nim: 'F55122088',
        email: 'siti@untad.ac.id',
        password: 'password123',
      }),
    });
    const userBody = await userRes.json();
    userToken = userBody.data.token;
  });

  beforeEach(() => {
    clearPublicBookCache();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  after(async () => {
    globalThis.fetch = originalFetch;
    await new Promise((resolve) => server.close(resolve));
    closeDb();
  });

  describe('Konfigurasi Default Proxy', () => {
    test('Memiliki konfigurasi timeout 8 detik, cache TTL 5 menit, dan User-Agent', () => {
      assert.equal(config.openLibraryTimeoutMs, 8000);
      assert.equal(config.openLibraryCacheTtlMs, 5 * 60 * 1000);
      assert.ok(config.openLibraryUserAgent && config.openLibraryUserAgent.length > 0);
    });
  });

  describe('GET /api/v1/public-books (Pencarian & Akses Peran)', () => {
    test('Menggunakan default subject=computer_science saat q kosong, menyertakan User-Agent, dan dapat diakses Tamu/User/Admin', async () => {
      const capturedRequests = [];
      mockOpenLibraryFetch(async (url, init) => {
        capturedRequests.push({ url, headers: init?.headers || {} });
        return jsonResponse({
          numFound: 2,
          docs: [
            {
              key: '/works/OL45804W',
              title: 'Dune',
              author_name: ['Frank Herbert'],
              first_publish_year: 1965,
              cover_i: 14625765,
              subject: ['Science fiction', 'Classic'],
            },
            {
              key: '/works/OL12345W',
              title: 'Clean Code',
              author_name: ['Robert C. Martin'],
              first_publish_year: 2008,
            },
            {
              key: '/books/OL999M',
              title: 'Bukan Work Valid',
            },
          ],
        });
      });

      // 1. Akses sebagai Tamu
      const guestRes = await originalFetch(`${baseUrl}/api/v1/public-books`);
      assert.equal(guestRes.status, 200);
      const guestBody = await guestRes.json();

      assert.equal(guestBody.success, true);
      assert.equal(guestBody.data.length, 2);
      assert.deepEqual(guestBody.data[0], {
        workId: 'OL45804W',
        title: 'Dune',
        authors: ['Frank Herbert'],
        firstPublishYear: 1965,
        coverUrl: 'https://covers.openlibrary.org/b/id/14625765-M.jpg',
        subjects: ['Science fiction', 'Classic'],
        inReadlist: false,
      });
      assert.equal(guestBody.data[1].coverUrl, null);
      assert.deepEqual(guestBody.data[1].subjects, []);
      assert.deepEqual(guestBody.meta, {
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1,
      });

      assert.equal(capturedRequests.length, 1);
      const parsedUpstream = new URL(capturedRequests[0].url);
      assert.equal(parsedUpstream.pathname, '/search.json');
      assert.equal(parsedUpstream.searchParams.get('subject'), 'computer_science');
      assert.equal(parsedUpstream.searchParams.get('page'), '1');
      assert.equal(parsedUpstream.searchParams.get('limit'), '10');
      assert.equal(capturedRequests[0].headers['User-Agent'], config.openLibraryUserAgent);

      // 2. Akses sebagai User (terlayani dari cache tanpa memanggil fetch lagi)
      const userRes = await originalFetch(`${baseUrl}/api/v1/public-books`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      assert.equal(userRes.status, 200);

      // 3. Akses sebagai Admin (terlayani dari cache tanpa memanggil fetch lagi)
      const adminRes = await originalFetch(`${baseUrl}/api/v1/public-books`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.equal(adminRes.status, 200);

      assert.equal(capturedRequests.length, 1, 'Request berulang dalam TTL 5 menit harus menggunakan cache');
    });

    test('Mendukung parameter q, page, dan pembatasan limit maksimal 20', async () => {
      let capturedUrl = '';
      mockOpenLibraryFetch(async (url) => {
        capturedUrl = url;
        return jsonResponse({
          numFound: 45,
          docs: [
            {
              key: '/works/OL100W',
              title: 'Introduction to Algorithms',
              author_name: ['Thomas H. Cormen'],
              first_publish_year: 1990,
            },
          ],
        });
      });

      const res = await originalFetch(`${baseUrl}/api/v1/public-books?q=algorithms&page=2&limit=50`);
      assert.equal(res.status, 200);
      const body = await res.json();

      const parsed = new URL(capturedUrl);
      assert.equal(parsed.searchParams.get('q'), 'algorithms');
      assert.equal(parsed.searchParams.get('subject'), null);
      assert.equal(parsed.searchParams.get('page'), '2');
      assert.equal(parsed.searchParams.get('limit'), '20');

      assert.deepEqual(body.meta, {
        page: 2,
        limit: 20,
        total: 45,
        totalPages: 3,
      });
    });

    test('Cache in-memory kedaluwarsa setelah TTL 5 menit', async () => {
      let callCount = 0;
      const mockFetch = async () => {
        callCount += 1;
        return jsonResponse({
          numFound: 1,
          docs: [{ key: '/works/OL777W', title: `Buku Ke-${callCount}` }],
        });
      };

      const t0 = 1_700_000_000_000;
      const first = await publicBookService.searchPublicBooks({ q: 'cache-test' }, null, {
        fetchFn: mockFetch,
        now: t0,
      });
      assert.equal(first.items[0].title, 'Buku Ke-1');
      assert.equal(callCount, 1);

      // Masih dalam 5 menit (4 menit 59 detik) -> cache hit
      const second = await publicBookService.searchPublicBooks({ q: 'cache-test' }, null, {
        fetchFn: mockFetch,
        now: t0 + 4 * 60 * 1000 + 59 * 1000,
      });
      assert.equal(second.items[0].title, 'Buku Ke-1');
      assert.equal(callCount, 1);

      // Setelah tepat 5 menit -> cache miss, memanggil upstream lagi
      const third = await publicBookService.searchPublicBooks({ q: 'cache-test' }, null, {
        fetchFn: mockFetch,
        now: t0 + 5 * 60 * 1000,
      });
      assert.equal(third.items[0].title, 'Buku Ke-2');
      assert.equal(callCount, 2);
    });
  });

  describe('GET /api/v1/public-books/:workId (Detail Lazy, Author, Deskripsi, & Validasi)', () => {
    test('Menolak workId tidak sesuai pola ^OL[0-9]+W$ dengan 400 VALIDATION_ERROR', async () => {
      const invalidIds = ['INVALID', 'OL45804M', 'OLW', '45804W', 'OLabcW'];
      for (const workId of invalidIds) {
        const res = await originalFetch(`${baseUrl}/api/v1/public-books/${workId}`);
        assert.equal(res.status, 400);
        const body = await res.json();
        assert.equal(body.success, false);
        assert.equal(body.error.code, 'VALIDATION_ERROR');
      }
    });

    test('Mengembalikan 404 NOT_FOUND jika work tidak ditemukan di Open Library', async () => {
      mockOpenLibraryFetch(async () => jsonResponse({ error: 'not found' }, 404));

      const res = await originalFetch(`${baseUrl}/api/v1/public-books/OL9999999W`);
      assert.equal(res.status, 404);
      const body = await res.json();
      assert.equal(body.success, false);
      assert.equal(body.error.code, 'NOT_FOUND');
    });

    test('Melakukan resolve maksimal 3 nama author pertama, menyertakan User-Agent, dan menormalisasi deskripsi objek', async () => {
      const requestedUrls = [];
      mockOpenLibraryFetch(async (url, init) => {
        requestedUrls.push({ url, userAgent: init?.headers?.['User-Agent'] });
        if (url.endsWith('/works/OL45804W.json')) {
          return jsonResponse({
            key: '/works/OL45804W',
            title: 'Dune',
            first_publish_date: 'August 1965',
            covers: [-1, 14625765],
            subjects: ['Science fiction', 'Classic'],
            description: { type: '/type/text', value: '  Set on the desert planet Arrakis...  ' },
            authors: [
              { author: { key: '/authors/OL1A' } },
              { author: { key: '/authors/OL2A' } },
              { author: { key: '/authors/OL3A' } },
              { author: { key: '/authors/OL4A' } },
            ],
          });
        }
        if (url.endsWith('/authors/OL1A.json')) return jsonResponse({ name: 'Frank Herbert' });
        if (url.endsWith('/authors/OL2A.json')) return jsonResponse({ name: 'Author Dua' });
        if (url.endsWith('/authors/OL3A.json')) return jsonResponse({ name: 'Author Tiga' });
        if (url.endsWith('/authors/OL4A.json')) return jsonResponse({ name: 'Author Keempat' });
        return jsonResponse({}, 404);
      });

      const res = await originalFetch(`${baseUrl}/api/v1/public-books/OL45804W`);
      assert.equal(res.status, 200);
      const body = await res.json();

      assert.equal(body.success, true);
      assert.deepEqual(body.data, {
        workId: 'OL45804W',
        title: 'Dune',
        authors: ['Frank Herbert', 'Author Dua', 'Author Tiga'],
        firstPublishYear: 1965,
        coverUrl: 'https://covers.openlibrary.org/b/id/14625765-M.jpg',
        subjects: ['Science fiction', 'Classic'],
        description: 'Set on the desert planet Arrakis...',
        descriptionFallback: 'Deskripsi belum tersedia di Open Library.',
        inReadlist: false,
      });

      assert.equal(
        requestedUrls.some((item) => item.url.endsWith('/authors/OL4A.json')),
        false,
        'Author ke-4 tidak boleh di-resolve',
      );
      for (const reqInfo of requestedUrls) {
        assert.equal(reqInfo.userAgent, config.openLibraryUserAgent);
      }
    });

    test('Menggunakan fallback ["Unknown Author"] dan description null + descriptionFallback saat author gagal dan deskripsi kosong', async () => {
      mockOpenLibraryFetch(async (url) => {
        if (url.endsWith('/works/OL555W.json')) {
          return jsonResponse({
            key: '/works/OL555W',
            title: 'Buku Tanpa Deskripsi',
            authors: [{ author: { key: '/authors/OL999A' } }],
          });
        }
        // Simulasikan kegagalan upstream saat resolve author
        return jsonResponse({ error: 'server error' }, 500);
      });

      const res = await originalFetch(`${baseUrl}/api/v1/public-books/OL555W`);
      assert.equal(res.status, 200);
      const body = await res.json();

      assert.deepEqual(body.data.authors, ['Unknown Author']);
      assert.equal(body.data.description, null);
      assert.ok(
        typeof body.data.descriptionFallback === 'string' && body.data.descriptionFallback.length > 0,
      );
    });

    test('Menghitung inReadlist secara dinamis per User ketika tabel readlist_items tersedia', async () => {
      mockOpenLibraryFetch(async (url) => {
        if (url.endsWith('/works/OL888W.json')) {
          return jsonResponse({
            key: '/works/OL888W',
            title: 'Buku Readlist Uji',
            description: 'Deskripsi tersedia',
          });
        }
        return jsonResponse({}, 404);
      });

      const db = getDb();
      db.exec(`
        CREATE TABLE IF NOT EXISTS readlist_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          work_id TEXT NOT NULL,
          UNIQUE(user_id, work_id)
        );
      `);
      const userRow = db.prepare("SELECT id FROM users WHERE email = 'siti@untad.ac.id';").get();
      db.prepare('INSERT OR IGNORE INTO readlist_items (user_id, work_id) VALUES (?, ?);').run(
        userRow.id,
        'OL888W',
      );

      // Tamu -> inReadlist: false
      const guestRes = await originalFetch(`${baseUrl}/api/v1/public-books/OL888W`);
      assert.equal((await guestRes.json()).data.inReadlist, false);

      // Admin -> inReadlist: false
      const adminRes = await originalFetch(`${baseUrl}/api/v1/public-books/OL888W`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.equal((await adminRes.json()).data.inReadlist, false);

      // User pemilik readlist -> inReadlist: true (meskipun detail buku berasal dari cache)
      const userRes = await originalFetch(`${baseUrl}/api/v1/public-books/OL888W`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      assert.equal((await userRes.json()).data.inReadlist, true);
    });
  });

  describe('Pemetaan Error Upstream (502 UPSTREAM_API_ERROR)', () => {
    test('Mengembalikan 502 UPSTREAM_API_ERROR ketika Open Library mengembalikan HTTP 500', async () => {
      mockOpenLibraryFetch(async () => jsonResponse({ error: 'internal error' }, 500));

      const res = await originalFetch(`${baseUrl}/api/v1/public-books?q=failing`);
      assert.equal(res.status, 502);

      const body = await res.json();
      assert.equal(body.success, false);
      assert.equal(body.error.code, 'UPSTREAM_API_ERROR');
      assert.ok(body.message);
    });

    test('Mengembalikan 502 UPSTREAM_API_ERROR ketika terjadi error jaringan saat menghubungi Open Library', async () => {
      mockOpenLibraryFetch(async () => {
        throw new TypeError('fetch failed');
      });

      const res = await originalFetch(`${baseUrl}/api/v1/public-books/OL45804W`);
      assert.equal(res.status, 502);

      const body = await res.json();
      assert.equal(body.success, false);
      assert.equal(body.error.code, 'UPSTREAM_API_ERROR');
    });

    test('Mengembalikan 502 UPSTREAM_API_ERROR ketika panggilan Open Library mengalami timeout', async () => {
      const previousTimeout = config.openLibraryTimeoutMs;
      config.openLibraryTimeoutMs = 40;

      try {
        mockOpenLibraryFetch(
          (_url, init) =>
            new Promise((_resolve, reject) => {
              init.signal.addEventListener('abort', () => {
                const abortErr = new Error('The operation was aborted');
                abortErr.name = 'AbortError';
                reject(abortErr);
              });
            }),
        );

        const res = await originalFetch(`${baseUrl}/api/v1/public-books?q=slow-upstream`);
        assert.equal(res.status, 502);

        const body = await res.json();
        assert.equal(body.success, false);
        assert.equal(body.error.code, 'UPSTREAM_API_ERROR');
        assert.match(body.message, /timeout/i);
      } finally {
        config.openLibraryTimeoutMs = previousTimeout;
      }
    });
  });
});
