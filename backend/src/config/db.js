import pg from 'pg';

const { Pool } = pg;
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL wajib dikonfigurasi melalui environment backend.');
}

const useSsl = process.env.DATABASE_SSL === 'true';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {}),
});

pool.on('error', (error) => {
  console.error('Kesalahan koneksi database:', error);
});

async function initializeDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGSERIAL PRIMARY KEY,
      name VARCHAR(80) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS user_sessions (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash CHAR(64) NOT NULL UNIQUE,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS user_sessions_user_id_idx ON user_sessions (user_id);
    CREATE INDEX IF NOT EXISTS user_sessions_expires_at_idx ON user_sessions (expires_at);
    CREATE TABLE IF NOT EXISTS training_logs (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
      date DATE NOT NULL,
      distance_km NUMERIC(6, 2) NOT NULL CHECK (distance_km > 0),
      duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
      rpe SMALLINT NOT NULL CHECK (rpe BETWEEN 1 AND 10),
      notes VARCHAR(500) NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    ALTER TABLE training_logs ADD COLUMN IF NOT EXISTS user_id BIGINT REFERENCES users(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS training_logs_date_idx ON training_logs (date DESC);
    CREATE INDEX IF NOT EXISTS training_logs_user_date_idx ON training_logs (user_id, date DESC);
  `);
}

export { initializeDatabase, pool };
