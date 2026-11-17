import { createApp, ensureDatabaseInitialized } from '../backend/src/app.js';

if (process.env.VERCEL) {
  const vercelOrigin = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://localhost';
  process.env.PORT ||= '4000';
  process.env.APP_URL ||= vercelOrigin;
  process.env.CORS_ORIGIN ||= vercelOrigin;
  process.env.OPENROUTER_MODELS ||= 'nvidia/nemotron-3-ultra-550b-a55b:free,nvidia/nemotron-3.5-super-vl:free,baidu/ernie-5.5-flash-preview:free';
  process.env.OPENROUTER_API_URL ||= 'https://openrouter.ai/api/v1/chat/completions';
  process.env.OPENROUTER_TIMEOUT_MS ||= '20000';
  process.env.OPENROUTER_TEMPERATURE ||= '0.5';
  process.env.OPENROUTER_MAX_TOKENS ||= '1200';
}

const { app } = createApp();

export default async function handler(req, res) {
  await ensureDatabaseInitialized();
  return app(req, res);
}
