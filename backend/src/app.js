import cors from 'cors';
import express from 'express';
import { initializeDatabase, pool } from './config/db.js';
import { readRuntimeConfig } from './config/runtime.js';
import authRoutes from './routes/authRoutes.js';
import scheduleRoutes from './routes/scheduleRoutes.js';
import { createLog, getLogs } from './controllers/scheduleController.js';
import { createRateLimiter } from './middlewares/rateLimit.js';
import { requireAuth } from './middlewares/requireAuth.js';
import validateMetrics from './middlewares/validateMetrics.js';

let dbInitPromise = null;

function ensureDatabaseInitialized() {
  if (!dbInitPromise) {
    dbInitPromise = initializeDatabase().catch((error) => {
      dbInitPromise = null;
      throw error;
    });
  }
  return dbInitPromise;
}

function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  const config = readRuntimeConfig();
  const { CORS_ORIGIN: allowedOrigins } = config;

  const scheduleLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: 'Terlalu banyak permintaan pembuatan rencana latihan. Coba lagi sebentar lagi.',
  });

  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  app.use(cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('Origin tidak diizinkan oleh kebijakan CORS.'));
    },
    credentials: true,
  }));
  app.use(express.json({ limit: '32kb' }));

  app.get('/api/health', async (_req, res, next) => {
    try {
      await ensureDatabaseInitialized();
      await pool.query('SELECT 1');
      res.json({ status: 'ok', database: 'connected' });
    } catch (error) {
      next(error);
    }
  });

  app.use('/api/auth', async (_req, _res, next) => {
    try {
      await ensureDatabaseInitialized();
      next();
    } catch (error) {
      next(error);
    }
  }, authRoutes);

  app.get('/api/logs', requireAuth, getLogs);
  app.post('/api/logs', requireAuth, validateMetrics, createLog);
  app.use('/api/schedule', requireAuth, scheduleLimiter, scheduleRoutes);

  app.use((error, _req, res, _next) => {
    console.error(error);
    if (error instanceof SyntaxError && 'body' in error) {
      res.status(400).json({ error: 'Format JSON tidak valid.' });
      return;
    }
    res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
  });

  return { app, config };
}

export { createApp, ensureDatabaseInitialized };
