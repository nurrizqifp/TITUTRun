import { pool } from '../config/db.js';
import { readRuntimeConfig } from '../config/runtime.js';
import { SESSION_COOKIE_NAME } from '../middlewares/requireAuth.js';
import {
  DUMMY_PASSWORD_HASH,
  generateSessionToken,
  hashPassword,
  hashSessionToken,
  parseCookies,
  verifyPassword,
} from '../utils/auth.js';
import { loginSchema, registerSchema } from '../utils/authSchemas.js';

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function cookieOptions() {
  const { APP_URL } = readRuntimeConfig();
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.COOKIE_SECURE === 'true' || APP_URL.startsWith('https://'),
    path: '/',
    maxAge: SESSION_TTL_MS,
  };
}

async function createSessionForUser(userId, res) {
  const rawToken = generateSessionToken();
  const tokenHash = hashSessionToken(rawToken);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await pool.query(
    `INSERT INTO user_sessions (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [userId, tokenHash, expiresAt],
  );

  // Opportunistically clean up expired sessions for this user.
  await pool.query(
    `DELETE FROM user_sessions WHERE user_id = $1 AND expires_at <= NOW()`,
    [userId],
  );

  res.cookie(SESSION_COOKIE_NAME, rawToken, cookieOptions());
}

async function register(req, res, next) {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: parsed.error.issues[0]?.message || 'Data pendaftaran tidak valid.',
      details: parsed.error.issues.map(({ path, message }) => ({
        field: path.join('.'),
        message,
      })),
    });
    return;
  }

  const { name, email, password } = parsed.data;
  try {
    const passwordHash = await hashPassword(password);
    const { rows } = await pool.query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, name, email`,
      [name, email, passwordHash],
    );
    const user = rows[0];
    await createSessionForUser(user.id, res);
    res.status(201).json({ user });
  } catch (error) {
    if (error?.code === '23505') {
      res.status(409).json({ error: 'Email sudah terdaftar. Silakan masuk atau gunakan email lain.' });
      return;
    }
    next(error);
  }
}

async function login(req, res, next) {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: 'Email atau kata sandi tidak valid.',
      details: parsed.error.issues.map(({ path, message }) => ({
        field: path.join('.'),
        message,
      })),
    });
    return;
  }

  const { email, password } = parsed.data;
  try {
    const { rows } = await pool.query(
      `SELECT id, name, email, password_hash
       FROM users
       WHERE email = $1
       LIMIT 1`,
      [email],
    );

    if (!rows.length) {
      await verifyPassword(password, DUMMY_PASSWORD_HASH);
      res.status(401).json({ error: 'Email atau kata sandi salah.' });
      return;
    }

    const userRow = rows[0];
    const passwordMatches = await verifyPassword(password, userRow.password_hash);
    if (!passwordMatches) {
      res.status(401).json({ error: 'Email atau kata sandi salah.' });
      return;
    }

    await createSessionForUser(userRow.id, res);
    res.json({
      user: {
        id: userRow.id,
        name: userRow.name,
        email: userRow.email,
      },
    });
  } catch (error) {
    next(error);
  }
}

async function logout(req, res, next) {
  try {
    const cookies = parseCookies(req.headers.cookie);
    const rawToken = cookies[SESSION_COOKIE_NAME];
    if (rawToken) {
      await pool.query(
        `DELETE FROM user_sessions WHERE token_hash = $1`,
        [hashSessionToken(rawToken)],
      );
    }
    const { maxAge: _maxAge, ...clearOpts } = cookieOptions();
    res.clearCookie(SESSION_COOKIE_NAME, clearOpts);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
}

function getCurrentUser(req, res) {
  res.json({ user: req.user });
}

export { getCurrentUser, login, loginSchema, logout, register, registerSchema };
