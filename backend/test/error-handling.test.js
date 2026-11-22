import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createApp } from '../src/app/index.js';
import { closeDb } from '../src/app/database.js';

describe('Penanganan Error Terpusat & Rute Tidak Dikenal', () => {
  let server;
  let baseUrl;

  before(async () => {
    process.env.NODE_ENV = 'test';
    const { requestHandler, router } = createApp({ dbPath: ':memory:' });

    // Rute uji untuk memverifikasi payload valid
    router.post('/api/v1/test-valid-json', (req, res) => {
      res.json(200, { success: true, data: req.body });
    });

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

  test('mengembalikan 404 NOT_FOUND ketika mengakses rute yang tidak dikenal', async () => {
    const res = await fetch(`${baseUrl}/api/v1/rute-palsu-tidak-ada`);
    assert.equal(res.status, 404);

    const body = await res.json();
    assert.equal(body.success, false);
    assert.ok(body.message);
    assert.match(body.message, /tidak ditemukan/i);
    assert.equal(body.error.code, 'NOT_FOUND');
  });

  test('mengembalikan 400 VALIDATION_ERROR ketika payload JSON tidak valid', async () => {
    const res = await fetch(`${baseUrl}/api/v1/health`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: '{ "invalidJson": broken...',
    });

    assert.equal(res.status, 400);

    const body = await res.json();
    assert.equal(body.success, false);
    assert.equal(body.message, 'Format payload JSON tidak valid');
    assert.equal(body.error.code, 'VALIDATION_ERROR');
  });

  test('mengembalikan 400 VALIDATION_ERROR untuk payload JSON rusak pada rute POST mana pun', async () => {
    const res = await fetch(`${baseUrl}/api/v1/unknown-endpoint`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: '{{malformed json',
    });

    assert.equal(res.status, 400);

    const body = await res.json();
    assert.equal(body.success, false);
    assert.equal(body.error.code, 'VALIDATION_ERROR');
  });

  test('berhasil mem-parsing payload JSON yang valid', async () => {
    const payload = { title: 'Buku Uji', stok: 10 };
    const res = await fetch(`${baseUrl}/api/v1/test-valid-json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    assert.equal(res.status, 200);

    const body = await res.json();
    assert.equal(body.success, true);
    assert.deepEqual(body.data, payload);
  });
});
