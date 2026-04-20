const express = require('express');
const bcrypt = require('bcryptjs');
const { getOne, getAll, run } = require('../db/pg');
const authenticate = require('../middleware/auth');
const { sendWelcomeEmail } = require('../services/emailService');

const router = express.Router();
router.use(authenticate);

const VALID_ROLES = ['ceo', 'admin', 'pm', 'developer'];
const PRIVILEGED  = ['ceo', 'admin'];

/**
 * GET /api/team
 * Returns all members in the same workspace.
 */
router.get('/', async (req, res) => {
  try {
    const wsId = req.workspaceUserId;
    const includeHidden = req.query.include_hidden === '1';
    const visibilityFilter = includeHidden ? '' : ' AND show_in_dashboard = TRUE';
    const members = await getAll(`
      SELECT id, email, name, color, role, workspace_owner_id, show_in_dashboard, created_at
      FROM users
      WHERE (id = ? OR workspace_owner_id = ?)${visibilityFilter}
      ORDER BY id ASC
    `, [wsId, wsId]);
    res.json(members);
  } catch (err) {
    console.error('[team GET /]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/team/stats
 * Returns per-member task counts, project count, and time this week.
 */
router.get('/stats', async (req, res) => {
  try {
    const wsId = req.workspaceUserId;

    // All workspace member IDs (only those enabled for dashboard)
    const members = await getAll(`
      SELECT id, email, name, color, role
      FROM users WHERE (id = ? OR workspace_owner_id = ?) AND show_in_dashboard = TRUE
      ORDER BY id ASC
    `, [wsId, wsId]);

    const memberIds = members.map(m => m.id);
    if (memberIds.length === 0) return res.json([]);

    // Tasks per assignee grouped by status
    const taskRows = await getAll(`
      SELECT t.assignee_id, t.status, COUNT(*) AS cnt
      FROM tasks t
      JOIN projects p ON p.id = t.project_id
      WHERE p.user_id = ?
        AND t.assignee_id IS NOT NULL
      GROUP BY t.assignee_id, t.status
    `, [wsId]);

    // Active projects per assignee
    const projectRows = await getAll(`
      SELECT assignee_id, COUNT(*) AS cnt
      FROM projects
      WHERE user_id = ? AND status != 'completed' AND assignee_id IS NOT NULL
      GROUP BY assignee_id
    `, [wsId]);

    // Time this week per workspace member
    const now = new Date();
    const day = now.getDay() || 7;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - day + 1);
    weekStart.setHours(0, 0, 0, 0);

    const idPlaceholders = memberIds.map(() => '?').join(',');
    const timeRows = await getAll(`
      SELECT user_id, SUM(duration) AS week_seconds
      FROM time_entries
      WHERE user_id IN (${idPlaceholders})
        AND start_time >= ?
        AND duration IS NOT NULL
      GROUP BY user_id
    `, [...memberIds, weekStart.toISOString()]);

    // Merge into per-member objects
    const taskMap = {};
    for (const row of taskRows) {
      if (!taskMap[row.assignee_id]) taskMap[row.assignee_id] = { todo: 0, doing: 0, done: 0 };
      if (row.status === 'todo')  taskMap[row.assignee_id].todo  += parseInt(row.cnt);
      if (row.status === 'doing') taskMap[row.assignee_id].doing += parseInt(row.cnt);
      if (row.status === 'done')  taskMap[row.assignee_id].done  += parseInt(row.cnt);
    }
    const projectMap = {};
    for (const row of projectRows) {
      projectMap[row.assignee_id] = parseInt(row.cnt);
    }
    const timeMap = {};
    for (const row of timeRows) {
      timeMap[row.user_id] = parseInt(row.week_seconds) || 0;
    }

    const stats = members.map(m => ({
      user_id:      m.id,
      name:         m.name || m.email,
      color:        m.color,
      email:        m.email,
      role:         m.role,
      task_todo:    taskMap[m.id]?.todo    || 0,
      task_doing:   taskMap[m.id]?.doing   || 0,
      task_done:    taskMap[m.id]?.done    || 0,
      project_count: projectMap[m.id]     || 0,
      week_seconds: timeMap[m.id]         || 0,
    }));

    res.json(stats);
  } catch (err) {
    console.error('[team GET /stats]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/team/invite
 * Admin only: create a new team member account linked to this workspace.
 */
router.post('/invite', async (req, res) => {
  try {
    if (!PRIVILEGED.includes(req.userRole)) {
      return res.status(403).json({ error: 'Nur Admins können Mitglieder einladen' });
    }

    const { email, password, name, role = 'developer', color = '#6366f1' } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'E-Mail und Passwort sind erforderlich' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Passwort muss mindestens 6 Zeichen lang sein' });
    }
    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({ error: 'Ungültige Rolle' });
    }

    const existing = await getOne('SELECT id FROM users WHERE email = ?', [email]);
    if (existing) {
      return res.status(409).json({ error: 'E-Mail ist bereits registriert' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const result = await run(`
      INSERT INTO users (email, password_hash, name, color, role, workspace_owner_id)
      VALUES (?, ?, ?, ?, ?, ?)
      RETURNING id
    `, [email, passwordHash, name || '', color, role, req.workspaceUserId]);

    const newUserId = result.lastInsertRowid ?? result.id;

    // Create default settings row for the new member
    await run('INSERT INTO settings (user_id) VALUES (?) ON CONFLICT (user_id) DO NOTHING', [newUserId]);

    const member = await getOne(
      'SELECT id, email, name, color, role, workspace_owner_id, created_at FROM users WHERE id = ?',
      [newUserId]
    );

    // Send welcome email with credentials (non-blocking — don't fail invite if email fails)
    const ownerSettings = await getOne('SELECT company_name FROM settings WHERE user_id = ?', [req.workspaceUserId]);
    sendWelcomeEmail({
      to:         email,
      name:       name || '',
      password,
      role,
      agencyName: ownerSettings?.company_name || '',
      appUrl:     process.env.APP_URL,
    }).catch(err => console.warn('[team invite] welcome email failed:', err.message));

    res.status(201).json(member);
  } catch (err) {
    console.error('[team POST /invite]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/team/:id
 * Admin only: update a team member's name, role, or color.
 */
router.put('/:id', async (req, res) => {
  try {
    if (!PRIVILEGED.includes(req.userRole)) {
      return res.status(403).json({ error: 'Nur Admins können Mitglieder bearbeiten' });
    }

    const wsId = req.workspaceUserId;
    const member = await getOne(`
      SELECT id, role FROM users
      WHERE id = ? AND (id = ? OR workspace_owner_id = ?)
    `, [req.params.id, wsId, wsId]);

    if (!member) return res.status(404).json({ error: 'Mitglied nicht gefunden' });

    const { name, role, color, show_in_dashboard } = req.body;

    if (role && !VALID_ROLES.includes(role)) {
      return res.status(400).json({ error: 'Ungültige Rolle' });
    }

    // Prevent demoting yourself if you're the only privileged user
    if (role && !PRIVILEGED.includes(role) && member.id === req.userId) {
      const privCount = await getOne(`
        SELECT COUNT(*) as count FROM users
        WHERE (id = ? OR workspace_owner_id = ?) AND role IN ('ceo', 'admin')
      `, [wsId, wsId]);
      if (parseInt(privCount.count) <= 1) {
        return res.status(400).json({ error: 'Der letzte Admin/CEO kann nicht degradiert werden' });
      }
    }

    await run(`
      UPDATE users SET
        name               = COALESCE(?, name),
        role               = COALESCE(?, role),
        color              = COALESCE(?, color),
        show_in_dashboard  = CASE WHEN ? THEN ? ELSE show_in_dashboard END
      WHERE id = ?
    `, [name ?? null, role ?? null, color ?? null,
        show_in_dashboard !== undefined, show_in_dashboard ?? true,
        req.params.id]);

    const updated = await getOne(
      'SELECT id, email, name, color, role, workspace_owner_id, show_in_dashboard, created_at FROM users WHERE id = ?',
      [req.params.id]
    );
    res.json(updated);
  } catch (err) {
    console.error('[team PUT /:id]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/team/:id
 * Admin only: remove a team member from the workspace.
 */
router.delete('/:id', async (req, res) => {
  try {
    if (!PRIVILEGED.includes(req.userRole)) {
      return res.status(403).json({ error: 'Nur Admins können Mitglieder entfernen' });
    }

    // Cannot delete yourself
    if (parseInt(req.params.id) === req.userId) {
      return res.status(400).json({ error: 'Sie können sich nicht selbst entfernen' });
    }

    const wsId = req.workspaceUserId;
    const member = await getOne(`
      SELECT id FROM users
      WHERE id = ? AND workspace_owner_id = ?
    `, [req.params.id, wsId]);

    if (!member) return res.status(404).json({ error: 'Mitglied nicht gefunden' });

    await run('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('[team DELETE /:id]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
