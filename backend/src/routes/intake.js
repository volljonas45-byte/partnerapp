const express    = require('express');
const crypto     = require('crypto');
const db         = require('../db/database');
const authenticate = require('../middleware/auth');

const router = express.Router();

// ── TEMPLATES (auth required) ─────────────────────────────────────────────────
router.get('/templates', authenticate, (req, res) => {
  const rows = db.prepare('SELECT * FROM intake_templates WHERE user_id = ? ORDER BY created_at DESC').all(req.userId);
  res.json(rows.map(r => ({ ...r, fields: JSON.parse(r.fields) })));
});

router.post('/templates', authenticate, (req, res) => {
  const { name, description, fields } = req.body;
  if (!name) return res.status(400).json({ error: 'Name fehlt' });
  const r = db.prepare('INSERT INTO intake_templates (user_id, name, description, fields) VALUES (?, ?, ?, ?)')
    .run(req.userId, name, description || '', JSON.stringify(fields || []));
  const tmpl = db.prepare('SELECT * FROM intake_templates WHERE id = ?').get(r.lastInsertRowid);
  res.json({ ...tmpl, fields: JSON.parse(tmpl.fields) });
});

router.patch('/templates/:id', authenticate, (req, res) => {
  const { name, description, fields } = req.body;
  const existing = db.prepare('SELECT * FROM intake_templates WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  db.prepare('UPDATE intake_templates SET name = ?, description = ?, fields = ? WHERE id = ?')
    .run(name ?? existing.name, description ?? existing.description, JSON.stringify(fields ?? JSON.parse(existing.fields)), req.params.id);
  const tmpl = db.prepare('SELECT * FROM intake_templates WHERE id = ?').get(req.params.id);
  res.json({ ...tmpl, fields: JSON.parse(tmpl.fields) });
});

router.delete('/templates/:id', authenticate, (req, res) => {
  db.prepare('DELETE FROM intake_templates WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  res.json({ ok: true });
});

// ── FORMS (auth required) ─────────────────────────────────────────────────────

// Inbox: all submitted forms with full fields + responses (must be before /:id)
router.get('/inbox', authenticate, (req, res) => {
  const rows = db.prepare(`
    SELECT f.*, t.fields, t.name AS template_name, c.company_name AS client_name, p.name AS project_name
    FROM intake_forms f
    LEFT JOIN intake_templates t ON f.template_id = t.id
    LEFT JOIN clients c ON f.client_id = c.id
    LEFT JOIN projects p ON f.project_id = p.id
    WHERE f.user_id = ? AND f.status = 'submitted'
    ORDER BY f.submitted_at DESC
  `).all(req.userId);
  res.json(rows.map(r => ({
    ...r,
    fields:    JSON.parse(r.fields    || '[]'),
    responses: JSON.parse(r.responses || '{}'),
  })));
});

// Unread count (must be before /:id)
router.get('/unread-count', authenticate, (req, res) => {
  const row = db.prepare(
    `SELECT COUNT(*) as count FROM intake_forms WHERE user_id = ? AND status = 'submitted' AND seen = 0`
  ).get(req.userId);
  res.json({ count: row.count });
});

router.get('/', authenticate, (req, res) => {
  const rows = db.prepare(`
    SELECT f.*, t.name AS template_name, c.company_name AS client_name, p.name AS project_name
    FROM intake_forms f
    LEFT JOIN intake_templates t ON f.template_id = t.id
    LEFT JOIN clients c ON f.client_id = c.id
    LEFT JOIN projects p ON f.project_id = p.id
    WHERE f.user_id = ? ORDER BY f.created_at DESC
  `).all(req.userId);
  res.json(rows);
});

router.post('/', authenticate, (req, res) => {
  const { template_id, project_id, client_id, title } = req.body;
  if (!title) return res.status(400).json({ error: 'Titel fehlt' });
  if (!template_id) return res.status(400).json({ error: 'Template fehlt' });
  const token = crypto.randomBytes(24).toString('hex');
  const r = db.prepare('INSERT INTO intake_forms (user_id, template_id, project_id, client_id, title, token) VALUES (?, ?, ?, ?, ?, ?)')
    .run(req.userId, template_id, project_id || null, client_id || null, title, token);
  const form = db.prepare('SELECT * FROM intake_forms WHERE id = ?').get(r.lastInsertRowid);
  res.json(form);
});

router.get('/:id', authenticate, (req, res) => {
  const form = db.prepare(`
    SELECT f.*, t.fields, t.name AS template_name, c.company_name AS client_name, p.name AS project_name
    FROM intake_forms f
    LEFT JOIN intake_templates t ON f.template_id = t.id
    LEFT JOIN clients c ON f.client_id = c.id
    LEFT JOIN projects p ON f.project_id = p.id
    WHERE f.id = ? AND f.user_id = ?
  `).get(req.params.id, req.userId);
  if (!form) return res.status(404).json({ error: 'Not found' });
  res.json({ ...form, fields: JSON.parse(form.fields || '[]'), responses: JSON.parse(form.responses || '{}') });
});

// Mark as seen
router.patch('/:id/seen', authenticate, (req, res) => {
  db.prepare('UPDATE intake_forms SET seen = 1 WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  res.json({ ok: true });
});

// Internal fill (agency fills for client)
router.patch('/:id/submit', authenticate, (req, res) => {
  const { responses } = req.body;
  db.prepare('UPDATE intake_forms SET responses = ?, status = ?, submitted_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?')
    .run(JSON.stringify(responses || {}), 'submitted', req.params.id, req.userId);
  const form = db.prepare('SELECT * FROM intake_forms WHERE id = ?').get(req.params.id);
  res.json(form);
});

router.delete('/:id', authenticate, (req, res) => {
  db.prepare('DELETE FROM intake_forms WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  res.json({ ok: true });
});

// ── PUBLIC (no auth) ──────────────────────────────────────────────────────────
router.get('/public/:token', (req, res) => {
  const form = db.prepare(`
    SELECT f.*, t.fields, t.name AS template_name
    FROM intake_forms f
    LEFT JOIN intake_templates t ON f.template_id = t.id
    WHERE f.token = ?
  `).get(req.params.token);
  if (!form) return res.status(404).json({ error: 'Formular nicht gefunden' });
  res.json({ ...form, fields: JSON.parse(form.fields || '[]'), responses: JSON.parse(form.responses || '{}') });
});

router.post('/public/:token/submit', (req, res) => {
  const form = db.prepare('SELECT * FROM intake_forms WHERE token = ?').get(req.params.token);
  if (!form) return res.status(404).json({ error: 'Formular nicht gefunden' });
  if (form.status === 'submitted') return res.status(400).json({ error: 'Bereits eingereicht' });
  db.prepare('UPDATE intake_forms SET responses = ?, status = ?, submitted_at = CURRENT_TIMESTAMP WHERE token = ?')
    .run(JSON.stringify(req.body.responses || {}), 'submitted', req.params.token);
  res.json({ ok: true });
});

module.exports = router;
