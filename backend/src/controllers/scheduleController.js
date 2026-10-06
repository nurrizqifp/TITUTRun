import { pool } from '../config/db.js';

function formatLog(row) {
  return {
    id: row.id,
    date: row.date instanceof Date ? row.date.toISOString().slice(0, 10) : row.date,
    distanceKm: Number(row.distance_km),
    durationMinutes: row.duration_minutes,
    rpe: row.rpe,
    notes: row.notes,
  };
}

async function getLogs(_req, res, next) {
  try {
    const { rows } = await pool.query(`
      SELECT id, date::text AS date, distance_km, duration_minutes, rpe, notes
      FROM training_logs
      ORDER BY date DESC, id DESC
      LIMIT 200
    `);
    res.json(rows.map(formatLog));
  } catch (error) {
    next(error);
  }
}

async function createLog(req, res, next) {
  try {
    const { date, distanceKm, durationMinutes, rpe, notes } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO training_logs (date, distance_km, duration_minutes, rpe, notes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, date::text AS date, distance_km, duration_minutes, rpe, notes`,
      [date, distanceKm, durationMinutes, rpe, notes],
    );
    res.status(201).json(formatLog(rows[0]));
  } catch (error) {
    next(error);
  }
}

export { createLog, getLogs };
