import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createApp } from '../src/app/index.js';
import { closeDb } from '../src/app/database.js';
import { config } from '../src/config/index.js';

describe('Endpoint Health Check: GET /api/v1/health & GET /api/v2/health', () => {
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

  test('GET /api/v1/health mengembalikan status 200, payload v1, dan header Deprecation', async () => {
    const res = await fetch(`${baseUrl}/api/v1/health`);
    assert.equal(res.status, 200);

    const contentType = res.headers.get('content-type');
    assert.match(contentType, /application\/json/);

    assert.equal(res.headers.get('x-api-version'), 'v1');
    assert.equal(res.headers.get('deprecation'), 'true');
    assert.equal(res.headers.get('sunset'), config.healthV1Sunset);
    assert.equal(Number.isNaN(Date.parse(res.headers.get('sunset'))), false);
    assert.equal(res.headers.get('sunset').endsWith('GMT'), true);
    assert.equal(res.headers.get('link'), '</api/v2/health>; rel="successor-version"');

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

  test('GET /api/v2/health mengembalikan status 200 dengan metadata versi API dan uptime', async () => {
    const res = await fetch(`${baseUrl}/api/v2/health`);
    assert.equal(res.status, 200);

    const contentType = res.headers.get('content-type');
    assert.match(contentType, /application\/json/);

    assert.equal(res.headers.get('x-api-version'), 'v2');
    assert.equal(res.headers.get('deprecation'), null);
    assert.equal(res.headers.get('sunset'), null);

    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.message, 'Server sehat');
    assert.ok(body.data);
    assert.equal(body.data.status, 'ok');
    assert.equal(body.data.apiVersion, 'v2');
    assert.deepEqual(body.data.supportedVersions, ['v1', 'v2']);
    assert.equal(typeof body.data.uptimeSeconds, 'number');
    assert.ok(body.data.uptimeSeconds >= 0);
    assert.deepEqual(body.data.services, {
      database: {
        status: 'connected',
        engine: 'sqlite',
      },
    });

    assert.ok(body.data.timestamp);
    const date = new Date(body.data.timestamp);
    assert.equal(isNaN(date.getTime()), false);
  });
});
