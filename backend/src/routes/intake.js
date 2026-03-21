const express    = require('express');
const crypto     = require('crypto');
const { getOne, getAll, run } = require('../db/pg');
const authenticate = require('../middleware/auth');

const router = express.Router();

// ── TEMPLATES (auth required) ─────────────────────────────────────────────────
router.get('/templates', authenticate, async (req, res) => {
  try {
    const rows = await getAll('SELECT * FROM intake_templates WHERE user_id = ? ORDER BY created_at DESC', [req.userId]);
    res.json(rows.map(r => ({ ...r, fields: JSON.parse(r.fields) })));
  } catch (err) {
    console.error('[intake GET /templates]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/templates', authenticate, async (req, res) => {
  try {
    const { name, description, fields } = req.body;
    if (!name) return res.status(400).json({ error: 'Name fehlt' });
    const r = await run('INSERT INTO intake_templates (user_id, name, description, fields) VALUES (?, ?, ?, ?) RETURNING id',
      [req.userId, name, description || '', JSON.stringify(fields || [])]);
    const tmpl = await getOne('SELECT * FROM intake_templates WHERE id = ?', [r.lastInsertRowid]);
    res.json({ ...tmpl, fields: JSON.parse(tmpl.fields) });
  } catch (err) {
    console.error('[intake POST /templates]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/templates/:id', authenticate, async (req, res) => {
  try {
    const { name, description, fields } = req.body;
    const existing = await getOne('SELECT * FROM intake_templates WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
    if (!existing) return res.status(404).json({ error: 'Not found' });
    await run('UPDATE intake_templates SET name = ?, description = ?, fields = ? WHERE id = ?',
      [name ?? existing.name, description ?? existing.description, JSON.stringify(fields ?? JSON.parse(existing.fields)), req.params.id]);
    const tmpl = await getOne('SELECT * FROM intake_templates WHERE id = ?', [req.params.id]);
    res.json({ ...tmpl, fields: JSON.parse(tmpl.fields) });
  } catch (err) {
    console.error('[intake PATCH /templates/:id]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/templates/:id', authenticate, async (req, res) => {
  try {
    await run('DELETE FROM intake_templates WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
    res.json({ ok: true });
  } catch (err) {
    console.error('[intake DELETE /templates/:id]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── FORMS (auth required) ─────────────────────────────────────────────────────

// Inbox: all submitted forms with full fields + responses (must be before /:id)
router.get('/inbox', authenticate, async (req, res) => {
  try {
    const rows = await getAll(`
      SELECT f.*, t.fields, t.name AS template_name, c.company_name AS client_name, p.name AS project_name
      FROM intake_forms f
      LEFT JOIN intake_templates t ON f.template_id = t.id
      LEFT JOIN clients c ON f.client_id = c.id
      LEFT JOIN projects p ON f.project_id = p.id
      WHERE f.user_id = ? AND f.status = 'submitted'
      ORDER BY f.submitted_at DESC
    `, [req.userId]);
    res.json(rows.map(r => ({
      ...r,
      fields:    JSON.parse(r.fields    || '[]'),
      responses: JSON.parse(r.responses || '{}'),
    })));
  } catch (err) {
    console.error('[intake GET /inbox]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Unread count (must be before /:id)
router.get('/unread-count', authenticate, async (req, res) => {
  try {
    const row = await getOne(
      `SELECT COUNT(*) as count FROM intake_forms WHERE user_id = ? AND status = 'submitted' AND seen = 0`,
      [req.userId]
    );
    res.json({ count: parseInt(row.count) });
  } catch (err) {
    console.error('[intake GET /unread-count]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/', authenticate, async (req, res) => {
  try {
    const rows = await getAll(`
      SELECT f.*, t.name AS template_name, c.company_name AS client_name, p.name AS project_name
      FROM intake_forms f
      LEFT JOIN intake_templates t ON f.template_id = t.id
      LEFT JOIN clients c ON f.client_id = c.id
      LEFT JOIN projects p ON f.project_id = p.id
      WHERE f.user_id = ? ORDER BY f.created_at DESC
    `, [req.userId]);
    res.json(rows);
  } catch (err) {
    console.error('[intake GET /]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', authenticate, async (req, res) => {
  try {
    const { template_id, project_id, client_id, title } = req.body;
    if (!title) return res.status(400).json({ error: 'Titel fehlt' });
    if (!template_id) return res.status(400).json({ error: 'Template fehlt' });
    const token = crypto.randomBytes(24).toString('hex');
    const r = await run('INSERT INTO intake_forms (user_id, template_id, project_id, client_id, title, token) VALUES (?, ?, ?, ?, ?, ?) RETURNING id',
      [req.userId, template_id, project_id || null, client_id || null, title, token]);
    const form = await getOne('SELECT * FROM intake_forms WHERE id = ?', [r.lastInsertRowid]);
    res.json(form);
  } catch (err) {
    console.error('[intake POST /]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const form = await getOne(`
      SELECT f.*, t.fields, t.name AS template_name, c.company_name AS client_name, p.name AS project_name
      FROM intake_forms f
      LEFT JOIN intake_templates t ON f.template_id = t.id
      LEFT JOIN clients c ON f.client_id = c.id
      LEFT JOIN projects p ON f.project_id = p.id
      WHERE f.id = ? AND f.user_id = ?
    `, [req.params.id, req.userId]);
    if (!form) return res.status(404).json({ error: 'Not found' });
    res.json({ ...form, fields: JSON.parse(form.fields || '[]'), responses: JSON.parse(form.responses || '{}') });
  } catch (err) {
    console.error('[intake GET /:id]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mark as seen
router.patch('/:id/seen', authenticate, async (req, res) => {
  try {
    await run('UPDATE intake_forms SET seen = 1 WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
    res.json({ ok: true });
  } catch (err) {
    console.error('[intake PATCH /:id/seen]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Internal fill (agency fills for client)
router.patch('/:id/submit', authenticate, async (req, res) => {
  try {
    const { responses } = req.body;
    await run('UPDATE intake_forms SET responses = ?, status = ?, submitted_at = NOW() WHERE id = ? AND user_id = ?',
      [JSON.stringify(responses || {}), 'submitted', req.params.id, req.userId]);
    const form = await getOne('SELECT * FROM intake_forms WHERE id = ?', [req.params.id]);
    res.json(form);
  } catch (err) {
    console.error('[intake PATCH /:id/submit]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', authenticate, async (req, res) => {
  try {
    await run('DELETE FROM intake_forms WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
    res.json({ ok: true });
  } catch (err) {
    console.error('[intake DELETE /:id]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── PUBLIC (no auth) ──────────────────────────────────────────────────────────
router.get('/public/:token', async (req, res) => {
  try {
    const form = await getOne(`
      SELECT f.*, t.fields, t.name AS template_name,
             c.company_name AS client_company_name
      FROM intake_forms f
      LEFT JOIN intake_templates t ON f.template_id = t.id
      LEFT JOIN projects p ON f.project_id = p.id
      LEFT JOIN clients c ON p.client_id = c.id
      WHERE f.token = ?
    `, [req.params.token]);
    if (!form) return res.status(404).json({ error: 'Formular nicht gefunden' });

    // Sicher parsen – unterstützt auch doppelt-encoded JSON (Legacy-Daten)
    function safeParse(str, fallback) {
      try {
        let v = JSON.parse(str || JSON.stringify(fallback));
        // Wenn Ergebnis noch ein String ist → nochmal parsen (doppelt-encoded)
        if (typeof v === 'string') v = JSON.parse(v);
        return v;
      } catch { return fallback; }
    }

    res.json({
      ...form,
      fields:    safeParse(form.fields, []),
      responses: safeParse(form.responses, {}),
    });
  } catch (err) {
    console.error('[intake GET /public/:token]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/public/:token/submit', async (req, res) => {
  try {
    const form = await getOne('SELECT * FROM intake_forms WHERE token = ?', [req.params.token]);
    if (!form) return res.status(404).json({ error: 'Formular nicht gefunden' });
    if (form.status === 'submitted') return res.status(400).json({ error: 'Bereits eingereicht' });
    await run('UPDATE intake_forms SET responses = ?, status = ?, submitted_at = NOW() WHERE token = ?',
      [JSON.stringify(req.body.responses || {}), 'submitted', req.params.token]);
    res.json({ ok: true });
  } catch (err) {
    console.error('[intake POST /public/:token/submit]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
