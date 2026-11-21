import http from 'node:http';
import { config } from './src/config/index.js';
import { logger } from './src/app/logger.js';
import { createApp } from './src/app/index.js';
import { closeDb } from './src/app/database.js';

const { requestHandler, router } = createApp();
const server = http.createServer(requestHandler);

/**
 * Menjalankan server HTTP
 * @param {number} [port]
 * @param {string} [host]
 * @returns {Promise<http.Server>}
 */
export function startServer(port = config.port, host = config.host) {
  return new Promise((resolve, reject) => {
    server.on('error', (err) => {
      logger.error('Gagal menjalankan server HTTP:', err);
      reject(err);
    });

    server.listen(port, host, () => {
      const address = server.address();
      const actualPort = typeof address === 'object' && address ? address.port : port;
      logger.info(`Server berjalan di http://${host}:${actualPort}`);
      logger.info(`Dokumentasi OpenAPI interaktif di http://${host}:${actualPort}/api/docs`);
      logger.info(`Cek kesehatan server di http://${host}:${actualPort}/api/v1/health`);
      resolve(server);
    });
  });
}

// Tangani graceful shutdown
function gracefulShutdown(signal) {
  logger.info(`Menerima sinyal ${signal}, mematikan server secara anggun...`);
  server.close(() => {
    closeDb();
    logger.info('Server HTTP dan koneksi database ditutup.');
    process.exit(0);
  });

  // Force close jika melebihi batas waktu 5 detik
  setTimeout(() => {
    logger.error('Shutdown melebihi batas waktu, mematikan paksa.');
    process.exit(1);
  }, 5000).unref();
}

if (process.env.NODE_ENV !== 'test') {
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  startServer().catch(() => process.exit(1));
}

export { server, requestHandler, router };
export default server;
