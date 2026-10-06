import { z } from 'zod';

const runtimeSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535),
  DATABASE_URL: z.string().url(),
  APP_URL: z.string().url(),
  CORS_ORIGIN: z.string()
    .transform((value) => value.split(',').map((origin) => origin.trim()).filter(Boolean))
    .pipe(z.array(z.string().url()).min(1)),
  OPENROUTER_API_KEY: z.string().optional().default('').transform((value) => value.trim()),
  OPENROUTER_MODELS: z.string()
    .transform((value) => value.split(',').map((model) => model.trim()).filter(Boolean))
    .pipe(z.array(z.string().min(1)).min(1)),
  OPENROUTER_API_URL: z.string().url(),
  OPENROUTER_TIMEOUT_MS: z.coerce.number().int().positive(),
  OPENROUTER_TEMPERATURE: z.coerce.number().min(0).max(2),
  OPENROUTER_MAX_TOKENS: z.coerce.number().int().positive(),
});

function readRuntimeConfig(environment = process.env) {
  const result = runtimeSchema.safeParse(environment);
  if (!result.success) {
    const invalidFields = [...new Set(result.error.issues.map((issue) => issue.path.join('.')))];
    throw new Error(`Konfigurasi environment tidak valid atau belum diisi: ${invalidFields.join(', ')}`);
  }
  return result.data;
}

export { readRuntimeConfig };
