import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { config } from '../config/index.js';
import { logger } from './logger.js';

let dbInstance = null;

/**
 * Inisialisasi koneksi SQLite menggunakan modul bawaan node:sqlite (DatabaseSync)
 * @param {string} [customPath]
 * @returns {DatabaseSync}
 */
export function initDatabase(customPath) {
  const targetPath = customPath || config.dbPath;

  if (dbInstance) {
    return dbInstance;
  }

  if (targetPath !== ':memory:') {
    const resolvedPath = path.resolve(targetPath);
    const dir = path.dirname(resolvedPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    dbInstance = new DatabaseSync(resolvedPath);
    try {
      dbInstance.exec('PRAGMA journal_mode = WAL;');
    } catch (err) {
      logger.warn('Gagal mengaktifkan mode WAL:', err.message);
    }
  } else {
    dbInstance = new DatabaseSync(':memory:');
  }

  dbInstance.exec('PRAGMA foreign_keys = ON;');
  logger.info(`Koneksi SQLite berhasil diinisialisasi pada: ${targetPath}`);
  return dbInstance;
}

/**
 * Mengambil instance koneksi SQLite yang sedang aktif atau membuat baru jika belum ada
 * @param {string} [customPath]
 * @returns {DatabaseSync}
 */
export function getDatabase(customPath) {
  if (!dbInstance) {
    return initDatabase(customPath);
  }
  return dbInstance;
}

/**
 * Menutup koneksi database SQLite
 */
export function closeDatabase() {
  if (dbInstance) {
    try {
      dbInstance.close();
      logger.info('Koneksi SQLite berhasil ditutup');
    } catch (err) {
      logger.error('Error saat menutup koneksi SQLite:', err.message);
    }
    dbInstance = null;
  }
}

export const initDb = initDatabase;
export const getDb = getDatabase;
export const closeDb = closeDatabase;

export default {
  initDatabase,
  getDatabase,
  closeDatabase,
  initDb,
  getDb,
  closeDb,
};
