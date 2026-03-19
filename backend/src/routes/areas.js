const express = require('express');
const router = express.Router();
const { getOne, getAll, run, pool } = require('../db/pg');
const authenticate = require('../middleware/auth');

router.use(authenticate);

// List all areas with their projects
router.get('/', async (req, res) => {
  try {
    const uid = req.userId;

    const areas = await getAll(`
      SELECT * FROM project_areas WHERE user_id = ? ORDER BY position, id
    `, [uid]);

    const projects = await getAll(`
      SELECT p.*, c.company_name as client_name,
        (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id) as task_count,
        (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND t.status = 'done') as task_done_count
      FROM projects p
      LEFT JOIN clients c ON c.id = p.client_id
      WHERE p.user_id = ? AND p.project_type = 'general'
      ORDER BY p.created_at DESC
    `, [uid]);

    const result = areas.map(a => ({
      ...a,
      projects: projects.filter(p => p.area_id === a.id),
    }));

    res.json(result);
  } catch (err) {
    console.error('[areas GET /]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create area
router.post('/', async (req, res) => {
  try {
    const uid = req.userId;
    const { name, color = '#0071E3', icon = 'briefcase' } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Name erforderlich' });

    const maxPos = await getOne(`SELECT MAX(position) as m FROM project_areas WHERE user_id = ?`, [uid]);
    const position = (maxPos?.m ?? -1) + 1;

    const result = await run(`
      INSERT INTO project_areas (user_id, name, color, icon, position) VALUES (?, ?, ?, ?, ?)
      RETURNING id
    `, [uid, name.trim(), color, icon, position]);

    const area = await getOne(`SELECT * FROM project_areas WHERE id = ?`, [result.lastInsertRowid]);
    res.json({ ...area, projects: [] });
  } catch (err) {
    console.error('[areas POST /]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update area
router.put('/:id', async (req, res) => {
  try {
    const uid = req.userId;
    const area = await getOne(`SELECT * FROM project_areas WHERE id = ? AND user_id = ?`, [req.params.id, uid]);
    if (!area) return res.status(404).json({ error: 'Nicht gefunden' });

    const { name, color, icon } = req.body;
    await run(`UPDATE project_areas SET name = ?, color = ?, icon = ? WHERE id = ?`,
      [name ?? area.name, color ?? area.color, icon ?? area.icon, area.id]);

    res.json(await getOne(`SELECT * FROM project_areas WHERE id = ?`, [area.id]));
  } catch (err) {
    console.error('[areas PUT /:id]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete area
router.delete('/:id', async (req, res) => {
  try {
    const uid = req.userId;
    const area = await getOne(`SELECT * FROM project_areas WHERE id = ? AND user_id = ?`, [req.params.id, uid]);
    if (!area) return res.status(404).json({ error: 'Nicht gefunden' });

    await run(`UPDATE projects SET area_id = NULL WHERE area_id = ? AND user_id = ?`, [area.id, uid]);
    await run(`DELETE FROM project_areas WHERE id = ?`, [area.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error('[areas DELETE /:id]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a general project inside an area
router.post('/:id/projects', async (req, res) => {
  try {
    const uid = req.userId;
    const area = await getOne(`SELECT * FROM project_areas WHERE id = ? AND user_id = ?`, [req.params.id, uid]);
    if (!area) return res.status(404).json({ error: 'Nicht gefunden' });

    const { name, description = '', status = 'planned' } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Name erforderlich' });

    // For general projects, client_id is set to NULL (no real client required).
    // The projects table allows NULL for client_id in PostgreSQL schema.
    const result = await run(`
      INSERT INTO projects (user_id, client_id, name, description, status, area_id, project_type)
      VALUES (?, NULL, ?, ?, ?, ?, 'general')
      RETURNING id
    `, [uid, name.trim(), description, status, area.id]);

    const project = await getOne(`
      SELECT p.*, NULL::text as client_name
      FROM projects p
      WHERE p.id = ?
    `, [result.lastInsertRowid]);

    res.json({ ...project, task_count: 0, task_done_count: 0 });
  } catch (err) {
    console.error('[areas POST /:id/projects]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
