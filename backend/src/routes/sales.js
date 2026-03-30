const express = require('express');
const router = express.Router();
const { getOne, getAll, run } = require('../db/pg');
const authenticate = require('../middleware/auth');

router.use(authenticate);

// ── HELPERS ──────────────────────────────────────────────────────────────────

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function weekStartStr() {
  const now = new Date();
  const day = now.getDay() || 7; // Mon=1 ... Sun=7
  const mon = new Date(now);
  mon.setDate(now.getDate() - day + 1);
  return mon.toISOString().slice(0, 10);
}

function motivation(todayCalls, todayReached, todayClosings, targets) {
  const { daily_calls, daily_connects, daily_closings } = targets;

  if (todayClosings >= daily_closings && todayCalls >= daily_calls) {
    const over = todayCalls - daily_calls;
    return over > 0
      ? { message: `Du bist heute on fire — ${over} Anrufe über dem Ziel!`, type: 'excellent' }
      : { message: 'Tagesziel erreicht! Weiter so!', type: 'success' };
  }

  const remaining = daily_calls - todayCalls;
  if (remaining > daily_calls * 0.7) {
    return { message: 'Du liegst unter deinem Ziel — leg jetzt los!', type: 'urgent' };
  }

  return { message: `Noch ${remaining} Anrufe bis zu deinem Tagesziel!`, type: 'warning' };
}

// ── LEADS ────────────────────────────────────────────────────────────────────

// GET /api/sales/leads
router.get('/leads', async (req, res) => {
  try {
    const { status, due_today, search } = req.query;
    let sql = `
      SELECT sl.*,
             c.company_name, c.contact_person, c.phone, c.email, c.industry, c.website,
             (SELECT MAX(sc.started_at) FROM sales_calls sc WHERE sc.client_id = sl.client_id AND sc.user_id = sl.user_id) AS last_call_at,
             (SELECT COUNT(*) FROM sales_calls sc WHERE sc.client_id = sl.client_id AND sc.user_id = sl.user_id)::int AS total_calls
      FROM sales_leads sl
      JOIN clients c ON c.id = sl.client_id
      WHERE sl.user_id = ?
    `;
    const params = [req.workspaceUserId];

    if (status) {
      sql += ' AND sl.status = ?';
      params.push(status);
    }

    if (due_today === '1') {
      sql += ' AND sl.next_followup_date IS NOT NULL AND sl.next_followup_date <= ?';
      params.push(todayStr());
      sql += " AND sl.status NOT IN ('abgeschlossen', 'verloren')";
    }

    if (search) {
      sql += ' AND (c.company_name ILIKE ? OR c.contact_person ILIKE ? OR c.phone ILIKE ?)';
      const q = `%${search}%`;
      params.push(q, q, q);
    }

    sql += ' ORDER BY sl.priority DESC, sl.next_followup_date ASC NULLS LAST, sl.created_at DESC';

    const rows = await getAll(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('[sales/leads GET]', err);
    res.status(500).json({ error: 'Fehler beim Laden der Leads' });
  }
});

// POST /api/sales/leads
router.post('/leads', async (req, res) => {
  try {
    const { client_id, status, notes, priority, next_followup_date, next_followup_note, deal_value } = req.body;
    if (!client_id) return res.status(400).json({ error: 'client_id ist erforderlich' });

    const existing = await getOne('SELECT id FROM sales_leads WHERE client_id = ? AND user_id = ?', [client_id, req.workspaceUserId]);
    if (existing) return res.status(409).json({ error: 'Dieser Kunde ist bereits ein Lead' });

    const client = await getOne('SELECT id FROM clients WHERE id = ? AND user_id = ?', [client_id, req.workspaceUserId]);
    if (!client) return res.status(404).json({ error: 'Kunde nicht gefunden' });

    const result = await run(
      `INSERT INTO sales_leads (user_id, client_id, status, notes, priority, next_followup_date, next_followup_note, deal_value)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
      [req.workspaceUserId, client_id, status || 'neu', notes || '', priority || 0,
       next_followup_date || null, next_followup_note || '', deal_value || null]
    );

    const created = await getOne(
      `SELECT sl.*, c.company_name, c.contact_person, c.phone, c.email, c.industry
       FROM sales_leads sl JOIN clients c ON c.id = sl.client_id
       WHERE sl.id = ?`,
      [result.lastInsertRowid]
    );
    res.status(201).json(created);
  } catch (err) {
    console.error('[sales/leads POST]', err);
    res.status(500).json({ error: 'Fehler beim Erstellen des Leads' });
  }
});

// PUT /api/sales/leads/:id
router.put('/leads/:id', async (req, res) => {
  try {
    const lead = await getOne('SELECT * FROM sales_leads WHERE id = ? AND user_id = ?', [req.params.id, req.workspaceUserId]);
    if (!lead) return res.status(404).json({ error: 'Lead nicht gefunden' });

    const { status, notes, priority, next_followup_date, next_followup_note, deal_value } = req.body;

    const updates = [];
    const params = [];

    if (status !== undefined) {
      updates.push('status = ?');
      params.push(status);
      if (status === 'abgeschlossen') { updates.push('won_at = NOW()'); }
      if (status === 'verloren') { updates.push('lost_at = NOW()'); }
    }
    if (notes !== undefined) { updates.push('notes = ?'); params.push(notes); }
    if (priority !== undefined) { updates.push('priority = ?'); params.push(priority); }
    if (next_followup_date !== undefined) { updates.push('next_followup_date = ?'); params.push(next_followup_date || null); }
    if (next_followup_note !== undefined) { updates.push('next_followup_note = ?'); params.push(next_followup_note); }
    if (deal_value !== undefined) { updates.push('deal_value = ?'); params.push(deal_value); }

    if (updates.length === 0) return res.json(lead);

    updates.push('updated_at = NOW()');
    params.push(req.params.id, req.workspaceUserId);

    await run(
      `UPDATE sales_leads SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
      params
    );

    const updated = await getOne(
      `SELECT sl.*, c.company_name, c.contact_person, c.phone, c.email, c.industry
       FROM sales_leads sl JOIN clients c ON c.id = sl.client_id
       WHERE sl.id = ?`,
      [req.params.id]
    );
    res.json(updated);
  } catch (err) {
    console.error('[sales/leads PUT]', err);
    res.status(500).json({ error: 'Fehler beim Aktualisieren des Leads' });
  }
});

// DELETE /api/sales/leads/:id
router.delete('/leads/:id', async (req, res) => {
  try {
    const lead = await getOne('SELECT id FROM sales_leads WHERE id = ? AND user_id = ?', [req.params.id, req.workspaceUserId]);
    if (!lead) return res.status(404).json({ error: 'Lead nicht gefunden' });
    await run('DELETE FROM sales_leads WHERE id = ? AND user_id = ?', [req.params.id, req.workspaceUserId]);
    res.json({ success: true });
  } catch (err) {
    console.error('[sales/leads DELETE]', err);
    res.status(500).json({ error: 'Fehler beim Löschen' });
  }
});

// ── CALLS ────────────────────────────────────────────────────────────────────

// GET /api/sales/calls
router.get('/calls', async (req, res) => {
  try {
    const { client_id, from, to, limit } = req.query;
    let sql = `
      SELECT sc.*, c.company_name, c.contact_person
      FROM sales_calls sc
      JOIN clients c ON c.id = sc.client_id
      WHERE sc.user_id = ?
    `;
    const params = [req.workspaceUserId];

    if (client_id) { sql += ' AND sc.client_id = ?'; params.push(client_id); }
    if (from) { sql += ' AND sc.started_at >= ?::timestamp'; params.push(from); }
    if (to) { sql += ' AND sc.started_at <= ?::timestamp'; params.push(to + 'T23:59:59'); }

    sql += ' ORDER BY sc.started_at DESC';
    if (limit) { sql += ` LIMIT ${parseInt(limit, 10)}`; }

    const rows = await getAll(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('[sales/calls GET]', err);
    res.status(500).json({ error: 'Fehler beim Laden der Anrufe' });
  }
});

// POST /api/sales/calls
router.post('/calls', async (req, res) => {
  try {
    const { client_id, outcome, notes, duration_sec } = req.body;
    if (!client_id) return res.status(400).json({ error: 'client_id ist erforderlich' });

    // Auto-link to lead
    const lead = await getOne('SELECT id FROM sales_leads WHERE client_id = ? AND user_id = ?', [client_id, req.workspaceUserId]);

    const result = await run(
      `INSERT INTO sales_calls (user_id, client_id, lead_id, outcome, notes, duration_sec)
       VALUES (?, ?, ?, ?, ?, ?) RETURNING id`,
      [req.workspaceUserId, client_id, lead?.id || null, outcome || 'reached', notes || '', duration_sec || null]
    );

    const created = await getOne('SELECT * FROM sales_calls WHERE id = ?', [result.lastInsertRowid]);
    res.status(201).json(created);
  } catch (err) {
    console.error('[sales/calls POST]', err);
    res.status(500).json({ error: 'Fehler beim Loggen des Anrufs' });
  }
});

// PUT /api/sales/calls/:id
router.put('/calls/:id', async (req, res) => {
  try {
    const call = await getOne('SELECT * FROM sales_calls WHERE id = ? AND user_id = ?', [req.params.id, req.workspaceUserId]);
    if (!call) return res.status(404).json({ error: 'Anruf nicht gefunden' });

    const { outcome, notes, duration_sec, created_followup } = req.body;

    if (outcome !== undefined)          await run('UPDATE sales_calls SET outcome = ? WHERE id = ?', [outcome, req.params.id]);
    if (notes !== undefined)            await run('UPDATE sales_calls SET notes = ? WHERE id = ?', [notes, req.params.id]);
    if (duration_sec !== undefined)     await run('UPDATE sales_calls SET duration_sec = ? WHERE id = ?', [duration_sec, req.params.id]);
    if (created_followup !== undefined) await run('UPDATE sales_calls SET created_followup = ? WHERE id = ?', [created_followup, req.params.id]);

    const updated = await getOne('SELECT * FROM sales_calls WHERE id = ?', [req.params.id]);
    res.json(updated);
  } catch (err) {
    console.error('[sales/calls PUT]', err);
    res.status(500).json({ error: 'Fehler beim Aktualisieren' });
  }
});

// DELETE /api/sales/calls/:id
router.delete('/calls/:id', async (req, res) => {
  try {
    const call = await getOne('SELECT id FROM sales_calls WHERE id = ? AND user_id = ?', [req.params.id, req.workspaceUserId]);
    if (!call) return res.status(404).json({ error: 'Anruf nicht gefunden' });
    await run('DELETE FROM sales_calls WHERE id = ? AND user_id = ?', [req.params.id, req.workspaceUserId]);
    res.json({ success: true });
  } catch (err) {
    console.error('[sales/calls DELETE]', err);
    res.status(500).json({ error: 'Fehler beim Löschen' });
  }
});

// ── STATS ────────────────────────────────────────────────────────────────────

// GET /api/sales/stats
router.get('/stats', async (req, res) => {
  try {
    const uid = req.workspaceUserId;
    const today = todayStr();
    const weekStart = weekStartStr();

    // Today's calls
    const todayStats = await getOne(`
      SELECT
        COUNT(*)::int AS calls_total,
        COUNT(*) FILTER (WHERE outcome = 'reached')::int AS calls_reached,
        COUNT(*) FILTER (WHERE outcome = 'not_reached')::int AS calls_not_reached
      FROM sales_calls
      WHERE user_id = ? AND started_at::date = ?::date
    `, [uid, today]);

    // Today's closings (leads marked abgeschlossen today)
    const todayClosings = await getOne(`
      SELECT COUNT(*)::int AS count
      FROM sales_leads
      WHERE user_id = ? AND won_at::date = ?::date
    `, [uid, today]);

    // Week stats
    const weekStats = await getOne(`
      SELECT
        COUNT(*)::int AS calls_total,
        COUNT(*) FILTER (WHERE outcome = 'reached')::int AS calls_reached
      FROM sales_calls
      WHERE user_id = ? AND started_at::date >= ?::date
    `, [uid, weekStart]);

    const weekClosings = await getOne(`
      SELECT COUNT(*)::int AS count
      FROM sales_leads
      WHERE user_id = ? AND won_at::date >= ?::date
    `, [uid, weekStart]);

    // Follow-ups due
    const followupsDue = await getOne(`
      SELECT COUNT(*)::int AS count
      FROM sales_leads
      WHERE user_id = ? AND next_followup_date IS NOT NULL AND next_followup_date <= ?
        AND status NOT IN ('abgeschlossen', 'verloren')
    `, [uid, today]);

    // Targets
    let targets = await getOne('SELECT * FROM sales_targets WHERE user_id = ?', [uid]);
    if (!targets) {
      await run('INSERT INTO sales_targets (user_id) VALUES (?) RETURNING id', [uid]);
      targets = await getOne('SELECT * FROM sales_targets WHERE user_id = ?', [uid]);
    }

    const callsTotal = todayStats?.calls_total || 0;
    const callsReached = todayStats?.calls_reached || 0;
    const closings = todayClosings?.count || 0;
    const connectRate = callsTotal > 0 ? Math.round((callsReached / callsTotal) * 1000) / 10 : 0;

    res.json({
      today: {
        calls_total: callsTotal,
        calls_reached: callsReached,
        calls_not_reached: todayStats?.calls_not_reached || 0,
        closings,
        connect_rate: connectRate,
      },
      week: {
        calls_total: weekStats?.calls_total || 0,
        calls_reached: weekStats?.calls_reached || 0,
        closings: weekClosings?.count || 0,
      },
      targets: {
        daily_calls: targets.daily_calls,
        daily_connects: targets.daily_connects,
        daily_closings: targets.daily_closings,
        weekly_calls: targets.weekly_calls,
        weekly_closings: targets.weekly_closings,
      },
      followups_due: followupsDue?.count || 0,
      motivation: motivation(callsTotal, callsReached, closings, targets),
    });
  } catch (err) {
    console.error('[sales/stats GET]', err);
    res.status(500).json({ error: 'Fehler beim Laden der Statistiken' });
  }
});

// GET /api/sales/stats/chart
router.get('/stats/chart', async (req, res) => {
  try {
    const days = parseInt(req.query.days, 10) || 14;
    const uid = req.workspaceUserId;

    const rows = await getAll(`
      SELECT
        started_at::date AS date,
        COUNT(*)::int AS calls,
        COUNT(*) FILTER (WHERE outcome = 'reached')::int AS reached,
        COUNT(*) FILTER (WHERE outcome = 'not_reached')::int AS not_reached
      FROM sales_calls
      WHERE user_id = ? AND started_at >= NOW() - INTERVAL '1 day' * ?
      GROUP BY started_at::date
      ORDER BY date ASC
    `, [uid, days]);

    // Fill gaps with zero-days
    const map = {};
    rows.forEach(r => { map[r.date instanceof Date ? r.date.toISOString().slice(0, 10) : r.date] = r; });

    const result = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      result.push(map[key] || { date: key, calls: 0, reached: 0, not_reached: 0 });
    }

    res.json({ days: result });
  } catch (err) {
    console.error('[sales/stats/chart GET]', err);
    res.status(500).json({ error: 'Fehler beim Laden der Chart-Daten' });
  }
});

// ── TARGETS ──────────────────────────────────────────────────────────────────

// GET /api/sales/targets
router.get('/targets', async (req, res) => {
  try {
    let targets = await getOne('SELECT * FROM sales_targets WHERE user_id = ?', [req.workspaceUserId]);
    if (!targets) {
      await run('INSERT INTO sales_targets (user_id) VALUES (?) RETURNING id', [req.workspaceUserId]);
      targets = await getOne('SELECT * FROM sales_targets WHERE user_id = ?', [req.workspaceUserId]);
    }
    res.json(targets);
  } catch (err) {
    console.error('[sales/targets GET]', err);
    res.status(500).json({ error: 'Fehler beim Laden der Ziele' });
  }
});

// PUT /api/sales/targets
router.put('/targets', async (req, res) => {
  try {
    let targets = await getOne('SELECT * FROM sales_targets WHERE user_id = ?', [req.workspaceUserId]);
    if (!targets) {
      await run('INSERT INTO sales_targets (user_id) VALUES (?) RETURNING id', [req.workspaceUserId]);
    }

    const { daily_calls, daily_connects, daily_closings, weekly_calls, weekly_closings } = req.body;

    await run(`
      UPDATE sales_targets SET
        daily_calls = ?, daily_connects = ?, daily_closings = ?,
        weekly_calls = ?, weekly_closings = ?, updated_at = NOW()
      WHERE user_id = ?
    `, [
      daily_calls ?? 30, daily_connects ?? 10, daily_closings ?? 2,
      weekly_calls ?? 150, weekly_closings ?? 8, req.workspaceUserId,
    ]);

    const updated = await getOne('SELECT * FROM sales_targets WHERE user_id = ?', [req.workspaceUserId]);
    res.json(updated);
  } catch (err) {
    console.error('[sales/targets PUT]', err);
    res.status(500).json({ error: 'Fehler beim Aktualisieren der Ziele' });
  }
});

module.exports = router;
