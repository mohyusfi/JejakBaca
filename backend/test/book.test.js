import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createApp } from '../src/app/index.js';
import { closeDb, getDb } from '../src/app/database.js';
import { config } from '../src/config/index.js';
import { bookService, sampleBooks } from '../src/service/book.service.js';

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

    test('sampleBooks memuat buku contoh lengkap dengan metadata valid', () => {
      assert.ok(Array.isArray(sampleBooks));
      assert.ok(sampleBooks.length >= 5);
      for (const b of sampleBooks) {
        assert.ok(b.title);
        assert.ok(b.author);
        assert.ok(b.description);
        assert.ok(b.stockTotal >= 1);
      }
    });
  });

  describe('GET /api/v1/books (Katalog Publik, Tamu, User, Admin)', () => {
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

    test('User terdaftar dapat membaca katalog buku dengan membawa token (status 200)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/books`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.ok(Array.isArray(body.data));
    });

    test('Admin dapat membaca katalog buku dengan membawa token (status 200)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/books`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.ok(Array.isArray(body.data));
    });

    test('Mendukung pencarian kata kunci q berdasarkan judul', async () => {
      const res = await fetch(`${baseUrl}/api/v1/books?q=Algoritma`);
      assert.equal(res.status, 200);

      const body = await res.json();
      assert.equal(body.success, true);
      assert.ok(body.data.length >= 1);
      assert.match(body.data[0].title, /Algoritma/i);
    });

    test('Mendukung pencarian kata kunci q berdasarkan nama penulis', async () => {
      const res = await fetch(`${baseUrl}/api/v1/books?q=Munir`);
      assert.equal(res.status, 200);

      const body = await res.json();
      assert.equal(body.success, true);
      assert.ok(body.data.length >= 1);
      assert.match(body.data[0].author, /Munir/i);
    });

    test('Mendukung pencarian kata kunci q berdasarkan ISBN', async () => {
      const res = await fetch(`${baseUrl}/api/v1/books?q=978-602-1234-56-7`);
      assert.equal(res.status, 200);

      const body = await res.json();
      assert.equal(body.success, true);
      assert.ok(body.data.length >= 1);
      assert.equal(body.data[0].isbn, '978-602-1234-56-7');
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

    test('Mendukung filter availableOnly=true dan memfilter buku stok habis', async () => {
      // Buat buku dengan stok 0 via database
      const db = getDb();
      db.prepare(`
        INSERT INTO books (title, author, description, stock_total, stock_available)
        VALUES ('Buku Habis Stok', 'Penulis Habis', 'Stok nol', 1, 0);
      `).run();

      const resFiltered = await fetch(`${baseUrl}/api/v1/books?availableOnly=true`);
      assert.equal(resFiltered.status, 200);
      const bodyFiltered = await resFiltered.json();
      for (const book of bodyFiltered.data) {
        assert.ok(book.stockAvailable > 0);
      }
      assert.ok(!bodyFiltered.data.some((b) => b.title === 'Buku Habis Stok'));

      // Tanpa availableOnly, buku habis stok tetap muncul di katalog
      const resAll = await fetch(`${baseUrl}/api/v1/books?q=Habis+Stok`);
      assert.equal(resAll.status, 200);
      const bodyAll = await resAll.json();
      assert.ok(bodyAll.data.some((b) => b.title === 'Buku Habis Stok'));
    });

    test('Mendukung paginasi page & limit', async () => {
      const res = await fetch(`${baseUrl}/api/v1/books?page=1&limit=2`);
      assert.equal(res.status, 200);

      const body = await res.json();
      assert.equal(body.data.length, 2);
      assert.equal(body.meta.limit, 2);
      assert.ok(body.meta.totalPages >= 3);
    });

    test('Membatasi nilai limit > 50 ke nilai maksimum 50', async () => {
      const res = await fetch(`${baseUrl}/api/v1/books?limit=100`);
      assert.equal(res.status, 200);

      const body = await res.json();
      assert.equal(body.meta.limit, 50);
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
      assert.equal(body.data.isBorrowedByMe, false);
    });

    test('Mengembalikan 404 NOT_FOUND jika buku tidak ditemukan', async () => {
      const res = await fetch(`${baseUrl}/api/v1/books/99999`);
      assert.equal(res.status, 404);

      const body = await res.json();
      assert.equal(body.success, false);
      assert.equal(body.error.code, 'NOT_FOUND');
    });

    test('Mengembalikan 404 NOT_FOUND jika format ID tidak valid (bukan angka)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/books/invalid-id`);
      assert.equal(res.status, 404);

      const body = await res.json();
      assert.equal(body.success, false);
      assert.equal(body.error.code, 'NOT_FOUND');
    });

    test('Menampilkan isBorrowedByMe = true saat diakses oleh User yang meminjam buku tersebut', async () => {
      // Pinjam buku 2 menggunakan userToken
      const loanRes = await fetch(`${baseUrl}/api/v1/loans`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({ bookId: 2 }),
      });
      assert.equal(loanRes.status, 201);
      const loanBody = await loanRes.json();
      const loanId = loanBody.data.id;

      // Cek detail buku 2 oleh User -> isBorrowedByMe harus true
      const checkRes = await fetch(`${baseUrl}/api/v1/books/2`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      assert.equal(checkRes.status, 200);
      const checkBody = await checkRes.json();
      assert.equal(checkBody.data.isBorrowedByMe, true);

      // Cek detail buku 2 oleh Tamu -> isBorrowedByMe harus false
      const guestRes = await fetch(`${baseUrl}/api/v1/books/2`);
      assert.equal(guestRes.status, 200);
      const guestBody = await guestRes.json();
      assert.equal(guestBody.data.isBorrowedByMe, false);

      // Kembalikan pinjaman
      await fetch(`${baseUrl}/api/v1/loans/${loanId}/return`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${userToken}` },
      });
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

    test('Menolak jika stockTotal bernilai negatif atau kurang dari 1 (400 VALIDATION_ERROR)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/books`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          title: 'Buku Stok Minus',
          author: 'Penulis Minus',
          description: 'Deskripsi valid',
          stockTotal: -5,
        }),
      });

      assert.equal(res.status, 400);
      const body = await res.json();
      assert.equal(body.error.code, 'VALIDATION_ERROR');
      assert.ok(body.error.details.some((d) => d.field === 'stockTotal'));
    });

    test('Menolak jika publishedYear tidak valid (400 VALIDATION_ERROR)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/books`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          title: 'Buku Tahun Aneh',
          author: 'Penulis Aneh',
          description: 'Deskripsi valid',
          stockTotal: 2,
          publishedYear: 'bukan_tahun',
        }),
      });

      assert.equal(res.status, 400);
      const body = await res.json();
      assert.equal(body.error.code, 'VALIDATION_ERROR');
      assert.ok(body.error.details.some((d) => d.field === 'publishedYear'));
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

    test('Menolak jika Tamu tanpa token mencoba memperbarui buku (401 UNAUTHORIZED)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/books/1`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Edit Tamu' }),
      });

      assert.equal(res.status, 401);
      const body = await res.json();
      assert.equal(body.error.code, 'UNAUTHORIZED');
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
      const body = await res.json();
      assert.equal(body.error.code, 'FORBIDDEN');
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

    test('Mengembalikan 404 NOT_FOUND jika ID buku bukan angka', async () => {
      const res = await fetch(`${baseUrl}/api/v1/books/abc`, {
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

    test('Menolak update dengan field string kosong atau stockTotal negatif (400 VALIDATION_ERROR)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/books/1`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          title: '',
          author: '   ',
          description: '',
          stockTotal: -2,
        }),
      });

      assert.equal(res.status, 400);
      const body = await res.json();
      assert.equal(body.error.code, 'VALIDATION_ERROR');
      assert.ok(Array.isArray(body.error.details));
      assert.equal(body.error.details.length, 4);
    });

    test('Menolak pembaruan stok jika stockTotal kurang dari jumlah buku yang sedang dipinjam (409 CONFLICT)', async () => {
      // Pinjam buku 3 menggunakan userToken
      const loanRes = await fetch(`${baseUrl}/api/v1/loans`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({ bookId: 3 }),
      });
      assert.equal(loanRes.status, 201);
      const loanBody = await loanRes.json();
      const loanId = loanBody.data.id;

      // Admin mencoba mengubah stockTotal buku 3 menjadi 0 (kurang dari 1 yang sedang dipinjam)
      const updateRes = await fetch(`${baseUrl}/api/v1/books/3`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ stockTotal: 0 }),
      });

      assert.equal(updateRes.status, 409);
      const updateBody = await updateRes.json();
      assert.equal(updateBody.error.code, 'STOCK_BELOW_BORROWED');

      // Kembalikan pinjaman
      await fetch(`${baseUrl}/api/v1/loans/${loanId}/return`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${userToken}` },
      });
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
          stockTotal: 2,
        }),
      });
      const body = await res.json();
      createdBookId = body.data.id;
    });

    test('Tamu tanpa token tidak boleh menghapus buku (401 UNAUTHORIZED)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/books/${createdBookId}`, {
        method: 'DELETE',
      });
      assert.equal(res.status, 401);
      const body = await res.json();
      assert.equal(body.error.code, 'UNAUTHORIZED');
    });

    test('User biasa tidak boleh menghapus buku (403 FORBIDDEN)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/books/${createdBookId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${userToken}` },
      });
      assert.equal(res.status, 403);
      const body = await res.json();
      assert.equal(body.error.code, 'FORBIDDEN');
    });

    test('Menolak soft-delete jika buku masih memiliki peminjaman aktif (409 CONFLICT)', async () => {
      // Pinjam createdBookId oleh userToken
      const loanRes = await fetch(`${baseUrl}/api/v1/loans`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({ bookId: createdBookId }),
      });
      assert.equal(loanRes.status, 201);
      const loanBody = await loanRes.json();
      const loanId = loanBody.data.id;

      // Admin mencoba menghapus buku yang sedang dipinjam
      const delRes = await fetch(`${baseUrl}/api/v1/books/${createdBookId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.equal(delRes.status, 409);
      const delBody = await delRes.json();
      assert.equal(delBody.error.code, 'BOOK_IN_ACTIVE_LOAN');

      // Kembalikan pinjaman
      await fetch(`${baseUrl}/api/v1/loans/${loanId}/return`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${userToken}` },
      });
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
      const body = await res.json();
      assert.equal(body.error.code, 'NOT_FOUND');
    });

    test('Mencoba update buku yang sudah di-soft-delete mengembalikan 404 NOT_FOUND', async () => {
      const res = await fetch(`${baseUrl}/api/v1/books/${createdBookId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ title: 'Update Buku Terhapus' }),
      });
      assert.equal(res.status, 404);
      const body = await res.json();
      assert.equal(body.error.code, 'NOT_FOUND');
    });

    test('Menghapus buku dengan ID tidak valid (bukan angka) mengembalikan 404 NOT_FOUND', async () => {
      const res = await fetch(`${baseUrl}/api/v1/books/bukan-angka`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.equal(res.status, 404);
      const body = await res.json();
      assert.equal(body.error.code, 'NOT_FOUND');
    });
  });
});
