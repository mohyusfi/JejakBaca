import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createApp } from '../src/app/index.js';
import { closeDb, getDb, seedAdmin } from '../src/app/database.js';
import { config } from '../src/config/index.js';
import { authMiddleware, roleGuard } from '../src/middleware/auth.js';

describe('Autentikasi User & Admin (Issue #5)', () => {
  let server;
  let baseUrl;

  before(async () => {
    process.env.NODE_ENV = 'test';
    // Gunakan in-memory database
    const { requestHandler, router } = createApp({ dbPath: ':memory:' });

    // Tambahkan rute terproteksi untuk menguji roleGuard
    router.get(
      '/api/v1/test/admin-only',
      authMiddleware,
      roleGuard('admin'),
      (req, res) => {
        res.json(200, { success: true, message: 'Halo Admin', user: req.user });
      }
    );

    server = http.createServer(requestHandler);

    await new Promise((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const address = server.address();
        baseUrl = `http://127.0.0.1:${address.port}`;
        resolve();
      });
    });
  });

  after(async () => {
    await new Promise((resolve) => server.close(resolve));
    closeDb();
  });

  describe('Seeding Admin Otomatis & Idempoten', () => {
    test('akun Admin dibuat otomatis saat inisialisasi dan tidak terduplikasi saat seedAdmin dijalankan ulang', () => {
      const db = getDb();
      const admin = db.prepare('SELECT id, name, email, role FROM users WHERE email = ?;').get(config.adminEmail);
      assert.ok(admin, 'Admin harus ada di database');
      assert.equal(admin.role, 'admin');

      // Jalankan seedAdmin ulang untuk memastikan sifat idempoten
      seedAdmin(db);
      const count = db.prepare('SELECT COUNT(*) as total FROM users WHERE email = ?;').get(config.adminEmail);
      assert.equal(count.total, 1, 'Akun admin tidak boleh terduplikasi');
    });
  });

  describe('POST /api/v1/auth/register', () => {
    test('berhasil mendaftar sebagai User dan langsung auto-login (status 201)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Andi Pratama',
          nim: 'F55122001',
          email: 'andi@untad.ac.id',
          password: 'rahasia123',
        }),
      });

      assert.equal(res.status, 201);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.message, 'Registrasi berhasil');
      assert.ok(body.data.token);
      assert.equal(body.data.expiresIn, 86400);
      assert.equal(body.data.user.name, 'Andi Pratama');
      assert.equal(body.data.user.nim, 'F55122001');
      assert.equal(body.data.user.email, 'andi@untad.ac.id');
      assert.equal(body.data.user.role, 'user');
      assert.ok(body.data.user.createdAt);
    });

    test('menolak input tidak lengkap atau tidak valid dengan 400 VALIDATION_ERROR', async () => {
      const res = await fetch(`${baseUrl}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: '',
          nim: '1',
          email: 'bukan-email',
          password: '123',
        }),
      });

      assert.equal(res.status, 400);
      const body = await res.json();
      assert.equal(body.success, false);
      assert.equal(body.error.code, 'VALIDATION_ERROR');
      assert.ok(Array.isArray(body.error.details));
      assert.equal(body.error.details.length, 4);
    });

    test('menolak duplikasi email dengan 409 CONFLICT', async () => {
      const res = await fetch(`${baseUrl}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Andi Kembaran',
          nim: 'F55122999',
          email: 'andi@untad.ac.id', // email sama dengan test sebelumnya
          password: 'password123',
        }),
      });

      assert.equal(res.status, 409);
      const body = await res.json();
      assert.equal(body.success, false);
      assert.equal(body.error.code, 'CONFLICT');
      assert.match(body.message, /email sudah terdaftar/i);
    });

    test('menolak duplikasi NIM dengan 409 CONFLICT', async () => {
      const res = await fetch(`${baseUrl}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Budi Santoso',
          nim: 'F55122001', // NIM sama dengan test sebelumnya
          email: 'budi@untad.ac.id',
          password: 'password123',
        }),
      });

      assert.equal(res.status, 409);
      const body = await res.json();
      assert.equal(body.success, false);
      assert.equal(body.error.code, 'CONFLICT');
      assert.match(body.message, /nim sudah terdaftar/i);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    test('User berhasil login menggunakan Email', async () => {
      const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: 'andi@untad.ac.id',
          password: 'rahasia123',
        }),
      });

      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.message, 'Login berhasil');
      assert.ok(body.data.token);
      assert.equal(body.data.user.role, 'user');
      assert.equal(body.data.user.email, 'andi@untad.ac.id');
    });

    test('User berhasil login menggunakan NIM', async () => {
      const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: 'F55122001',
          password: 'rahasia123',
        }),
      });

      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.data.user.nim, 'F55122001');
      assert.equal(body.data.user.role, 'user');
    });

    test('Admin berhasil login menggunakan kredensial default', async () => {
      const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: config.adminEmail,
          password: config.adminPassword,
        }),
      });

      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.data.user.role, 'admin');
      assert.equal(body.data.user.email, config.adminEmail);
    });

    test('menolak kredensial yang salah dengan 401 UNAUTHORIZED', async () => {
      const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: 'andi@untad.ac.id',
          password: 'passwordsalah',
        }),
      });

      assert.equal(res.status, 401);
      const body = await res.json();
      assert.equal(body.success, false);
      assert.equal(body.error.code, 'UNAUTHORIZED');
    });

    test('menolak login jika identifier tidak ditemukan dengan 401 UNAUTHORIZED', async () => {
      const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: 'tidakada@untad.ac.id',
          password: 'apapunsandi',
        }),
      });

      assert.equal(res.status, 401);
      const body = await res.json();
      assert.equal(body.success, false);
      assert.equal(body.error.code, 'UNAUTHORIZED');
    });
  });

  describe('GET /api/v1/auth/me', () => {
    let userToken;

    before(async () => {
      const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: 'andi@untad.ac.id',
          password: 'rahasia123',
        }),
      });
      const body = await res.json();
      userToken = body.data.token;
    });

    test('berhasil mengambil profil dengan token Bearer yang sah (status 200)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/auth/me`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });

      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.data.name, 'Andi Pratama');
      assert.equal(body.data.email, 'andi@untad.ac.id');
      assert.equal(body.data.role, 'user');
    });

    test('menolak akses tanpa token Authorization dengan 401 UNAUTHORIZED', async () => {
      const res = await fetch(`${baseUrl}/api/v1/auth/me`);
      assert.equal(res.status, 401);

      const body = await res.json();
      assert.equal(body.success, false);
      assert.equal(body.error.code, 'UNAUTHORIZED');
    });

    test('menolak akses dengan token palsu/rusak dengan 401 UNAUTHORIZED', async () => {
      const res = await fetch(`${baseUrl}/api/v1/auth/me`, {
        headers: { Authorization: 'Bearer token.palsu.rusak' },
      });
      assert.equal(res.status, 401);

      const body = await res.json();
      assert.equal(body.success, false);
      assert.equal(body.error.code, 'UNAUTHORIZED');
    });
  });

  describe('Role Guard Otorisasi Peran', () => {
    let userToken;
    let adminToken;

    before(async () => {
      // Dapatkan token User
      const userRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: 'andi@untad.ac.id',
          password: 'rahasia123',
        }),
      });
      userToken = (await userRes.json()).data.token;

      // Dapatkan token Admin
      const adminRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: config.adminEmail,
          password: config.adminPassword,
        }),
      });
      adminToken = (await adminRes.json()).data.token;
    });

    test('User biasa mengakses rute khusus Admin ditolak dengan 403 FORBIDDEN', async () => {
      const res = await fetch(`${baseUrl}/api/v1/test/admin-only`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });

      assert.equal(res.status, 403);
      const body = await res.json();
      assert.equal(body.success, false);
      assert.equal(body.error.code, 'FORBIDDEN');
    });

    test('Admin dapat mengakses rute khusus Admin (status 200)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/test/admin-only`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.message, 'Halo Admin');
    });
  });
});
