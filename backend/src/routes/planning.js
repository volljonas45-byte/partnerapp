const express = require('express');
const router = express.Router();
const { getOne, getAll, run } = require('../db/pg');
const authenticate = require('../middleware/auth');

router.use(authenticate);

// ── HELPERS ──────────────────────────────────────────────────────────────────

function currentWeekStart() {
  const now = new Date();
  const day = now.getDay() || 7;
  const mon = new Date(now);
  mon.setDate(now.getDate() - day + 1);
  return mon.toISOString().slice(0, 10);
}

// ── KPIs ──────────────────────────────────────────────────────────────────────

router.get('/kpis', async (req, res) => {
  try {
    const rows = await getAll(
      `SELECT k.*, u.name AS owner_name, u.color AS owner_color
       FROM planning_kpis k
       LEFT JOIN users u ON u.id = k.owner_id
       WHERE k.user_id = ?
       ORDER BY k.area, k.created_at DESC`,
      [req.workspaceUserId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/kpis', async (req, res) => {
  const { title, area, owner_id, target_value, current_value, unit, frequency, description, color } = req.body;
  try {
    const { lastInsertRowid } = await run(
      `INSERT INTO planning_kpis (user_id, title, area, owner_id, target_value, current_value, unit, frequency, description, color)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
      [req.workspaceUserId, title, area || 'Allgemein', owner_id || null,
       target_value ?? 100, current_value ?? 0, unit || '%',
       frequency || 'monthly', description || '', color || 'blue']
    );
    const kpi = await getOne(
      `SELECT k.*, u.name AS owner_name, u.color AS owner_color
       FROM planning_kpis k LEFT JOIN users u ON u.id = k.owner_id WHERE k.id = ?`,
      [lastInsertRowid]
    );
    res.status(201).json(kpi);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/kpis/:id', async (req, res) => {
  const { title, area, owner_id, target_value, current_value, unit, frequency, description, color, is_active } = req.body;
  try {
    await run(
      `UPDATE planning_kpis
       SET title=?, area=?, owner_id=?, target_value=?, current_value=?,
           unit=?, frequency=?, description=?, color=?, is_active=?, updated_at=NOW()
       WHERE id=? AND user_id=?`,
      [title, area, owner_id || null, target_value, current_value,
       unit, frequency, description, color, is_active ?? true,
       req.params.id, req.workspaceUserId]
    );
    const kpi = await getOne(
      `SELECT k.*, u.name AS owner_name, u.color AS owner_color
       FROM planning_kpis k LEFT JOIN users u ON u.id = k.owner_id WHERE k.id = ?`,
      [req.params.id]
    );
    res.json(kpi);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/kpis/:id', async (req, res) => {
  try {
    await run('DELETE FROM planning_kpis WHERE id=? AND user_id=?', [req.params.id, req.workspaceUserId]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── DECISIONS ──────────────────────────────────────────────────────────────────

router.get('/decisions', async (req, res) => {
  try {
    const rows = await getAll(
      `SELECT d.*, u.name AS owner_name, u.color AS owner_color
       FROM planning_decisions d
       LEFT JOIN users u ON u.id = d.owner_id
       WHERE d.user_id = ?
       ORDER BY d.decided_at DESC`,
      [req.workspaceUserId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/decisions', async (req, res) => {
  const { title, description, impact, area, owner_id, status, decided_at } = req.body;
  try {
    const { lastInsertRowid } = await run(
      `INSERT INTO planning_decisions (user_id, title, description, impact, area, owner_id, status, decided_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
      [req.workspaceUserId, title, description || '', impact || '',
       area || 'Allgemein', owner_id || null, status || 'active',
       decided_at || new Date().toISOString()]
    );
    const dec = await getOne(
      `SELECT d.*, u.name AS owner_name, u.color AS owner_color
       FROM planning_decisions d LEFT JOIN users u ON u.id = d.owner_id WHERE d.id = ?`,
      [lastInsertRowid]
    );
    res.status(201).json(dec);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/decisions/:id', async (req, res) => {
  const { title, description, impact, area, owner_id, status, decided_at } = req.body;
  try {
    await run(
      `UPDATE planning_decisions
       SET title=?, description=?, impact=?, area=?, owner_id=?, status=?, decided_at=?, updated_at=NOW()
       WHERE id=? AND user_id=?`,
      [title, description, impact, area, owner_id || null, status, decided_at,
       req.params.id, req.workspaceUserId]
    );
    const dec = await getOne(
      `SELECT d.*, u.name AS owner_name, u.color AS owner_color
       FROM planning_decisions d LEFT JOIN users u ON u.id = d.owner_id WHERE d.id = ?`,
      [req.params.id]
    );
    res.json(dec);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/decisions/:id', async (req, res) => {
  try {
    await run('DELETE FROM planning_decisions WHERE id=? AND user_id=?', [req.params.id, req.workspaceUserId]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── TASKS ──────────────────────────────────────────────────────────────────────

router.get('/tasks', async (req, res) => {
  const { status } = req.query;
  try {
    const rows = await getAll(
      `SELECT t.*, u.name AS owner_name, u.color AS owner_color
       FROM planning_tasks t
       LEFT JOIN users u ON u.id = t.owner_id
       WHERE t.user_id = ? ${status ? 'AND t.status = ?' : ''}
       ORDER BY
         CASE t.priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
         t.due_date ASC NULLS LAST,
         t.created_at DESC`,
      status ? [req.workspaceUserId, status] : [req.workspaceUserId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/tasks', async (req, res) => {
  const { title, description, type, area, owner_id, status, priority, due_date } = req.body;
  try {
    const { lastInsertRowid } = await run(
      `INSERT INTO planning_tasks (user_id, title, description, type, area, owner_id, status, priority, due_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
      [req.workspaceUserId, title, description || '', type || 'task',
       area || 'Allgemein', owner_id || null, status || 'open',
       priority || 'medium', due_date || null]
    );
    const task = await getOne(
      `SELECT t.*, u.name AS owner_name, u.color AS owner_color
       FROM planning_tasks t LEFT JOIN users u ON u.id = t.owner_id WHERE t.id = ?`,
      [lastInsertRowid]
    );
    res.status(201).json(task);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/tasks/:id', async (req, res) => {
  const { title, description, type, area, owner_id, status, priority, due_date } = req.body;
  try {
    await run(
      `UPDATE planning_tasks
       SET title=?, description=?, type=?, area=?, owner_id=?, status=?, priority=?, due_date=?, updated_at=NOW()
       WHERE id=? AND user_id=?`,
      [title, description, type, area, owner_id || null, status, priority, due_date || null,
       req.params.id, req.workspaceUserId]
    );
    const task = await getOne(
      `SELECT t.*, u.name AS owner_name, u.color AS owner_color
       FROM planning_tasks t LEFT JOIN users u ON u.id = t.owner_id WHERE t.id = ?`,
      [req.params.id]
    );
    res.json(task);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/tasks/:id', async (req, res) => {
  try {
    await run('DELETE FROM planning_tasks WHERE id=? AND user_id=?', [req.params.id, req.workspaceUserId]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── FEEDBACK ──────────────────────────────────────────────────────────────────

router.get('/feedback', async (req, res) => {
  const { week, author_id } = req.query;
  const weekStr = week || currentWeekStart();
  try {
    let sql = `
      SELECT f.*, u.name AS author_name, u.color AS author_color, u.email AS author_email
      FROM planning_feedback f
      JOIN users u ON u.id = f.author_id
      WHERE f.user_id = ? AND f.week_start = ?`;
    const params = [req.workspaceUserId, weekStr];
    if (author_id) { sql += ' AND f.author_id = ?'; params.push(author_id); }
    sql += ' ORDER BY u.name';
    const rows = await getAll(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/feedback/weeks', async (req, res) => {
  try {
    const rows = await getAll(
      `SELECT DISTINCT week_start FROM planning_feedback WHERE user_id = ?
       ORDER BY week_start DESC LIMIT 20`,
      [req.workspaceUserId]
    );
    res.json(rows.map(r => r.week_start));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/feedback', async (req, res) => {
  const { author_id, week_start, area, rating, wins, blockers, next_steps, improvement_goal } = req.body;
  const weekStr = week_start || currentWeekStart();
  const aid = author_id || req.userId;
  try {
    await run(
      `INSERT INTO planning_feedback (user_id, author_id, week_start, area, rating, wins, blockers, next_steps, improvement_goal)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (user_id, author_id, week_start)
       DO UPDATE SET area=EXCLUDED.area, rating=EXCLUDED.rating, wins=EXCLUDED.wins,
         blockers=EXCLUDED.blockers, next_steps=EXCLUDED.next_steps,
         improvement_goal=EXCLUDED.improvement_goal, updated_at=NOW()
       RETURNING id`,
      [req.workspaceUserId, aid, weekStr, area || 'Allgemein',
       rating || null, wins || '', blockers || '', next_steps || '', improvement_goal || '']
    );
    const entry = await getOne(
      `SELECT f.*, u.name AS author_name, u.color AS author_color, u.email AS author_email
       FROM planning_feedback f JOIN users u ON u.id = f.author_id
       WHERE f.user_id = ? AND f.author_id = ? AND f.week_start = ?`,
      [req.workspaceUserId, aid, weekStr]
    );
    res.status(201).json(entry);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/feedback/:id', async (req, res) => {
  const { area, rating, wins, blockers, next_steps, improvement_goal } = req.body;
  try {
    await run(
      `UPDATE planning_feedback
       SET area=?, rating=?, wins=?, blockers=?, next_steps=?, improvement_goal=?, updated_at=NOW()
       WHERE id=? AND user_id=?`,
      [area, rating, wins, blockers, next_steps, improvement_goal,
       req.params.id, req.workspaceUserId]
    );
    const entry = await getOne(
      `SELECT f.*, u.name AS author_name, u.color AS author_color, u.email AS author_email
       FROM planning_feedback f JOIN users u ON u.id = f.author_id WHERE f.id = ?`,
      [req.params.id]
    );
    res.json(entry);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
