import { z } from 'zod';

const NAME_PATTERN = /^[\p{L}][\p{L}\s'.-]*$/u;
const EMAIL_PATTERN = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,24}$/;
const CONTROL_CHAR_PATTERN = /[\u0000-\u001F\u007F]/;

const normalizedEmailSchema = z.string()
  .trim()
  .toLowerCase()
  .min(5, 'Email terlalu pendek.')
  .max(120, 'Email maksimal 120 karakter.')
  .refine((value) => !/\s/.test(value) && !value.includes('..') && EMAIL_PATTERN.test(value), {
    message: 'Format email tidak valid. Gunakan alamat email lengkap (contoh: nama@domain.com).',
  });

const registerSchema = z.object({
  name: z.string()
    .trim()
    .transform((value) => value.replace(/\s+/g, ' '))
    .pipe(
      z.string()
        .min(2, 'Nama minimal 2 karakter.')
        .max(60, 'Nama maksimal 60 karakter.')
        .refine((value) => !CONTROL_CHAR_PATTERN.test(value) && NAME_PATTERN.test(value), {
          message: 'Nama hanya boleh berisi huruf, spasi, titik, apostrof, atau tanda hubung.',
        })
        .refine((value) => (value.match(/\p{L}/gu) || []).length >= 2, {
          message: 'Nama harus mengandung minimal 2 huruf.',
        }),
    ),
  email: normalizedEmailSchema,
  password: z.string()
    .min(10, 'Kata sandi minimal 10 karakter.')
    .max(72, 'Kata sandi maksimal 72 karakter.')
    .refine((value) => value === value.trim(), {
      message: 'Kata sandi tidak boleh diawali atau diakhiri spasi.',
    })
    .refine((value) => !CONTROL_CHAR_PATTERN.test(value), {
      message: 'Kata sandi mengandung karakter kontrol yang tidak diizinkan.',
    })
    .refine((value) => /[a-z]/.test(value), {
      message: 'Kata sandi harus mengandung minimal 1 huruf kecil.',
    })
    .refine((value) => /[A-Z]/.test(value), {
      message: 'Kata sandi harus mengandung minimal 1 huruf besar.',
    })
    .refine((value) => /[0-9]/.test(value), {
      message: 'Kata sandi harus mengandung minimal 1 angka.',
    })
    .refine((value) => /[^A-Za-z0-9\s]/.test(value), {
      message: 'Kata sandi harus mengandung minimal 1 simbol (contoh: !@#$%).',
    }),
}).strict().superRefine((data, ctx) => {
  const loweredPassword = data.password.toLowerCase();
  const emailLocalPart = data.email.split('@')[0] || '';
  if (emailLocalPart.length >= 3 && loweredPassword.includes(emailLocalPart)) {
    ctx.addIssue({
      code: 'custom',
      path: ['password'],
      message: 'Kata sandi tidak boleh mengandung bagian dari alamat email Anda.',
    });
  }
  const nameTokens = data.name.toLowerCase().split(/\s+/).filter((token) => token.length >= 3);
  if (nameTokens.some((token) => loweredPassword.includes(token))) {
    ctx.addIssue({
      code: 'custom',
      path: ['password'],
      message: 'Kata sandi tidak boleh mengandung nama Anda.',
    });
  }
});

const loginSchema = z.object({
  email: normalizedEmailSchema,
  password: z.string()
    .min(1, 'Kata sandi wajib diisi.')
    .max(72, 'Kata sandi maksimal 72 karakter.')
    .refine((value) => !CONTROL_CHAR_PATTERN.test(value), {
      message: 'Format kata sandi tidak valid.',
    }),
}).strict();

export { loginSchema, normalizedEmailSchema, registerSchema };
