const express = require('express');
const db = require('../db/database');
const authenticate = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

const VALID_STATUSES      = ['planned', 'active', 'waiting', 'waiting_for_client', 'feedback', 'completed'];
const VALID_TASK_STATUSES = ['todo', 'doing', 'done'];

const STATUS_LABELS = {
  planned: 'Geplant', active: 'Demo', waiting_for_client: 'Warten auf Kunde',
  feedback: 'Überarbeitung', waiting: 'Fertigstellung', completed: 'Abgeschlossen',
};

function logActivity(projectId, userId, type, message) {
  db.prepare('INSERT INTO project_activity (project_id, user_id, type, message) VALUES (?, ?, ?, ?)')
    .run(projectId, userId, type, message);
}

const CHECKLIST_KEYS = [
  'domain_connected',
  'imprint_added',
  'privacy_policy_added',
  'mobile_optimized',
  'tracking_installed',
  'client_access_given',
];

/** Ensure checklist rows exist for a project */
function ensureChecklist(projectId) {
  const ins = db.prepare(
    'INSERT OR IGNORE INTO project_checklist (project_id, key, checked) VALUES (?, ?, 0)'
  );
  CHECKLIST_KEYS.forEach(key => ins.run(projectId, key));
}

/** All project fields extracted from body */
function projectFields(body) {
  return {
    client_id:      body.client_id      ?? null,
    name:           body.name           ?? null,
    status:         body.status         ?? null,
    start_date:     body.start_date     !== undefined ? (body.start_date  || null) : undefined,
    deadline:       body.deadline       !== undefined ? (body.deadline    || null) : undefined,
    budget:         body.budget         !== undefined ? (body.budget      || null) : undefined,
    description:    body.description    !== undefined ? body.description  : undefined,
    type:           body.type           !== undefined ? (body.type        || null) : undefined,
    build_type:        body.build_type        !== undefined ? (body.build_type        || null) : undefined,
    frontend:          body.frontend          !== undefined ? (body.frontend          || null) : undefined,
    hosting_provider:  body.hosting_provider  !== undefined ? (body.hosting_provider  || null) : undefined,
    hosting_owner:     body.hosting_owner     !== undefined ? (body.hosting_owner     || null) : undefined,
    domain_provider:   body.domain_provider   !== undefined ? (body.domain_provider   || null) : undefined,
    domain_name:       body.domain_name       !== undefined ? (body.domain_name       || null) : undefined,
    repository_url:    body.repository_url    !== undefined ? (body.repository_url    || null) : undefined,
    dsgvo_type:        body.dsgvo_type        !== undefined ? (body.dsgvo_type        || null) : undefined,
    live_url:          body.live_url          !== undefined ? (body.live_url          || null) : undefined,
    admin_access_note: body.admin_access_note !== undefined ? (body.admin_access_note || null) : undefined,
    billing_type:      body.billing_type      !== undefined ? (body.billing_type      || null) : undefined,
    price:             body.price             !== undefined ? (body.price             || null) : undefined,
    payment_status:    body.payment_status    !== undefined ? (body.payment_status    || null) : undefined,
  };
}

// ── LIST ─────────────────────────────────────────────────────────────────────
router.get('/', (req, res) => {
  const rows = db.prepare(`
    SELECT p.*, c.company_name as client_name,
           COUNT(t.id) as task_count,
           COUNT(CASE WHEN t.status = 'done' THEN 1 END) as task_done_count
    FROM projects p
    LEFT JOIN clients c ON c.id = p.client_id
    LEFT JOIN tasks t ON t.project_id = p.id
    WHERE p.user_id = ?
    GROUP BY p.id
    ORDER BY p.created_at DESC
  `).all(req.userId);
  res.json(rows);
});

// ── SINGLE ───────────────────────────────────────────────────────────────────
router.get('/:id', (req, res) => {
  const project = db.prepare(`
    SELECT p.*, c.company_name as client_name, c.contact_person,
           c.email as client_email, c.phone as client_phone
    FROM projects p
    LEFT JOIN clients c ON c.id = p.client_id
    WHERE p.id = ? AND p.user_id = ?
  `).get(req.params.id, req.userId);

  if (!project) return res.status(404).json({ error: 'Projekt nicht gefunden' });

  ensureChecklist(req.params.id);

  const tasks     = db.prepare('SELECT * FROM tasks WHERE project_id = ? ORDER BY created_at ASC').all(req.params.id);
  const checklist = db.prepare('SELECT key, label, checked, custom FROM project_checklist WHERE project_id = ? ORDER BY id ASC').all(req.params.id);

  const invoiceCount = db.prepare(
    'SELECT COUNT(*) as count FROM invoices WHERE project_id = ? AND user_id = ?'
  ).get(req.params.id, req.userId);
  const quoteCount = db.prepare(
    'SELECT COUNT(*) as count FROM quotes WHERE project_id = ? AND user_id = ?'
  ).get(req.params.id, req.userId);

  res.json({
    ...project,
    tasks,
    checklist,
    invoice_count: invoiceCount.count,
    quote_count:   quoteCount.count,
  });
});

// ── CREATE ───────────────────────────────────────────────────────────────────
router.post('/', (req, res) => {
  const f = projectFields(req.body);

  if (!f.name)
    return res.status(400).json({ error: 'name ist erforderlich' });

  if (f.client_id) {
    const client = db.prepare('SELECT id FROM clients WHERE id = ? AND user_id = ?').get(f.client_id, req.userId);
    if (!client) return res.status(404).json({ error: 'Kunde nicht gefunden' });
  }

  const r = db.prepare(`
    INSERT INTO projects
      (user_id, client_id, name, status, start_date, deadline, budget, description, type)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    req.userId, f.client_id, f.name, f.status || 'planned',
    f.start_date ?? null, f.deadline ?? null, f.budget ?? null,
    f.description ?? '', f.type ?? null,
  );

  ensureChecklist(r.lastInsertRowid);
  logActivity(r.lastInsertRowid, req.userId, 'created', 'Projekt wurde erstellt');

  const project = db.prepare(`
    SELECT p.*, c.company_name as client_name
    FROM projects p LEFT JOIN clients c ON c.id = p.client_id WHERE p.id = ?
  `).get(r.lastInsertRowid);

  res.status(201).json(project);
});

// ── UPDATE ───────────────────────────────────────────────────────────────────
router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT id FROM projects WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!existing) return res.status(404).json({ error: 'Projekt nicht gefunden' });

  // Build SET clause dynamically from provided fields
  const allowed = [
    'client_id','name','status','start_date','deadline','budget','description','type',
    'build_type','frontend','hosting_provider','hosting_owner','domain_provider','domain_name','repository_url',
    'dsgvo_type','live_url','admin_access_note',
    'billing_type','price','payment_status','assignee',
  ];

  const sets   = [];
  const values = [];
  for (const key of allowed) {
    if (key in req.body) {
      sets.push(`${key} = ?`);
      values.push(req.body[key] === '' ? null : (req.body[key] ?? null));
    }
  }

  if (sets.length > 0) {
    // Log status change if status is being updated
    if ('status' in req.body) {
      const oldProject = db.prepare('SELECT status FROM projects WHERE id = ?').get(req.params.id);
      if (oldProject && oldProject.status !== req.body.status) {
        const from = STATUS_LABELS[oldProject.status] || oldProject.status;
        const to   = STATUS_LABELS[req.body.status]   || req.body.status;
        logActivity(req.params.id, req.userId, 'status_change', `Status geändert: ${from} → ${to}`);
      }
    }
    db.prepare(`UPDATE projects SET ${sets.join(', ')} WHERE id = ? AND user_id = ?`)
      .run(...values, req.params.id, req.userId);
  }

  const project = db.prepare(`
    SELECT p.*, c.company_name as client_name
    FROM projects p LEFT JOIN clients c ON c.id = p.client_id WHERE p.id = ?
  `).get(req.params.id);

  res.json(project);
});

// ── DELETE ───────────────────────────────────────────────────────────────────
router.delete('/:id', (req, res) => {
  const project = db.prepare('SELECT id FROM projects WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!project) return res.status(404).json({ error: 'Projekt nicht gefunden' });
  db.prepare('DELETE FROM projects WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  res.json({ success: true });
});

// ── CHECKLIST ─────────────────────────────────────────────────────────────────
router.patch('/:id/checklist/:key', (req, res) => {
  const project = db.prepare('SELECT id FROM projects WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!project) return res.status(404).json({ error: 'Projekt nicht gefunden' });

  ensureChecklist(req.params.id);
  const { checked } = req.body;
  db.prepare('INSERT OR IGNORE INTO project_checklist (project_id, key, checked) VALUES (?, ?, 0)')
    .run(req.params.id, req.params.key);
  db.prepare('UPDATE project_checklist SET checked = ? WHERE project_id = ? AND key = ?')
    .run(checked ? 1 : 0, req.params.id, req.params.key);

  res.json({ key: req.params.key, checked: checked ? 1 : 0 });
});

router.post('/:id/checklist', (req, res) => {
  const project = db.prepare('SELECT id FROM projects WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!project) return res.status(404).json({ error: 'Projekt nicht gefunden' });

  const { label } = req.body;
  if (!label?.trim()) return res.status(400).json({ error: 'label ist erforderlich' });

  const key = `custom_${Date.now()}`;
  db.prepare('INSERT INTO project_checklist (project_id, key, label, checked, custom) VALUES (?, ?, ?, 0, 1)')
    .run(req.params.id, key, label.trim());

  res.status(201).json(db.prepare('SELECT * FROM project_checklist WHERE project_id = ? AND key = ?').get(req.params.id, key));
});

router.delete('/:id/checklist/:key', (req, res) => {
  const project = db.prepare('SELECT id FROM projects WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!project) return res.status(404).json({ error: 'Projekt nicht gefunden' });

  const row = db.prepare('SELECT custom FROM project_checklist WHERE project_id = ? AND key = ?').get(req.params.id, req.params.key);
  if (!row || !row.custom) return res.status(400).json({ error: 'Nur eigene Einträge können gelöscht werden' });

  db.prepare('DELETE FROM project_checklist WHERE project_id = ? AND key = ?').run(req.params.id, req.params.key);
  res.json({ success: true });
});

// ── TASKS ─────────────────────────────────────────────────────────────────────
router.get('/:id/tasks', (req, res) => {
  const project = db.prepare('SELECT id FROM projects WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!project) return res.status(404).json({ error: 'Projekt nicht gefunden' });
  const tasks = db.prepare('SELECT * FROM tasks WHERE project_id = ? ORDER BY created_at ASC').all(req.params.id);
  res.json(tasks);
});

router.post('/:id/tasks', (req, res) => {
  const project = db.prepare('SELECT id FROM projects WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!project) return res.status(404).json({ error: 'Projekt nicht gefunden' });

  const { title } = req.body;
  if (!title) return res.status(400).json({ error: 'title ist erforderlich' });

  const r = db.prepare('INSERT INTO tasks (project_id, user_id, title, status) VALUES (?, ?, ?, ?)')
    .run(req.params.id, req.userId, title, 'todo');

  res.status(201).json(db.prepare('SELECT * FROM tasks WHERE id = ?').get(r.lastInsertRowid));
});

router.patch('/:id/tasks/:taskId', (req, res) => {
  const task = db.prepare(
    'SELECT t.id FROM tasks t JOIN projects p ON p.id = t.project_id WHERE t.id = ? AND p.user_id = ?'
  ).get(req.params.taskId, req.userId);
  if (!task) return res.status(404).json({ error: 'Aufgabe nicht gefunden' });

  const { status, title } = req.body;
  if (status && !VALID_TASK_STATUSES.includes(status))
    return res.status(400).json({ error: `Ungültiger Status` });

  if (status) db.prepare('UPDATE tasks SET status=? WHERE id=?').run(status, req.params.taskId);
  if (title)  db.prepare('UPDATE tasks SET title=?  WHERE id=?').run(title,  req.params.taskId);

  res.json(db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.taskId));
});

router.delete('/:id/tasks/:taskId', (req, res) => {
  const task = db.prepare(
    'SELECT t.id FROM tasks t JOIN projects p ON p.id = t.project_id WHERE t.id = ? AND p.user_id = ?'
  ).get(req.params.taskId, req.userId);
  if (!task) return res.status(404).json({ error: 'Aufgabe nicht gefunden' });
  db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.taskId);
  res.json({ success: true });
});

// ── LINKED INVOICES ───────────────────────────────────────────────────────────
router.get('/:id/invoices', (req, res) => {
  const project = db.prepare('SELECT id FROM projects WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!project) return res.status(404).json({ error: 'Projekt nicht gefunden' });

  const rows = db.prepare(`
    SELECT i.*, c.company_name as client_name
    FROM invoices i LEFT JOIN clients c ON c.id = i.client_id
    WHERE i.project_id = ? AND i.user_id = ?
    ORDER BY i.created_at DESC
  `).all(req.params.id, req.userId);
  res.json(rows);
});

// ── LINKED QUOTES ─────────────────────────────────────────────────────────────
router.get('/:id/quotes', (req, res) => {
  const project = db.prepare('SELECT id FROM projects WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!project) return res.status(404).json({ error: 'Projekt nicht gefunden' });

  const rows = db.prepare(`
    SELECT q.*, c.company_name as client_name
    FROM quotes q LEFT JOIN clients c ON c.id = q.client_id
    WHERE q.project_id = ? AND q.user_id = ?
    ORDER BY q.created_at DESC
  `).all(req.params.id, req.userId);
  res.json(rows);
});

// ── CREDENTIALS (external secure links only — no passwords stored) ────────────
const VALID_CRED_TYPES = ['password', 'guide', 'other'];

router.get('/:id/credentials', (req, res) => {
  const project = db.prepare('SELECT id FROM projects WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!project) return res.status(404).json({ error: 'Projekt nicht gefunden' });

  const rows = db.prepare(
    'SELECT * FROM project_credentials WHERE project_id = ? AND user_id = ? ORDER BY created_at ASC'
  ).all(req.params.id, req.userId);
  res.json(rows);
});

router.post('/:id/credentials', (req, res) => {
  const project = db.prepare('SELECT id FROM projects WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!project) return res.status(404).json({ error: 'Projekt nicht gefunden' });

  const { label, type = 'other', link, note } = req.body;
  if (!label) return res.status(400).json({ error: 'label ist erforderlich' });
  if (type && !VALID_CRED_TYPES.includes(type))
    return res.status(400).json({ error: 'Ungültiger Typ' });

  const r = db.prepare(
    'INSERT INTO project_credentials (project_id, user_id, label, type, link, note) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(req.params.id, req.userId, label, type, link || null, note || null);

  res.status(201).json(db.prepare('SELECT * FROM project_credentials WHERE id = ?').get(r.lastInsertRowid));
});

router.patch('/:id/credentials/:credId', (req, res) => {
  const cred = db.prepare(
    'SELECT c.id FROM project_credentials c JOIN projects p ON p.id = c.project_id WHERE c.id = ? AND p.user_id = ?'
  ).get(req.params.credId, req.userId);
  if (!cred) return res.status(404).json({ error: 'Eintrag nicht gefunden' });

  const { label, type, link, note } = req.body;
  if (type && !VALID_CRED_TYPES.includes(type))
    return res.status(400).json({ error: 'Ungültiger Typ' });

  if (label !== undefined) db.prepare('UPDATE project_credentials SET label=? WHERE id=?').run(label, req.params.credId);
  if (type  !== undefined) db.prepare('UPDATE project_credentials SET type=?  WHERE id=?').run(type,  req.params.credId);
  if (link  !== undefined) db.prepare('UPDATE project_credentials SET link=?  WHERE id=?').run(link  || null, req.params.credId);
  if (note  !== undefined) db.prepare('UPDATE project_credentials SET note=?  WHERE id=?').run(note  || null, req.params.credId);

  res.json(db.prepare('SELECT * FROM project_credentials WHERE id = ?').get(req.params.credId));
});

router.delete('/:id/credentials/:credId', (req, res) => {
  const cred = db.prepare(
    'SELECT c.id FROM project_credentials c JOIN projects p ON p.id = c.project_id WHERE c.id = ? AND p.user_id = ?'
  ).get(req.params.credId, req.userId);
  if (!cred) return res.status(404).json({ error: 'Eintrag nicht gefunden' });

  db.prepare('DELETE FROM project_credentials WHERE id = ?').run(req.params.credId);
  res.json({ success: true });
});

// ── NOTES ─────────────────────────────────────────────────────────────────────

router.get('/:id/notes', (req, res) => {
  const project = db.prepare('SELECT id FROM projects WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!project) return res.status(404).json({ error: 'Projekt nicht gefunden' });

  const notes = db.prepare(
    'SELECT * FROM project_notes WHERE project_id = ? ORDER BY created_at DESC'
  ).all(req.params.id);
  res.json(notes);
});

router.post('/:id/notes', (req, res) => {
  const project = db.prepare('SELECT id FROM projects WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!project) return res.status(404).json({ error: 'Projekt nicht gefunden' });

  const { content } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: 'Inhalt ist erforderlich' });

  const r = db.prepare(
    'INSERT INTO project_notes (project_id, user_id, content) VALUES (?, ?, ?)'
  ).run(req.params.id, req.userId, content.trim());

  logActivity(req.params.id, req.userId, 'note_added', 'Notiz hinzugefügt');

  res.status(201).json(db.prepare('SELECT * FROM project_notes WHERE id = ?').get(r.lastInsertRowid));
});

router.delete('/:id/notes/:noteId', (req, res) => {
  const note = db.prepare(
    'SELECT n.id FROM project_notes n JOIN projects p ON p.id = n.project_id WHERE n.id = ? AND p.user_id = ?'
  ).get(req.params.noteId, req.userId);
  if (!note) return res.status(404).json({ error: 'Notiz nicht gefunden' });

  db.prepare('DELETE FROM project_notes WHERE id = ?').run(req.params.noteId);
  res.json({ success: true });
});

// ── ACTIVITY ──────────────────────────────────────────────────────────────────

router.get('/:id/activity', (req, res) => {
  const project = db.prepare('SELECT id FROM projects WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!project) return res.status(404).json({ error: 'Projekt nicht gefunden' });

  const activity = db.prepare(
    'SELECT * FROM project_activity WHERE project_id = ? ORDER BY created_at DESC LIMIT 50'
  ).all(req.params.id);
  res.json(activity);
});

module.exports = router;
