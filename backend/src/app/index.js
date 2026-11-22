import { initDb } from './database.js';
import { Router } from './router.js';
import { corsMiddleware } from '../middleware/cors.js';
import { requestLogger } from '../middleware/logger.js';
import { parseJsonBody } from '../middleware/bodyParser.js';
import { errorHandler, NotFoundError } from '../middleware/errorHandler.js';
import { authMiddleware, optionalAuthMiddleware, roleGuard } from '../middleware/auth.js';
import { healthController } from '../controller/health.controller.js';
import { docsController } from '../controller/docs.controller.js';
import { authController } from '../controller/auth.controller.js';
import { bookController } from '../controller/book.controller.js';
import { loanController } from '../controller/loan.controller.js';

/**
 * Membuat dan mengonfigurasi aplikasi HTTP
 * @param {{ dbPath?: string }} [options]
 * @returns {{ requestHandler: Function, router: Router }}
 */
export function createApp(options = {}) {
  // Inisialisasi koneksi SQLite, migrasi skema tabel, dan seed akun admin
  initDb(options.dbPath);

  const router = new Router();

  // 1. Rute sistem & dokumentasi inti
  router.get('/api/v1/health', healthController.getHealth);
  router.get('/api/openapi.yaml', docsController.serveOpenApiYaml);
  router.get('/api/docs', docsController.serveDocs);

  // 2. Rute Autentikasi User & Admin
  router.post('/api/v1/auth/register', authController.register);
  router.post('/api/v1/auth/login', authController.login);
  router.get('/api/v1/auth/me', authMiddleware, authController.me);

  // 3. Rute Katalog & CRUD Buku Perpustakaan
  router.get('/api/v1/books', optionalAuthMiddleware, bookController.getBooks);
  router.get('/api/v1/books/:id', optionalAuthMiddleware, bookController.getBookById);
  router.post('/api/v1/books', authMiddleware, roleGuard('admin'), bookController.createBook);
  router.put('/api/v1/books/:id', authMiddleware, roleGuard('admin'), bookController.updateBook);
  router.delete('/api/v1/books/:id', authMiddleware, roleGuard('admin'), bookController.deleteBook);

  // 4. Rute Transaksi Peminjaman & Pengembalian (User & Admin)
  router.get('/api/v1/loans/my', authMiddleware, roleGuard('user'), loanController.getMyLoans);
  router.post('/api/v1/loans', authMiddleware, roleGuard('user'), loanController.borrowBook);
  router.patch('/api/v1/loans/:id/return', authMiddleware, roleGuard('user'), loanController.returnLoan);
  router.get('/api/v1/admin/loans', authMiddleware, roleGuard('admin'), loanController.getAdminLoans);

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

      // 6. Eksekusi handler rute (termasuk route-level middleware)
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
