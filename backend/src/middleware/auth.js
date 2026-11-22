import { config } from '../config/index.js';
import { verifyJwt } from '../lib/crypto.js';
import { UnauthorizedError, ForbiddenError } from './errorHandler.js';

/**
 * Middleware autentikasi wajib.
 * Memverifikasi header `Authorization: Bearer <token>` dan menyematkan `req.user`.
 * @param {import('node:http').IncomingMessage} req
 * @param {import('node:http').ServerResponse} res
 */
export function authMiddleware(req, res) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    throw new UnauthorizedError('Header Authorization tidak ditemukan');
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    throw new UnauthorizedError('Format header Authorization harus Bearer <token>');
  }

  const token = parts[1];
  try {
    const decoded = verifyJwt(token, config.jwtSecret);
    req.user = decoded;
  } catch (err) {
    throw new UnauthorizedError(err.message || 'Token autentikasi tidak valid atau kedaluwarsa');
  }
}

/**
 * Middleware autentikasi opsional.
 * Jika token Bearer ada dan valid, menyematkan `req.user`. Jika tidak ada/tidak valid, `req.user = null`.
 * @param {import('node:http').IncomingMessage} req
 * @param {import('node:http').ServerResponse} res
 */
export function optionalAuthMiddleware(req, res) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    req.user = null;
    return;
  }

  const parts = authHeader.split(' ');
  if (parts.length === 2 && parts[0] === 'Bearer') {
    try {
      req.user = verifyJwt(parts[1], config.jwtSecret);
      return;
    } catch {
      // Abaikan bila token tidak valid
    }
  }

  req.user = null;
}

/**
 * Guard peran (Role Guard) untuk membatasi akses endpoint berdasarkan peran pengguna.
 * @param  {...string} allowedRoles Contoh: 'admin', 'user'
 * @returns {Function}
 */
export function roleGuard(...allowedRoles) {
  return function guard(req, res) {
    if (!req.user) {
      throw new UnauthorizedError('Autentikasi diperlukan untuk mengakses resource ini');
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw new ForbiddenError('Akses ditolak: peran Anda tidak memiliki izin untuk resource ini');
    }
  };
}

export default {
  authMiddleware,
  optionalAuthMiddleware,
  roleGuard,
};
