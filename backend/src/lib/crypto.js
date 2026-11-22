import crypto from 'node:crypto';
import util from 'node:util';

const scryptAsync = util.promisify(crypto.scrypt);

/**
 * Membuat hash password menggunakan crypto.scrypt dengan salt acak 16 byte
 * @param {string} password
 * @returns {Promise<string>} Format: `${salt}:${derivedKeyHex}`
 */
export async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = await scryptAsync(password, salt, 64);
  return `${salt}:${derivedKey.toString('hex')}`;
}

/**
 * Versi sinkronus hash password untuk inisialisasi / seeding database
 * @param {string} password
 * @returns {string} Format: `${salt}:${derivedKeyHex}`
 */
export function hashPasswordSync(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return `${salt}:${derivedKey.toString('hex')}`;
}

/**
 * Memverifikasi kecocokan password dengan hash yang tersimpan
 * @param {string} password
 * @param {string} storedHash
 * @returns {Promise<boolean>}
 */
export async function verifyPassword(password, storedHash) {
  if (!storedHash || typeof storedHash !== 'string' || !storedHash.includes(':')) {
    return false;
  }
  const [salt, key] = storedHash.split(':');
  if (!salt || !key) {
    return false;
  }

  const derivedKey = await scryptAsync(password, salt, 64);
  const keyBuffer = Buffer.from(key, 'hex');

  if (derivedKey.length !== keyBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(derivedKey, keyBuffer);
}

/**
 * Mengubah data ke Base64URL string
 * @param {any} data
 * @returns {string}
 */
function base64UrlEncode(data) {
  const str = typeof data === 'string' ? data : JSON.stringify(data);
  return Buffer.from(str).toString('base64url');
}

/**
 * Mendekode string Base64URL ke utf-8
 * @param {string} str
 * @returns {string}
 */
function base64UrlDecode(str) {
  return Buffer.from(str, 'base64url').toString('utf-8');
}

/**
 * Membuat token JWT stateless bertanda tangan HS256
 * @param {object} payload
 * @param {string} secret
 * @param {number} [expiresInSeconds=86400] Default 24 jam (86400 detik)
 * @returns {string}
 */
export function signJwt(payload, secret, expiresInSeconds = 86400) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds,
  };

  const encodedHeader = base64UrlEncode(header);
  const encodedPayload = base64UrlEncode(fullPayload);
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const signature = crypto
    .createHmac('sha256', secret)
    .update(signingInput)
    .digest('base64url');

  return `${signingInput}.${signature}`;
}

/**
 * Memverifikasi dan mendekode token JWT HS256
 * @param {string} token
 * @param {string} secret
 * @returns {object} Payload token yang telah didekode
 */
export function verifyJwt(token, secret) {
  if (!token || typeof token !== 'string') {
    throw new Error('Token tidak valid');
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Format token tidak valid');
  }

  const [encodedHeader, encodedPayload, signature] = parts;
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(signingInput)
    .digest('base64url');

  const sigBuf = Buffer.from(signature);
  const expectedSigBuf = Buffer.from(expectedSignature);

  if (sigBuf.length !== expectedSigBuf.length || !crypto.timingSafeEqual(sigBuf, expectedSigBuf)) {
    throw new Error('Tanda tangan token tidak valid');
  }

  let payload;
  try {
    payload = JSON.parse(base64UrlDecode(encodedPayload));
  } catch {
    throw new Error('Payload token tidak valid');
  }

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) {
    throw new Error('Token telah kedaluwarsa');
  }

  return payload;
}

export default {
  hashPassword,
  hashPasswordSync,
  verifyPassword,
  signJwt,
  verifyJwt,
};
