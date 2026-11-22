import { logger } from '../app/logger.js';

/**
 * Middleware untuk logging setiap HTTP request
 * @param {import('node:http').IncomingMessage} req
 * @param {import('node:http').ServerResponse} res
 */
export function requestLogger(req, res) {
  const start = Date.now();
  const { method, url } = req;

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${method} ${url} ${res.statusCode} - ${duration}ms`);
  });
}

export default requestLogger;
