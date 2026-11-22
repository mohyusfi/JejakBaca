import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createApp } from '../src/app/index.js';
import { closeDb, getDb } from '../src/app/database.js';
import { config } from '../src/config/index.js';
import { bookService } from '../src/service/book.service.js';

describe('Katalog & CRUD Buku Perpustakaan (Issue #6)', () => {
  let server;
  let baseUrl;
  let adminToken;
  let userToken;

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

    // Login sebagai Admin
    const adminRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: config.adminEmail,
        password: config.adminPassword,
      }),
    });
    const adminBody = await adminRes.json();
    adminToken = adminBody.data.token;

    // Registrasi User biasa
    const userRes = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Budi Buku',
        nim: 'F55122100',
        email: 'budibuku@untad.ac.id',
        password: 'password123',
      }),
    });
    const userBody = await userRes.json();
    userToken = userBody.data.token;

    // Seed buku contoh awal ke in-memory database
    const db = getDb();
    bookService.seedBooks(db);
  });

  after(async () => {
    await new Promise((resolve) => server.close(resolve));
    closeDb();
  });

  describe('Seeding Buku Idempoten', () => {
    test('seedBooks dapat dijalankan ulang tanpa membuat duplikasi data', () => {
      const db = getDb();
      const countBefore = db.prepare('SELECT COUNT(*) as total FROM books WHERE deleted_at IS NULL;').get().total;
      const added = bookService.seedBooks(db);
      assert.equal(added, 0, 'Tidak boleh ada buku tambahan saat dijalankan ulang');
      const countAfter = db.prepare('SELECT COUNT(*) as total FROM books WHERE deleted_at IS NULL;').get().total;
      assert.equal(countBefore, countAfter);
    });
  });

  describe('GET /api/v1/books (Katalog Publik & Tamu)', () => {
    test('Tamu tanpa token dapat membaca katalog buku dan meta paginasi (status 200)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/books`);
      assert.equal(res.status, 200);

      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.message, 'Daftar buku berhasil diambil');
      assert.ok(Array.isArray(body.data));
      assert.ok(body.data.length > 0);
      assert.ok(body.meta);
      assert.equal(body.meta.page, 1);
      assert.equal(body.meta.limit, 10);
      assert.ok(body.meta.total >= 5);
      assert.equal(body.meta.totalPages, 1);

      const book = body.data[0];
      assert.ok(book.id);
      assert.ok(book.title);
      assert.ok(book.author);
      assert.ok(book.description);
      assert.ok(typeof book.stockTotal === 'number');
      assert.ok(typeof book.stockAvailable === 'number');
      assert.equal(book.isBorrowedByMe, false);
    });

    test('Mendukung pencarian kata kunci q (judul, penulis, atau ISBN)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/books?q=Algoritma`);
      assert.equal(res.status, 200);

      const body = await res.json();
      assert.equal(body.success, true);
      assert.ok(body.data.length >= 1);
      assert.match(body.data[0].title, /Algoritma/i);
    });

    test('Mendukung filter kategori', async () => {
      const res = await fetch(`${baseUrl}/api/v1/books?category=Informatika`);
      assert.equal(res.status, 200);

      const body = await res.json();
      assert.equal(body.success, true);
      for (const book of body.data) {
        assert.equal(book.category, 'Informatika');
      }
    });

    test('Mendukung filter availableOnly=true', async () => {
      const res = await fetch(`${baseUrl}/api/v1/books?availableOnly=true`);
      assert.equal(res.status, 200);

      const body = await res.json();
      assert.equal(body.success, true);
      for (const book of body.data) {
        assert.ok(book.stockAvailable > 0);
      }
    });

    test('Mendukung paginasi page & limit', async () => {
      const res = await fetch(`${baseUrl}/api/v1/books?page=1&limit=2`);
      assert.equal(res.status, 200);

      const body = await res.json();
      assert.equal(body.data.length, 2);
      assert.equal(body.meta.limit, 2);
      assert.ok(body.meta.totalPages >= 3);
    });
  });

  describe('GET /api/v1/books/:id', () => {
    test('Mengembalikan detail buku yang valid (status 200)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/books/1`);
      assert.equal(res.status, 200);

      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.data.id, 1);
      assert.ok(body.data.title);
      assert.ok(body.data.author);
      assert.ok(body.data.description);
    });

    test('Mengembalikan 404 NOT_FOUND jika buku tidak ditemukan', async () => {
      const res = await fetch(`${baseUrl}/api/v1/books/99999`);
      assert.equal(res.status, 404);

      const body = await res.json();
      assert.equal(body.success, false);
      assert.equal(body.error.code, 'NOT_FOUND');
    });
  });

  describe('POST /api/v1/books (Admin)', () => {
    test('Admin berhasil menambahkan buku perpustakaan baru (status 201)', async () => {
      const payload = {
        title: 'Pemrograman Web Modern',
        author: 'Eko Kurniawan Khannedy',
        isbn: '978-623-0000-01-1',
        category: 'Pemrograman',
        publishedYear: 2024,
        stockTotal: 10,
        description: 'Panduan lengkap membangun REST API dan aplikasi web berskala besar.',
        coverUrl: 'https://example.com/cover-web.jpg',
      };

      const res = await fetch(`${baseUrl}/api/v1/books`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify(payload),
      });

      assert.equal(res.status, 201);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.message, 'Buku berhasil ditambahkan');
      assert.equal(body.data.title, payload.title);
      assert.equal(body.data.stockTotal, 10);
      assert.equal(body.data.stockAvailable, 10);
      assert.equal(body.data.description, payload.description);
    });

    test('Menolak input tidak lengkap dengan 400 VALIDATION_ERROR', async () => {
      const res = await fetch(`${baseUrl}/api/v1/books`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          title: '',
          author: '',
          description: '',
          stockTotal: 0,
        }),
      });

      assert.equal(res.status, 400);
      const body = await res.json();
      assert.equal(body.success, false);
      assert.equal(body.error.code, 'VALIDATION_ERROR');
      assert.ok(Array.isArray(body.error.details));
      assert.equal(body.error.details.length, 4);
    });

    test('Menolak akses User biasa dengan 403 FORBIDDEN', async () => {
      const res = await fetch(`${baseUrl}/api/v1/books`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({
          title: 'Buku Ilegal',
          author: 'Anonim',
          description: 'Mencoba bypass role',
          stockTotal: 1,
        }),
      });

      assert.equal(res.status, 403);
      const body = await res.json();
      assert.equal(body.success, false);
      assert.equal(body.error.code, 'FORBIDDEN');
    });

    test('Menolak akses Tamu tanpa token dengan 401 UNAUTHORIZED', async () => {
      const res = await fetch(`${baseUrl}/api/v1/books`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Buku Tamu',
          author: 'Anonim',
          description: 'Tanpa token',
          stockTotal: 1,
        }),
      });

      assert.equal(res.status, 401);
      const body = await res.json();
      assert.equal(body.error.code, 'UNAUTHORIZED');
    });
  });

  describe('PUT /api/v1/books/:id (Admin)', () => {
    test('Admin berhasil memperbarui metadata dan stok buku (status 200)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/books/1`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          title: 'Struktur Data dan Algoritma Edisi Revisi',
          stockTotal: 8,
        }),
      });

      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.data.id, 1);
      assert.equal(body.data.title, 'Struktur Data dan Algoritma Edisi Revisi');
      assert.equal(body.data.stockTotal, 8);
      assert.equal(body.data.stockAvailable, 8);
    });

    test('Mengembalikan 404 NOT_FOUND jika buku tidak ditemukan', async () => {
      const res = await fetch(`${baseUrl}/api/v1/books/99999`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ title: 'Gagal' }),
      });

      assert.equal(res.status, 404);
      const body = await res.json();
      assert.equal(body.error.code, 'NOT_FOUND');
    });

    test('Menolak jika User biasa mencoba memperbarui buku (403 FORBIDDEN)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/books/1`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({ title: 'Coba Edit' }),
      });

      assert.equal(res.status, 403);
    });
  });

  describe('DELETE /api/v1/books/:id (Admin, Soft-Delete)', () => {
    let createdBookId;

    before(async () => {
      const res = await fetch(`${baseUrl}/api/v1/books`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          title: 'Buku Yang Akan Dihapus',
          author: 'Penulis Fana',
          description: 'Buku ini segera di-soft-delete',
          stockTotal: 1,
        }),
      });
      const body = await res.json();
      createdBookId = body.data.id;
    });

    test('User biasa tidak boleh menghapus buku (403 FORBIDDEN)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/books/${createdBookId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${userToken}` },
      });
      assert.equal(res.status, 403);
    });

    test('Admin berhasil melakukan soft-delete buku (status 200)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/books/${createdBookId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.message, 'Buku berhasil dihapus');
      assert.equal(body.data.id, createdBookId);
    });

    test('Buku yang telah di-soft-delete tidak muncul di katalog GET /api/v1/books', async () => {
      const res = await fetch(`${baseUrl}/api/v1/books?q=Buku+Yang+Akan+Dihapus`);
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.data.length, 0);
    });

    test('Mengakses detail buku yang di-soft-delete mengembalikan 404 NOT_FOUND', async () => {
      const res = await fetch(`${baseUrl}/api/v1/books/${createdBookId}`);
      assert.equal(res.status, 404);
      const body = await res.json();
      assert.equal(body.error.code, 'NOT_FOUND');
    });

    test('Menghapus ulang buku yang sudah di-soft-delete mengembalikan 404 NOT_FOUND', async () => {
      const res = await fetch(`${baseUrl}/api/v1/books/${createdBookId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.equal(res.status, 404);
    });
  });
});
