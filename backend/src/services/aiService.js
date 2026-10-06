import { z } from 'zod';
import { readRuntimeConfig } from '../config/runtime.js';

const dayNames = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
const scheduleResponseSchema = z.object({
  title: z.string().min(1).max(100),
  days: z.array(z.object({
    day: z.string().min(1).max(20),
    kind: z.enum(['run', 'rest']),
    workout: z.string().min(1).max(160),
    detail: z.string().min(1).max(240),
  })).length(7).refine((days) => days.every((day, index) => day.day === dayNames[index])),
}).strict();

function createLocalSchedule({ goal, experience, weeklyRuns }) {
  const focus = goal === 'General fitness' ? 'kebugaran' : `target ${goal}`;
  const easyDistance = experience === 'Pemula' ? '3–4 km' : '5–7 km';
  const workouts = Array.from({ length: 7 }, (_, index) => ({
    day: dayNames[index],
    kind: 'rest',
    workout: 'Istirahat',
    detail: 'Pulihkan tubuh. Jalan ringan dan peregangan boleh dilakukan.',
  }));
  const sessions = [
    ['Lari santai', `${easyDistance} dengan napas nyaman.`],
    ['Latihan kualitas', 'Pemanasan, 4 × 2 menit lebih cepat dengan jeda jalan, lalu pendinginan.'],
    ['Lari pemulihan', '20–30 menit ringan; perlambat atau berhenti jika terasa nyeri.'],
    ['Lari jarak jauh', experience === 'Pemula' ? '5–7 km dengan intensitas santai.' : '8–12 km dengan intensitas santai.'],
    ['Lari santai', `${easyDistance}; jaga usaha tetap ringan.`],
    ['Lari progresif', '20–35 menit; mulai ringan dan akhiri sedikit lebih mantap.'],
  ];
  const runDays = weeklyRuns === 2
    ? [2, 6]
    : weeklyRuns === 3
      ? [1, 3, 6]
      : weeklyRuns === 4
        ? [1, 3, 5, 6]
        : weeklyRuns === 5
          ? [0, 1, 3, 5, 6]
          : [0, 1, 2, 4, 5, 6];

  runDays.forEach((dayIndex, sessionIndex) => {
    const [workout, detail] = sessions[sessionIndex];
    workouts[dayIndex] = { ...workouts[dayIndex], kind: 'run', workout, detail };
  });

  return {
    title: `Rencana mingguan · ${focus}`,
    days: workouts,
    source: 'local',
    disclaimer: 'Rencana umum untuk kebugaran, bukan saran medis. Sesuaikan dengan kondisi tubuh dan berhenti jika terasa nyeri.',
  };
}

function reconcileRunDays(schedule, preferences) {
  const localSchedule = createLocalSchedule(preferences);
  const runIndexes = schedule.days
    .map((day, index) => day.kind === 'run' ? index : -1)
    .filter((index) => index >= 0);
  const adjusted = runIndexes.length !== preferences.weeklyRuns;

  if (runIndexes.length > preferences.weeklyRuns) {
    const priority = (index) => {
      const workout = `${schedule.days[index].workout} ${schedule.days[index].detail}`.toLowerCase();
      if (/jarak jauh|long run|long distance/.test(workout)) return 0;
      if (/interval|tempo|speed|kualitas/.test(workout)) return 1;
      return 2 + index / 7;
    };
    runIndexes.sort((left, right) => priority(left) - priority(right));
    runIndexes.length = preferences.weeklyRuns;
  } else {
    localSchedule.days.forEach((day, index) => {
      if (runIndexes.length < preferences.weeklyRuns && day.kind === 'run' && !runIndexes.includes(index)) {
        runIndexes.push(index);
      }
    });
  }

  const selected = new Set(runIndexes);
  return {
    days: schedule.days.map((day, index) => {
      if (selected.has(index)) {
        return day.kind === 'run' ? day : localSchedule.days[index];
      }
      return day.kind === 'run'
        ? { ...day, kind: 'rest', workout: 'Istirahat', detail: 'Pulihkan tubuh. Jalan ringan dan peregangan boleh dilakukan.' }
        : day;
    }),
    adjusted,
  };
}

function parseGeneratedSchedule(content, preferences) {
  const jsonContent = content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const parsed = scheduleResponseSchema.parse(JSON.parse(jsonContent));
  const reconciled = reconcileRunDays(parsed, preferences);
  return { ...parsed, ...reconciled };
}

async function requestScheduleFromModels(preferences, config, fetchImplementation = fetch, logger = console) {
  const {
    OPENROUTER_API_KEY: apiKey,
    OPENROUTER_API_URL: apiUrl,
    OPENROUTER_MAX_TOKENS: maxTokens,
    OPENROUTER_MODELS: models,
    OPENROUTER_TEMPERATURE: temperature,
    OPENROUTER_TIMEOUT_MS: timeoutMs,
    APP_URL: appUrl,
  } = config;
  let lastError;

  for (const [index, model] of models.entries()) {
    try {
      const response = await fetchImplementation(apiUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': appUrl,
          'X-Title': 'TITUT Run',
        },
        body: JSON.stringify({
          model,
          temperature,
          max_tokens: maxTokens,
          messages: [
            {
              role: 'system',
              content: 'Kamu asisten latihan lari yang berhati-hati. Susun jadwal mingguan realistis dalam bahasa Indonesia untuk pelari. Jangan mendiagnosis, menjanjikan hasil, atau memberi instruksi berbahaya. Sertakan tepat tujuh hari dalam urutan Senin sampai Minggu dan tetapkan kind "run" tepat sebanyak nilai weeklyRuns dari preferensi; hari lainnya wajib kind "rest". Kembalikan hanya JSON valid dengan bentuk {"title":"...","days":[{"day":"Senin","kind":"run","workout":"...","detail":"..."}]}.',
            },
            {
              role: 'user',
              content: JSON.stringify(preferences),
            },
          ],
        }),
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (!response.ok) {
        throw new Error(`OpenRouter merespons HTTP ${response.status}.`);
      }

      const payload = await response.json();
      const content = payload.choices?.[0]?.message?.content;
      if (typeof content !== 'string') {
        throw new Error('OpenRouter tidak mengembalikan konten jadwal.');
      }
      const { adjusted, ...parsed } = parseGeneratedSchedule(content, preferences);

      return {
        ...parsed,
        source: 'openrouter',
        modelUsed: model,
        adjusted,
        disclaimer: 'Rencana umum untuk kebugaran, bukan saran medis. Sesuaikan dengan kondisi tubuh dan berhenti jika terasa nyeri.',
      };
    } catch (error) {
      lastError = error;
      logger.warn(
        `OpenRouter model ${model} gagal (${index + 1}/${models.length}); ${index + 1 < models.length ? 'mencoba model berikutnya.' : 'tidak ada model lain.'}`,
        error instanceof Error ? error.message : 'Kesalahan tidak dikenal.',
      );
    }
  }

  throw lastError ?? new Error('Tidak ada model OpenRouter yang dikonfigurasi.');
}

async function generateTrainingSchedule(preferences) {
  const config = readRuntimeConfig();
  if (!config.OPENROUTER_API_KEY) {
    return createLocalSchedule(preferences);
  }

  try {
    return await requestScheduleFromModels(preferences, config);
  } catch (error) {
    console.error('Semua model OpenRouter gagal; menggunakan jadwal lokal.', error);
    return {
      ...createLocalSchedule(preferences),
      fallbackReason: 'Semua model AI gagal. Jadwal lokal ditampilkan sebagai gantinya.',
    };
  }
}

export { createLocalSchedule, generateTrainingSchedule, parseGeneratedSchedule, requestScheduleFromModels };
