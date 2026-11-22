import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createApp } from '../src/app/index.js';
import { closeDb } from '../src/app/database.js';

describe('Endpoint Health Check: GET /api/v1/health', () => {
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

  test('mengembalikan status 200 dan payload kesehatan server & database', async () => {
    const res = await fetch(`${baseUrl}/api/v1/health`);
    assert.equal(res.status, 200);

    const contentType = res.headers.get('content-type');
    assert.match(contentType, /application\/json/);

    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.message, 'Server sehat');
    assert.ok(body.data);
    assert.equal(body.data.status, 'ok');
    assert.equal(body.data.database, 'connected');

    // Validasi timestamp berupa format ISO-8601 yang valid
    assert.ok(body.data.timestamp);
    const date = new Date(body.data.timestamp);
    assert.equal(isNaN(date.getTime()), false);
  });
});
