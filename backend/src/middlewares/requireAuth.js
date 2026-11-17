import { pool } from '../config/db.js';
import { hashSessionToken, parseCookies } from '../utils/auth.js';

const SESSION_COOKIE_NAME = 'titut_session';

async function requireAuth(req, res, next) {
  try {
    const cookies = parseCookies(req.headers.cookie);
    const rawToken = cookies[SESSION_COOKIE_NAME];
    if (!rawToken) {
      res.status(401).json({ error: 'Sesi belum dimulai atau telah berakhir. Silakan masuk kembali.' });
      return;
    }

    const tokenHash = hashSessionToken(rawToken);
    const { rows } = await pool.query(
      `SELECT s.id AS session_id, u.id, u.name, u.email
       FROM user_sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = $1 AND s.expires_at > NOW()
       LIMIT 1`,
      [tokenHash],
    );

    if (!rows.length) {
      res.status(401).json({ error: 'Sesi tidak valid atau telah kedaluwarsa. Silakan masuk kembali.' });
      return;
    }

    req.user = {
      id: rows[0].id,
      name: rows[0].name,
      email: rows[0].email,
    };
    req.sessionId = rows[0].session_id;
    next();
  } catch (error) {
    next(error);
  }
}

export { SESSION_COOKIE_NAME, parseCookies, requireAuth };
