import { initDb, closeDb } from './app/database.js';
import { bookService } from './service/book.service.js';
import { logger } from './app/logger.js';

async function runSeed() {
  logger.info('Memulai seeding data Buku Perpustakaan UNTAD...');
  const db = initDb();

  const count = bookService.seedBooks(db);
  logger.info(`Seeding selesai: ${count} buku baru berhasil ditambahkan.`);

  closeDb();
  process.exit(0);
}

runSeed().catch((err) => {
  logger.error('Gagal menjalankan seeding:', err);
  process.exit(1);
});
