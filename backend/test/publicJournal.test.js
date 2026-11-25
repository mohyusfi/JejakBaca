import { test, describe, before, after, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createApp } from '../src/app/index.js';
import { closeDb } from '../src/app/database.js';
import { config } from '../src/config/index.js';
import { clearPublicJournalCache, publicJournalService } from '../src/service/publicJournal.service.js';

describe('Proxy Jurnal Publik Crossref API (GET /api/v1/public-journals)', () => {
  let server;
  let baseUrl;
  let adminToken;
  let userToken;
  const originalFetch = globalThis.fetch;

  /**
   * Helper untuk me-mock panggilan fetch ke Crossref sementara request lokal diteruskan ke server uji
   * @param {(url: string, init?: RequestInit) => Promise<Response>} upstreamHandler
   */
  function mockCrossrefFetch(upstreamHandler) {
    globalThis.fetch = async (input, init) => {
      const url = typeof input === 'string' ? input : input.url;
      if (url.startsWith(config.crossrefBaseUrl)) {
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
        name: 'Budi Peneliti',
        nim: 'F55122099',
        email: 'budi.peneliti@untad.ac.id',
        password: 'password123',
      }),
    });
    const userBody = await userRes.json();
    userToken = userBody.data.token;
  });

  beforeEach(() => {
    clearPublicJournalCache();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  after(async () => {
    globalThis.fetch = originalFetch;
    await new Promise((resolve) => server.close(resolve));
    closeDb();
  });

  describe('Konfigurasi Default Proxy Crossref', () => {
    test('Memiliki konfigurasi baseUrl, timeout 8 detik, cache TTL 5 menit, dan User-Agent', () => {
      assert.equal(config.crossrefBaseUrl, 'https://api.crossref.org');
      assert.equal(config.crossrefTimeoutMs, 8000);
      assert.equal(config.crossrefCacheTtlMs, 5 * 60 * 1000);
      assert.ok(config.crossrefUserAgent && config.crossrefUserAgent.length > 0);
    });
  });

  describe('GET /api/v1/public-journals (Pencarian, Normalisasi, Cache, & Akses Peran)', () => {
    test('Menggunakan default query=computer science, menyertakan User-Agent, menormalisasi metadata, dan dapat diakses Tamu/User/Admin', async () => {
      const capturedRequests = [];
      mockCrossrefFetch(async (url, init) => {
        capturedRequests.push({ url, headers: init?.headers || {} });
        return jsonResponse({
          message: {
            'total-results': 3,
            items: [
              {
                DOI: '10.1145/1234567',
                title: ['  Adaptive Library Systems  '],
                author: [
                  { given: 'Andi', family: 'Pratama' },
                  { name: 'IEEE Computer Society' },
                ],
                'container-title': ['Journal of Computer Science'],
                publisher: 'ACM',
                published: { 'date-parts': [[2025, 4, 10]] },
                type: 'journal-article',
                'is-referenced-by-count': 12,
                URL: 'https://doi.org/10.1145/1234567',
              },
              {
                DOI: '10.1007/987654',
                title: ['Fallback Fields Article'],
                issued: { 'date-parts': [[2021]] },
              },
              {
                title: ['Entri Tanpa DOI Harus Diabaikan'],
              },
            ],
          },
        });
      });

      // 1. Akses sebagai Tamu
      const guestRes = await originalFetch(`${baseUrl}/api/v1/public-journals`);
      assert.equal(guestRes.status, 200);
      const guestBody = await guestRes.json();

      assert.equal(guestBody.success, true);
      assert.equal(guestBody.message, 'Jurnal publik berhasil diambil');
      assert.equal(guestBody.data.length, 2);
      assert.deepEqual(guestBody.data[0], {
        doi: '10.1145/1234567',
        title: 'Adaptive Library Systems',
        authors: ['Andi Pratama', 'IEEE Computer Society'],
        journal: 'Journal of Computer Science',
        publisher: 'ACM',
        publishedYear: 2025,
        type: 'journal-article',
        citationCount: 12,
        url: 'https://doi.org/10.1145/1234567',
      });
      assert.deepEqual(guestBody.data[1], {
        doi: '10.1007/987654',
        title: 'Fallback Fields Article',
        authors: ['Unknown Author'],
        journal: null,
        publisher: null,
        publishedYear: 2021,
        type: null,
        citationCount: 0,
        url: 'https://doi.org/10.1007/987654',
      });
      assert.deepEqual(guestBody.meta, {
        page: 1,
        limit: 10,
        total: 3,
        totalPages: 1,
      });

      assert.equal(capturedRequests.length, 1);
      const parsedUpstream = new URL(capturedRequests[0].url);
      assert.equal(parsedUpstream.pathname, '/works');
      assert.equal(parsedUpstream.searchParams.get('query'), 'computer science');
      assert.equal(parsedUpstream.searchParams.get('rows'), '10');
      assert.equal(parsedUpstream.searchParams.get('offset'), '0');
      assert.equal(
        parsedUpstream.searchParams.get('select'),
        'DOI,title,author,published,issued,container-title,publisher,type,URL,is-referenced-by-count',
      );
      assert.equal(capturedRequests[0].headers['User-Agent'], config.crossrefUserAgent);
      assert.equal(capturedRequests[0].headers.Accept, 'application/json');

      // 2. Akses sebagai User (terlayani dari cache tanpa memanggil fetch lagi)
      const userRes = await originalFetch(`${baseUrl}/api/v1/public-journals`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      assert.equal(userRes.status, 200);

      // 3. Akses sebagai Admin (terlayani dari cache tanpa memanggil fetch lagi)
      const adminRes = await originalFetch(`${baseUrl}/api/v1/public-journals`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.equal(adminRes.status, 200);

      assert.equal(capturedRequests.length, 1, 'Request berulang dalam TTL 5 menit harus menggunakan cache');
    });

    test('Mendukung parameter q, page, offset, dan pembatasan limit maksimal 20', async () => {
      let capturedUrl = '';
      mockCrossrefFetch(async (url) => {
        capturedUrl = url;
        return jsonResponse({
          message: {
            'total-results': 45,
            items: [
              {
                DOI: '10.1109/999999',
                title: ['Software Engineering Metrics'],
                author: [{ given: 'Siti', family: 'Rahma' }],
                published: { 'date-parts': [[2024]] },
              },
            ],
          },
        });
      });

      const res = await originalFetch(`${baseUrl}/api/v1/public-journals?q=software+engineering&page=2&limit=50`);
      assert.equal(res.status, 200);
      const body = await res.json();

      const parsed = new URL(capturedUrl);
      assert.equal(parsed.searchParams.get('query'), 'software engineering');
      assert.equal(parsed.searchParams.get('rows'), '20');
      assert.equal(parsed.searchParams.get('offset'), '20');

      assert.deepEqual(body.meta, {
        page: 2,
        limit: 20,
        total: 45,
        totalPages: 3,
      });
    });

    test('Menolak kombinasi page dan limit dengan offset > 10000 dengan 400 VALIDATION_ERROR', async () => {
      let called = false;
      mockCrossrefFetch(async () => {
        called = true;
        return jsonResponse({ message: { 'total-results': 0, items: [] } });
      });

      const res = await originalFetch(`${baseUrl}/api/v1/public-journals?page=502&limit=20`);
      assert.equal(res.status, 400);
      const body = await res.json();
      assert.equal(body.success, false);
      assert.equal(body.error.code, 'VALIDATION_ERROR');
      assert.equal(body.error.details[0].field, 'page');
      assert.equal(called, false);
    });

    test('Cache in-memory kedaluwarsa setelah TTL 5 menit', async () => {
      let callCount = 0;
      const mockFetch = async () => {
        callCount += 1;
        return jsonResponse({
          message: {
            'total-results': 1,
            items: [{ DOI: `10.1000/cache-${callCount}`, title: [`Artikel Ke-${callCount}`] }],
          },
        });
      };

      const t0 = 1_700_000_000_000;
      const first = await publicJournalService.searchPublicJournals({ q: 'cache-test' }, {
        fetchFn: mockFetch,
        now: t0,
      });
      assert.equal(first.items[0].title, 'Artikel Ke-1');
      assert.equal(callCount, 1);

      // Masih dalam 5 menit (4 menit 59 detik) -> cache hit
      const second = await publicJournalService.searchPublicJournals({ q: 'cache-test' }, {
        fetchFn: mockFetch,
        now: t0 + 4 * 60 * 1000 + 59 * 1000,
      });
      assert.equal(second.items[0].title, 'Artikel Ke-1');
      assert.equal(callCount, 1);

      // Setelah tepat 5 menit -> cache miss, memanggil upstream lagi
      const third = await publicJournalService.searchPublicJournals({ q: 'cache-test' }, {
        fetchFn: mockFetch,
        now: t0 + 5 * 60 * 1000,
      });
      assert.equal(third.items[0].title, 'Artikel Ke-2');
      assert.equal(callCount, 2);
    });
  });

  describe('Pemetaan Error Upstream (502 UPSTREAM_API_ERROR)', () => {
    test('Mengembalikan 502 UPSTREAM_API_ERROR ketika Crossref mengembalikan HTTP 500', async () => {
      mockCrossrefFetch(async () => jsonResponse({ error: 'internal error' }, 500));

      const res = await originalFetch(`${baseUrl}/api/v1/public-journals?q=failing`);
      assert.equal(res.status, 502);

      const body = await res.json();
      assert.equal(body.success, false);
      assert.equal(body.error.code, 'UPSTREAM_API_ERROR');
      assert.match(body.message, /Crossref/i);
    });

    test('Mengembalikan 502 UPSTREAM_API_ERROR ketika Crossref mengembalikan JSON tidak valid', async () => {
      mockCrossrefFetch(async () => new Response('not-json', { status: 200 }));

      const res = await originalFetch(`${baseUrl}/api/v1/public-journals?q=invalid-json`);
      assert.equal(res.status, 502);

      const body = await res.json();
      assert.equal(body.success, false);
      assert.equal(body.error.code, 'UPSTREAM_API_ERROR');
      assert.match(body.message, /JSON/i);
    });

    test('Mengembalikan 502 UPSTREAM_API_ERROR ketika terjadi error jaringan saat menghubungi Crossref', async () => {
      mockCrossrefFetch(async () => {
        throw new TypeError('fetch failed');
      });

      const res = await originalFetch(`${baseUrl}/api/v1/public-journals?q=network-error`);
      assert.equal(res.status, 502);

      const body = await res.json();
      assert.equal(body.success, false);
      assert.equal(body.error.code, 'UPSTREAM_API_ERROR');
      assert.match(body.message, /Crossref/i);
    });

    test('Mengembalikan 502 UPSTREAM_API_ERROR ketika panggilan Crossref mengalami timeout', async () => {
      const previousTimeout = config.crossrefTimeoutMs;
      config.crossrefTimeoutMs = 40;

      try {
        mockCrossrefFetch(
          (_url, init) =>
            new Promise((_resolve, reject) => {
              init.signal.addEventListener('abort', () => {
                const abortErr = new Error('The operation was aborted');
                abortErr.name = 'AbortError';
                reject(abortErr);
              });
            }),
        );

        const res = await originalFetch(`${baseUrl}/api/v1/public-journals?q=slow-upstream`);
        assert.equal(res.status, 502);

        const body = await res.json();
        assert.equal(body.success, false);
        assert.equal(body.error.code, 'UPSTREAM_API_ERROR');
        assert.match(body.message, /timeout/i);
      } finally {
        config.crossrefTimeoutMs = previousTimeout;
      }
    });
  });
});
