import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import { initializeDatabase, pool } from './src/config/db.js';
import { readRuntimeConfig } from './src/config/runtime.js';
import scheduleRoutes from './src/routes/scheduleRoutes.js';
import { createLog, getLogs } from './src/controllers/scheduleController.js';
import validateMetrics from './src/middlewares/validateMetrics.js';

const app = express();
const config = readRuntimeConfig();
const { PORT: port, CORS_ORIGIN: allowedOrigins } = config;

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error('Origin tidak diizinkan oleh kebijakan CORS.'));
  },
}));
app.use(express.json({ limit: '32kb' }));

app.get('/api/health', async (_req, res, next) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    next(error);
  }
});

app.get('/api/logs', getLogs);
app.post('/api/logs', validateMetrics, createLog);
app.use('/api/schedule', scheduleRoutes);

app.use((error, _req, res, _next) => {
  console.error(error);
  if (error instanceof SyntaxError && 'body' in error) {
    res.status(400).json({ error: 'Format JSON tidak valid.' });
    return;
  }
  res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
});

initializeDatabase()
  .then(() => {
    app.listen(port, () => {
      console.log(`TITUT Run API berjalan di port ${port}.`);
    });
  })
  .catch((error) => {
    console.error('Gagal menyiapkan database TITUT Run:', error);
    process.exitCode = 1;
  });
