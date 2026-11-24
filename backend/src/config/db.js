import pg from 'pg';

const { Pool } = pg;

let poolInstance = null;

function resolveConnectionString() {
  return (
    process.env.DATABASE_URL
    || process.env.POSTGRES_URL
    || process.env.POSTGRES_PRISMA_URL
    || process.env.NEON_DATABASE_URL
    || ''
  ).trim();
}

function getPool() {
  if (poolInstance) {
    return poolInstance;
  }

  const connectionString = resolveConnectionString();
  if (!connectionString) {
    throw new Error('DATABASE_URL wajib dikonfigurasi melalui environment backend.');
  }

  const useSsl = process.env.DATABASE_SSL === 'true'
    || (Boolean(process.env.VERCEL) && process.env.DATABASE_SSL !== 'false')
    || /[?&]sslmode=require/i.test(connectionString);

  poolInstance = new Pool({
    connectionString,
    ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {}),
  });

  poolInstance.on('error', (error) => {
    console.error('Kesalahan koneksi database:', error);
  });

  return poolInstance;
}

const pool = {
  query(text, params) {
    return getPool().query(text, params);
  },
};

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
    CREATE TABLE IF NOT EXISTS training_plans (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(100) NOT NULL,
      days JSONB NOT NULL,
      source VARCHAR(20) NOT NULL,
      model_used VARCHAR(120),
      adjusted BOOLEAN NOT NULL DEFAULT FALSE,
      disclaimer TEXT NOT NULL,
      fallback_reason TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS training_plans_user_created_idx ON training_plans (user_id, created_at DESC);
  `);
}

export { initializeDatabase, pool, resolveConnectionString };
