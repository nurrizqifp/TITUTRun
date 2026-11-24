import cors from 'cors';
import express from 'express';
import { initializeDatabase, pool, resolveConnectionString } from './config/db.js';
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

function applyVercelDefaults() {
  if (!process.env.VERCEL && !process.env.VERCEL_ENV) return;

  const fallbackDatabaseUrl = resolveConnectionString();
  if (fallbackDatabaseUrl) {
    process.env.DATABASE_URL ||= fallbackDatabaseUrl;
  }

  const origins = [
    process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`,
    process.env.VERCEL_BRANCH_URL && `https://${process.env.VERCEL_BRANCH_URL}`,
    process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`,
  ].filter(Boolean);

  const primaryOrigin = origins[0] || 'https://localhost';
  process.env.PORT ||= '4000';
  process.env.APP_URL ||= primaryOrigin;
  process.env.CORS_ORIGIN ||= (origins.length ? origins.join(',') : primaryOrigin);
  process.env.OPENROUTER_MODELS ||= 'nvidia/nemotron-3-ultra-550b-a55b:free,nvidia/nemotron-3.5-super-vl:free,baidu/ernie-5.5-flash-preview:free';
  process.env.OPENROUTER_API_URL ||= 'https://openrouter.ai/api/v1/chat/completions';
  process.env.OPENROUTER_TIMEOUT_MS ||= '20000';
  process.env.OPENROUTER_TEMPERATURE ||= '0.5';
  process.env.OPENROUTER_MAX_TOKENS ||= '1200';
}

function createApp() {
  applyVercelDefaults();
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  let config = null;
  let configError = null;
  try {
    config = readRuntimeConfig();
  } catch (error) {
    if (!process.env.VERCEL && !process.env.VERCEL_ENV) {
      throw error;
    }
    configError = error;
  }

  const allowedOrigins = config?.CORS_ORIGIN || [];

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

  app.use((_req, res, next) => {
    if (configError) {
      const hasDbEnv = Boolean(resolveConnectionString());
      const hint = !hasDbEnv
        ? 'Variabel DATABASE_URL belum terbaca di deployment ini. Pastikan sudah dicentang untuk Production/Preview lalu lakukan Redeploy.'
        : 'Format DATABASE_URL tidak valid (pastikan tanpa tanda kutip, tanpa kurung siku [ ], dan karakter spesial pada password sudah di-URL-encode).';
      res.status(503).json({
        status: 'error',
        error: `${configError.message} ${hint}`,
      });
      return;
    }
    next();
  });

  app.get('/api/health', async (_req, res, next) => {
    try {
      await ensureDatabaseInitialized();
      await pool.query('SELECT 1');
      res.json({ status: 'ok', database: 'connected' });
    } catch (error) {
      next(error);
    }
  });

  async function initDbMiddleware(_req, _res, next) {
    try {
      await ensureDatabaseInitialized();
      next();
    } catch (error) {
      next(error);
    }
  }

  app.use('/api/auth', initDbMiddleware, authRoutes);
  app.get('/api/logs', initDbMiddleware, requireAuth, getLogs);
  app.post('/api/logs', initDbMiddleware, requireAuth, validateMetrics, createLog);
  app.use('/api/schedule', initDbMiddleware, requireAuth, scheduleLimiter, scheduleRoutes);

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
