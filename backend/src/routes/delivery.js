const express    = require('express');
const crypto     = require('crypto');
const db         = require('../db/database');
const authenticate = require('../middleware/auth');

const router = express.Router();

const parseDoc = d => d ? ({ ...d, links: JSON.parse(d.links || '[]'), credentials: JSON.parse(d.credentials || '[]') }) : null;

router.get('/', authenticate, (req, res) => {
  const rows = db.prepare(`
    SELECT d.*, p.name AS project_name, c.company_name AS client_name
    FROM delivery_documents d
    LEFT JOIN projects p ON d.project_id = p.id
    LEFT JOIN clients c ON p.client_id = c.id
    WHERE d.user_id = ? ORDER BY d.created_at DESC
  `).all(req.userId);
  res.json(rows.map(parseDoc));
});

router.post('/', authenticate, (req, res) => {
  const { project_id, type, title, summary, links, credentials, instructions } = req.body;
  if (!project_id || !title) return res.status(400).json({ error: 'Pflichtfelder fehlen' });
  const token = crypto.randomBytes(24).toString('hex');
  const r = db.prepare(`
    INSERT INTO delivery_documents (user_id, project_id, type, title, summary, links, credentials, instructions, token)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(req.userId, project_id, type || 'one_time', title, summary || '',
     JSON.stringify(links || []), JSON.stringify(credentials || []), instructions || '', token);
  res.json(parseDoc(db.prepare('SELECT * FROM delivery_documents WHERE id = ?').get(r.lastInsertRowid)));
});

router.get('/:id', authenticate, (req, res) => {
  const doc = db.prepare(`
    SELECT d.*, p.name AS project_name, c.company_name AS client_name
    FROM delivery_documents d
    LEFT JOIN projects p ON d.project_id = p.id
    LEFT JOIN clients c ON p.client_id = c.id
    WHERE d.id = ? AND d.user_id = ?
  `).get(req.params.id, req.userId);
  if (!doc) return res.status(404).json({ error: 'Not found' });
  res.json(parseDoc(doc));
});

router.patch('/:id', authenticate, (req, res) => {
  const existing = db.prepare('SELECT * FROM delivery_documents WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const { type, status, title, summary, links, credentials, instructions } = req.body;
  db.prepare(`
    UPDATE delivery_documents SET type=?, status=?, title=?, summary=?, links=?, credentials=?, instructions=?
    WHERE id=? AND user_id=?
  `).run(
    type         ?? existing.type,
    status       ?? existing.status,
    title        ?? existing.title,
    summary      ?? existing.summary,
    links        != null ? JSON.stringify(links)       : existing.links,
    credentials  != null ? JSON.stringify(credentials) : existing.credentials,
    instructions ?? existing.instructions,
    req.params.id, req.userId
  );
  res.json(parseDoc(db.prepare('SELECT * FROM delivery_documents WHERE id = ?').get(req.params.id)));
});

router.delete('/:id', authenticate, (req, res) => {
  db.prepare('DELETE FROM delivery_documents WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  res.json({ ok: true });
});

// Public view (status must be 'sent')
router.get('/public/:token', (req, res) => {
  const doc = db.prepare(`
    SELECT d.*, p.name AS project_name, p.type AS project_type, p.live_url,
           c.company_name AS client_name
    FROM delivery_documents d
    LEFT JOIN projects p ON d.project_id = p.id
    LEFT JOIN clients c ON p.client_id = c.id
    WHERE d.token = ? AND d.status = 'sent'
  `).get(req.params.token);
  if (!doc) return res.status(404).json({ error: 'Dokument nicht gefunden oder nicht freigegeben' });
  res.json(parseDoc(doc));
});

module.exports = router;
