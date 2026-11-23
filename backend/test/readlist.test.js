import { test, describe, before, after, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createApp } from '../src/app/index.js';
import { closeDb, getDb } from '../src/app/database.js';
import { config } from '../src/config/index.js';
import { clearPublicBookCache } from '../src/service/publicBook.service.js';

describe('Readlist Pribadi User (Issue #9)', () => {
  let server;
  let baseUrl;
  let adminToken;
  let user1Token;
  let user2Token;
  const originalFetch = globalThis.fetch;

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

    // 1. Login Admin
    const adminRes = await originalFetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: config.adminEmail,
        password: config.adminPassword,
      }),
    });
    adminToken = (await adminRes.json()).data.token;

    // 2. Register User 1
    const user1Res = await originalFetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Andi Mahasiswa',
        nim: 'F55122100',
        email: 'andi.readlist@untad.ac.id',
        password: 'password123',
      }),
    });
    user1Token = (await user1Res.json()).data.token;

    // 3. Register User 2
    const user2Res = await originalFetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Budi Mahasiswa',
        nim: 'F55122200',
        email: 'budi.readlist@untad.ac.id',
        password: 'password123',
      }),
    });
    user2Token = (await user2Res.json()).data.token;
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

  describe('Pemisahan Peran & Otorisasi Endpoint Readlist', () => {
    test('Tamu tanpa token ditolak dengan 401 UNAUTHORIZED pada GET /readlist', async () => {
      const res = await originalFetch(`${baseUrl}/api/v1/readlist`);
      assert.equal(res.status, 401);
      const body = await res.json();
      assert.equal(body.success, false);
      assert.equal(body.error.code, 'UNAUTHORIZED');
    });

    test('Tamu tanpa token ditolak dengan 401 UNAUTHORIZED pada POST /readlist', async () => {
      const res = await originalFetch(`${baseUrl}/api/v1/readlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workId: 'OL45804W' }),
      });
      assert.equal(res.status, 401);
      const body = await res.json();
      assert.equal(body.success, false);
      assert.equal(body.error.code, 'UNAUTHORIZED');
    });

    test('Tamu tanpa token ditolak dengan 401 UNAUTHORIZED pada DELETE /readlist/:workId', async () => {
      const res = await originalFetch(`${baseUrl}/api/v1/readlist/OL45804W`, {
        method: 'DELETE',
      });
      assert.equal(res.status, 401);
      const body = await res.json();
      assert.equal(body.success, false);
      assert.equal(body.error.code, 'UNAUTHORIZED');
    });

    test('Admin ditolak dengan 403 FORBIDDEN pada GET /readlist', async () => {
      const res = await originalFetch(`${baseUrl}/api/v1/readlist`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.equal(res.status, 403);
      const body = await res.json();
      assert.equal(body.success, false);
      assert.equal(body.error.code, 'FORBIDDEN');
    });

    test('Admin ditolak dengan 403 FORBIDDEN pada POST /readlist', async () => {
      const res = await originalFetch(`${baseUrl}/api/v1/readlist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ workId: 'OL45804W' }),
      });
      assert.equal(res.status, 403);
      const body = await res.json();
      assert.equal(body.success, false);
      assert.equal(body.error.code, 'FORBIDDEN');
    });

    test('Admin ditolak dengan 403 FORBIDDEN pada DELETE /readlist/:workId', async () => {
      const res = await originalFetch(`${baseUrl}/api/v1/readlist/OL45804W`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.equal(res.status, 403);
      const body = await res.json();
      assert.equal(body.success, false);
      assert.equal(body.error.code, 'FORBIDDEN');
    });
  });

  describe('Validasi Format workId', () => {
    test('POST /readlist menolak workId tidak valid dengan 400 VALIDATION_ERROR', async () => {
      const invalidIds = ['12345', 'OL123M', 'OLW', 'OL123w', 'OLabcW', '', null];

      for (const invalidId of invalidIds) {
        const res = await originalFetch(`${baseUrl}/api/v1/readlist`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${user1Token}`,
          },
          body: JSON.stringify({ workId: invalidId }),
        });

        assert.equal(res.status, 400, `Harus gagal untuk workId: ${invalidId}`);
        const body = await res.json();
        assert.equal(body.success, false);
        assert.equal(body.error.code, 'VALIDATION_ERROR');
        assert.ok(body.error.details.some((d) => d.field === 'workId'));
      }
    });

    test('DELETE /readlist/:workId menolak workId tidak valid dengan 400 VALIDATION_ERROR', async () => {
      const res = await originalFetch(`${baseUrl}/api/v1/readlist/invalid_work_id`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${user1Token}` },
      });

      assert.equal(res.status, 400);
      const body = await res.json();
      assert.equal(body.success, false);
      assert.equal(body.error.code, 'VALIDATION_ERROR');
    });
  });

  describe('POST /api/v1/readlist (Menyimpan Snapshot Metadata)', () => {
    test('Berhasil menambahkan Buku Publik ke Readlist dan menyimpan snapshot metadata (status 201)', async () => {
      mockOpenLibraryFetch(async (url) => {
        if (url.endsWith('/works/OL1001W.json')) {
          return jsonResponse({
            key: '/works/OL1001W',
            title: 'Clean Code: A Handbook of Agile Software Craftsmanship',
            authors: [{ author: { key: '/authors/OL2001A' } }],
            first_publish_date: 'August 1, 2008',
            covers: [10001],
            description: { type: '/type/text', value: 'Even bad code can function.' },
          });
        }
        if (url.endsWith('/authors/OL2001A.json')) {
          return jsonResponse({
            key: '/authors/OL2001A',
            name: 'Robert C. Martin',
          });
        }
        return jsonResponse({}, 404);
      });

      const res = await originalFetch(`${baseUrl}/api/v1/readlist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user1Token}`,
        },
        body: JSON.stringify({ workId: 'OL1001W' }),
      });

      assert.equal(res.status, 201);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.message, 'Buku berhasil ditambahkan ke readlist');

      const item = body.data;
      assert.ok(item.id > 0);
      assert.equal(item.workId, 'OL1001W');
      assert.equal(item.title, 'Clean Code: A Handbook of Agile Software Craftsmanship');
      assert.deepEqual(item.authors, ['Robert C. Martin']);
      assert.equal(item.firstPublishYear, 2008);
      assert.equal(item.coverUrl, 'https://covers.openlibrary.org/b/id/10001-M.jpg');
      assert.equal(item.description, 'Even bad code can function.');
      assert.ok(item.createdAt);

      // Verifikasi snapshot tersimpan di database SQLite
      const db = getDb();
      const savedRow = db.prepare('SELECT * FROM readlist_items WHERE id = ?;').get(item.id);
      assert.ok(savedRow);
      assert.equal(savedRow.work_id, 'OL1001W');
      assert.equal(savedRow.title, 'Clean Code: A Handbook of Agile Software Craftsmanship');
      assert.equal(JSON.parse(savedRow.authors)[0], 'Robert C. Martin');
      assert.equal(savedRow.first_publish_year, 2008);
      assert.equal(savedRow.description, 'Even bad code can function.');
    });

    test('Menolak duplikasi workId pada User yang sama dengan 409 ALREADY_IN_READLIST', async () => {
      const res = await originalFetch(`${baseUrl}/api/v1/readlist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user1Token}`,
        },
        body: JSON.stringify({ workId: 'OL1001W' }),
      });

      assert.equal(res.status, 409);
      const body = await res.json();
      assert.equal(body.success, false);
      assert.equal(body.error.code, 'ALREADY_IN_READLIST');
    });

    test('User berbeda (User 2) dapat menyimpan workId yang sama secara independen', async () => {
      mockOpenLibraryFetch(async (url) => {
        if (url.endsWith('/works/OL1001W.json')) {
          return jsonResponse({
            key: '/works/OL1001W',
            title: 'Clean Code: A Handbook of Agile Software Craftsmanship',
            authors: [{ name: 'Robert C. Martin' }],
            first_publish_date: 'August 1, 2008',
            description: 'Even bad code can function.',
          });
        }
        return jsonResponse({}, 404);
      });

      const res = await originalFetch(`${baseUrl}/api/v1/readlist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user2Token}`,
        },
        body: JSON.stringify({ workId: 'OL1001W' }),
      });

      assert.equal(res.status, 201);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.data.workId, 'OL1001W');
    });

    test('Mengembalikan 502 UPSTREAM_API_ERROR jika Open Library API mengalami kegagalan', async () => {
      mockOpenLibraryFetch(async (url) => {
        if (url.includes('OL9999W')) {
          return jsonResponse({ error: 'Server internal upstream rusak' }, 500);
        }
        return jsonResponse({}, 404);
      });

      const res = await originalFetch(`${baseUrl}/api/v1/readlist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user1Token}`,
        },
        body: JSON.stringify({ workId: 'OL9999W' }),
      });

      assert.equal(res.status, 502);
      const body = await res.json();
      assert.equal(body.success, false);
      assert.equal(body.error.code, 'UPSTREAM_API_ERROR');
    });

    test('Mengembalikan 404 NOT_FOUND jika work tidak ditemukan di Open Library', async () => {
      mockOpenLibraryFetch(async () => jsonResponse({}, 404));

      const res = await originalFetch(`${baseUrl}/api/v1/readlist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user1Token}`,
        },
        body: JSON.stringify({ workId: 'OL40404W' }),
      });

      assert.equal(res.status, 404);
      const body = await res.json();
      assert.equal(body.success, false);
      assert.equal(body.error.code, 'NOT_FOUND');
    });
  });

  describe('GET /api/v1/readlist (Daftar Snapshot, Pencarian, & Paginasi)', () => {
    before(async () => {
      mockOpenLibraryFetch(async (url) => {
        if (url.endsWith('/works/OL2001W.json')) {
          return jsonResponse({
            key: '/works/OL2001W',
            title: 'The Pragmatic Programmer',
            authors: [{ name: 'Andy Hunt' }],
            first_publish_date: '1999',
            description: 'Your journey to mastery.',
          });
        }
        if (url.endsWith('/works/OL2002W.json')) {
          return jsonResponse({
            key: '/works/OL2002W',
            title: 'Design Patterns: Elements of Reusable Object-Oriented Software',
            authors: [{ name: 'Erich Gamma' }],
            first_publish_date: '1994',
            description: 'Gang of Four design patterns.',
          });
        }
        return jsonResponse({}, 404);
      });

      await originalFetch(`${baseUrl}/api/v1/readlist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user1Token}`,
        },
        body: JSON.stringify({ workId: 'OL2001W' }),
      });

      await originalFetch(`${baseUrl}/api/v1/readlist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user1Token}`,
        },
        body: JSON.stringify({ workId: 'OL2002W' }),
      });
    });

    test('Mengambil daftar Readlist dari SQLite tanpa memanggil Open Library API', async () => {
      let openLibraryCalled = false;
      mockOpenLibraryFetch(async () => {
        openLibraryCalled = true;
        return jsonResponse({});
      });

      const res = await originalFetch(`${baseUrl}/api/v1/readlist`, {
        headers: { Authorization: `Bearer ${user1Token}` },
      });

      assert.equal(res.status, 200);
      assert.equal(openLibraryCalled, false, 'GET /readlist tidak boleh memanggil Open Library API');

      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.message, 'Readlist berhasil diambil');
      assert.ok(body.data.length >= 3); // OL1001W, OL2001W, OL2002W
      assert.equal(body.meta.page, 1);
    });

    test('Mendukung pencarian q berdasarkan judul snapshot', async () => {
      const res = await originalFetch(`${baseUrl}/api/v1/readlist?q=Pragmatic`, {
        headers: { Authorization: `Bearer ${user1Token}` },
      });

      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.data.length, 1);
      assert.equal(body.data[0].workId, 'OL2001W');
      assert.equal(body.data[0].title, 'The Pragmatic Programmer');
    });

    test('Mendukung pencarian q berdasarkan nama author snapshot', async () => {
      const res = await originalFetch(`${baseUrl}/api/v1/readlist?q=Erich Gamma`, {
        headers: { Authorization: `Bearer ${user1Token}` },
      });

      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.data.length, 1);
      assert.equal(body.data[0].workId, 'OL2002W');
    });

    test('Mendukung paginasi page & limit, serta membatasi limit maksimal 50', async () => {
      const resPaging = await originalFetch(`${baseUrl}/api/v1/readlist?page=1&limit=2`, {
        headers: { Authorization: `Bearer ${user1Token}` },
      });
      assert.equal(resPaging.status, 200);
      const bodyPaging = await resPaging.json();
      assert.equal(bodyPaging.data.length, 2);
      assert.equal(bodyPaging.meta.limit, 2);

      // Uji limit > 50 dibatasi ke 50
      const resMaxLimit = await originalFetch(`${baseUrl}/api/v1/readlist?limit=100`, {
        headers: { Authorization: `Bearer ${user1Token}` },
      });
      assert.equal(resMaxLimit.status, 200);
      const bodyMaxLimit = await resMaxLimit.json();
      assert.equal(bodyMaxLimit.meta.limit, 50);
    });
  });

  describe('DELETE /api/v1/readlist/{workId} (Penghapusan & Isolasi User)', () => {
    test('Hanya menghapus item milik User terkait dan mengembalikan 200 { workId }', async () => {
      const res = await originalFetch(`${baseUrl}/api/v1/readlist/OL2002W`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${user1Token}` },
      });

      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.message, 'Buku berhasil dihapus dari readlist');
      assert.equal(body.data.workId, 'OL2002W');

      // Pastikan sudah tidak ada di readlist User 1
      const checkRes = await originalFetch(`${baseUrl}/api/v1/readlist?q=Patterns`, {
        headers: { Authorization: `Bearer ${user1Token}` },
      });
      assert.equal((await checkRes.json()).data.length, 0);
    });

    test('Mengembalikan 404 NOT_FOUND jika item tidak ada di Readlist', async () => {
      const res = await originalFetch(`${baseUrl}/api/v1/readlist/OL99999W`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${user1Token}` },
      });

      assert.equal(res.status, 404);
      const body = await res.json();
      assert.equal(body.success, false);
      assert.equal(body.error.code, 'NOT_FOUND');
    });

    test('User 2 tidak dapat menghapus item milik User 1 (mengembalikan 404 NOT_FOUND)', async () => {
      // OL2001W ada di readlist User 1 tapi tidak ada di readlist User 2
      const res = await originalFetch(`${baseUrl}/api/v1/readlist/OL2001W`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${user2Token}` },
      });

      assert.equal(res.status, 404);
      const body = await res.json();
      assert.equal(body.success, false);
      assert.equal(body.error.code, 'NOT_FOUND');
    });
  });

  describe('Sinkronisasi Flag inReadlist pada Endpoint Buku Publik', () => {
    const SYNC_WORK_ID = 'OL7777W';

    test('Flag inReadlist sinkron secara akurat saat ditambah dan dihapus dari Readlist', async () => {
      mockOpenLibraryFetch(async (url) => {
        if (url.includes('/search.json')) {
          return jsonResponse({
            numFound: 1,
            docs: [
              {
                key: `/works/${SYNC_WORK_ID}`,
                title: 'Sinkronisasi Readlist Book',
                author_name: ['Testing Author'],
                first_publish_year: 2024,
              },
            ],
          });
        }
        if (url.endsWith(`/works/${SYNC_WORK_ID}.json`)) {
          return jsonResponse({
            key: `/works/${SYNC_WORK_ID}`,
            title: 'Sinkronisasi Readlist Book',
            authors: [{ name: 'Testing Author' }],
            first_publish_date: '2024',
            description: 'Sinkronisasi flag',
          });
        }
        return jsonResponse({}, 404);
      });

      // 1. Awalnya belum masuk readlist: inReadlist harus false untuk User 1, User 2, Tamu, dan Admin
      const getDetailBeforeUser1 = await originalFetch(`${baseUrl}/api/v1/public-books/${SYNC_WORK_ID}`, {
        headers: { Authorization: `Bearer ${user1Token}` },
      });
      assert.equal((await getDetailBeforeUser1.json()).data.inReadlist, false);

      const getSearchBeforeUser1 = await originalFetch(`${baseUrl}/api/v1/public-books?q=Sinkronisasi`, {
        headers: { Authorization: `Bearer ${user1Token}` },
      });
      assert.equal((await getSearchBeforeUser1.json()).data[0].inReadlist, false);

      // 2. User 1 menambahkan SYNC_WORK_ID ke Readlist
      const addRes = await originalFetch(`${baseUrl}/api/v1/readlist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user1Token}`,
        },
        body: JSON.stringify({ workId: SYNC_WORK_ID }),
      });
      assert.equal(addRes.status, 201);

      // 3. Verifikasi inReadlist: true untuk User 1 pada detail dan katalog
      const getDetailAfterUser1 = await originalFetch(`${baseUrl}/api/v1/public-books/${SYNC_WORK_ID}`, {
        headers: { Authorization: `Bearer ${user1Token}` },
      });
      assert.equal((await getDetailAfterUser1.json()).data.inReadlist, true);

      const getSearchAfterUser1 = await originalFetch(`${baseUrl}/api/v1/public-books?q=Sinkronisasi`, {
        headers: { Authorization: `Bearer ${user1Token}` },
      });
      assert.equal((await getSearchAfterUser1.json()).data[0].inReadlist, true);

      // 4. Verifikasi inReadlist tetap false untuk Tamu, Admin, dan User 2
      const getDetailGuest = await originalFetch(`${baseUrl}/api/v1/public-books/${SYNC_WORK_ID}`);
      assert.equal((await getDetailGuest.json()).data.inReadlist, false);

      const getDetailAdmin = await originalFetch(`${baseUrl}/api/v1/public-books/${SYNC_WORK_ID}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.equal((await getDetailAdmin.json()).data.inReadlist, false);

      const getDetailUser2 = await originalFetch(`${baseUrl}/api/v1/public-books/${SYNC_WORK_ID}`, {
        headers: { Authorization: `Bearer ${user2Token}` },
      });
      assert.equal((await getDetailUser2.json()).data.inReadlist, false);

      // 5. User 1 menghapus SYNC_WORK_ID dari Readlist
      const delRes = await originalFetch(`${baseUrl}/api/v1/readlist/${SYNC_WORK_ID}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${user1Token}` },
      });
      assert.equal(delRes.status, 200);

      // 6. Verifikasi inReadlist kembali false untuk User 1
      const getDetailAfterDel = await originalFetch(`${baseUrl}/api/v1/public-books/${SYNC_WORK_ID}`, {
        headers: { Authorization: `Bearer ${user1Token}` },
      });
      assert.equal((await getDetailAfterDel.json()).data.inReadlist, false);
    });
  });
});
