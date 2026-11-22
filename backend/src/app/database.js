import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { config } from '../config/index.js';
import { logger } from './logger.js';
import { hashPasswordSync } from '../lib/crypto.js';

let dbInstance = null;

/**
 * Membuat tabel-tabel utama jika belum ada
 * @param {DatabaseSync} db
 */
export function migrateDatabase(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      nim TEXT UNIQUE,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('user', 'admin')),
      created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
      updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
    );

    CREATE TABLE IF NOT EXISTS books (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      isbn TEXT,
      category TEXT,
      published_year INTEGER,
      stock_total INTEGER NOT NULL DEFAULT 1,
      stock_available INTEGER NOT NULL DEFAULT 1,
      description TEXT NOT NULL,
      cover_url TEXT,
      deleted_at TEXT,
      created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
      updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
    );

    CREATE TABLE IF NOT EXISTS loans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      book_id INTEGER NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('borrowed', 'returned')) DEFAULT 'borrowed',
      borrowed_at TEXT NOT NULL,
      due_date TEXT NOT NULL,
      returned_at TEXT,
      created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
      updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (book_id) REFERENCES books(id)
    );

    CREATE INDEX IF NOT EXISTS idx_loans_user_status ON loans(user_id, status);
    CREATE INDEX IF NOT EXISTS idx_loans_book_status ON loans(book_id, status);

    CREATE TABLE IF NOT EXISTS readlist_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      work_id TEXT NOT NULL,
      title TEXT NOT NULL DEFAULT '',
      authors TEXT NOT NULL DEFAULT '[]',
      first_publish_year INTEGER,
      cover_url TEXT,
      description TEXT,
      created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(user_id, work_id)
    );

    CREATE INDEX IF NOT EXISTS idx_readlist_items_user_id ON readlist_items(user_id);
    CREATE INDEX IF NOT EXISTS idx_readlist_items_user_work ON readlist_items(user_id, work_id);
  `);
}

/**
 * Menyemai akun Admin secara idempoten saat inisialisasi database
 * @param {DatabaseSync} db
 */
export function seedAdmin(db) {
  const stmtCheck = db.prepare('SELECT id FROM users WHERE email = ? LIMIT 1;');
  const existing = stmtCheck.get(config.adminEmail);

  if (!existing) {
    const passwordHash = hashPasswordSync(config.adminPassword);
    const stmtInsert = db.prepare(`
      INSERT INTO users (name, nim, email, password_hash, role)
      VALUES (?, NULL, ?, ?, 'admin');
    `);
    stmtInsert.run(config.adminName, config.adminEmail, passwordHash);
    logger.info(`Akun admin berhasil disemai secara otomatis (${config.adminEmail})`);
  }
}

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
  
  // Jalankan migrasi dan seed admin
  migrateDatabase(dbInstance);
  seedAdmin(dbInstance);

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
  migrateDatabase,
  seedAdmin,
};
