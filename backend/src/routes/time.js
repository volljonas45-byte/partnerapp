const express = require('express');
const { getOne, getAll, run } = require('../db/pg');
const authenticate = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDuration(seconds) {
  if (!seconds) return 0;
  return Math.floor(seconds);
}

// ── Time Entries ──────────────────────────────────────────────────────────────

/**
 * GET /api/time/entries
 * Query params: project_id, from (YYYY-MM-DD), to (YYYY-MM-DD)
 */
router.get('/entries', async (req, res) => {
  try {
    const userId = req.userId;
    const { project_id, from, to } = req.query;

    let sql = `
      SELECT te.*, p.name AS project_name
      FROM time_entries te
      LEFT JOIN projects p ON p.id = te.project_id
      WHERE te.user_id = ?
    `;
    const params = [userId];

    if (project_id) { sql += ' AND te.project_id = ?'; params.push(project_id); }
    if (from)       { sql += ' AND DATE(te.start_time) >= ?'; params.push(from); }
    if (to)         { sql += ' AND DATE(te.start_time) <= ?'; params.push(to); }

    sql += ' ORDER BY te.start_time DESC';

    const entries = await getAll(sql, params);
    res.json(entries);
  } catch (err) {
    console.error('[time GET /entries]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/time/entries
 * Manual entry: { project_id, description, start_time, end_time, duration }
 */
router.post('/entries', async (req, res) => {
  try {
    const userId = req.userId;
    const { project_id, description, start_time, end_time, duration } = req.body;

    if (!start_time) return res.status(400).json({ error: 'start_time is required' });

    // Calculate duration from start/end if not provided
    let dur = duration;
    if (!dur && end_time) {
      dur = Math.round((new Date(end_time) - new Date(start_time)) / 1000);
    }

    const result = await run(`
      INSERT INTO time_entries (user_id, project_id, description, start_time, end_time, duration)
      VALUES (?, ?, ?, ?, ?, ?) RETURNING id
    `, [userId, project_id || null, description || '', start_time, end_time || null, dur || null]);

    const entry = await getOne(`
      SELECT te.*, p.name AS project_name
      FROM time_entries te LEFT JOIN projects p ON p.id = te.project_id
      WHERE te.id = ?
    `, [result.lastInsertRowid]);

    res.status(201).json(entry);
  } catch (err) {
    console.error('[time POST /entries]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/time/entries/:id
 */
router.put('/entries/:id', async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const { project_id, description, start_time, end_time, duration } = req.body;

    const entry = await getOne('SELECT * FROM time_entries WHERE id = ? AND user_id = ?', [id, userId]);
    if (!entry) return res.status(404).json({ error: 'Not found' });

    let dur = duration;
    if (!dur && end_time && start_time) {
      dur = Math.round((new Date(end_time) - new Date(start_time)) / 1000);
    }

    await run(`
      UPDATE time_entries
      SET project_id = ?, description = ?, start_time = ?, end_time = ?, duration = ?
      WHERE id = ? AND user_id = ?
    `, [
      project_id !== undefined ? project_id : entry.project_id,
      description !== undefined ? description : entry.description,
      start_time || entry.start_time,
      end_time !== undefined ? end_time : entry.end_time,
      dur !== undefined ? dur : entry.duration,
      id, userId,
    ]);

    const updated = await getOne(`
      SELECT te.*, p.name AS project_name
      FROM time_entries te LEFT JOIN projects p ON p.id = te.project_id
      WHERE te.id = ?
    `, [id]);
    res.json(updated);
  } catch (err) {
    console.error('[time PUT /entries/:id]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/time/entries/:id
 */
router.delete('/entries/:id', async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const entry = await getOne('SELECT id FROM time_entries WHERE id = ? AND user_id = ?', [id, userId]);
    if (!entry) return res.status(404).json({ error: 'Not found' });
    await run('DELETE FROM time_entries WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('[time DELETE /entries/:id]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Timer ─────────────────────────────────────────────────────────────────────

/**
 * GET /api/time/timer/active
 * Returns the currently running timer (no end_time) or null
 */
router.get('/timer/active', async (req, res) => {
  try {
    const entry = await getOne(`
      SELECT te.*, p.name AS project_name
      FROM time_entries te LEFT JOIN projects p ON p.id = te.project_id
      WHERE te.user_id = ? AND te.end_time IS NULL AND te.duration IS NULL
      ORDER BY te.start_time DESC LIMIT 1
    `, [req.userId]);
    res.json(entry || null);
  } catch (err) {
    console.error('[time GET /timer/active]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/time/timer/start
 * Body: { project_id, description }
 */
router.post('/timer/start', async (req, res) => {
  try {
    const userId = req.userId;

    // Stop any existing timer first
    const active = await getOne(
      'SELECT id FROM time_entries WHERE user_id = ? AND end_time IS NULL AND duration IS NULL',
      [userId]
    );
    if (active) {
      const now = new Date();
      const existing = await getOne('SELECT start_time FROM time_entries WHERE id = ?', [active.id]);
      const dur = Math.round((now - new Date(existing.start_time)) / 1000);
      await run(
        'UPDATE time_entries SET end_time = ?, duration = ? WHERE id = ?',
        [now.toISOString(), dur, active.id]
      );
    }

    const { project_id, description } = req.body;
    const startTime = new Date().toISOString();

    const result = await run(`
      INSERT INTO time_entries (user_id, project_id, description, start_time)
      VALUES (?, ?, ?, ?) RETURNING id
    `, [userId, project_id || null, description || '', startTime]);

    const entry = await getOne(`
      SELECT te.*, p.name AS project_name
      FROM time_entries te LEFT JOIN projects p ON p.id = te.project_id
      WHERE te.id = ?
    `, [result.lastInsertRowid]);

    res.status(201).json(entry);
  } catch (err) {
    console.error('[time POST /timer/start]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/time/timer/stop
 * Body: { id } — stops the running timer
 */
router.post('/timer/stop', async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.body;

    const entry = await getOne(
      'SELECT * FROM time_entries WHERE id = ? AND user_id = ? AND end_time IS NULL',
      [id, userId]
    );
    if (!entry) return res.status(404).json({ error: 'Active timer not found' });

    const now = new Date();
    const dur = Math.round((now - new Date(entry.start_time)) / 1000);

    await run(
      'UPDATE time_entries SET end_time = ?, duration = ? WHERE id = ?',
      [now.toISOString(), dur, id]
    );

    const updated = await getOne(`
      SELECT te.*, p.name AS project_name
      FROM time_entries te LEFT JOIN projects p ON p.id = te.project_id
      WHERE te.id = ?
    `, [id]);
    res.json(updated);
  } catch (err) {
    console.error('[time POST /timer/stop]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Summary ───────────────────────────────────────────────────────────────────

/**
 * GET /api/time/summary
 * Returns total seconds for today, this week, this month, and per-project breakdown
 */
router.get('/summary', async (req, res) => {
  try {
    const userId = req.userId;
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    // Start of week (Monday)
    const day = now.getDay() || 7;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - day + 1);
    const weekStartStr = weekStart.toISOString().slice(0, 10);

    const monthStr = now.toISOString().slice(0, 7); // YYYY-MM

    const entries = await getAll(`
      SELECT te.duration, te.project_id, p.name AS project_name,
             DATE(te.start_time) AS entry_date,
             TO_CHAR(te.start_time, 'YYYY-MM') AS entry_month
      FROM time_entries te
      LEFT JOIN projects p ON p.id = te.project_id
      WHERE te.user_id = ? AND te.duration IS NOT NULL
    `, [userId]);

    let today_sec = 0, week_sec = 0, month_sec = 0;
    const byProjectMap = {};

    for (const e of entries) {
      const dur = e.duration || 0;
      if (e.entry_date === todayStr) today_sec += dur;
      if (e.entry_date >= weekStartStr) week_sec += dur;
      if (e.entry_month === monthStr) month_sec += dur;

      if (e.project_id) {
        if (!byProjectMap[e.project_id]) {
          byProjectMap[e.project_id] = { project_id: e.project_id, project_name: e.project_name, total_sec: 0 };
        }
        byProjectMap[e.project_id].total_sec += dur;
      }
    }

    res.json({
      today_sec,
      week_sec,
      month_sec,
      byProject: Object.values(byProjectMap).sort((a, b) => b.total_sec - a.total_sec),
    });
  } catch (err) {
    console.error('[time GET /summary]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Fahrtenbuch ───────────────────────────────────────────────────────────────

/**
 * GET /api/time/fahrtenbuch
 * Query params: month (YYYY-MM), project_id
 */
router.get('/fahrtenbuch', async (req, res) => {
  try {
    const userId = req.userId;
    const { month, project_id } = req.query;

    let sql = `
      SELECT fe.*, p.name AS project_name
      FROM fahrtenbuch_entries fe
      LEFT JOIN projects p ON p.id = fe.project_id
      WHERE fe.user_id = ?
    `;
    const params = [userId];

    if (month)      { sql += ` AND TO_CHAR(TO_DATE(fe.date, 'YYYY-MM-DD'), 'YYYY-MM') = ?`; params.push(month); }
    if (project_id) { sql += ' AND fe.project_id = ?'; params.push(project_id); }

    sql += ' ORDER BY fe.date DESC, fe.created_at DESC';

    const entries = await getAll(sql, params);
    res.json(entries);
  } catch (err) {
    console.error('[time GET /fahrtenbuch]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/time/fahrtenbuch
 */
router.post('/fahrtenbuch', async (req, res) => {
  try {
    const userId = req.userId;
    const { project_id, date, from_loc, to_loc, distance_km, purpose, notes } = req.body;

    if (!date) return res.status(400).json({ error: 'date is required' });

    const result = await run(`
      INSERT INTO fahrtenbuch_entries (user_id, project_id, date, from_loc, to_loc, distance_km, purpose, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id
    `, [userId, project_id || null, date, from_loc || '', to_loc || '', distance_km || 0, purpose || '', notes || '']);

    const entry = await getOne(`
      SELECT fe.*, p.name AS project_name
      FROM fahrtenbuch_entries fe LEFT JOIN projects p ON p.id = fe.project_id
      WHERE fe.id = ?
    `, [result.lastInsertRowid]);

    res.status(201).json(entry);
  } catch (err) {
    console.error('[time POST /fahrtenbuch]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/time/fahrtenbuch/:id
 */
router.put('/fahrtenbuch/:id', async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const entry = await getOne('SELECT * FROM fahrtenbuch_entries WHERE id = ? AND user_id = ?', [id, userId]);
    if (!entry) return res.status(404).json({ error: 'Not found' });

    const { project_id, date, from_loc, to_loc, distance_km, purpose, notes } = req.body;
    await run(`
      UPDATE fahrtenbuch_entries
      SET project_id = ?, date = ?, from_loc = ?, to_loc = ?, distance_km = ?, purpose = ?, notes = ?
      WHERE id = ? AND user_id = ?
    `, [
      project_id !== undefined ? project_id : entry.project_id,
      date || entry.date,
      from_loc !== undefined ? from_loc : entry.from_loc,
      to_loc !== undefined ? to_loc : entry.to_loc,
      distance_km !== undefined ? distance_km : entry.distance_km,
      purpose !== undefined ? purpose : entry.purpose,
      notes !== undefined ? notes : entry.notes,
      id, userId,
    ]);

    const updated = await getOne(`
      SELECT fe.*, p.name AS project_name
      FROM fahrtenbuch_entries fe LEFT JOIN projects p ON p.id = fe.project_id
      WHERE fe.id = ?
    `, [id]);
    res.json(updated);
  } catch (err) {
    console.error('[time PUT /fahrtenbuch/:id]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/time/fahrtenbuch/:id
 */
router.delete('/fahrtenbuch/:id', async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const entry = await getOne('SELECT id FROM fahrtenbuch_entries WHERE id = ? AND user_id = ?', [id, userId]);
    if (!entry) return res.status(404).json({ error: 'Not found' });
    await run('DELETE FROM fahrtenbuch_entries WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('[time DELETE /fahrtenbuch/:id]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
