const express   = require('express');
const authenticate = require('../middleware/auth');
const { getOne, getAll, run } = require('../db/pg');

const router = express.Router();
router.use(authenticate);

const PHASE_ORDER = ['demo', 'demo_lieferung', 'entscheidung', 'projektstart', 'rechtliches', 'uebergabe', 'abgeschlossen'];

const DEFAULT_TOOLS = [
  { name: 'Wix',               url: 'https://wix.com',        category: 'cms',           position: 0 },
  { name: 'GitHub',            url: 'https://github.com',     category: 'code',          position: 1 },
  { name: 'Vercel',            url: 'https://vercel.com',     category: 'hosting',       position: 2 },
  { name: 'Claude',            url: 'https://claude.ai',      category: 'code',          position: 3 },
  { name: 'Figma',             url: 'https://figma.com',      category: 'design',        position: 4 },
  { name: 'Netlify',           url: 'https://netlify.com',    category: 'hosting',       position: 5 },
  { name: 'IT-Kanzlei München',url: '',                       category: 'legal',         position: 6 },
  { name: 'WhatsApp',          url: 'https://web.whatsapp.com', category: 'communication', position: 7 },
];

// ── TOOLS (must be before /:projectId) ────────────────────────────────────────

router.get('/tools', async (req, res) => {
  try {
    const uid = req.workspaceUserId;
    let tools = await getAll('SELECT * FROM user_tools WHERE user_id = $1 ORDER BY position ASC', [uid]);
    if (tools.length === 0) {
      for (const t of DEFAULT_TOOLS) {
        await run('INSERT INTO user_tools (user_id, name, url, category, position) VALUES ($1,$2,$3,$4,$5)', [uid, t.name, t.url, t.category, t.position]);
      }
      tools = await getAll('SELECT * FROM user_tools WHERE user_id = $1 ORDER BY position ASC', [uid]);
    }
    res.json(tools);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/tools', async (req, res) => {
  try {
    const uid = req.workspaceUserId;
    const { name, url = '', category = 'other' } = req.body;
    if (!name) return res.status(400).json({ error: 'name erforderlich' });
    const maxPos = await getOne('SELECT COALESCE(MAX(position),0) as m FROM user_tools WHERE user_id = $1', [uid]);
    const r = await run('INSERT INTO user_tools (user_id, name, url, category, position) VALUES ($1,$2,$3,$4,$5) RETURNING id', [uid, name, url, category, (maxPos.m || 0) + 1]);
    res.status(201).json(await getOne('SELECT * FROM user_tools WHERE id = $1', [r.lastInsertRowid]));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.patch('/tools/:id', async (req, res) => {
  try {
    const uid = req.workspaceUserId;
    const tool = await getOne('SELECT id FROM user_tools WHERE id = $1 AND user_id = $2', [req.params.id, uid]);
    if (!tool) return res.status(404).json({ error: 'Tool nicht gefunden' });
    const { name, url, category } = req.body;
    const fields = [], vals = [];
    if (name !== undefined) { fields.push(`name=$${fields.length+1}`); vals.push(name); }
    if (url !== undefined)  { fields.push(`url=$${fields.length+1}`);  vals.push(url); }
    if (category !== undefined) { fields.push(`category=$${fields.length+1}`); vals.push(category); }
    if (fields.length) await run(`UPDATE user_tools SET ${fields.join(',')} WHERE id=$${fields.length+1}`, [...vals, req.params.id]);
    res.json(await getOne('SELECT * FROM user_tools WHERE id = $1', [req.params.id]));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/tools/:id', async (req, res) => {
  try {
    const uid = req.workspaceUserId;
    await run('DELETE FROM user_tools WHERE id = $1 AND user_id = $2', [req.params.id, uid]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── DASHBOARD REMINDERS (must be before /:projectId) ──────────────────────────

router.get('/reminders', async (req, res) => {
  try {
    const uid = req.workspaceUserId;
    const reminders = await getAll(`
      SELECT wr.*, p.name as project_name
      FROM workflow_reminders wr
      JOIN projects p ON p.id = wr.project_id
      WHERE wr.user_id = $1 AND wr.done = 0
      ORDER BY wr.due_date ASC
    `, [uid]);
    res.json(reminders);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── WORKFLOW STATE ─────────────────────────────────────────────────────────────

router.get('/:projectId', async (req, res) => {
  try {
    const uid = req.workspaceUserId;
    const pid = req.params.projectId;
    const project = await getOne('SELECT id FROM projects WHERE id = $1 AND user_id = $2', [pid, uid]);
    if (!project) return res.status(404).json({ error: 'Projekt nicht gefunden' });

    let wf = await getOne('SELECT * FROM project_workflow WHERE project_id = $1', [pid]);
    if (!wf) {
      await run('INSERT INTO project_workflow (project_id, user_id, current_phase, phase_data, decisions) VALUES ($1,$2,$3,$4,$5)', [pid, uid, 'demo', '{}', '{}']);
      wf = await getOne('SELECT * FROM project_workflow WHERE project_id = $1', [pid]);
    }
    res.json({
      ...wf,
      phase_data: JSON.parse(wf.phase_data || '{}'),
      decisions:  JSON.parse(wf.decisions  || '{}'),
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/:projectId', async (req, res) => {
  try {
    const uid = req.workspaceUserId;
    const pid = req.params.projectId;
    const project = await getOne('SELECT id FROM projects WHERE id = $1 AND user_id = $2', [pid, uid]);
    if (!project) return res.status(404).json({ error: 'Projekt nicht gefunden' });

    const { phase_data, decisions, current_phase } = req.body;
    const wf = await getOne('SELECT * FROM project_workflow WHERE project_id = $1', [pid]);
    if (!wf) return res.status(404).json({ error: 'Workflow nicht gefunden' });

    const existingPhaseData = JSON.parse(wf.phase_data || '{}');
    const existingDecisions = JSON.parse(wf.decisions  || '{}');

    const newPhaseData = phase_data ? { ...existingPhaseData, ...phase_data } : existingPhaseData;
    const newDecisions = decisions  ? { ...existingDecisions, ...decisions  } : existingDecisions;
    const newPhase     = current_phase || wf.current_phase;

    await run(
      'UPDATE project_workflow SET phase_data=$1, decisions=$2, current_phase=$3, updated_at=NOW() WHERE project_id=$4',
      [JSON.stringify(newPhaseData), JSON.stringify(newDecisions), newPhase, pid]
    );

    // Handle outcome decisions → update project status
    if (decisions?.outcome) {
      const statusMap = { won: 'active', lost: 'completed', postponed: 'waiting_for_client' };
      const newStatus = statusMap[decisions.outcome];
      if (newStatus) await run('UPDATE projects SET status=$1 WHERE id=$2', [newStatus, pid]);
    }

    const updated = await getOne('SELECT * FROM project_workflow WHERE project_id = $1', [pid]);
    res.json({
      ...updated,
      phase_data: JSON.parse(updated.phase_data || '{}'),
      decisions:  JSON.parse(updated.decisions  || '{}'),
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/:projectId/advance', async (req, res) => {
  try {
    const uid = req.workspaceUserId;
    const pid = req.params.projectId;
    const project = await getOne('SELECT id, name FROM projects WHERE id = $1 AND user_id = $2', [pid, uid]);
    if (!project) return res.status(404).json({ error: 'Projekt nicht gefunden' });

    const wf = await getOne('SELECT * FROM project_workflow WHERE project_id = $1', [pid]);
    if (!wf) return res.status(404).json({ error: 'Workflow nicht gefunden' });

    const currentIdx = PHASE_ORDER.indexOf(wf.current_phase);
    if (currentIdx === -1 || currentIdx >= PHASE_ORDER.length - 1) {
      return res.status(400).json({ error: 'Bereits in letzter Phase' });
    }

    const nextPhase = PHASE_ORDER[currentIdx + 1];
    await run('UPDATE project_workflow SET current_phase=$1, updated_at=NOW() WHERE project_id=$2', [nextPhase, pid]);

    // If final phase, mark project completed
    if (nextPhase === 'abgeschlossen') {
      await run('UPDATE projects SET status=$1 WHERE id=$2', ['completed', pid]);
      await run('UPDATE project_workflow SET completed_at=NOW() WHERE project_id=$1', [pid]);
    }

    // Log activity
    try {
      await run(
        'INSERT INTO project_activity (project_id, user_id, type, message) VALUES ($1,$2,$3,$4)',
        [pid, uid, 'workflow_phase', `Phase "${wf.current_phase}" abgeschlossen → "${nextPhase}"`]
      );
    } catch (_) {}

    const updated = await getOne('SELECT * FROM project_workflow WHERE project_id = $1', [pid]);
    res.json({
      ...updated,
      phase_data: JSON.parse(updated.phase_data || '{}'),
      decisions:  JSON.parse(updated.decisions  || '{}'),
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── PROJECT REMINDERS ─────────────────────────────────────────────────────────

router.get('/:projectId/reminders', async (req, res) => {
  try {
    const uid = req.workspaceUserId;
    const pid = req.params.projectId;
    const reminders = await getAll('SELECT * FROM workflow_reminders WHERE project_id=$1 AND user_id=$2 ORDER BY due_date ASC', [pid, uid]);
    res.json(reminders);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/:projectId/reminders', async (req, res) => {
  try {
    const uid = req.workspaceUserId;
    const pid = req.params.projectId;
    const { title, due_date, note = '', type = 'followup' } = req.body;
    if (!title || !due_date) return res.status(400).json({ error: 'title und due_date erforderlich' });
    const r = await run(
      'INSERT INTO workflow_reminders (project_id, user_id, type, title, due_date, note) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id',
      [pid, uid, type, title, due_date, note]
    );
    res.status(201).json(await getOne('SELECT * FROM workflow_reminders WHERE id=$1', [r.lastInsertRowid]));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.patch('/:projectId/reminders/:id', async (req, res) => {
  try {
    const uid = req.workspaceUserId;
    const { done, note, due_date } = req.body;
    const reminder = await getOne('SELECT id FROM workflow_reminders WHERE id=$1 AND user_id=$2', [req.params.id, uid]);
    if (!reminder) return res.status(404).json({ error: 'Erinnerung nicht gefunden' });
    const fields = [], vals = [];
    if (done !== undefined) {
      fields.push(`done=$${fields.length+1}`, `done_at=$${fields.length+2}`);
      vals.push(done ? 1 : 0, done ? new Date().toISOString() : null);
    }
    if (note !== undefined)     { fields.push(`note=$${fields.length+1}`);     vals.push(note); }
    if (due_date !== undefined) { fields.push(`due_date=$${fields.length+1}`); vals.push(due_date); }
    if (fields.length) await run(`UPDATE workflow_reminders SET ${fields.join(',')} WHERE id=$${fields.length+1}`, [...vals, req.params.id]);
    res.json(await getOne('SELECT * FROM workflow_reminders WHERE id=$1', [req.params.id]));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:projectId/reminders/:id', async (req, res) => {
  try {
    const uid = req.workspaceUserId;
    await run('DELETE FROM workflow_reminders WHERE id=$1 AND user_id=$2', [req.params.id, uid]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
