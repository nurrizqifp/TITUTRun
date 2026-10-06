import test from 'node:test';
import assert from 'node:assert/strict';
import { readRuntimeConfig } from '../src/config/runtime.js';
import { metricsSchema } from '../src/middlewares/validateMetrics.js';
import {
  createLocalSchedule,
  generateTrainingSchedule,
  parseGeneratedSchedule,
  requestScheduleFromModels,
} from '../src/services/aiService.js';

const preferences = { goal: '5K', experience: 'Pemula', weeklyRuns: 3 };
const modelNames = ['provider/first', 'provider/second', 'provider/third'];
const modelConfig = {
  OPENROUTER_API_KEY: 'test-key',
  OPENROUTER_API_URL: 'https://openrouter.example.test/api',
  OPENROUTER_MODELS: modelNames,
  OPENROUTER_TEMPERATURE: 0.5,
  OPENROUTER_TIMEOUT_MS: 25,
  OPENROUTER_MAX_TOKENS: 1200,
  APP_URL: 'http://localhost',
};
const completeRuntimeConfig = {
  PORT: '4100',
  DATABASE_URL: 'postgres://runner:local@localhost:5432/titut_run',
  APP_URL: 'http://localhost:3000',
  CORS_ORIGIN: 'http://localhost:5173,http://localhost:3000',
  OPENROUTER_API_KEY: '',
  OPENROUTER_MODELS: modelNames.join(','),
  OPENROUTER_API_URL: modelConfig.OPENROUTER_API_URL,
  OPENROUTER_TIMEOUT_MS: '25',
  OPENROUTER_TEMPERATURE: '0.5',
  OPENROUTER_MAX_TOKENS: '1200',
};

function validModelContent() {
  const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu']
    .map((day, index) => ({
      day,
      kind: [0, 2, 5].includes(index) ? 'run' : 'rest',
      workout: [0, 2, 5].includes(index) ? 'Lari santai' : 'Istirahat',
      detail: 'Usaha ringan dan nyaman.',
    }));
  return JSON.stringify({ title: 'Rencana mingguan', days });
}

test('requires runtime configuration rather than using hardcoded port or URL defaults', () => {
  assert.throws(() => readRuntimeConfig({}), /PORT.*DATABASE_URL/);

  const config = readRuntimeConfig(completeRuntimeConfig);
  assert.equal(config.PORT, 4100);
  assert.deepEqual(config.CORS_ORIGIN, ['http://localhost:5173', 'http://localhost:3000']);
  assert.deepEqual(config.OPENROUTER_MODELS, modelNames);
  assert.equal(config.OPENROUTER_TIMEOUT_MS, 25);
  assert.equal(config.OPENROUTER_TEMPERATURE, 0.5);
  assert.equal(config.OPENROUTER_MAX_TOKENS, 1200);
});

test('validates realistic running metrics and normalizes notes', () => {
  const result = metricsSchema.safeParse({
    date: '2026-10-06',
    distanceKm: 5,
    durationMinutes: 32,
    rpe: 6,
  });

  assert.equal(result.success, true);
  assert.equal(result.data.notes, '');
});

test('rejects metrics outside the documented limits', () => {
  const result = metricsSchema.safeParse({
    date: '2026-10-06',
    distanceKm: 0,
    durationMinutes: 0,
    rpe: 11,
  });

  assert.equal(result.success, false);
});

test('local schedule includes seven days and the requested number of runs', () => {
  const schedule = createLocalSchedule({
    goal: '5K',
    experience: 'Pemula',
    weeklyRuns: 3,
  });

  assert.equal(schedule.source, 'local');
  assert.equal(schedule.days.length, 7);
  assert.equal(schedule.days.filter(({ kind }) => kind === 'run').length, 3);
});

test('reconciles an AI schedule that exceeds the requested running days', () => {
  const preferences = { goal: '5K', experience: 'Pemula', weeklyRuns: 3 };
  const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu']
    .map((day) => ({ day, kind: 'run', workout: 'Lari santai', detail: 'Usaha ringan.' }));
  const result = parseGeneratedSchedule(JSON.stringify({ title: 'Rencana 5K', days }), preferences);

  assert.equal(result.adjusted, true);
  assert.equal(result.days.filter(({ kind }) => kind === 'run').length, preferences.weeklyRuns);
});

test('rejects AI schedules that do not contain the seven weekdays in order', () => {
  const days = ['Selasa', 'Senin', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu']
    .map((day) => ({ day, kind: 'rest', workout: 'Istirahat', detail: 'Pulihkan tubuh.' }));

  assert.throws(
    () => parseGeneratedSchedule(JSON.stringify({ title: 'Rencana 5K', days }), {
      goal: '5K',
      experience: 'Pemula',
      weeklyRuns: 3,
    }),
  );
});

test('tries the next configured model after provider errors and returns the first valid schedule', async () => {
  const attemptedModels = [];
  const warnings = [];
  const result = await requestScheduleFromModels(
    preferences,
    modelConfig,
    async (_url, options) => {
      const model = JSON.parse(options.body).model;
      attemptedModels.push(model);
      if (model === modelNames[0]) {
        return { ok: false, status: 429 };
      }
      if (model === modelNames[1]) {
        throw new Error('Network unavailable');
      }
      return { ok: true, json: async () => ({ choices: [{ message: { content: validModelContent() } }] }) };
    },
    { warn: (...args) => warnings.push(args) },
  );

  assert.deepEqual(attemptedModels, modelNames);
  assert.equal(warnings.length, 2);
  assert.equal(result.modelUsed, modelNames[2]);
  assert.equal(result.days.filter(({ kind }) => kind === 'run').length, preferences.weeklyRuns);
});

test('tries the next model when a provider returns an invalid schedule', async () => {
  const attemptedModels = [];
  const result = await requestScheduleFromModels(
    preferences,
    { ...modelConfig, OPENROUTER_MODELS: modelNames.slice(0, 2) },
    async (_url, options) => {
      const model = JSON.parse(options.body).model;
      attemptedModels.push(model);
      return {
        ok: true,
        json: async () => ({
          choices: [{ message: { content: model === modelNames[0] ? 'invalid JSON' : validModelContent() } }],
        }),
      };
    },
    { warn() {} },
  );

  assert.deepEqual(attemptedModels, modelNames.slice(0, 2));
  assert.equal(result.modelUsed, modelNames[1]);
});

test('returns a visible local fallback when every configured model fails', async () => {
  const originalKey = process.env.OPENROUTER_API_KEY;
  const originalModels = process.env.OPENROUTER_MODELS;
  const originalApiUrl = process.env.OPENROUTER_API_URL;
  const originalTimeout = process.env.OPENROUTER_TIMEOUT_MS;
  const originalTemperature = process.env.OPENROUTER_TEMPERATURE;
  const originalMaxTokens = process.env.OPENROUTER_MAX_TOKENS;
  const originalAppUrl = process.env.APP_URL;
  const originalPort = process.env.PORT;
  const originalDatabaseUrl = process.env.DATABASE_URL;
  const originalCorsOrigin = process.env.CORS_ORIGIN;
  const originalFetch = globalThis.fetch;
  const originalConsoleError = console.error;
  process.env.OPENROUTER_API_KEY = 'test-key';
  process.env.OPENROUTER_MODELS = modelNames.join(',');
  process.env.OPENROUTER_API_URL = modelConfig.OPENROUTER_API_URL;
  process.env.OPENROUTER_TIMEOUT_MS = String(modelConfig.OPENROUTER_TIMEOUT_MS);
  process.env.OPENROUTER_TEMPERATURE = String(modelConfig.OPENROUTER_TEMPERATURE);
  process.env.OPENROUTER_MAX_TOKENS = String(modelConfig.OPENROUTER_MAX_TOKENS);
  process.env.APP_URL = modelConfig.APP_URL;
  process.env.PORT = '4000';
  process.env.DATABASE_URL = 'postgres://test:test@localhost/test';
  process.env.CORS_ORIGIN = 'http://localhost';
  globalThis.fetch = async () => { throw new Error('Network unavailable'); };
  console.error = () => {};

  try {
    const result = await generateTrainingSchedule(preferences);
    assert.equal(result.source, 'local');
    assert.match(result.fallbackReason, /Semua model AI gagal/);
    assert.equal(result.days.filter(({ kind }) => kind === 'run').length, preferences.weeklyRuns);
  } finally {
    if (originalKey === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = originalKey;
    if (originalModels === undefined) delete process.env.OPENROUTER_MODELS;
    else process.env.OPENROUTER_MODELS = originalModels;
    if (originalApiUrl === undefined) delete process.env.OPENROUTER_API_URL;
    else process.env.OPENROUTER_API_URL = originalApiUrl;
    if (originalTimeout === undefined) delete process.env.OPENROUTER_TIMEOUT_MS;
    else process.env.OPENROUTER_TIMEOUT_MS = originalTimeout;
    if (originalTemperature === undefined) delete process.env.OPENROUTER_TEMPERATURE;
    else process.env.OPENROUTER_TEMPERATURE = originalTemperature;
    if (originalMaxTokens === undefined) delete process.env.OPENROUTER_MAX_TOKENS;
    else process.env.OPENROUTER_MAX_TOKENS = originalMaxTokens;
    if (originalAppUrl === undefined) delete process.env.APP_URL;
    else process.env.APP_URL = originalAppUrl;
    if (originalPort === undefined) delete process.env.PORT;
    else process.env.PORT = originalPort;
    if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = originalDatabaseUrl;
    if (originalCorsOrigin === undefined) delete process.env.CORS_ORIGIN;
    else process.env.CORS_ORIGIN = originalCorsOrigin;
    globalThis.fetch = originalFetch;
    console.error = originalConsoleError;
  }
});
