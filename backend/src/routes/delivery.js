const express    = require('express');
const crypto     = require('crypto');
const { getOne, getAll, run } = require('../db/pg');
const authenticate = require('../middleware/auth');

const router = express.Router();

const parseDoc = d => d ? ({ ...d, links: JSON.parse(d.links || '[]'), credentials: JSON.parse(d.credentials || '[]') }) : null;

router.get('/', authenticate, async (req, res) => {
  try {
    const rows = await getAll(`
      SELECT d.*, p.name AS project_name, c.company_name AS client_name
      FROM delivery_documents d
      LEFT JOIN projects p ON d.project_id = p.id
      LEFT JOIN clients c ON p.client_id = c.id
      WHERE d.user_id = ? ORDER BY d.created_at DESC
    `, [req.workspaceUserId]);
    res.json(rows.map(parseDoc));
  } catch (err) {
    console.error('[delivery GET /]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', authenticate, async (req, res) => {
  try {
    const { project_id, type, title, summary, links, credentials, instructions } = req.body;
    if (!project_id || !title) return res.status(400).json({ error: 'Pflichtfelder fehlen' });
    const token = crypto.randomBytes(24).toString('hex');
    const r = await run(`
      INSERT INTO delivery_documents (user_id, project_id, type, title, summary, links, credentials, instructions, token)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING id
    `, [req.workspaceUserId, project_id, type || 'one_time', title, summary || '',
       JSON.stringify(links || []), JSON.stringify(credentials || []), instructions || '', token]);
    res.json(parseDoc(await getOne('SELECT * FROM delivery_documents WHERE id = ?', [r.lastInsertRowid])));
  } catch (err) {
    console.error('[delivery POST /]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const doc = await getOne(`
      SELECT d.*, p.name AS project_name, c.company_name AS client_name
      FROM delivery_documents d
      LEFT JOIN projects p ON d.project_id = p.id
      LEFT JOIN clients c ON p.client_id = c.id
      WHERE d.id = ? AND d.user_id = ?
    `, [req.params.id, req.workspaceUserId]);
    if (!doc) return res.status(404).json({ error: 'Not found' });
    res.json(parseDoc(doc));
  } catch (err) {
    console.error('[delivery GET /:id]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/:id', authenticate, async (req, res) => {
  try {
    const existing = await getOne('SELECT * FROM delivery_documents WHERE id = ? AND user_id = ?', [req.params.id, req.workspaceUserId]);
    if (!existing) return res.status(404).json({ error: 'Not found' });
    const { type, status, title, summary, links, credentials, instructions } = req.body;
    await run(`
      UPDATE delivery_documents SET type=?, status=?, title=?, summary=?, links=?, credentials=?, instructions=?
      WHERE id=? AND user_id=?
    `, [
      type         ?? existing.type,
      status       ?? existing.status,
      title        ?? existing.title,
      summary      ?? existing.summary,
      links        != null ? JSON.stringify(links)       : existing.links,
      credentials  != null ? JSON.stringify(credentials) : existing.credentials,
      instructions ?? existing.instructions,
      req.params.id, req.workspaceUserId,
    ]);
    res.json(parseDoc(await getOne('SELECT * FROM delivery_documents WHERE id = ?', [req.params.id])));
  } catch (err) {
    console.error('[delivery PATCH /:id]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', authenticate, async (req, res) => {
  try {
    await run('DELETE FROM delivery_documents WHERE id = ? AND user_id = ?', [req.params.id, req.workspaceUserId]);
    res.json({ ok: true });
  } catch (err) {
    console.error('[delivery DELETE /:id]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Public view (status must be 'sent')
router.get('/public/:token', async (req, res) => {
  try {
    const doc = await getOne(`
      SELECT d.*, p.name AS project_name, p.type AS project_type, p.live_url,
             c.company_name AS client_name
      FROM delivery_documents d
      LEFT JOIN projects p ON d.project_id = p.id
      LEFT JOIN clients c ON p.client_id = c.id
      WHERE d.token = ? AND d.status = 'sent'
    `, [req.params.token]);
    if (!doc) return res.status(404).json({ error: 'Dokument nicht gefunden oder nicht freigegeben' });
    res.json(parseDoc(doc));
  } catch (err) {
    console.error('[delivery GET /public/:token]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
