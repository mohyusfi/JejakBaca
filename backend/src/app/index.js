import { initDb } from './database.js';
import { Router } from './router.js';
import { corsMiddleware } from '../middleware/cors.js';
import { requestLogger } from '../middleware/logger.js';
import { parseJsonBody } from '../middleware/bodyParser.js';
import { errorHandler, NotFoundError } from '../middleware/errorHandler.js';
import { healthController } from '../controller/health.controller.js';
import { docsController } from '../controller/docs.controller.js';

/**
 * Membuat dan mengonfigurasi aplikasi HTTP
 * @param {{ dbPath?: string }} [options]
 * @returns {{ requestHandler: Function, router: Router }}
 */
export function createApp(options = {}) {
  // Inisialisasi koneksi SQLite
  initDb(options.dbPath);

  const router = new Router();

  // Daftarkan rute sistem & dokumentasi inti
  router.get('/api/v1/health', healthController.getHealth);
  router.get('/api/openapi.yaml', docsController.serveOpenApiYaml);
  router.get('/api/docs', docsController.serveDocs);

  /**
   * Request handler utama untuk node:http.createServer
   * @param {import('node:http').IncomingMessage} req
   * @param {import('node:http').ServerResponse} res
   */
  async function requestHandler(req, res) {
    // Tambahkan helper ke objek response
    res.json = (statusCode, data) => {
      if (!res.headersSent) {
        res.statusCode = statusCode;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify(data));
      }
    };

    res.send = (statusCode, contentType, body) => {
      if (!res.headersSent) {
        res.statusCode = statusCode;
        res.setHeader('Content-Type', contentType);
        res.end(body);
      }
    };

    try {
      // 1. Eksekusi CORS
      const handledOptions = corsMiddleware(req, res);
      if (handledOptions) {
        return;
      }

      // 2. Logging request
      requestLogger(req, res);

      // 3. Parsing URL dan query parameters
      const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      req.path = parsedUrl.pathname;
      req.query = Object.fromEntries(parsedUrl.searchParams);

      // 4. Parsing JSON Body
      await parseJsonBody(req);

      // 5. Pencocokan rute
      const matchResult = router.match(req.method, req.path);
      if (!matchResult) {
        throw new NotFoundError(`Route tidak ditemukan: ${req.method} ${req.path}`);
      }

      const { route, params } = matchResult;
      req.params = params;

      // 6. Eksekusi handler rute
      for (const handler of route.handlers) {
        await handler(req, res);
        if (res.writableEnded) {
          break;
        }
      }
    } catch (err) {
      errorHandler(err, req, res);
    }
  }

  return {
    requestHandler,
    router,
  };
}

export default createApp;
