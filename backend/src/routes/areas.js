const express = require('express');
const router = express.Router();
const db = require('../db/database');
const authenticate = require('../middleware/auth');

router.use(authenticate);

// List all areas with their projects
router.get('/', (req, res) => {
  const uid = req.userId;

  const areas = db.prepare(`
    SELECT * FROM project_areas WHERE user_id = ? ORDER BY position, id
  `).all(uid);

  const projects = db.prepare(`
    SELECT p.*, c.company_name as client_name,
      (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id) as task_count,
      (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND t.status = 'done') as task_done_count
    FROM projects p
    LEFT JOIN clients c ON c.id = p.client_id
    WHERE p.user_id = ? AND p.project_type = 'general'
    ORDER BY p.created_at DESC
  `).all(uid);

  const result = areas.map(a => ({
    ...a,
    projects: projects.filter(p => p.area_id === a.id),
  }));

  res.json(result);
});

// Create area
router.post('/', (req, res) => {
  const uid = req.userId;
  const { name, color = '#0071E3', icon = 'briefcase' } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Name erforderlich' });

  const maxPos = db.prepare(`SELECT MAX(position) as m FROM project_areas WHERE user_id = ?`).get(uid);
  const position = (maxPos?.m ?? -1) + 1;

  const result = db.prepare(`
    INSERT INTO project_areas (user_id, name, color, icon, position) VALUES (?, ?, ?, ?, ?)
  `).run(uid, name.trim(), color, icon, position);

  const area = db.prepare(`SELECT * FROM project_areas WHERE id = ?`).get(result.lastInsertRowid);
  res.json({ ...area, projects: [] });
});

// Update area
router.put('/:id', (req, res) => {
  const uid = req.userId;
  const area = db.prepare(`SELECT * FROM project_areas WHERE id = ? AND user_id = ?`).get(req.params.id, uid);
  if (!area) return res.status(404).json({ error: 'Nicht gefunden' });

  const { name, color, icon } = req.body;
  db.prepare(`UPDATE project_areas SET name = ?, color = ?, icon = ? WHERE id = ?`)
    .run(name ?? area.name, color ?? area.color, icon ?? area.icon, area.id);

  res.json(db.prepare(`SELECT * FROM project_areas WHERE id = ?`).get(area.id));
});

// Delete area
router.delete('/:id', (req, res) => {
  const uid = req.userId;
  const area = db.prepare(`SELECT * FROM project_areas WHERE id = ? AND user_id = ?`).get(req.params.id, uid);
  if (!area) return res.status(404).json({ error: 'Nicht gefunden' });

  db.prepare(`UPDATE projects SET area_id = NULL WHERE area_id = ? AND user_id = ?`).run(area.id, uid);
  db.prepare(`DELETE FROM project_areas WHERE id = ?`).run(area.id);
  res.json({ ok: true });
});

// Create a general project inside an area
router.post('/:id/projects', (req, res) => {
  const uid = req.userId;
  const area = db.prepare(`SELECT * FROM project_areas WHERE id = ? AND user_id = ?`).get(req.params.id, uid);
  if (!area) return res.status(404).json({ error: 'Nicht gefunden' });

  const { name, description = '', status = 'planned' } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Name erforderlich' });

  // client_id = 0 (no real client); FK checks disabled so the NOT NULL constraint is satisfied
  // without requiring a real client record for general projects
  db.pragma('foreign_keys = OFF');
  let result;
  try {
    result = db.prepare(`
      INSERT INTO projects (user_id, client_id, name, description, status, area_id, project_type)
      VALUES (?, 0, ?, ?, ?, ?, 'general')
    `).run(uid, name.trim(), description, status, area.id);
  } finally {
    db.pragma('foreign_keys = ON');
  }

  const project = db.prepare(`
    SELECT p.*, NULL as client_name
    FROM projects p
    WHERE p.id = ?
  `).get(result.lastInsertRowid);

  res.json({ ...project, task_count: 0, task_done_count: 0 });
});

module.exports = router;
