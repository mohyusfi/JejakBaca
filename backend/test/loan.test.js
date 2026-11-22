import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createApp } from '../src/app/index.js';
import { closeDb, getDb } from '../src/app/database.js';
import { config } from '../src/config/index.js';
import { bookService } from '../src/service/book.service.js';

describe('Transaksi Peminjaman & Pengembalian Self-Service serta Pantauan Admin (Issue #7)', () => {
  let server;
  let baseUrl;
  let adminToken;
  let user1Token;
  let user2Token;

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

    const adminRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: config.adminEmail,
        password: config.adminPassword,
      }),
    });
    adminToken = (await adminRes.json()).data.token;

    const user1Res = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Siti Mahasiswa',
        nim: 'F55122010',
        email: 'siti@untad.ac.id',
        password: 'password123',
      }),
    });
    user1Token = (await user1Res.json()).data.token;

    const user2Res = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Rudi Mahasiswa',
        nim: 'F55122020',
        email: 'rudi@untad.ac.id',
        password: 'password123',
      }),
    });
    user2Token = (await user2Res.json()).data.token;

    bookService.seedBooks(getDb());
  });

  after(async () => {
    await new Promise((resolve) => server.close(resolve));
    closeDb();
  });

  describe('Otorisasi Peran pada Endpoint Peminjaman', () => {
    test('Tamu tanpa token ditolak dengan 401 UNAUTHORIZED', async () => {
      const res = await fetch(`${baseUrl}/api/v1/loans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId: 1 }),
      });
      assert.equal(res.status, 401);
    });

    test('Admin dilarang meminjam buku (403 FORBIDDEN)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/loans`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ bookId: 1 }),
      });
      assert.equal(res.status, 403);
      assert.equal((await res.json()).error.code, 'FORBIDDEN');
    });

    test('User dilarang mengakses pantauan Admin /api/v1/admin/loans (403 FORBIDDEN)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/admin/loans`, {
        headers: { Authorization: `Bearer ${user1Token}` },
      });
      assert.equal(res.status, 403);
      assert.equal((await res.json()).error.code, 'FORBIDDEN');
    });
  });

  describe('POST /api/v1/loans (Pinjam Buku)', () => {
    test('Menolak input bookId tidak valid dengan 400 VALIDATION_ERROR', async () => {
      const res = await fetch(`${baseUrl}/api/v1/loans`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user1Token}`,
        },
        body: JSON.stringify({ bookId: 'abc' }),
      });
      assert.equal(res.status, 400);
      assert.equal((await res.json()).error.code, 'VALIDATION_ERROR');
    });

    test('Menolak dengan 404 NOT_FOUND jika buku tidak ada', async () => {
      const res = await fetch(`${baseUrl}/api/v1/loans`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user1Token}`,
        },
        body: JSON.stringify({ bookId: 99999 }),
      });
      assert.equal(res.status, 404);
      assert.equal((await res.json()).error.code, 'NOT_FOUND');
    });

    test('User berhasil meminjam buku (201), stok berkurang 1, dueDate +7 hari', async () => {
      const beforeBook = await (await fetch(`${baseUrl}/api/v1/books/1`)).json();
      const stockBefore = beforeBook.data.stockAvailable;

      const res = await fetch(`${baseUrl}/api/v1/loans`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user1Token}`,
        },
        body: JSON.stringify({ bookId: 1 }),
      });

      assert.equal(res.status, 201);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.data.bookId, 1);
      assert.equal(body.data.status, 'borrowed');
      assert.equal(body.data.isOverdue, false);
      assert.equal(body.data.daysRemaining, 7);
      assert.equal(body.data.returnedAt, null);

      const diffMs = new Date(body.data.dueDate).getTime() - new Date(body.data.borrowedAt).getTime();
      assert.equal(diffMs, 7 * 24 * 60 * 60 * 1000);

      const afterBook = await (await fetch(`${baseUrl}/api/v1/books/1`)).json();
      assert.equal(afterBook.data.stockAvailable, stockBefore - 1);
    });

    test('Menolak dengan 409 DUPLICATE_ACTIVE_LOAN jika User meminjam buku yang sama lagi', async () => {
      const res = await fetch(`${baseUrl}/api/v1/loans`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user1Token}`,
        },
        body: JSON.stringify({ bookId: 1 }),
      });
      assert.equal(res.status, 409);
      assert.equal((await res.json()).error.code, 'DUPLICATE_ACTIVE_LOAN');
    });

    test('Menolak dengan 409 LOAN_LIMIT_EXCEEDED saat User sudah meminjam 3 buku aktif', async () => {
      // Pinjam buku 2 dan 3 sehingga total aktif menjadi 3
      const res2 = await fetch(`${baseUrl}/api/v1/loans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user1Token}` },
        body: JSON.stringify({ bookId: 2 }),
      });
      assert.equal(res2.status, 201);

      const res3 = await fetch(`${baseUrl}/api/v1/loans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user1Token}` },
        body: JSON.stringify({ bookId: 3 }),
      });
      assert.equal(res3.status, 201);

      // Pinjaman ke-4 ditolak
      const res4 = await fetch(`${baseUrl}/api/v1/loans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user1Token}` },
        body: JSON.stringify({ bookId: 4 }),
      });
      assert.equal(res4.status, 409);
      assert.equal((await res4.json()).error.code, 'LOAN_LIMIT_EXCEEDED');
    });

    test('Menolak dengan 409 OUT_OF_STOCK jika stok tersedia buku habis', async () => {
      // Buat buku stok 1 oleh Admin
      const createRes = await fetch(`${baseUrl}/api/v1/books`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({
          title: 'Buku Stok Terbatas',
          author: 'Penulis Uji',
          description: 'Hanya 1 eksemplar',
          stockTotal: 1,
        }),
      });
      const limitedBookId = (await createRes.json()).data.id;

      // User 2 meminjam eksemplar terakhir
      const loanRes = await fetch(`${baseUrl}/api/v1/loans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user2Token}` },
        body: JSON.stringify({ bookId: limitedBookId }),
      });
      assert.equal(loanRes.status, 201);

      // User lain (registrasi baru) mencoba meminjam -> OUT_OF_STOCK
      const user3Res = await fetch(`${baseUrl}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Andi Ketiga',
          nim: 'F55122030',
          email: 'andi3@untad.ac.id',
          password: 'password123',
        }),
      });
      const user3Token = (await user3Res.json()).data.token;

      const failRes = await fetch(`${baseUrl}/api/v1/loans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user3Token}` },
        body: JSON.stringify({ bookId: limitedBookId }),
      });
      assert.equal(failRes.status, 409);
      assert.equal((await failRes.json()).error.code, 'OUT_OF_STOCK');
    });
  });

  describe('Integrasi Lintas-Fitur pada Buku Perpustakaan', () => {
    test('GET /api/v1/books dan GET /api/v1/books/:id mengisi isBorrowedByMe secara akurat untuk User', async () => {
      const listRes = await fetch(`${baseUrl}/api/v1/books`, {
        headers: { Authorization: `Bearer ${user1Token}` },
      });
      assert.equal(listRes.status, 200);
      const books = (await listRes.json()).data;
      const book1 = books.find((b) => b.id === 1);
      const book5 = books.find((b) => b.id === 5);
      assert.equal(book1.isBorrowedByMe, true);
      assert.equal(book5.isBorrowedByMe, false);

      const detailRes = await fetch(`${baseUrl}/api/v1/books/1`, {
        headers: { Authorization: `Bearer ${user1Token}` },
      });
      assert.equal((await detailRes.json()).data.isBorrowedByMe, true);
    });

    test('DELETE /api/v1/books/:id menolak dengan 409 BOOK_IN_ACTIVE_LOAN jika sedang dipinjam', async () => {
      const res = await fetch(`${baseUrl}/api/v1/books/1`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.equal(res.status, 409);
      assert.equal((await res.json()).error.code, 'BOOK_IN_ACTIVE_LOAN');
    });

    test('PUT /api/v1/books/:id menolak 409 STOCK_BELOW_BORROWED dan menghitung ulang stockAvailable', async () => {
      // Buku 1 sedang dipinjam oleh user1 (1 eksemplar)
      const failRes = await fetch(`${baseUrl}/api/v1/books/1`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ stockTotal: 0 }),
      });
      assert.equal(failRes.status, 409);
      assert.equal((await failRes.json()).error.code, 'STOCK_BELOW_BORROWED');

      const okRes = await fetch(`${baseUrl}/api/v1/books/1`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ stockTotal: 10 }),
      });
      assert.equal(okRes.status, 200);
      const updated = (await okRes.json()).data;
      assert.equal(updated.stockTotal, 10);
      assert.equal(updated.stockAvailable, 9);
    });
  });

  describe('PATCH /api/v1/loans/:id/return & GET /api/v1/loans/my', () => {
    let user1LoanIdForBook3;

    before(async () => {
      const myRes = await fetch(`${baseUrl}/api/v1/loans/my`, {
        headers: { Authorization: `Bearer ${user1Token}` },
      });
      const loans = (await myRes.json()).data;
      user1LoanIdForBook3 = loans.find((l) => l.bookId === 3).id;
    });

    test('Menolak pengembalian pinjaman milik User lain dengan 404 NOT_FOUND', async () => {
      const res = await fetch(`${baseUrl}/api/v1/loans/${user1LoanIdForBook3}/return`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${user2Token}` },
      });
      assert.equal(res.status, 404);
      assert.equal((await res.json()).error.code, 'NOT_FOUND');
    });

    test('User pemilik berhasil mengembalikan buku (200), stok bertambah 1', async () => {
      const bookBefore = (await (await fetch(`${baseUrl}/api/v1/books/3`)).json()).data;

      const res = await fetch(`${baseUrl}/api/v1/loans/${user1LoanIdForBook3}/return`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${user1Token}` },
      });
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.data.status, 'returned');
      assert.ok(body.data.returnedAt);
      assert.equal(body.data.isOverdue, false);
      assert.equal(body.data.daysRemaining, 0);

      const bookAfter = (await (await fetch(`${baseUrl}/api/v1/books/3`)).json()).data;
      assert.equal(bookAfter.stockAvailable, bookBefore.stockAvailable + 1);
    });

    test('Menolak pengembalian ulang dengan 409 CONFLICT', async () => {
      const res = await fetch(`${baseUrl}/api/v1/loans/${user1LoanIdForBook3}/return`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${user1Token}` },
      });
      assert.equal(res.status, 409);
      assert.equal((await res.json()).error.code, 'CONFLICT');
    });

    test('GET /api/v1/loans/my mendukung filter status, status Terlambat, dan riwayat buku soft-delete', async () => {
      // Simulasikan pinjaman buku 2 milik user1 sudah lewat jatuh tempo 2 hari
      const db = getDb();
      const pastDue = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
      db.prepare("UPDATE loans SET due_date = ? WHERE book_id = 2 AND status = 'borrowed';").run(pastDue);

      // Soft-delete buku 3 (sudah dikembalikan oleh user1 sehingga boleh dihapus)
      const delRes = await fetch(`${baseUrl}/api/v1/books/3`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.equal(delRes.status, 200);

      // Filter overdue
      const overdueRes = await fetch(`${baseUrl}/api/v1/loans/my?status=overdue`, {
        headers: { Authorization: `Bearer ${user1Token}` },
      });
      assert.equal(overdueRes.status, 200);
      const overdueData = (await overdueRes.json()).data;
      assert.equal(overdueData.length, 1);
      assert.equal(overdueData[0].bookId, 2);
      assert.equal(overdueData[0].isOverdue, true);
      assert.ok(overdueData[0].daysRemaining <= -2);

      // Filter returned tetap menampilkan buku 3 yang sudah di-soft-delete
      const returnedRes = await fetch(`${baseUrl}/api/v1/loans/my?status=returned`, {
        headers: { Authorization: `Bearer ${user1Token}` },
      });
      assert.equal(returnedRes.status, 200);
      const returnedData = (await returnedRes.json()).data;
      assert.equal(returnedData.length, 1);
      assert.equal(returnedData[0].bookId, 3);
      assert.ok(returnedData[0].bookTitle);

      // Filter status invalid ditolak 400 VALIDATION_ERROR
      const badStatusRes = await fetch(`${baseUrl}/api/v1/loans/my?status=invalid`, {
        headers: { Authorization: `Bearer ${user1Token}` },
      });
      assert.equal(badStatusRes.status, 400);
      assert.equal((await badStatusRes.json()).error.code, 'VALIDATION_ERROR');
    });
  });

  describe('GET /api/v1/admin/loans (Pantauan Admin)', () => {
    test('Admin dapat memantau peminjaman aktif default (borrowed), filter overdue, dan pencarian q (NIM/nama/judul)', async () => {
      const defaultRes = await fetch(`${baseUrl}/api/v1/admin/loans`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.equal(defaultRes.status, 200);
      const defaultBody = await defaultRes.json();
      assert.ok(defaultBody.data.length >= 2);
      assert.ok(defaultBody.data[0].borrower);
      assert.ok(defaultBody.data[0].borrower.name);
      assert.ok(defaultBody.data[0].borrower.nim);

      // Pencarian berdasarkan NIM user2
      const searchNimRes = await fetch(`${baseUrl}/api/v1/admin/loans?q=F55122020`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.equal(searchNimRes.status, 200);
      const searchNimBody = await searchNimRes.json();
      assert.equal(searchNimBody.data.length, 1);
      assert.equal(searchNimBody.data[0].borrower.nim, 'F55122020');

      // Filter overdue
      const overdueRes = await fetch(`${baseUrl}/api/v1/admin/loans?status=overdue`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.equal(overdueRes.status, 200);
      const overdueBody = await overdueRes.json();
      assert.equal(overdueBody.data.length, 1);
      assert.equal(overdueBody.data[0].isOverdue, true);
    });
  });
});
