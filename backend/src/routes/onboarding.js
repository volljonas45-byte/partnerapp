const express  = require('express');
const crypto   = require('crypto');
const { getOne, getAll, run, pool } = require('../db/pg');
const authenticate = require('../middleware/auth');

const router = express.Router();

const STEP_TYPES = ['text', 'form', 'select', 'credentials', 'checklist', 'file_upload'];

// ── PUBLIC ROUTES (no auth) ───────────────────────────────────────────────────

router.get('/public/:token', async (req, res) => {
  try {
    const flow = await getOne(`
      SELECT f.*, t.brand_name, t.brand_color, t.brand_logo, t.name as template_name
      FROM onboarding_flows f
      JOIN onboarding_templates t ON t.id = f.template_id
      WHERE f.link_token = ?
    `, [req.params.token]);

    if (!flow) return res.status(404).json({ error: 'Formular nicht gefunden' });

    if (flow.password_hash) {
      const provided = req.headers['x-onboarding-pin'];
      if (!provided) return res.status(401).json({ error: 'PIN erforderlich', requiresPin: true });
      const hashed = crypto.createHash('sha256').update(String(provided)).digest('hex');
      if (hashed !== flow.password_hash)
        return res.status(401).json({ error: 'Falscher PIN', requiresPin: true });
    }

    const steps = await getAll(
      'SELECT * FROM onboarding_template_steps WHERE template_id = ? ORDER BY position ASC',
      [flow.template_id]
    );

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
  } catch (err) {
    console.error('[onboarding GET /public/:token]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/public/:token/step', async (req, res) => {
  try {
    const flow = await getOne('SELECT * FROM onboarding_flows WHERE link_token = ?', [req.params.token]);
    if (!flow) return res.status(404).json({ error: 'Formular nicht gefunden' });
    if (flow.status === 'completed') return res.status(400).json({ error: 'Formular bereits abgeschlossen' });

    if (flow.password_hash) {
      const provided = req.headers['x-onboarding-pin'];
      const hashed   = provided ? crypto.createHash('sha256').update(String(provided)).digest('hex') : '';
      if (hashed !== flow.password_hash)
        return res.status(401).json({ error: 'Falscher PIN', requiresPin: true });
    }

    const { step_index, response } = req.body;
    const stepCountRow = await getOne(
      'SELECT COUNT(*) as count FROM onboarding_template_steps WHERE template_id = ?',
      [flow.template_id]
    );
    const stepCount = parseInt(stepCountRow.count);

    const responses = JSON.parse(flow.responses || '{}');
    responses[step_index] = response;

    const nextStep  = step_index + 1;
    const isComplete = nextStep >= stepCount;

    await run(`
      UPDATE onboarding_flows
      SET responses = ?, current_step = ?, status = ?, completed_at = ?
      WHERE link_token = ?
    `, [
      JSON.stringify(responses),
      isComplete ? stepCount : nextStep,
      isComplete ? 'completed' : 'in_progress',
      isComplete ? new Date().toISOString() : null,
      req.params.token,
    ]);

    res.json({ success: true, completed: isComplete, next_step: nextStep });
  } catch (err) {
    console.error('[onboarding PATCH /public/:token/step]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── AUTHENTICATED ROUTES ──────────────────────────────────────────────────────
router.use(authenticate);

// ── TEMPLATES ─────────────────────────────────────────────────────────────────

router.get('/templates', async (req, res) => {
  try {
    const templates = await getAll(`
      SELECT t.*,
             COUNT(DISTINCT s.id)  as step_count,
             COUNT(DISTINCT f.id)  as flow_count
      FROM onboarding_templates t
      LEFT JOIN onboarding_template_steps s ON s.template_id = t.id
      LEFT JOIN onboarding_flows f          ON f.template_id = t.id AND f.user_id = t.user_id
      WHERE t.user_id = ?
      GROUP BY t.id
      ORDER BY t.created_at DESC
    `, [req.userId]);
    res.json(templates);
  } catch (err) {
    console.error('[onboarding GET /templates]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/templates/:id', async (req, res) => {
  try {
    const template = await getOne('SELECT * FROM onboarding_templates WHERE id = ? AND user_id = ?',
      [req.params.id, req.userId]);
    if (!template) return res.status(404).json({ error: 'Vorlage nicht gefunden' });

    const steps = await getAll(
      'SELECT * FROM onboarding_template_steps WHERE template_id = ? ORDER BY position ASC',
      [req.params.id]
    );

    res.json({
      ...template,
      steps: steps.map(s => ({ ...s, config: JSON.parse(s.config || '{}') })),
    });
  } catch (err) {
    console.error('[onboarding GET /templates/:id]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/templates', async (req, res) => {
  try {
    const { name, brand_name = '', brand_color = '#111827', brand_logo = null } = req.body;
    if (!name) return res.status(400).json({ error: 'name ist erforderlich' });

    const r = await run(
      'INSERT INTO onboarding_templates (user_id, name, brand_name, brand_color, brand_logo) VALUES (?, ?, ?, ?, ?) RETURNING id',
      [req.userId, name, brand_name, brand_color, brand_logo]
    );

    res.status(201).json(await getOne('SELECT * FROM onboarding_templates WHERE id = ?', [r.lastInsertRowid]));
  } catch (err) {
    console.error('[onboarding POST /templates]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/templates/:id', async (req, res) => {
  try {
    const template = await getOne('SELECT id FROM onboarding_templates WHERE id = ? AND user_id = ?',
      [req.params.id, req.userId]);
    if (!template) return res.status(404).json({ error: 'Vorlage nicht gefunden' });

    const allowed = ['name', 'brand_name', 'brand_color', 'brand_logo'];
    const sets = [], values = [];
    let paramIdx = 1;
    for (const key of allowed) {
      if (key in req.body) {
        sets.push(`${key} = $${paramIdx++}`);
        values.push(req.body[key]);
      }
    }
    if (sets.length > 0) {
      values.push(req.params.id, req.userId);
      const pgClient = await pool.connect();
      try {
        await pgClient.query(
          `UPDATE onboarding_templates SET ${sets.join(', ')} WHERE id = $${paramIdx} AND user_id = $${paramIdx + 1}`,
          values
        );
      } finally {
        pgClient.release();
      }
    }

    res.json(await getOne('SELECT * FROM onboarding_templates WHERE id = ?', [req.params.id]));
  } catch (err) {
    console.error('[onboarding PUT /templates/:id]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/templates/:id', async (req, res) => {
  try {
    const template = await getOne('SELECT id FROM onboarding_templates WHERE id = ? AND user_id = ?',
      [req.params.id, req.userId]);
    if (!template) return res.status(404).json({ error: 'Vorlage nicht gefunden' });

    await run('DELETE FROM onboarding_templates WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
    res.json({ success: true });
  } catch (err) {
    console.error('[onboarding DELETE /templates/:id]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── STEPS ──────────────────────────────────────────────────────────────────────

router.post('/templates/:id/steps', async (req, res) => {
  try {
    const template = await getOne('SELECT id FROM onboarding_templates WHERE id = ? AND user_id = ?',
      [req.params.id, req.userId]);
    if (!template) return res.status(404).json({ error: 'Vorlage nicht gefunden' });

    const { type, title, description = '', config = {} } = req.body;
    if (!type || !STEP_TYPES.includes(type)) return res.status(400).json({ error: 'Ungültiger Typ' });
    if (!title) return res.status(400).json({ error: 'title ist erforderlich' });

    const maxPosRow = await getOne(
      'SELECT COALESCE(MAX(position), -1) as max FROM onboarding_template_steps WHERE template_id = ?',
      [req.params.id]
    );

    const r = await run(
      'INSERT INTO onboarding_template_steps (template_id, position, type, title, description, config) VALUES (?, ?, ?, ?, ?, ?) RETURNING id',
      [req.params.id, maxPosRow.max + 1, type, title, description, JSON.stringify(config)]
    );

    const step = await getOne('SELECT * FROM onboarding_template_steps WHERE id = ?', [r.lastInsertRowid]);
    res.status(201).json({ ...step, config: JSON.parse(step.config || '{}') });
  } catch (err) {
    console.error('[onboarding POST /templates/:id/steps]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/templates/:id/steps/:stepId', async (req, res) => {
  try {
    const step = await getOne(`
      SELECT s.id FROM onboarding_template_steps s
      JOIN onboarding_templates t ON t.id = s.template_id
      WHERE s.id = ? AND t.user_id = ?
    `, [req.params.stepId, req.userId]);
    if (!step) return res.status(404).json({ error: 'Schritt nicht gefunden' });

    const { title, description, config } = req.body;
    if (title       !== undefined) await run('UPDATE onboarding_template_steps SET title=?       WHERE id=?', [title, req.params.stepId]);
    if (description !== undefined) await run('UPDATE onboarding_template_steps SET description=? WHERE id=?', [description, req.params.stepId]);
    if (config      !== undefined) await run('UPDATE onboarding_template_steps SET config=?      WHERE id=?', [JSON.stringify(config), req.params.stepId]);

    const updated = await getOne('SELECT * FROM onboarding_template_steps WHERE id = ?', [req.params.stepId]);
    res.json({ ...updated, config: JSON.parse(updated.config || '{}') });
  } catch (err) {
    console.error('[onboarding PUT /templates/:id/steps/:stepId]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/templates/:id/steps/:stepId', async (req, res) => {
  try {
    const step = await getOne(`
      SELECT s.id FROM onboarding_template_steps s
      JOIN onboarding_templates t ON t.id = s.template_id
      WHERE s.id = ? AND t.user_id = ?
    `, [req.params.stepId, req.userId]);
    if (!step) return res.status(404).json({ error: 'Schritt nicht gefunden' });

    await run('DELETE FROM onboarding_template_steps WHERE id = ?', [req.params.stepId]);
    res.json({ success: true });
  } catch (err) {
    console.error('[onboarding DELETE /templates/:id/steps/:stepId]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/templates/:id/steps/reorder', async (req, res) => {
  try {
    const template = await getOne('SELECT id FROM onboarding_templates WHERE id = ? AND user_id = ?',
      [req.params.id, req.userId]);
    if (!template) return res.status(404).json({ error: 'Vorlage nicht gefunden' });

    const { stepIds } = req.body;
    if (!Array.isArray(stepIds)) return res.status(400).json({ error: 'stepIds array erforderlich' });

    const pgClient = await pool.connect();
    try {
      await pgClient.query('BEGIN');
      for (let idx = 0; idx < stepIds.length; idx++) {
        await pgClient.query(
          'UPDATE onboarding_template_steps SET position = $1 WHERE id = $2 AND template_id = $3',
          [idx, stepIds[idx], req.params.id]
        );
      }
      await pgClient.query('COMMIT');
    } catch (txErr) {
      await pgClient.query('ROLLBACK');
      throw txErr;
    } finally {
      pgClient.release();
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[onboarding PATCH /templates/:id/steps/reorder]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── FLOWS ─────────────────────────────────────────────────────────────────────

router.get('/flows', async (req, res) => {
  try {
    const flows = await getAll(`
      SELECT f.*, t.name as template_name, t.brand_color,
             c.company_name as linked_client_name
      FROM onboarding_flows f
      JOIN onboarding_templates t ON t.id = f.template_id
      LEFT JOIN clients c ON c.id = f.client_id
      WHERE f.user_id = ?
      ORDER BY f.created_at DESC
    `, [req.userId]);
    res.json(flows);
  } catch (err) {
    console.error('[onboarding GET /flows]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/flows/:id', async (req, res) => {
  try {
    const flow = await getOne(`
      SELECT f.*, t.name as template_name, t.brand_name, t.brand_color
      FROM onboarding_flows f
      JOIN onboarding_templates t ON t.id = f.template_id
      WHERE f.id = ? AND f.user_id = ?
    `, [req.params.id, req.userId]);
    if (!flow) return res.status(404).json({ error: 'Flow nicht gefunden' });

    const steps = await getAll(
      'SELECT * FROM onboarding_template_steps WHERE template_id = ? ORDER BY position ASC',
      [flow.template_id]
    );

    res.json({
      ...flow,
      responses: JSON.parse(flow.responses || '{}'),
      steps: steps.map(s => ({ ...s, config: JSON.parse(s.config || '{}') })),
    });
  } catch (err) {
    console.error('[onboarding GET /flows/:id]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/flows', async (req, res) => {
  try {
    const { template_id, client_id, client_name = '', pin } = req.body;
    if (!template_id) return res.status(400).json({ error: 'template_id ist erforderlich' });

    const template = await getOne('SELECT id FROM onboarding_templates WHERE id = ? AND user_id = ?',
      [template_id, req.userId]);
    if (!template) return res.status(404).json({ error: 'Vorlage nicht gefunden' });

    const link_token    = crypto.randomBytes(24).toString('hex');
    const password_hash = pin ? crypto.createHash('sha256').update(String(pin)).digest('hex') : null;

    const r = await run(`
      INSERT INTO onboarding_flows (user_id, template_id, client_id, client_name, link_token, password_hash)
      VALUES (?, ?, ?, ?, ?, ?)
      RETURNING id
    `, [req.userId, template_id, client_id || null, client_name, link_token, password_hash]);

    const flow = await getOne(`
      SELECT f.*, t.name as template_name
      FROM onboarding_flows f JOIN onboarding_templates t ON t.id = f.template_id
      WHERE f.id = ?
    `, [r.lastInsertRowid]);

    res.status(201).json({ ...flow, link_token });
  } catch (err) {
    console.error('[onboarding POST /flows]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/flows/:id', async (req, res) => {
  try {
    const flow = await getOne('SELECT id FROM onboarding_flows WHERE id = ? AND user_id = ?',
      [req.params.id, req.userId]);
    if (!flow) return res.status(404).json({ error: 'Flow nicht gefunden' });

    await run('DELETE FROM onboarding_flows WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
    res.json({ success: true });
  } catch (err) {
    console.error('[onboarding DELETE /flows/:id]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
