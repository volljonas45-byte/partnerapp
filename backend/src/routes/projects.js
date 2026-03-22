const express = require('express');
const { getOne, getAll, run, pool } = require('../db/pg');
const authenticate = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

const VALID_STATUSES      = ['planned', 'active', 'waiting', 'waiting_for_client', 'feedback', 'completed'];
const VALID_TASK_STATUSES = ['todo', 'doing', 'done'];

const STATUS_LABELS = {
  planned: 'Geplant', active: 'Demo', waiting_for_client: 'Warten auf Kunde',
  feedback: 'Überarbeitung', waiting: 'Fertigstellung', completed: 'Abgeschlossen',
};

async function logActivity(projectId, userId, type, message) {
  try {
    await run('INSERT INTO project_activity (project_id, user_id, type, message) VALUES (?, ?, ?, ?)',
      [projectId, userId, type, message]);
  } catch (err) {
    console.warn('[logActivity] Failed:', err.message);
  }
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
async function ensureChecklist(projectId) {
  for (const key of CHECKLIST_KEYS) {
    await run(
      'INSERT INTO project_checklist (project_id, key, checked) VALUES (?, ?, 0) ON CONFLICT (project_id, key) DO NOTHING',
      [projectId, key]
    );
  }
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
router.get('/', async (req, res) => {
  try {
    const clientFilter = req.query.client_id ? ' AND p.client_id = ?' : '';
    const params = req.query.client_id ? [req.workspaceUserId, req.query.client_id] : [req.workspaceUserId];
    const rows = await getAll(`
      SELECT p.*, c.company_name as client_name,
             COUNT(t.id) as task_count,
             COUNT(CASE WHEN t.status = 'done' THEN 1 END) as task_done_count,
             pw.current_phase,
             u.name as assignee_name, u.color as assignee_color, u.email as assignee_email
      FROM projects p
      LEFT JOIN clients c ON c.id = p.client_id
      LEFT JOIN tasks t ON t.project_id = p.id
      LEFT JOIN project_workflow pw ON pw.project_id = p.id
      LEFT JOIN users u ON u.id = p.assignee_id
      WHERE p.user_id = ?${clientFilter}
      GROUP BY p.id, c.company_name, pw.current_phase, u.name, u.color, u.email
      ORDER BY p.created_at DESC
    `, params);
    res.json(rows);
  } catch (err) {
    console.error('[projects GET /]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── SINGLE ───────────────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const project = await getOne(`
      SELECT p.*, c.company_name as client_name, c.contact_person,
             c.email as client_email, c.phone as client_phone,
             c.address as client_address, c.postal_code as client_postal_code,
             c.city as client_city, c.country as client_country,
             c.id as client_db_id,
             u.name as assignee_name, u.color as assignee_color, u.email as assignee_email
      FROM projects p
      LEFT JOIN clients c ON c.id = p.client_id
      LEFT JOIN users u ON u.id = p.assignee_id
      WHERE p.id = ? AND p.user_id = ?
    `, [req.params.id, req.workspaceUserId]);

    if (!project) return res.status(404).json({ error: 'Projekt nicht gefunden' });

    await ensureChecklist(req.params.id);

    const tasks     = await getAll('SELECT * FROM tasks WHERE project_id = ? ORDER BY created_at ASC', [req.params.id]);
    const checklist = await getAll('SELECT key, label, checked, custom FROM project_checklist WHERE project_id = ? ORDER BY id ASC', [req.params.id]);

    const invoiceCount = await getOne(
      'SELECT COUNT(*) as count FROM invoices WHERE project_id = ? AND user_id = ?',
      [req.params.id, req.workspaceUserId]
    );
    const quoteCount = await getOne(
      'SELECT COUNT(*) as count FROM quotes WHERE project_id = ? AND user_id = ?',
      [req.params.id, req.workspaceUserId]
    );

    res.json({
      ...project,
      tasks,
      checklist,
      invoice_count: parseInt(invoiceCount.count),
      quote_count:   parseInt(quoteCount.count),
    });
  } catch (err) {
    console.error('[projects GET /:id]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── CREATE ───────────────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const f = projectFields(req.body);

    if (!f.name)
      return res.status(400).json({ error: 'name ist erforderlich' });

    if (f.client_id) {
      const client = await getOne('SELECT id FROM clients WHERE id = ? AND user_id = ?', [f.client_id, req.workspaceUserId]);
      if (!client) return res.status(404).json({ error: 'Kunde nicht gefunden' });
    }

    // Default assignee is the creator; can be overridden by passing assignee_id
    const assigneeId = req.body.assignee_id ? parseInt(req.body.assignee_id) : req.userId;

    const r = await run(`
      INSERT INTO projects
        (user_id, client_id, name, status, start_date, deadline, budget, description, type, assignee_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING id
    `, [
      req.workspaceUserId, f.client_id, f.name, f.status || 'planned',
      f.start_date ?? null, f.deadline ?? null, f.budget ?? null,
      f.description ?? '', f.type ?? null, assigneeId,
    ]);

    await ensureChecklist(r.lastInsertRowid);
    await logActivity(r.lastInsertRowid, req.userId, 'created', 'Projekt wurde erstellt');

    const project = await getOne(`
      SELECT p.*, c.company_name as client_name
      FROM projects p LEFT JOIN clients c ON c.id = p.client_id WHERE p.id = ?
    `, [r.lastInsertRowid]);

    res.status(201).json(project);
  } catch (err) {
    console.error('[projects POST /]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── UPDATE ───────────────────────────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const existing = await getOne('SELECT id FROM projects WHERE id = ? AND user_id = ?', [req.params.id, req.workspaceUserId]);
    if (!existing) return res.status(404).json({ error: 'Projekt nicht gefunden' });

    // Build SET clause dynamically from provided fields
    const allowed = [
      'client_id','name','status','start_date','deadline','budget','description','type',
      'build_type','frontend','hosting_provider','hosting_owner','domain_provider','domain_name','repository_url',
      'dsgvo_type','live_url','admin_access_note',
      'billing_type','price','payment_status','assignee','assignee_id',
    ];

    const sets   = [];
    const values = [];
    let paramIdx = 1;
    for (const key of allowed) {
      if (key in req.body) {
        sets.push(`${key} = $${paramIdx++}`);
        values.push(req.body[key] === '' ? null : (req.body[key] ?? null));
      }
    }

    if (sets.length > 0) {
      // Log status change if status is being updated
      if ('status' in req.body) {
        const oldProject = await getOne('SELECT status FROM projects WHERE id = ?', [req.params.id]);
        if (oldProject && oldProject.status !== req.body.status) {
          const from = STATUS_LABELS[oldProject.status] || oldProject.status;
          const to   = STATUS_LABELS[req.body.status]   || req.body.status;
          await logActivity(req.params.id, req.userId, 'status_change', `Status geändert: ${from} → ${to}`);
        }
      }
      // Append id and user_id params
      values.push(req.params.id, req.workspaceUserId);
      const pgClient = await pool.connect();
      try {
        await pgClient.query(
          `UPDATE projects SET ${sets.join(', ')} WHERE id = $${paramIdx} AND user_id = $${paramIdx + 1}`,
          values
        );
      } finally {
        pgClient.release();
      }
    }

    const project = await getOne(`
      SELECT p.*, c.company_name as client_name
      FROM projects p LEFT JOIN clients c ON c.id = p.client_id WHERE p.id = ?
    `, [req.params.id]);

    res.json(project);
  } catch (err) {
    console.error('[projects PUT /:id]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── DELETE ───────────────────────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const project = await getOne('SELECT id FROM projects WHERE id = ? AND user_id = ?', [req.params.id, req.workspaceUserId]);
    if (!project) return res.status(404).json({ error: 'Projekt nicht gefunden' });
    await run('DELETE FROM projects WHERE id = ? AND user_id = ?', [req.params.id, req.workspaceUserId]);
    res.json({ success: true });
  } catch (err) {
    console.error('[projects DELETE /:id]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── CHECKLIST ─────────────────────────────────────────────────────────────────
router.patch('/:id/checklist/:key', async (req, res) => {
  try {
    const project = await getOne('SELECT id FROM projects WHERE id = ? AND user_id = ?', [req.params.id, req.workspaceUserId]);
    if (!project) return res.status(404).json({ error: 'Projekt nicht gefunden' });

    await ensureChecklist(req.params.id);
    const { checked } = req.body;
    await run(
      'INSERT INTO project_checklist (project_id, key, checked) VALUES (?, ?, 0) ON CONFLICT (project_id, key) DO NOTHING',
      [req.params.id, req.params.key]
    );
    await run('UPDATE project_checklist SET checked = ? WHERE project_id = ? AND key = ?',
      [checked ? 1 : 0, req.params.id, req.params.key]);

    res.json({ key: req.params.key, checked: checked ? 1 : 0 });
  } catch (err) {
    console.error('[projects PATCH /:id/checklist/:key]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:id/checklist', async (req, res) => {
  try {
    const project = await getOne('SELECT id FROM projects WHERE id = ? AND user_id = ?', [req.params.id, req.workspaceUserId]);
    if (!project) return res.status(404).json({ error: 'Projekt nicht gefunden' });

    const { label } = req.body;
    if (!label?.trim()) return res.status(400).json({ error: 'label ist erforderlich' });

    const key = `custom_${Date.now()}`;
    await run('INSERT INTO project_checklist (project_id, key, label, checked, custom) VALUES (?, ?, ?, 0, 1)',
      [req.params.id, key, label.trim()]);

    res.status(201).json(await getOne('SELECT * FROM project_checklist WHERE project_id = ? AND key = ?', [req.params.id, key]));
  } catch (err) {
    console.error('[projects POST /:id/checklist]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id/checklist/:key', async (req, res) => {
  try {
    const project = await getOne('SELECT id FROM projects WHERE id = ? AND user_id = ?', [req.params.id, req.workspaceUserId]);
    if (!project) return res.status(404).json({ error: 'Projekt nicht gefunden' });

    const row = await getOne('SELECT custom FROM project_checklist WHERE project_id = ? AND key = ?', [req.params.id, req.params.key]);
    if (!row || !row.custom) return res.status(400).json({ error: 'Nur eigene Einträge können gelöscht werden' });

    await run('DELETE FROM project_checklist WHERE project_id = ? AND key = ?', [req.params.id, req.params.key]);
    res.json({ success: true });
  } catch (err) {
    console.error('[projects DELETE /:id/checklist/:key]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── TASKS ─────────────────────────────────────────────────────────────────────
router.get('/:id/tasks', async (req, res) => {
  try {
    const project = await getOne('SELECT id FROM projects WHERE id = ? AND user_id = ?', [req.params.id, req.workspaceUserId]);
    if (!project) return res.status(404).json({ error: 'Projekt nicht gefunden' });
    const tasks = await getAll(`
      SELECT t.*, u.name as assignee_name, u.color as assignee_color, u.email as assignee_email
      FROM tasks t
      LEFT JOIN users u ON u.id = t.assignee_id
      WHERE t.project_id = ?
      ORDER BY t.created_at ASC
    `, [req.params.id]);
    res.json(tasks);
  } catch (err) {
    console.error('[projects GET /:id/tasks]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:id/tasks', async (req, res) => {
  try {
    const project = await getOne('SELECT id FROM projects WHERE id = ? AND user_id = ?', [req.params.id, req.workspaceUserId]);
    if (!project) return res.status(404).json({ error: 'Projekt nicht gefunden' });

    const { title, assignee_id } = req.body;
    if (!title) return res.status(400).json({ error: 'title ist erforderlich' });

    const r = await run(
      'INSERT INTO tasks (project_id, user_id, title, status, assignee_id) VALUES (?, ?, ?, ?, ?) RETURNING id',
      [req.params.id, req.userId, title, 'todo', assignee_id ?? null]
    );

    const task = await getOne(`
      SELECT t.*, u.name as assignee_name, u.color as assignee_color, u.email as assignee_email
      FROM tasks t LEFT JOIN users u ON u.id = t.assignee_id
      WHERE t.id = ?
    `, [r.lastInsertRowid]);
    res.status(201).json(task);
  } catch (err) {
    console.error('[projects POST /:id/tasks]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/:id/tasks/:taskId', async (req, res) => {
  try {
    const task = await getOne(
      'SELECT t.id FROM tasks t JOIN projects p ON p.id = t.project_id WHERE t.id = ? AND p.user_id = ?',
      [req.params.taskId, req.workspaceUserId]
    );
    if (!task) return res.status(404).json({ error: 'Aufgabe nicht gefunden' });

    const { status, title, assignee_id } = req.body;
    if (status && !VALID_TASK_STATUSES.includes(status))
      return res.status(400).json({ error: 'Ungültiger Status' });

    if (status)                        await run('UPDATE tasks SET status=?      WHERE id=?', [status,       req.params.taskId]);
    if (title)                         await run('UPDATE tasks SET title=?       WHERE id=?', [title,        req.params.taskId]);
    if (assignee_id !== undefined)     await run('UPDATE tasks SET assignee_id=? WHERE id=?', [assignee_id ?? null, req.params.taskId]);

    const updated = await getOne(`
      SELECT t.*, u.name as assignee_name, u.color as assignee_color, u.email as assignee_email
      FROM tasks t LEFT JOIN users u ON u.id = t.assignee_id
      WHERE t.id = ?
    `, [req.params.taskId]);
    res.json(updated);
  } catch (err) {
    console.error('[projects PATCH /:id/tasks/:taskId]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id/tasks/:taskId', async (req, res) => {
  try {
    const task = await getOne(
      'SELECT t.id FROM tasks t JOIN projects p ON p.id = t.project_id WHERE t.id = ? AND p.user_id = ?',
      [req.params.taskId, req.workspaceUserId]
    );
    if (!task) return res.status(404).json({ error: 'Aufgabe nicht gefunden' });
    await run('DELETE FROM tasks WHERE id = ?', [req.params.taskId]);
    res.json({ success: true });
  } catch (err) {
    console.error('[projects DELETE /:id/tasks/:taskId]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── LINKED INVOICES ───────────────────────────────────────────────────────────
router.get('/:id/invoices', async (req, res) => {
  try {
    const project = await getOne('SELECT id FROM projects WHERE id = ? AND user_id = ?', [req.params.id, req.workspaceUserId]);
    if (!project) return res.status(404).json({ error: 'Projekt nicht gefunden' });

    const rows = await getAll(`
      SELECT i.*, c.company_name as client_name
      FROM invoices i LEFT JOIN clients c ON c.id = i.client_id
      WHERE i.project_id = ? AND i.user_id = ?
      ORDER BY i.created_at DESC
    `, [req.params.id, req.workspaceUserId]);
    res.json(rows);
  } catch (err) {
    console.error('[projects GET /:id/invoices]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── LINKED QUOTES ─────────────────────────────────────────────────────────────
router.get('/:id/quotes', async (req, res) => {
  try {
    const project = await getOne('SELECT id FROM projects WHERE id = ? AND user_id = ?', [req.params.id, req.workspaceUserId]);
    if (!project) return res.status(404).json({ error: 'Projekt nicht gefunden' });

    const rows = await getAll(`
      SELECT q.*, c.company_name as client_name
      FROM quotes q LEFT JOIN clients c ON c.id = q.client_id
      WHERE q.project_id = ? AND q.user_id = ?
      ORDER BY q.created_at DESC
    `, [req.params.id, req.workspaceUserId]);
    res.json(rows);
  } catch (err) {
    console.error('[projects GET /:id/quotes]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── CREDENTIALS (external secure links only — no passwords stored) ────────────
const VALID_CRED_TYPES = ['password', 'guide', 'other'];

router.get('/:id/credentials', async (req, res) => {
  try {
    const project = await getOne('SELECT id FROM projects WHERE id = ? AND user_id = ?', [req.params.id, req.workspaceUserId]);
    if (!project) return res.status(404).json({ error: 'Projekt nicht gefunden' });

    const rows = await getAll(
      'SELECT * FROM project_credentials WHERE project_id = ? AND user_id = ? ORDER BY created_at ASC',
      [req.params.id, req.workspaceUserId]
    );
    res.json(rows);
  } catch (err) {
    console.error('[projects GET /:id/credentials]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:id/credentials', async (req, res) => {
  try {
    const project = await getOne('SELECT id FROM projects WHERE id = ? AND user_id = ?', [req.params.id, req.workspaceUserId]);
    if (!project) return res.status(404).json({ error: 'Projekt nicht gefunden' });

    const { label, type = 'other', link, note } = req.body;
    if (!label) return res.status(400).json({ error: 'label ist erforderlich' });
    if (type && !VALID_CRED_TYPES.includes(type))
      return res.status(400).json({ error: 'Ungültiger Typ' });

    const r = await run(
      'INSERT INTO project_credentials (project_id, user_id, label, type, link, note) VALUES (?, ?, ?, ?, ?, ?) RETURNING id',
      [req.params.id, req.workspaceUserId, label, type, link || null, note || null]
    );

    res.status(201).json(await getOne('SELECT * FROM project_credentials WHERE id = ?', [r.lastInsertRowid]));
  } catch (err) {
    console.error('[projects POST /:id/credentials]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/:id/credentials/:credId', async (req, res) => {
  try {
    const cred = await getOne(
      'SELECT c.id FROM project_credentials c JOIN projects p ON p.id = c.project_id WHERE c.id = ? AND p.user_id = ?',
      [req.params.credId, req.workspaceUserId]
    );
    if (!cred) return res.status(404).json({ error: 'Eintrag nicht gefunden' });

    const { label, type, link, note } = req.body;
    if (type && !VALID_CRED_TYPES.includes(type))
      return res.status(400).json({ error: 'Ungültiger Typ' });

    if (label !== undefined) await run('UPDATE project_credentials SET label=? WHERE id=?', [label, req.params.credId]);
    if (type  !== undefined) await run('UPDATE project_credentials SET type=?  WHERE id=?', [type,  req.params.credId]);
    if (link  !== undefined) await run('UPDATE project_credentials SET link=?  WHERE id=?', [link  || null, req.params.credId]);
    if (note  !== undefined) await run('UPDATE project_credentials SET note=?  WHERE id=?', [note  || null, req.params.credId]);

    res.json(await getOne('SELECT * FROM project_credentials WHERE id = ?', [req.params.credId]));
  } catch (err) {
    console.error('[projects PATCH /:id/credentials/:credId]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id/credentials/:credId', async (req, res) => {
  try {
    const cred = await getOne(
      'SELECT c.id FROM project_credentials c JOIN projects p ON p.id = c.project_id WHERE c.id = ? AND p.user_id = ?',
      [req.params.credId, req.workspaceUserId]
    );
    if (!cred) return res.status(404).json({ error: 'Eintrag nicht gefunden' });

    await run('DELETE FROM project_credentials WHERE id = ?', [req.params.credId]);
    res.json({ success: true });
  } catch (err) {
    console.error('[projects DELETE /:id/credentials/:credId]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── NOTES ─────────────────────────────────────────────────────────────────────

router.get('/:id/notes', async (req, res) => {
  try {
    const project = await getOne('SELECT id FROM projects WHERE id = ? AND user_id = ?', [req.params.id, req.workspaceUserId]);
    if (!project) return res.status(404).json({ error: 'Projekt nicht gefunden' });

    const notes = await getAll(
      'SELECT * FROM project_notes WHERE project_id = ? ORDER BY created_at DESC',
      [req.params.id]
    );
    res.json(notes);
  } catch (err) {
    console.error('[projects GET /:id/notes]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:id/notes', async (req, res) => {
  try {
    const project = await getOne('SELECT id FROM projects WHERE id = ? AND user_id = ?', [req.params.id, req.workspaceUserId]);
    if (!project) return res.status(404).json({ error: 'Projekt nicht gefunden' });

    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: 'Inhalt ist erforderlich' });

    const r = await run(
      'INSERT INTO project_notes (project_id, user_id, content) VALUES (?, ?, ?) RETURNING id',
      [req.params.id, req.userId, content.trim()]
    );

    await logActivity(req.params.id, req.userId, 'note_added', 'Notiz hinzugefügt');

    res.status(201).json(await getOne('SELECT * FROM project_notes WHERE id = ?', [r.lastInsertRowid]));
  } catch (err) {
    console.error('[projects POST /:id/notes]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id/notes/:noteId', async (req, res) => {
  try {
    const note = await getOne(
      'SELECT n.id FROM project_notes n JOIN projects p ON p.id = n.project_id WHERE n.id = ? AND p.user_id = ?',
      [req.params.noteId, req.workspaceUserId]
    );
    if (!note) return res.status(404).json({ error: 'Notiz nicht gefunden' });

    await run('DELETE FROM project_notes WHERE id = ?', [req.params.noteId]);
    res.json({ success: true });
  } catch (err) {
    console.error('[projects DELETE /:id/notes/:noteId]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── ACTIVITY ──────────────────────────────────────────────────────────────────

router.get('/:id/activity', async (req, res) => {
  try {
    const project = await getOne('SELECT id FROM projects WHERE id = ? AND user_id = ?', [req.params.id, req.workspaceUserId]);
    if (!project) return res.status(404).json({ error: 'Projekt nicht gefunden' });

    const activity = await getAll(
      'SELECT * FROM project_activity WHERE project_id = ? ORDER BY created_at DESC LIMIT 50',
      [req.params.id]
    );
    res.json(activity);
  } catch (err) {
    console.error('[projects GET /:id/activity]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
