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
 * Query params: project_id, from (YYYY-MM-DD), to (YYYY-MM-DD), scope (workspace)
 * scope=workspace returns entries for all workspace members (for calendar view)
 */
router.get('/entries', async (req, res) => {
  try {
    const { project_id, from, to, scope } = req.query;

    let sql, params;

    if (scope === 'workspace') {
      // All members of the workspace
      const wsId = req.workspaceUserId;
      sql = `
        SELECT te.*, p.name AS project_name,
               u.name AS user_name, u.color AS user_color
        FROM time_entries te
        LEFT JOIN projects p ON p.id = te.project_id
        LEFT JOIN users u ON u.id = te.user_id
        WHERE (te.user_id = ? OR u.workspace_owner_id = ?)
      `;
      params = [wsId, wsId];
    } else {
      sql = `
        SELECT te.*, p.name AS project_name
        FROM time_entries te
        LEFT JOIN projects p ON p.id = te.project_id
        WHERE te.user_id = ?
      `;
      params = [req.userId];
    }

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
    const { project_id, description, start_time, end_time, duration, activity_tag } = req.body;

    if (!start_time) return res.status(400).json({ error: 'start_time is required' });

    // Calculate duration from start/end if not provided
    let dur = duration;
    if (!dur && end_time) {
      dur = Math.round((new Date(end_time) - new Date(start_time)) / 1000);
    }

    const result = await run(`
      INSERT INTO time_entries (user_id, project_id, description, start_time, end_time, duration, activity_tag)
      VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id
    `, [userId, project_id || null, description || '', start_time, end_time || null, dur || null, activity_tag || null]);

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
    const { project_id, description, start_time, end_time, duration, activity_tag } = req.body;

    const entry = await getOne('SELECT * FROM time_entries WHERE id = ? AND user_id = ?', [id, userId]);
    if (!entry) return res.status(404).json({ error: 'Not found' });

    let dur = duration;
    if (!dur && end_time && start_time) {
      dur = Math.round((new Date(end_time) - new Date(start_time)) / 1000);
    }

    await run(`
      UPDATE time_entries
      SET project_id = ?, description = ?, start_time = ?, end_time = ?, duration = ?, activity_tag = ?
      WHERE id = ? AND user_id = ?
    `, [
      project_id !== undefined ? project_id : entry.project_id,
      description !== undefined ? description : entry.description,
      start_time || entry.start_time,
      end_time !== undefined ? end_time : entry.end_time,
      dur !== undefined ? dur : entry.duration,
      activity_tag !== undefined ? (activity_tag || null) : entry.activity_tag,
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

    const { project_id, description, activity_tag } = req.body;
    const startTime = new Date().toISOString();

    const result = await run(`
      INSERT INTO time_entries (user_id, project_id, description, start_time, activity_tag)
      VALUES (?, ?, ?, ?, ?) RETURNING id
    `, [userId, project_id || null, description || '', startTime, activity_tag || null]);

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

    // Use Europe/Berlin timezone for correct day/week boundaries
    const berlinNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Berlin' }));
    const pad = n => String(n).padStart(2, '0');
    const todayStr = `${berlinNow.getFullYear()}-${pad(berlinNow.getMonth() + 1)}-${pad(berlinNow.getDate())}`;
    const monthStr = `${berlinNow.getFullYear()}-${pad(berlinNow.getMonth() + 1)}`;

    // Start of ISO week (Monday) in Berlin time
    const dayOfWeek = berlinNow.getDay() || 7; // Mon=1 … Sun=7
    const weekStart = new Date(berlinNow);
    weekStart.setDate(berlinNow.getDate() - dayOfWeek + 1);
    const weekStartStr = `${weekStart.getFullYear()}-${pad(weekStart.getMonth() + 1)}-${pad(weekStart.getDate())}`;

    const entries = await getAll(`
      SELECT te.duration, te.project_id, te.activity_tag, p.name AS project_name,
             TO_CHAR(te.start_time AT TIME ZONE 'Europe/Berlin', 'YYYY-MM-DD') AS entry_date,
             TO_CHAR(te.start_time AT TIME ZONE 'Europe/Berlin', 'YYYY-MM') AS entry_month
      FROM time_entries te
      LEFT JOIN projects p ON p.id = te.project_id
      WHERE te.user_id = ? AND te.duration IS NOT NULL
    `, [userId]);

    let today_sec = 0, week_sec = 0, month_sec = 0;
    const byProjectMap = {};
    const byActivityMap = {};

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

      if (e.activity_tag) {
        if (!byActivityMap[e.activity_tag]) {
          byActivityMap[e.activity_tag] = { activity_tag: e.activity_tag, total_sec: 0 };
        }
        byActivityMap[e.activity_tag].total_sec += dur;
      }
    }

    res.json({
      today_sec,
      week_sec,
      month_sec,
      byProject:  Object.values(byProjectMap).sort((a, b) => b.total_sec - a.total_sec),
      byActivity: Object.values(byActivityMap).sort((a, b) => b.total_sec - a.total_sec),
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

/**
 * POST /api/time/migrate-project
 * Renames a project OR moves all time entries from one project to another.
 * Body: { from_name, to_name }
 */
router.post('/migrate-project', async (req, res) => {
  try {
    const userId = req.userId;
    const { from_name, to_name } = req.body;
    if (!from_name || !to_name) return res.status(400).json({ error: 'from_name and to_name required' });

    const fromProject = await getOne(
      'SELECT id, name FROM projects WHERE LOWER(name) = LOWER(?) AND user_id = ?',
      [from_name.trim(), userId]
    );
    if (!fromProject) return res.json({ updated: 0, message: 'Source project not found' });

    const toProject = await getOne(
      'SELECT id, name FROM projects WHERE LOWER(name) = LOWER(?) AND user_id = ?',
      [to_name.trim(), userId]
    );

    if (!toProject) {
      // No target project exists — just rename the source project
      await run('UPDATE projects SET name = ? WHERE id = ?', [to_name.trim(), fromProject.id]);
      const { count } = await getOne(
        'SELECT COUNT(*)::int AS count FROM time_entries WHERE project_id = ? AND user_id = ?',
        [fromProject.id, userId]
      );
      return res.json({ action: 'renamed', updated: count, from: from_name, to: to_name });
    }

    // Target exists — move all entries from source project to target
    const result = await run(
      'UPDATE time_entries SET project_id = ? WHERE project_id = ? AND user_id = ?',
      [toProject.id, fromProject.id, userId]
    );
    return res.json({ action: 'migrated', updated: result.changes, from: from_name, to: to_name });
  } catch (err) {
    console.error('[time POST /migrate-project]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/time/migrate-to-activity-tags
 * Converts time entries belonging to "activity-type" projects (Cold Call, Leads, etc.)
 * into activity_tag entries with project_id = null.
 * Body: { project_names: ['Cold Call', 'Leads'] }
 */
router.post('/migrate-to-activity-tags', async (req, res) => {
  try {
    const userId = req.userId;
    const { project_names = [] } = req.body;
    if (!project_names.length) return res.json({ migrated: 0 });

    let totalMigrated = 0;
    const deletedProjects = [];

    for (const name of project_names) {
      const project = await getOne(
        'SELECT id, name FROM projects WHERE LOWER(name) = LOWER(?) AND user_id = ?',
        [name.trim(), userId]
      );
      if (!project) continue;

      const result = await run(
        'UPDATE time_entries SET activity_tag = ?, project_id = NULL WHERE project_id = ? AND user_id = ?',
        [project.name, project.id, userId]
      );
      totalMigrated += result.changes;

      // Delete the project if it now has no entries
      const remaining = await getOne(
        'SELECT COUNT(*)::int AS count FROM time_entries WHERE project_id = ? AND user_id = ?',
        [project.id, userId]
      );
      if ((remaining?.count || 0) === 0) {
        await run('DELETE FROM projects WHERE id = ? AND user_id = ?', [project.id, userId]);
        deletedProjects.push(project.name);
      }
    }

    res.json({ migrated: totalMigrated, deletedProjects });
  } catch (err) {
    console.error('[time POST /migrate-to-activity-tags]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
