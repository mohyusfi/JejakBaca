import { logger } from '../app/logger.js';

export class AppError extends Error {
  /**
   * @param {string} message
   * @param {number} statusCode
   * @param {string} code
   * @param {Array<{field: string, message: string}> | null} [details]
   */
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = null) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Format payload JSON tidak valid', details = null) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Token autentikasi tidak valid atau tidak ditemukan') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Akses ditolak') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Data atau route tidak ditemukan') {
    super(message, 404, 'NOT_FOUND');
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Konflik aturan bisnis atau duplikasi data', code = 'CONFLICT') {
    super(message, 409, code);
  }
}

export class UpstreamError extends AppError {
  constructor(message = 'Open Library API gagal merespons atau timeout') {
    super(message, 502, 'UPSTREAM_API_ERROR');
  }
}

/**
 * Middleware terpusat untuk penanganan error dengan format ApiErrorResponse
 * @param {Error} err
 * @param {import('node:http').IncomingMessage} req
 * @param {import('node:http').ServerResponse} res
 */
export function errorHandler(err, req, res) {
  const statusCode = err.statusCode || 500;
  const code = err.code || 'INTERNAL_ERROR';
  const message = err.message || 'Terjadi kesalahan internal pada server';

  if (statusCode >= 500) {
    logger.error(`[${req.method}] ${req.url} - ${statusCode} - ${message}`, err.stack || err);
  }

  const payload = {
    success: false,
    message,
    error: {
      code,
    },
  };

  if (err.details && Array.isArray(err.details) && err.details.length > 0) {
    payload.error.details = err.details;
  }

  if (!res.headersSent) {
    res.statusCode = statusCode;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(payload));
  }
}
