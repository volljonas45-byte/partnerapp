const express  = require('express');
const crypto   = require('crypto');
const db       = require('../db/database');
const authenticate = require('../middleware/auth');

const router = express.Router();

const STEP_TYPES = ['text', 'form', 'select', 'credentials', 'checklist', 'file_upload'];

// ── PUBLIC ROUTES (no auth) ───────────────────────────────────────────────────

router.get('/public/:token', (req, res) => {
  const flow = db.prepare(`
    SELECT f.*, t.brand_name, t.brand_color, t.brand_logo, t.name as template_name
    FROM onboarding_flows f
    JOIN onboarding_templates t ON t.id = f.template_id
    WHERE f.link_token = ?
  `).get(req.params.token);

  if (!flow) return res.status(404).json({ error: 'Formular nicht gefunden' });

  if (flow.password_hash) {
    const provided = req.headers['x-onboarding-pin'];
    if (!provided) return res.status(401).json({ error: 'PIN erforderlich', requiresPin: true });
    const hashed = crypto.createHash('sha256').update(String(provided)).digest('hex');
    if (hashed !== flow.password_hash)
      return res.status(401).json({ error: 'Falscher PIN', requiresPin: true });
  }

  const steps = db.prepare(
    'SELECT * FROM onboarding_template_steps WHERE template_id = ? ORDER BY position ASC'
  ).all(flow.template_id);

  res.json({
    id:            flow.id,
    status:        flow.status,
    client_name:   flow.client_name,
    current_step:  flow.current_step,
    responses:     JSON.parse(flow.responses || '{}'),
    brand_name:    flow.brand_name,
    brand_color:   flow.brand_color,
    brand_logo:    flow.brand_logo,
    template_name: flow.template_name,
    requiresPin:   !!flow.password_hash,
    steps: steps.map(s => ({ ...s, config: JSON.parse(s.config || '{}') })),
  });
});

router.patch('/public/:token/step', (req, res) => {
  const flow = db.prepare('SELECT * FROM onboarding_flows WHERE link_token = ?').get(req.params.token);
  if (!flow) return res.status(404).json({ error: 'Formular nicht gefunden' });
  if (flow.status === 'completed') return res.status(400).json({ error: 'Formular bereits abgeschlossen' });

  if (flow.password_hash) {
    const provided = req.headers['x-onboarding-pin'];
    const hashed   = provided ? crypto.createHash('sha256').update(String(provided)).digest('hex') : '';
    if (hashed !== flow.password_hash)
      return res.status(401).json({ error: 'Falscher PIN', requiresPin: true });
  }

  const { step_index, response } = req.body;
  const stepCount = db.prepare(
    'SELECT COUNT(*) as count FROM onboarding_template_steps WHERE template_id = ?'
  ).get(flow.template_id).count;

  const responses = JSON.parse(flow.responses || '{}');
  responses[step_index] = response;

  const nextStep  = step_index + 1;
  const isComplete = nextStep >= stepCount;

  db.prepare(`
    UPDATE onboarding_flows
    SET responses = ?, current_step = ?, status = ?, completed_at = ?
    WHERE link_token = ?
  `).run(
    JSON.stringify(responses),
    isComplete ? stepCount : nextStep,
    isComplete ? 'completed' : 'in_progress',
    isComplete ? new Date().toISOString() : null,
    req.params.token,
  );

  res.json({ success: true, completed: isComplete, next_step: nextStep });
});

// ── AUTHENTICATED ROUTES ──────────────────────────────────────────────────────
router.use(authenticate);

// ── TEMPLATES ─────────────────────────────────────────────────────────────────

router.get('/templates', (req, res) => {
  const templates = db.prepare(`
    SELECT t.*,
           COUNT(DISTINCT s.id)  as step_count,
           COUNT(DISTINCT f.id)  as flow_count
    FROM onboarding_templates t
    LEFT JOIN onboarding_template_steps s ON s.template_id = t.id
    LEFT JOIN onboarding_flows f          ON f.template_id = t.id AND f.user_id = t.user_id
    WHERE t.user_id = ?
    GROUP BY t.id
    ORDER BY t.created_at DESC
  `).all(req.userId);
  res.json(templates);
});

router.get('/templates/:id', (req, res) => {
  const template = db.prepare('SELECT * FROM onboarding_templates WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.userId);
  if (!template) return res.status(404).json({ error: 'Vorlage nicht gefunden' });

  const steps = db.prepare(
    'SELECT * FROM onboarding_template_steps WHERE template_id = ? ORDER BY position ASC'
  ).all(req.params.id);

  res.json({
    ...template,
    steps: steps.map(s => ({ ...s, config: JSON.parse(s.config || '{}') })),
  });
});

router.post('/templates', (req, res) => {
  const { name, brand_name = '', brand_color = '#111827', brand_logo = null } = req.body;
  if (!name) return res.status(400).json({ error: 'name ist erforderlich' });

  const r = db.prepare(
    'INSERT INTO onboarding_templates (user_id, name, brand_name, brand_color, brand_logo) VALUES (?, ?, ?, ?, ?)'
  ).run(req.userId, name, brand_name, brand_color, brand_logo);

  res.status(201).json(db.prepare('SELECT * FROM onboarding_templates WHERE id = ?').get(r.lastInsertRowid));
});

router.put('/templates/:id', (req, res) => {
  const template = db.prepare('SELECT id FROM onboarding_templates WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.userId);
  if (!template) return res.status(404).json({ error: 'Vorlage nicht gefunden' });

  const allowed = ['name', 'brand_name', 'brand_color', 'brand_logo'];
  const sets = [], values = [];
  for (const key of allowed) {
    if (key in req.body) { sets.push(`${key} = ?`); values.push(req.body[key]); }
  }
  if (sets.length > 0) {
    db.prepare(`UPDATE onboarding_templates SET ${sets.join(', ')} WHERE id = ? AND user_id = ?`)
      .run(...values, req.params.id, req.userId);
  }

  res.json(db.prepare('SELECT * FROM onboarding_templates WHERE id = ?').get(req.params.id));
});

router.delete('/templates/:id', (req, res) => {
  const template = db.prepare('SELECT id FROM onboarding_templates WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.userId);
  if (!template) return res.status(404).json({ error: 'Vorlage nicht gefunden' });

  db.prepare('DELETE FROM onboarding_templates WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  res.json({ success: true });
});

// ── STEPS ──────────────────────────────────────────────────────────────────────

router.post('/templates/:id/steps', (req, res) => {
  const template = db.prepare('SELECT id FROM onboarding_templates WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.userId);
  if (!template) return res.status(404).json({ error: 'Vorlage nicht gefunden' });

  const { type, title, description = '', config = {} } = req.body;
  if (!type || !STEP_TYPES.includes(type)) return res.status(400).json({ error: 'Ungültiger Typ' });
  if (!title) return res.status(400).json({ error: 'title ist erforderlich' });

  const maxPos = db.prepare(
    'SELECT COALESCE(MAX(position), -1) as max FROM onboarding_template_steps WHERE template_id = ?'
  ).get(req.params.id).max;

  const r = db.prepare(
    'INSERT INTO onboarding_template_steps (template_id, position, type, title, description, config) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(req.params.id, maxPos + 1, type, title, description, JSON.stringify(config));

  const step = db.prepare('SELECT * FROM onboarding_template_steps WHERE id = ?').get(r.lastInsertRowid);
  res.status(201).json({ ...step, config: JSON.parse(step.config || '{}') });
});

router.put('/templates/:id/steps/:stepId', (req, res) => {
  const step = db.prepare(`
    SELECT s.id FROM onboarding_template_steps s
    JOIN onboarding_templates t ON t.id = s.template_id
    WHERE s.id = ? AND t.user_id = ?
  `).get(req.params.stepId, req.userId);
  if (!step) return res.status(404).json({ error: 'Schritt nicht gefunden' });

  const { title, description, config } = req.body;
  if (title       !== undefined) db.prepare('UPDATE onboarding_template_steps SET title=?       WHERE id=?').run(title, req.params.stepId);
  if (description !== undefined) db.prepare('UPDATE onboarding_template_steps SET description=? WHERE id=?').run(description, req.params.stepId);
  if (config      !== undefined) db.prepare('UPDATE onboarding_template_steps SET config=?      WHERE id=?').run(JSON.stringify(config), req.params.stepId);

  const updated = db.prepare('SELECT * FROM onboarding_template_steps WHERE id = ?').get(req.params.stepId);
  res.json({ ...updated, config: JSON.parse(updated.config || '{}') });
});

router.delete('/templates/:id/steps/:stepId', (req, res) => {
  const step = db.prepare(`
    SELECT s.id FROM onboarding_template_steps s
    JOIN onboarding_templates t ON t.id = s.template_id
    WHERE s.id = ? AND t.user_id = ?
  `).get(req.params.stepId, req.userId);
  if (!step) return res.status(404).json({ error: 'Schritt nicht gefunden' });

  db.prepare('DELETE FROM onboarding_template_steps WHERE id = ?').run(req.params.stepId);
  res.json({ success: true });
});

router.patch('/templates/:id/steps/reorder', (req, res) => {
  const template = db.prepare('SELECT id FROM onboarding_templates WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.userId);
  if (!template) return res.status(404).json({ error: 'Vorlage nicht gefunden' });

  const { stepIds } = req.body;
  if (!Array.isArray(stepIds)) return res.status(400).json({ error: 'stepIds array erforderlich' });

  const update = db.prepare('UPDATE onboarding_template_steps SET position = ? WHERE id = ? AND template_id = ?');
  const updateAll = db.transaction(() => {
    stepIds.forEach((id, idx) => update.run(idx, id, req.params.id));
  });
  updateAll();

  res.json({ success: true });
});

// ── FLOWS ─────────────────────────────────────────────────────────────────────

router.get('/flows', (req, res) => {
  const flows = db.prepare(`
    SELECT f.*, t.name as template_name, t.brand_color,
           c.company_name as linked_client_name
    FROM onboarding_flows f
    JOIN onboarding_templates t ON t.id = f.template_id
    LEFT JOIN clients c ON c.id = f.client_id
    WHERE f.user_id = ?
    ORDER BY f.created_at DESC
  `).all(req.userId);
  res.json(flows);
});

router.get('/flows/:id', (req, res) => {
  const flow = db.prepare(`
    SELECT f.*, t.name as template_name, t.brand_name, t.brand_color
    FROM onboarding_flows f
    JOIN onboarding_templates t ON t.id = f.template_id
    WHERE f.id = ? AND f.user_id = ?
  `).get(req.params.id, req.userId);
  if (!flow) return res.status(404).json({ error: 'Flow nicht gefunden' });

  const steps = db.prepare(
    'SELECT * FROM onboarding_template_steps WHERE template_id = ? ORDER BY position ASC'
  ).all(flow.template_id);

  res.json({
    ...flow,
    responses: JSON.parse(flow.responses || '{}'),
    steps: steps.map(s => ({ ...s, config: JSON.parse(s.config || '{}') })),
  });
});

router.post('/flows', (req, res) => {
  const { template_id, client_id, client_name = '', pin } = req.body;
  if (!template_id) return res.status(400).json({ error: 'template_id ist erforderlich' });

  const template = db.prepare('SELECT id FROM onboarding_templates WHERE id = ? AND user_id = ?')
    .get(template_id, req.userId);
  if (!template) return res.status(404).json({ error: 'Vorlage nicht gefunden' });

  const link_token    = crypto.randomBytes(24).toString('hex');
  const password_hash = pin ? crypto.createHash('sha256').update(String(pin)).digest('hex') : null;

  const r = db.prepare(`
    INSERT INTO onboarding_flows (user_id, template_id, client_id, client_name, link_token, password_hash)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(req.userId, template_id, client_id || null, client_name, link_token, password_hash);

  const flow = db.prepare(`
    SELECT f.*, t.name as template_name
    FROM onboarding_flows f JOIN onboarding_templates t ON t.id = f.template_id
    WHERE f.id = ?
  `).get(r.lastInsertRowid);

  res.status(201).json({ ...flow, link_token });
});

router.delete('/flows/:id', (req, res) => {
  const flow = db.prepare('SELECT id FROM onboarding_flows WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.userId);
  if (!flow) return res.status(404).json({ error: 'Flow nicht gefunden' });

  db.prepare('DELETE FROM onboarding_flows WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  res.json({ success: true });
});

module.exports = router;
