import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createApp } from '../src/app/index.js';
import { closeDb } from '../src/app/database.js';

describe('Endpoint Dokumentasi OpenAPI & Swagger/Scalar', () => {
  let server;
  let baseUrl;

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
  });

  after(async () => {
    await new Promise((resolve) => server.close(resolve));
    closeDb();
  });

  test('GET /api/openapi.yaml menyajikan spesifikasi YAML dengan content-type yang sesuai', async () => {
    const res = await fetch(`${baseUrl}/api/openapi.yaml`);
    assert.equal(res.status, 200);

    const contentType = res.headers.get('content-type');
    assert.match(contentType, /application\/yaml/);

    const text = await res.text();
    assert.match(text, /openapi: 3\.0\.3/);
    assert.match(text, /title: API Perpustakaan UNTAD/);
    assert.match(text, /\/api\/v1\/health:/);
    assert.match(text, /\/api\/v2\/health:/);
    assert.match(text, /\/api\/v1\/public-journals:/);
    assert.match(text, /Sunset:/);
  });

  test('GET /api/docs menyajikan halaman HTML dokumentasi interaktif', async () => {
    const res = await fetch(`${baseUrl}/api/docs`);
    assert.equal(res.status, 200);

    const contentType = res.headers.get('content-type');
    assert.match(contentType, /text\/html/);

    const html = await res.text();
    assert.match(html, /<!doctype html>/i);
    assert.match(html, /Dokumentasi API Perpustakaan UNTAD/);
    assert.match(html, /data-url="\/api\/openapi\.yaml"/);
    assert.match(html, /scalar/i);
  });
});
