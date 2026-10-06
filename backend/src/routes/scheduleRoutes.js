import { Router } from 'express';
import { z } from 'zod';
import { generateTrainingSchedule } from '../services/aiService.js';

const router = Router();
const scheduleSchema = z.object({
  goal: z.enum(['5K', '10K', 'Half marathon', 'General fitness']),
  experience: z.enum(['Pemula', 'Menengah', 'Lanjutan']),
  weeklyRuns: z.number().int().min(2).max(6),
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

export default router;
