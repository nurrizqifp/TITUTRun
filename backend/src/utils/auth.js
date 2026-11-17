import crypto from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(crypto.scrypt);
const SCRYPT_KEY_LENGTH = 64;
const SCRYPT_OPTIONS = { N: 16384, r: 8, p: 1 };

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = await scryptAsync(password, salt, SCRYPT_KEY_LENGTH, SCRYPT_OPTIONS);
  return `${salt}:${Buffer.from(derivedKey).toString('hex')}`;
}

async function verifyPassword(password, storedHash) {
  if (typeof storedHash !== 'string' || !storedHash.includes(':')) {
    return false;
  }
  const [salt, expectedHex] = storedHash.split(':');
  if (!salt || !expectedHex) {
    return false;
  }
  const expectedBuffer = Buffer.from(expectedHex, 'hex');
  const derivedKey = await scryptAsync(password, salt, expectedBuffer.length, SCRYPT_OPTIONS);
  const derivedBuffer = Buffer.from(derivedKey);
  if (derivedBuffer.length !== expectedBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(derivedBuffer, expectedBuffer);
}

// Precomputed valid-format hash used when an account is not found so login timing stays uniform.
const DUMMY_PASSWORD_HASH = '00112233445566778899aabbccddeeff:' + '00'.repeat(SCRYPT_KEY_LENGTH);

function generateSessionToken() {
  return crypto.randomBytes(32).toString('base64url');
}

function hashSessionToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function parseCookies(cookieHeader) {
  const cookies = {};
  if (typeof cookieHeader !== 'string' || !cookieHeader) {
    return cookies;
  }
  for (const part of cookieHeader.split(';')) {
    const separatorIndex = part.indexOf('=');
    if (separatorIndex <= 0) continue;
    const key = part.slice(0, separatorIndex).trim();
    const value = part.slice(separatorIndex + 1).trim();
    if (key) {
      try {
        cookies[key] = decodeURIComponent(value);
      } catch {
        cookies[key] = value;
      }
    }
  }
  return cookies;
}

export {
  DUMMY_PASSWORD_HASH,
  generateSessionToken,
  hashPassword,
  hashSessionToken,
  parseCookies,
  verifyPassword,
};
