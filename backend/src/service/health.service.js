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

  /**
   * Memeriksa kondisi kesehatan server v2 dengan metadata versi API dan uptime
   * @returns {{ status: string, apiVersion: string, supportedVersions: string[], uptimeSeconds: number, services: { database: { status: string, engine: string } }, timestamp: string }}
   */
  checkHealthV2() {
    const baseHealth = this.checkHealth();

    return {
      status: baseHealth.status,
      apiVersion: 'v2',
      supportedVersions: ['v1', 'v2'],
      uptimeSeconds: Math.floor(process.uptime()),
      services: {
        database: {
          status: baseHealth.database,
          engine: 'sqlite',
        },
      },
      timestamp: baseHealth.timestamp,
    };
  },
};

export default healthService;
