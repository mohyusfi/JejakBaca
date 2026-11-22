import { getDb } from '../app/database.js';

export const healthService = {
  /**
   * Memeriksa kondisi kesehatan server dan status koneksi database SQLite
   * @returns {{ status: string, database: string, timestamp: string }}
   */
  checkHealth() {
    const db = getDb();
    const stmt = db.prepare('SELECT 1 AS alive;');
    const result = stmt.get();

    if (!result || result.alive !== 1) {
      throw new Error('Pemeriksaan koneksi SQLite gagal');
    }

    return {
      status: 'ok',
      database: 'connected',
      timestamp: new Date().toISOString(),
    };
  },
};

export default healthService;
