import { z } from 'zod';

const MIN_LOG_DATE = '2020-01-01';
const CONTROL_CHAR_PATTERN = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;

function maxAllowedLogDate() {
  // Allow up to +1 day from UTC today to accommodate client timezones without permitting far-future dates.
  return new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
}

const metricsSchema = z.object({
  date: z.iso.date('Format tanggal harus YYYY-MM-DD.')
    .refine((value) => value >= MIN_LOG_DATE, {
      message: `Tanggal latihan tidak boleh lebih awal dari ${MIN_LOG_DATE}.`,
    })
    .refine((value) => value <= maxAllowedLogDate(), {
      message: 'Tanggal latihan tidak boleh berada di masa depan.',
    }),
  distanceKm: z.number({ message: 'Jarak harus berupa angka.' })
    .finite('Jarak tidak valid.')
    .min(0.1, 'Jarak minimal 0,1 km.')
    .max(100, 'Jarak maksimal 100 km.')
    .refine((value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-6, {
      message: 'Jarak maksimal memiliki 2 angka di belakang koma.',
    }),
  durationMinutes: z.number({ message: 'Durasi harus berupa angka.' })
    .int('Durasi harus berupa bilangan bulat menit.')
    .min(1, 'Durasi minimal 1 menit.')
    .max(1000, 'Durasi maksimal 1000 menit.'),
  rpe: z.number({ message: 'RPE harus berupa angka.' })
    .int('RPE harus berupa bilangan bulat 1 sampai 10.')
    .min(1, 'RPE minimal 1.')
    .max(10, 'RPE maksimal 10.'),
  notes: z.string()
    .trim()
    .max(300, 'Catatan maksimal 300 karakter.')
    .refine((value) => !CONTROL_CHAR_PATTERN.test(value), {
      message: 'Catatan mengandung karakter kontrol yang tidak diizinkan.',
    })
    .refine((value) => !/[<>]/.test(value), {
      message: 'Catatan tidak boleh mengandung karakter < atau >.',
    })
    .optional()
    .default(''),
}).strict().superRefine((data, ctx) => {
  const paceMinutesPerKm = data.durationMinutes / data.distanceKm;
  if (paceMinutesPerKm < 1.5) {
    ctx.addIssue({
      code: 'custom',
      path: ['durationMinutes'],
      message: 'Kombinasi jarak dan durasi tidak realistis (pace lebih cepat dari 1:30 /km).',
    });
  } else if (paceMinutesPerKm > 30) {
    ctx.addIssue({
      code: 'custom',
      path: ['durationMinutes'],
      message: 'Kombinasi jarak dan durasi tidak realistis (pace lebih lambat dari 30:00 /km).',
    });
  }
});

export { metricsSchema };

export default function validateMetrics(req, res, next) {
  const result = metricsSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({
      error: result.error.issues[0]?.message || 'Periksa kembali data latihan.',
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
