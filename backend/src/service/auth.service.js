import { getDb } from '../app/database.js';
import { config } from '../config/index.js';
import { hashPassword, verifyPassword, signJwt } from '../lib/crypto.js';
import { ValidationError, ConflictError, UnauthorizedError } from '../middleware/errorHandler.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Memformat baris database menjadi objek UserProfile sesuai kontrak OpenAPI
 * @param {object} row
 * @returns {object}
 */
export function formatUserProfile(row) {
  return {
    id: row.id,
    name: row.name,
    nim: row.nim || null,
    email: row.email,
    role: row.role,
    createdAt: row.created_at || row.createdAt,
  };
}

export const authService = {
  /**
   * Mendaftarkan pengguna baru dengan role 'user' dan otomatis login
   * @param {{ name?: string, nim?: string, email?: string, password?: string }} payload
   * @returns {Promise<{ token: string, expiresIn: number, user: object }>}
   */
  async register({ name, nim, email, password }) {
    const details = [];

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      details.push({ field: 'name', message: 'Nama wajib diisi minimal 2 karakter' });
    }

    if (!nim || typeof nim !== 'string' || nim.trim().length < 3) {
      details.push({ field: 'nim', message: 'NIM wajib diisi minimal 3 karakter' });
    }

    if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
      details.push({ field: 'email', message: 'Format email tidak valid' });
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      details.push({ field: 'password', message: 'Kata sandi wajib diisi minimal 6 karakter' });
    }

    if (details.length > 0) {
      throw new ValidationError('Validasi registrasi gagal', details);
    }

    const trimmedName = name.trim();
    const trimmedNim = nim.trim();
    const trimmedEmail = email.trim().toLowerCase();

    const db = getDb();

    // Periksa duplikasi email
    const existingEmail = db.prepare('SELECT id FROM users WHERE email = ? LIMIT 1;').get(trimmedEmail);
    if (existingEmail) {
      throw new ConflictError('Email sudah terdaftar', 'CONFLICT');
    }

    // Periksa duplikasi NIM
    const existingNim = db.prepare('SELECT id FROM users WHERE nim = ? LIMIT 1;').get(trimmedNim);
    if (existingNim) {
      throw new ConflictError('NIM sudah terdaftar', 'CONFLICT');
    }

    const passwordHash = await hashPassword(password);
    const stmtInsert = db.prepare(`
      INSERT INTO users (name, nim, email, password_hash, role)
      VALUES (?, ?, ?, ?, 'user');
    `);

    const result = stmtInsert.run(trimmedName, trimmedNim, trimmedEmail, passwordHash);
    const userId = Number(result.lastInsertRowid);

    const userRow = db.prepare('SELECT id, name, nim, email, role, created_at FROM users WHERE id = ?;').get(userId);
    const userProfile = formatUserProfile(userRow);

    const token = signJwt(
      {
        sub: userProfile.id,
        id: userProfile.id,
        name: userProfile.name,
        email: userProfile.email,
        role: userProfile.role,
      },
      config.jwtSecret,
      config.jwtExpiresIn
    );

    return {
      token,
      expiresIn: config.jwtExpiresIn,
      user: userProfile,
    };
  },

  /**
   * Login untuk User maupun Admin menggunakan Email atau NIM
   * @param {{ identifier?: string, password?: string }} payload
   * @returns {Promise<{ token: string, expiresIn: number, user: object }>}
   */
  async login({ identifier, password }) {
    if (!identifier || typeof identifier !== 'string' || !identifier.trim()) {
      throw new ValidationError('Identifier (Email atau NIM) wajib diisi');
    }
    if (!password || typeof password !== 'string') {
      throw new ValidationError('Kata sandi wajib diisi');
    }

    const trimmedIdentifier = identifier.trim();
    const lowerIdentifier = trimmedIdentifier.toLowerCase();
    const db = getDb();

    // Cari user berdasarkan email atau NIM
    const stmt = db.prepare(`
      SELECT id, name, nim, email, password_hash, role, created_at
      FROM users
      WHERE email = ? OR nim = ?
      LIMIT 1;
    `);

    const user = stmt.get(lowerIdentifier, trimmedIdentifier);
    if (!user) {
      throw new UnauthorizedError('Email/NIM atau kata sandi tidak valid');
    }

    const isPasswordValid = await verifyPassword(password, user.password_hash);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Email/NIM atau kata sandi tidak valid');
    }

    const userProfile = formatUserProfile(user);

    const token = signJwt(
      {
        sub: userProfile.id,
        id: userProfile.id,
        name: userProfile.name,
        email: userProfile.email,
        role: userProfile.role,
      },
      config.jwtSecret,
      config.jwtExpiresIn
    );

    return {
      token,
      expiresIn: config.jwtExpiresIn,
      user: userProfile,
    };
  },

  /**
   * Mengambil profil pengguna aktif dari database
   * @param {number} userId
   * @returns {object}
   */
  getProfile(userId) {
    const db = getDb();
    const stmt = db.prepare('SELECT id, name, nim, email, role, created_at FROM users WHERE id = ?;');
    const user = stmt.get(userId);

    if (!user) {
      throw new UnauthorizedError('Pengguna tidak ditemukan atau sesi telah berakhir');
    }

    return formatUserProfile(user);
  },
};

export default authService;
