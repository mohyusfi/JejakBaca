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
import { publicBookController } from '../controller/publicBook.controller.js';
import { readlistController } from '../controller/readlist.controller.js';
import { graphqlController } from '../controller/graphql.controller.js';

/**
 * Membuat dan mengonfigurasi aplikasi HTTP
 * @param {{ dbPath?: string }} [options]
 * @returns {{ requestHandler: Function, router: Router }}
 */
export function createApp(options = {}) {
  // Inisialisasi koneksi SQLite, migrasi skema tabel, dan seed akun admin
  initDb(options.dbPath);

  const router = new Router();

  // Daftarkan rute sistem & dokumentasi inti
  router.get('/api/v1/health', healthController.getHealth);
  router.get('/api/v2/health', healthController.getHealthV2);
  router.get('/api/openapi.yaml', docsController.serveOpenApiYaml);
  router.get('/api/docs', docsController.serveDocs);

  // Daftarkan rute Autentikasi User & Admin
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

  // 5. Rute Proxy Buku Publik (Open Library API)
  router.get('/api/v1/public-books', optionalAuthMiddleware, publicBookController.searchPublicBooks);
  router.get('/api/v1/public-books/:workId', optionalAuthMiddleware, publicBookController.getPublicBookById);
  // 6. Rute Readlist Pribadi User
  router.get('/api/v1/readlist', authMiddleware, roleGuard('user'), readlistController.getReadlist);
  router.post('/api/v1/readlist', authMiddleware, roleGuard('user'), readlistController.addToReadlist);
  router.delete('/api/v1/readlist/:workId', authMiddleware, roleGuard('user'), readlistController.removeFromReadlist);

  // 7. Endpoint GraphQL Tunggal (Read-Only Query Aggregator)
  router.post('/graphql', optionalAuthMiddleware, graphqlController.handleGraphQL);
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

      // 6. Eksekusi handler rute (termasuk route-level middleware seperti authMiddleware)
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
