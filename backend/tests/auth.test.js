import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateSessionToken,
  hashPassword,
  hashSessionToken,
  parseCookies,
  verifyPassword,
} from '../src/utils/auth.js';
import { loginSchema, registerSchema } from '../src/utils/authSchemas.js';
import { createRateLimiter } from '../src/middlewares/rateLimit.js';
import { metricsSchema } from '../src/middlewares/validateMetrics.js';

test('hashPassword and verifyPassword validate matching passwords and reject wrong ones', async () => {
  const hash = await hashPassword('RahasiaLari123!');
  assert.ok(hash.includes(':'));
  assert.equal(await verifyPassword('RahasiaLari123!', hash), true);
  assert.equal(await verifyPassword('salah-password', hash), false);
  assert.equal(await verifyPassword('RahasiaLari123!', 'malformed'), false);
});

test('generateSessionToken and hashSessionToken produce deterministic SHA-256 hashes', () => {
  const tokenA = generateSessionToken();
  const tokenB = generateSessionToken();
  assert.notEqual(tokenA, tokenB);
  assert.equal(hashSessionToken(tokenA).length, 64);
  assert.equal(hashSessionToken(tokenA), hashSessionToken(tokenA));
});

test('parseCookies decodes cookie header values safely', () => {
  const cookies = parseCookies('foo=bar; titut_session=abc%3D123; empty=');
  assert.equal(cookies.foo, 'bar');
  assert.equal(cookies.titut_session, 'abc=123');
  assert.equal(cookies.empty, '');
  assert.deepEqual(parseCookies(undefined), {});
});

test('createRateLimiter blocks requests exceeding the configured threshold', () => {
  const limiter = createRateLimiter({ windowMs: 60_000, max: 2, message: 'Terlalu banyak' });
  let nextCount = 0;
  let statusCode = 200;
  let body;
  const headers = {};
  const req = { ip: '127.0.0.1' };
  const res = {
    set(key, value) { headers[key] = value; },
    status(code) {
      statusCode = code;
      return { json(payload) { body = payload; } };
    },
  };

  limiter(req, res, () => { nextCount += 1; });
  limiter(req, res, () => { nextCount += 1; });
  limiter(req, res, () => { nextCount += 1; });

  assert.equal(nextCount, 2);
  assert.equal(statusCode, 429);
  assert.equal(body.error, 'Terlalu banyak');
  assert.ok(Number(headers['Retry-After']) >= 1);
});

test('registerSchema enforces strict name, email, password complexity, and unknown-field rules', () => {
  const valid = registerSchema.safeParse({
    name: '  Nadia   Pratama  ',
    email: 'Nadia.Pratama@Example.COM',
    password: 'LariPagi#2026!',
  });
  assert.equal(valid.success, true);
  assert.equal(valid.data.name, 'Nadia Pratama');
  assert.equal(valid.data.email, 'nadia.pratama@example.com');

  // Rejects invalid name characters
  assert.equal(registerSchema.safeParse({
    name: 'Nadia <script>',
    email: 'nadia@example.com',
    password: 'LariPagi#2026!',
  }).success, false);

  // Rejects email without valid TLD or > 120 chars
  assert.equal(registerSchema.safeParse({
    name: 'Nadia Pratama',
    email: 'nadia@localhost',
    password: 'LariPagi#2026!',
  }).success, false);

  // Rejects weak password missing symbol/uppercase/length
  assert.equal(registerSchema.safeParse({
    name: 'Nadia Pratama',
    email: 'nadia@example.com',
    password: 'password123',
  }).success, false);

  // Rejects password containing user name or email local-part
  assert.equal(registerSchema.safeParse({
    name: 'Nadia Pratama',
    email: 'nadia@example.com',
    password: 'Nadia#2026!Strong',
  }).success, false);

  // Rejects unexpected extra fields (.strict())
  assert.equal(registerSchema.safeParse({
    name: 'Nadia Pratama',
    email: 'nadia@example.com',
    password: 'LariPagi#2026!',
    role: 'admin',
  }).success, false);
});

test('loginSchema normalizes email and rejects unknown fields', () => {
  const valid = loginSchema.safeParse({
    email: ' Runner@Example.com ',
    password: 'any-password',
  });
  assert.equal(valid.success, true);
  assert.equal(valid.data.email, 'runner@example.com');

  assert.equal(loginSchema.safeParse({
    email: 'runner@example.com',
    password: 'any-password',
    extra: true,
  }).success, false);
});

test('metricsSchema enforces date bounds, decimal precision, pace sanity, and notes limits', () => {
  // Rejects far-future date
  assert.equal(metricsSchema.safeParse({
    date: '2099-01-01',
    distanceKm: 5,
    durationMinutes: 30,
    rpe: 5,
  }).success, false);

  // Rejects date before 2020-01-01
  assert.equal(metricsSchema.safeParse({
    date: '2019-12-31',
    distanceKm: 5,
    durationMinutes: 30,
    rpe: 5,
  }).success, false);

  // Rejects > 2 decimal places on distance
  assert.equal(metricsSchema.safeParse({
    date: '2026-10-06',
    distanceKm: 5.123,
    durationMinutes: 30,
    rpe: 5,
  }).success, false);

  // Rejects unrealistic sprint pace (100 km in 10 minutes)
  assert.equal(metricsSchema.safeParse({
    date: '2026-10-06',
    distanceKm: 100,
    durationMinutes: 10,
    rpe: 5,
  }).success, false);

  // Rejects angle brackets in notes
  assert.equal(metricsSchema.safeParse({
    date: '2026-10-06',
    distanceKm: 5,
    durationMinutes: 30,
    rpe: 5,
    notes: 'Lari <script>alert(1)</script>',
  }).success, false);
});
