import { test, describe, before, after, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createApp } from '../src/app/index.js';
import { closeDb, getDb } from '../src/app/database.js';
import { config } from '../src/config/index.js';
import { bookService } from '../src/service/book.service.js';
import { clearPublicBookCache } from '../src/service/publicBook.service.js';

describe('Endpoint GraphQL Read-Only Query Aggregator (Issue #10)', () => {
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

  async function postGraphQL(payload, token = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    return originalFetch(`${baseUrl}/graphql`, {
      method: 'POST',
      headers,
      body: typeof payload === 'string' ? payload : JSON.stringify(payload),
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
    adminToken = (await adminRes.json()).data.token;

    const user1Res = await originalFetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Siti GraphQL',
        nim: 'F55122301',
        email: 'siti.gql@untad.ac.id',
        password: 'password123',
      }),
    });
    user1Token = (await user1Res.json()).data.token;

    const user2Res = await originalFetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Budi GraphQL',
        nim: 'F55122302',
        email: 'budi.gql@untad.ac.id',
        password: 'password123',
      }),
    });
    user2Token = (await user2Res.json()).data.token;

    bookService.seedBooks(getDb());
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

  describe('Validasi Request & Read-Only Schema', () => {
    test('Mengembalikan 400 VALIDATION_ERROR jika body kosong, query kosong, atau variables bukan objek', async () => {
      const emptyRes = await postGraphQL({});
      assert.equal(emptyRes.status, 400);
      assert.equal((await emptyRes.json()).error.code, 'VALIDATION_ERROR');

      const blankQueryRes = await postGraphQL({ query: '   ' });
      assert.equal(blankQueryRes.status, 400);
      assert.equal((await blankQueryRes.json()).error.code, 'VALIDATION_ERROR');

      const badVarsRes = await postGraphQL({ query: '{ libraryBooks { meta { total } } }', variables: ['bad'] });
      assert.equal(badVarsRes.status, 400);
      assert.equal((await badVarsRes.json()).error.code, 'VALIDATION_ERROR');

      const invalidJsonRes = await postGraphQL('{not-json');
      assert.equal(invalidJsonRes.status, 400);
      assert.equal((await invalidJsonRes.json()).error.code, 'VALIDATION_ERROR');
    });

    test('Menolak operasi mutasi karena skema GraphQL bersifat read-only', async () => {
      const res = await postGraphQL(
        { query: 'mutation { borrowBook(bookId: 1) { id } }' },
        user1Token
      );
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.ok(Array.isArray(body.errors) && body.errors.length > 0);
    });
  });

  describe('Query Katalog (libraryBooks, libraryBook, publicBooks, publicBookDetail)', () => {
    before(async () => {
      mockOpenLibraryFetch(async (url) => {
        if (url.includes('/works/OL45804W.json')) {
          return jsonResponse({
            key: '/works/OL45804W',
            title: 'Dune',
            authors: [{ author: { key: '/authors/OL79034A' } }],
            first_publish_year: 1965,
            covers: [14625765],
            subjects: ['Science fiction'],
            description: 'Novel fiksi ilmiah klasik.',
          });
        }
        if (url.includes('/authors/OL79034A.json')) {
          return jsonResponse({ name: 'Frank Herbert' });
        }
        if (url.includes('/search.json')) {
          return jsonResponse({
            numFound: 1,
            docs: [
              {
                key: '/works/OL45804W',
                title: 'Dune',
                author_name: ['Frank Herbert'],
                first_publish_year: 1965,
                cover_i: 14625765,
                subject: ['Science fiction'],
              },
            ],
          });
        }
        return jsonResponse({}, 404);
      });

      // User 1 meminjam buku id 1 dan menambahkan OL45804W ke readlist
      const loanRes = await originalFetch(`${baseUrl}/api/v1/loans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user1Token}` },
        body: JSON.stringify({ bookId: 1 }),
      });
      assert.equal(loanRes.status, 201);

      const readlistRes = await originalFetch(`${baseUrl}/api/v1/readlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user1Token}` },
        body: JSON.stringify({ workId: 'OL45804W' }),
      });
      assert.equal(readlistRes.status, 201);
    });

    test('Tamu, User, dan Admin dapat mengakses katalog serta mengisi isBorrowedByMe dan inReadlist untuk User', async () => {
      mockOpenLibraryFetch(async (url) => {
        if (url.includes('/search.json')) {
          return jsonResponse({
            numFound: 1,
            docs: [
              {
                key: '/works/OL45804W',
                title: 'Dune',
                author_name: ['Frank Herbert'],
                first_publish_year: 1965,
                cover_i: 14625765,
                subject: ['Science fiction'],
              },
            ],
          });
        }
        if (url.includes('/works/OL45804W.json')) {
          return jsonResponse({
            key: '/works/OL45804W',
            title: 'Dune',
            authors: [{ author: { key: '/authors/OL79034A' } }],
            first_publish_year: 1965,
            covers: [14625765],
            subjects: ['Science fiction'],
            description: 'Novel fiksi ilmiah klasik.',
          });
        }
        if (url.includes('/authors/OL79034A.json')) {
          return jsonResponse({ name: 'Frank Herbert' });
        }
        return jsonResponse({}, 404);
      });

      const query = `
        query KatalogGabungan {
          libraryBooks(page: 1, limit: 5) {
            items { id title isBorrowedByMe stockAvailable }
            meta { page limit total totalPages }
          }
          libraryBook(id: 1) {
            id
            title
            isBorrowedByMe
          }
          missingBook: libraryBook(id: 99999) {
            id
          }
          publicBooks(q: "dune", page: 1, limit: 5) {
            items { workId title inReadlist }
            meta { total }
          }
          publicBookDetail(workId: "OL45804W") {
            workId
            title
            inReadlist
            description
          }
        }
      `;

      // 1. Tamu
      const guestRes = await postGraphQL({ query });
      assert.equal(guestRes.status, 200);
      const guestBody = await guestRes.json();
      assert.equal(guestBody.errors, undefined);
      assert.equal(guestBody.data.libraryBook.isBorrowedByMe, false);
      assert.equal(guestBody.data.missingBook, null);
      assert.equal(guestBody.data.publicBooks.items[0].inReadlist, false);
      assert.equal(guestBody.data.publicBookDetail.inReadlist, false);

      // 2. User 1 (meminjam buku 1 & punya OL45804W di readlist)
      const userRes = await postGraphQL({ query }, user1Token);
      assert.equal(userRes.status, 200);
      const userBody = await userRes.json();
      assert.equal(userBody.errors, undefined);
      const book1 = userBody.data.libraryBooks.items.find((b) => b.id === 1);
      assert.equal(book1.isBorrowedByMe, true);
      assert.equal(userBody.data.libraryBook.isBorrowedByMe, true);
      assert.equal(userBody.data.publicBooks.items[0].inReadlist, true);
      assert.equal(userBody.data.publicBookDetail.inReadlist, true);

      // 3. Admin
      const adminRes = await postGraphQL({ query }, adminToken);
      assert.equal(adminRes.status, 200);
      const adminBody = await adminRes.json();
      assert.equal(adminBody.errors, undefined);
      assert.equal(adminBody.data.libraryBook.isBorrowedByMe, false);
      assert.equal(adminBody.data.publicBooks.items[0].inReadlist, false);
      assert.equal(adminBody.data.publicBookDetail.inReadlist, false);
    });
  });

  describe('Query myOverview (Khusus User)', () => {
    test('Tamu ditolak dengan error UNAUTHORIZED dan Admin ditolak dengan error FORBIDDEN', async () => {
      const query = '{ myOverview { activeLoansCount } }';

      const guestRes = await postGraphQL({ query });
      const guestBody = await guestRes.json();
      assert.ok(guestBody.errors?.length > 0);
      assert.equal(guestBody.errors[0].extensions.code, 'UNAUTHORIZED');

      const adminRes = await postGraphQL({ query }, adminToken);
      const adminBody = await adminRes.json();
      assert.ok(adminBody.errors?.length > 0);
      assert.equal(adminBody.errors[0].extensions.code, 'FORBIDDEN');
    });

    test('Mengembalikan statistik pinjaman aktif, terlambat, dan recentReadlist maksimal 5 item terbaru', async () => {
      // User 1 sudah punya 1 pinjaman aktif (buku 1) dan 1 readlist (OL45804W).
      // Tambahkan 1 pinjaman lagi (buku 2) dan ubah jadi terlambat.
      const loan2Res = await originalFetch(`${baseUrl}/api/v1/loans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user1Token}` },
        body: JSON.stringify({ bookId: 2 }),
      });
      assert.equal(loan2Res.status, 201);

      const db = getDb();
      const pastDue = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
      db.prepare("UPDATE loans SET due_date = ? WHERE book_id = 2 AND status = 'borrowed';").run(pastDue);

      // Tambahkan 5 item readlist lagi (total 6 item) untuk menguji batas 5 item terbaru
      const extraWorkIds = ['OL1001W', 'OL1002W', 'OL1003W', 'OL1004W', 'OL1005W'];
      mockOpenLibraryFetch(async (url) => {
        const match = url.match(/\/works\/(OL\d+W)\.json/);
        if (match) {
          return jsonResponse({
            key: `/works/${match[1]}`,
            title: `Buku ${match[1]}`,
            authors: [{ name: 'Penulis Uji' }],
          });
        }
        return jsonResponse({}, 404);
      });

      for (const workId of extraWorkIds) {
        const res = await originalFetch(`${baseUrl}/api/v1/readlist`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user1Token}` },
          body: JSON.stringify({ workId }),
        });
        assert.equal(res.status, 201);
      }

      const query = `
        query {
          myOverview {
            activeLoansCount
            overdueLoansCount
            readlistCount
            activeLoans {
              id
              bookId
              bookTitle
              isOverdue
              daysRemaining
            }
            recentReadlist {
              id
              workId
              title
            }
          }
        }
      `;

      const res = await postGraphQL({ query }, user1Token);
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.errors, undefined);

      const overview = body.data.myOverview;
      assert.equal(overview.activeLoansCount, 2);
      assert.equal(overview.overdueLoansCount, 1);
      assert.equal(overview.readlistCount, 6);
      assert.equal(overview.activeLoans.length, 2);
      assert.equal(overview.recentReadlist.length, 5);
      // Item terbaru (OL1005W) harus berada di urutan paling awal
      assert.equal(overview.recentReadlist[0].workId, 'OL1005W');
    });
  });

  describe('Query adminOverview (Khusus Admin)', () => {
    test('Tamu ditolak dengan error UNAUTHORIZED dan User ditolak dengan error FORBIDDEN', async () => {
      const query = '{ adminOverview { totalBooks } }';

      const guestRes = await postGraphQL({ query });
      const guestBody = await guestRes.json();
      assert.ok(guestBody.errors?.length > 0);
      assert.equal(guestBody.errors[0].extensions.code, 'UNAUTHORIZED');

      const userRes = await postGraphQL({ query }, user1Token);
      const userBody = await userRes.json();
      assert.ok(userBody.errors?.length > 0);
      assert.equal(userBody.errors[0].extensions.code, 'FORBIDDEN');
    });

    test('Mengembalikan totalBooks, lowStockBooksCount (<= 2), statistik pinjaman, dan recentLoans maks 5 item terfilter loanStatus', async () => {
      // Buat 4 pinjaman tambahan oleh user2 pada buku 3, 4, 5 & kembalikan 1 agar total pinjaman >= 6 (termasuk 1 returned)
      for (const bookId of [3, 4, 5]) {
        const r = await originalFetch(`${baseUrl}/api/v1/loans`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user2Token}` },
          body: JSON.stringify({ bookId }),
        });
        assert.equal(r.status, 201);
      }

      // Kembalikan buku 5 oleh user2
      const myLoansRes = await originalFetch(`${baseUrl}/api/v1/loans/my?status=borrowed`, {
        headers: { Authorization: `Bearer ${user2Token}` },
      });
      const user2Loans = (await myLoansRes.json()).data;
      const loanBook5 = user2Loans.find((l) => l.bookId === 5);
      await originalFetch(`${baseUrl}/api/v1/loans/${loanBook5.id}/return`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${user2Token}` },
      });

      // Tambahkan 2 pinjaman lagi oleh user1 (buku 3 & 4 sudah dipinjam user2, jadi user1 pinjam buku 5)
      // Total pinjaman aktif saat ini: user1(buku 1, buku 2), user2(buku 3, buku 4) = 4. Tambah user1(buku 5) = 5, dan buat buku baru stok 2 untuk pinjaman ke-6.
      const newBookRes = await originalFetch(`${baseUrl}/api/v1/books`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({
          title: 'Buku Stok Tipis',
          author: 'Admin Uji',
          description: 'Untuk uji ambang batas lowStockBooksCount <= 2',
          stockTotal: 2,
        }),
      });
      const newBookId = (await newBookRes.json()).data.id;

      await originalFetch(`${baseUrl}/api/v1/loans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user1Token}` },
        body: JSON.stringify({ bookId: 5 }),
      });
      await originalFetch(`${baseUrl}/api/v1/loans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user2Token}` },
        body: JSON.stringify({ bookId: newBookId }),
      });

      const query = `
        query AdminDash($status: LoanStatusFilter) {
          defaultView: adminOverview {
            totalBooks
            lowStockBooksCount
            activeLoansCount
            overdueLoansCount
            recentLoans {
              id
              bookId
              status
              isOverdue
            }
          }
          returnedView: adminOverview(loanStatus: $status) {
            recentLoans {
              id
              bookId
              status
            }
          }
        }
      `;

      const res = await postGraphQL({ query, variables: { status: 'RETURNED' } }, adminToken);
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.errors, undefined);

      const { defaultView, returnedView } = body.data;
      assert.equal(defaultView.totalBooks, 6);

      // Verifikasi langsung ke SQLite bahwa lowStockBooksCount menghitung stock_available <= 2
      const db = getDb();
      const expectedLowStock = db
        .prepare('SELECT COUNT(*) AS total FROM books WHERE deleted_at IS NULL AND stock_available <= 2;')
        .get().total;
      assert.equal(defaultView.lowStockBooksCount, expectedLowStock);

      assert.equal(defaultView.activeLoansCount, 6);
      assert.equal(defaultView.overdueLoansCount, 1);
      assert.equal(defaultView.recentLoans.length, 5);
      assert.ok(defaultView.recentLoans.every((loan) => loan.status === 'borrowed'));

      assert.equal(returnedView.recentLoans.length, 1);
      assert.equal(returnedView.recentLoans[0].status, 'returned');
      assert.equal(returnedView.recentLoans[0].bookId, 5);
    });
  });
});
