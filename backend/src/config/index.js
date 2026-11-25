import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

// Coba muat file .env secara native menggunakan process.loadEnvFile (Node.js >= 20.6)
const currentDir = path.dirname(fileURLToPath(import.meta.url));
const possibleEnvPaths = [
  path.resolve(currentDir, '../../.env'),
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), 'backend/.env'),
];

for (const envPath of possibleEnvPaths) {
  if (fs.existsSync(envPath)) {
    try {
      process.loadEnvFile(envPath);
      break;
    } catch {
      // Lanjutkan jika file tidak dapat dimuat
    }
  }
}

export const config = {
  port: Number(process.env.PORT) || 3000,
  host: process.env.HOST || '0.0.0.0',
  nodeEnv: process.env.NODE_ENV || 'development',
  dbPath: process.env.DB_PATH || 'data/library.db',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-key-untad-2026',
  jwtExpiresIn: Number(process.env.JWT_EXPIRES_IN) || 86400,
  adminEmail: process.env.ADMIN_EMAIL || 'admin@untad.ac.id',
  adminPassword: process.env.ADMIN_PASSWORD || 'Admin123!',
  adminName: process.env.ADMIN_NAME || 'Administrator Perpustakaan',
  openLibraryBaseUrl: process.env.OPEN_LIBRARY_BASE_URL || 'https://openlibrary.org',
  openLibraryUserAgent: process.env.OPEN_LIBRARY_USER_AGENT || 'UNTAD-Library-Proxy/1.0 (library@untad.ac.id)',
  openLibraryTimeoutMs: Number(process.env.OPEN_LIBRARY_TIMEOUT_MS) || 8000,
  openLibraryCacheTtlMs: Number(process.env.OPEN_LIBRARY_CACHE_TTL_MS) || 5 * 60 * 1000,
  healthV1Sunset: process.env.HEALTH_V1_SUNSET || 'Wed, 30 Jun 2027 23:59:59 GMT',
  crossrefBaseUrl: process.env.CROSSREF_BASE_URL || 'https://api.crossref.org',
  crossrefUserAgent: process.env.CROSSREF_USER_AGENT || 'UNTAD-Library-Proxy/1.0 (mailto:library@untad.ac.id)',
  crossrefTimeoutMs: Number(process.env.CROSSREF_TIMEOUT_MS) || 8000,
  crossrefCacheTtlMs: Number(process.env.CROSSREF_CACHE_TTL_MS) || 5 * 60 * 1000,
};

export default config;
