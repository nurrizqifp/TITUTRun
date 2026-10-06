import { z } from 'zod';

const metricsSchema = z.object({
  date: z.iso.date(),
  distanceKm: z.number().min(0.1).max(100),
  durationMinutes: z.number().int().min(1).max(1000),
  rpe: z.number().int().min(1).max(10),
  notes: z.string().trim().max(500).optional().default(''),
});

export { metricsSchema };

export default function validateMetrics(req, res, next) {
  const result = metricsSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({
      error: 'Periksa kembali data latihan.',
      details: result.error.issues.map(({ path, message }) => ({
        field: path.join('.'),
        message,
      })),
    });
    return;
  }

  req.body = result.data;
  next();
}
