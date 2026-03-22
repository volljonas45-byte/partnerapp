const express = require('express');
const bcrypt = require('bcryptjs');
const { getOne, getAll, run } = require('../db/pg');
const authenticate = require('../middleware/auth');
const { sendWelcomeEmail } = require('../services/emailService');

const router = express.Router();
router.use(authenticate);

const VALID_ROLES = ['admin', 'pm', 'developer'];

/**
 * GET /api/team
 * Returns all members in the same workspace.
 */
router.get('/', async (req, res) => {
  try {
    const wsId = req.workspaceUserId;
    const members = await getAll(`
      SELECT id, email, name, color, role, workspace_owner_id, created_at
      FROM users
      WHERE id = ? OR workspace_owner_id = ?
      ORDER BY id ASC
    `, [wsId, wsId]);
    res.json(members);
  } catch (err) {
    console.error('[team GET /]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/team/invite
 * Admin only: create a new team member account linked to this workspace.
 */
router.post('/invite', async (req, res) => {
  try {
    if (req.userRole !== 'admin') {
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

    const passwordHash = await bcrypt.hash(password, 10);

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
    if (req.userRole !== 'admin') {
      return res.status(403).json({ error: 'Nur Admins können Mitglieder bearbeiten' });
    }

    const wsId = req.workspaceUserId;
    const member = await getOne(`
      SELECT id, role FROM users
      WHERE id = ? AND (id = ? OR workspace_owner_id = ?)
    `, [req.params.id, wsId, wsId]);

    if (!member) return res.status(404).json({ error: 'Mitglied nicht gefunden' });

    const { name, role, color } = req.body;

    if (role && !VALID_ROLES.includes(role)) {
      return res.status(400).json({ error: 'Ungültige Rolle' });
    }

    // Prevent demoting yourself if you're the only admin
    if (role && role !== 'admin' && member.id === req.userId) {
      const adminCount = await getOne(`
        SELECT COUNT(*) as count FROM users
        WHERE (id = ? OR workspace_owner_id = ?) AND role = 'admin'
      `, [wsId, wsId]);
      if (parseInt(adminCount.count) <= 1) {
        return res.status(400).json({ error: 'Der letzte Admin kann nicht degradiert werden' });
      }
    }

    await run(`
      UPDATE users SET
        name  = COALESCE(?, name),
        role  = COALESCE(?, role),
        color = COALESCE(?, color)
      WHERE id = ?
    `, [name ?? null, role ?? null, color ?? null, req.params.id]);

    const updated = await getOne(
      'SELECT id, email, name, color, role, workspace_owner_id, created_at FROM users WHERE id = ?',
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
    if (req.userRole !== 'admin') {
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
