import { ValidationError, AppError } from './errorHandler.js';

const MAX_BODY_SIZE = 1024 * 1024; // 1 MB

/**
 * Membaca dan mem-parsing request body JSON
 * @param {import('node:http').IncomingMessage} req
 * @returns {Promise<any>}
 */
export async function parseJsonBody(req) {
  const method = req.method ? req.method.toUpperCase() : 'GET';
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    req.body = {};
    return req.body;
  }

  const contentType = req.headers['content-type'] || '';
  const isJson = contentType.includes('application/json');

  return new Promise((resolve, reject) => {
    let raw = '';
    let size = 0;

    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_SIZE) {
        req.destroy();
        reject(new AppError('Ukuran payload melebihi batas maksimal (1MB)', 413, 'VALIDATION_ERROR'));
        return;
      }
      raw += chunk;
    });

    req.on('end', () => {
      const trimmed = raw.trim();
      if (!trimmed) {
        req.body = {};
        return resolve(req.body);
      }

      // Jika Content-Type application/json atau diawali kurung JSON '{' atau '['
      if (isJson || trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try {
          req.body = JSON.parse(trimmed);
          resolve(req.body);
        } catch {
          reject(new ValidationError('Format payload JSON tidak valid'));
        }
      } else {
        req.body = trimmed;
        resolve(req.body);
      }
    });

    req.on('error', (err) => {
      reject(err);
    });
  });
}

export default parseJsonBody;
