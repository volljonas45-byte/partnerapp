const router = require('express').Router();
const { getAll, getOne, run } = require('../db/pg');
const authenticate = require('../middleware/auth');

router.use(authenticate);

// ── GET /api/calendar/events ──────────────────────────────────────────────────
router.get('/events', async (req, res) => {
  const { from, to } = req.query;
  const userId = req.userId;

  try {
    const user = await getOne('SELECT workspace_owner_id FROM users WHERE id = $1', [userId]);
    const ownerId = user?.workspace_owner_id || userId;

    const params = [userId, ownerId];
    let cond = 'WHERE (ce.user_id = $1 OR u.workspace_owner_id = $2 OR u.id = $2)';
    if (from) { params.push(from); cond += ` AND ce.start_time >= $${params.length}`; }
    if (to)   { params.push(to);   cond += ` AND ce.start_time <= $${params.length}`; }

    const events = await getAll(
      `SELECT ce.*, u.name AS creator_name, u.color AS creator_color
       FROM calendar_events ce
       JOIN users u ON u.id = ce.user_id
       ${cond}
       ORDER BY ce.start_time ASC`,
      params
    );
    res.json(events);
  } catch (err) {
    console.error('[calendar GET /events]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /api/calendar/events ─────────────────────────────────────────────────
router.post('/events', async (req, res) => {
  const { title, description, start_time, end_time, all_day, color, type, project_id, meeting_link, attendees, scope } = req.body;
  if (!title || !start_time) return res.status(400).json({ error: 'title and start_time required' });

  try {
    const { lastInsertRowid } = await run(
      `INSERT INTO calendar_events (user_id, title, description, start_time, end_time, all_day, color, type, project_id, meeting_link, attendees, scope)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`,
      [req.userId, title, description || '', start_time, end_time || null,
       all_day || false, color || '#0071E3', type || 'event', project_id || null,
       meeting_link || null, attendees || '', scope || 'personal']
    );
    const event = await getOne('SELECT * FROM calendar_events WHERE id = $1', [lastInsertRowid]);
    res.status(201).json(event);
  } catch (err) {
    console.error('[calendar POST /events]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── PUT /api/calendar/events/:id ──────────────────────────────────────────────
router.put('/events/:id', async (req, res) => {
  const { title, description, start_time, end_time, all_day, color, type, project_id, meeting_link, attendees, scope } = req.body;
  try {
    await run(
      `UPDATE calendar_events
       SET title=$1, description=$2, start_time=$3, end_time=$4,
           all_day=$5, color=$6, type=$7, project_id=$8,
           meeting_link=$9, attendees=$10, scope=$11
       WHERE id=$12 AND user_id=$13`,
      [title, description || '', start_time, end_time || null,
       all_day || false, color || '#0071E3', type || 'event', project_id || null,
       meeting_link || null, attendees || '', scope || 'personal',
       req.params.id, req.userId]
    );
    const event = await getOne('SELECT * FROM calendar_events WHERE id = $1', [req.params.id]);
    res.json(event);
  } catch (err) {
    console.error('[calendar PUT /events/:id]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── DELETE /api/calendar/events/:id ──────────────────────────────────────────
router.delete('/events/:id', async (req, res) => {
  try {
    await run('DELETE FROM calendar_events WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
    res.json({ success: true });
  } catch (err) {
    console.error('[calendar DELETE /events/:id]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
