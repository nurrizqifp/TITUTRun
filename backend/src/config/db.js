import pg from 'pg';

const { Pool } = pg;
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL wajib dikonfigurasi melalui environment backend.');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on('error', (error) => {
  console.error('Kesalahan koneksi database:', error);
});

async function initializeDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS training_logs (
      id BIGSERIAL PRIMARY KEY,
      date DATE NOT NULL,
      distance_km NUMERIC(6, 2) NOT NULL CHECK (distance_km > 0),
      duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
      rpe SMALLINT NOT NULL CHECK (rpe BETWEEN 1 AND 10),
      notes VARCHAR(500) NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS training_logs_date_idx ON training_logs (date DESC);
  `);
}

export { initializeDatabase, pool };
