import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../config/db.js';
import { generateTrainingSchedule, scheduleResponseSchema } from '../services/aiService.js';

const router = Router();
const scheduleSchema = z.object({
  goal: z.enum(['5K', '10K', 'Half marathon', 'General fitness']),
  experience: z.enum(['Pemula', 'Menengah', 'Lanjutan']),
  weeklyRuns: z.number().int().min(2).max(6),
}).strict();

const saveScheduleSchema = scheduleResponseSchema.extend({
  source: z.enum(['openrouter', 'local']),
  modelUsed: z.string().trim().min(1).max(120).optional(),
  adjusted: z.boolean().optional().default(false),
  disclaimer: z.string().trim().min(1).max(400),
  fallbackReason: z.string().trim().max(400).optional(),
}).strict();

function formatPlan(row) {
  return {
    id: row.id,
    title: row.title,
    days: row.days,
    source: row.source,
    ...(row.model_used ? { modelUsed: row.model_used } : {}),
    adjusted: row.adjusted,
    disclaimer: row.disclaimer,
    ...(row.fallback_reason ? { fallbackReason: row.fallback_reason } : {}),
    saved: true,
  };
}

router.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, title, days, source, model_used, adjusted, disclaimer, fallback_reason
       FROM training_plans
       WHERE user_id = $1
       ORDER BY created_at DESC, id DESC
       LIMIT 1`,
      [req.user.id],
    );
    res.json({ plan: rows.length ? formatPlan(rows[0]) : null });
  } catch (error) {
    next(error);
  }
});

router.post('/generate', async (req, res, next) => {
  const result = scheduleSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({
      error: 'Preferensi rencana latihan tidak valid.',
      details: result.error.issues.map(({ path, message }) => ({
        field: path.join('.'),
        message,
      })),
    });
    return;
  }

  try {
    const schedule = await generateTrainingSchedule(result.data);
    res.json(schedule);
  } catch (error) {
    next(error);
  }
});

router.post('/save', async (req, res, next) => {
  const result = saveScheduleSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({
      error: 'Data rencana latihan tidak valid untuk disimpan.',
      details: result.error.issues.map(({ path, message }) => ({
        field: path.join('.'),
        message,
      })),
    });
    return;
  }

  const { title, days, source, modelUsed, adjusted, disclaimer, fallbackReason } = result.data;
  try {
    const { rows } = await pool.query(
      `INSERT INTO training_plans (user_id, title, days, source, model_used, adjusted, disclaimer, fallback_reason)
       VALUES ($1, $2, $3::jsonb, $4, $5, $6, $7, $8)
       RETURNING id, title, days, source, model_used, adjusted, disclaimer, fallback_reason`,
      [req.user.id, title, JSON.stringify(days), source, modelUsed ?? null, adjusted, disclaimer, fallbackReason ?? null],
    );
    res.status(201).json({ plan: formatPlan(rows[0]) });
  } catch (error) {
    next(error);
  }
});

export default router;
