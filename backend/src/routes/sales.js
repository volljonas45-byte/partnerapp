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
  const day = now.getDay() || 7;
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

// Resolve display fields: prefer lead's own fields, fall back to linked client
const LEAD_SELECT = `
  SELECT
    sl.*,
    COALESCE(sl.company_name,   c.company_name)   AS company_name,
    COALESCE(sl.contact_person, c.contact_person) AS contact_person,
    COALESCE(sl.phone,          c.phone)           AS phone,
    COALESCE(sl.email,          c.email)           AS email,
    COALESCE(sl.branch,         c.industry)        AS industry,
    sl.branch, sl.city, sl.website_status, sl.domain,
    (SELECT MAX(sc.started_at)
     FROM sales_calls sc
     WHERE sc.user_id = sl.user_id
       AND (sc.lead_id = sl.id OR (sl.client_id IS NOT NULL AND sc.client_id = sl.client_id))
    ) AS last_call_at,
    (SELECT COUNT(*)
     FROM sales_calls sc
     WHERE sc.user_id = sl.user_id
       AND (sc.lead_id = sl.id OR (sl.client_id IS NOT NULL AND sc.client_id = sl.client_id))
    )::int AS total_calls
  FROM sales_leads sl
  LEFT JOIN clients c ON c.id = sl.client_id
`;

// ── LEADS ────────────────────────────────────────────────────────────────────

// GET /api/sales/leads
router.get('/leads', async (req, res) => {
  try {
    const { status, due_today, search } = req.query;
    let sql = LEAD_SELECT + ' WHERE sl.user_id = ?';
    const params = [req.workspaceUserId];

    if (status) {
      // "verloren" tab shows both verloren and kein_interesse
      if (status === 'verloren') {
        sql += " AND sl.status IN ('verloren', 'kein_interesse')";
      } else {
        sql += ' AND sl.status = ?';
        params.push(status);
      }
    } else if (due_today === '1') {
      sql += ' AND sl.next_followup_date IS NOT NULL AND sl.next_followup_date <= ?';
      params.push(todayStr());
      sql += " AND sl.status NOT IN ('gewonnen', 'abgeschlossen', 'verloren', 'kein_interesse')";
    } else {
      // "Alle" tab: hide archived/terminal leads
      sql += " AND sl.status NOT IN ('verloren', 'kein_interesse')";
    }

    if (search) {
      sql += ` AND (
        COALESCE(sl.company_name, c.company_name) ILIKE ? OR
        COALESCE(sl.contact_person, c.contact_person) ILIKE ? OR
        COALESCE(sl.phone, c.phone) ILIKE ?
      )`;
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

// GET /api/sales/leads/:id
router.get('/leads/:id', async (req, res) => {
  try {
    const row = await getOne(
      LEAD_SELECT + ' WHERE sl.id = ? AND sl.user_id = ?',
      [req.params.id, req.workspaceUserId]
    );
    if (!row) return res.status(404).json({ error: 'Lead nicht gefunden' });
    res.json(row);
  } catch (err) {
    console.error('[sales/leads/:id GET]', err);
    res.status(500).json({ error: 'Fehler beim Laden' });
  }
});

// POST /api/sales/leads
router.post('/leads', async (req, res) => {
  try {
    const {
      client_id, company_name, contact_person, phone, email,
      branch, city, website_status, domain,
      status, notes, priority, next_followup_date, next_followup_note, deal_value,
    } = req.body;

    // Either client_id or company_name required
    if (!client_id && !company_name) {
      return res.status(400).json({ error: 'Unternehmensname oder Kunde erforderlich' });
    }

    // If client linked, check not already a lead for this user
    if (client_id) {
      const existing = await getOne(
        'SELECT id FROM sales_leads WHERE client_id = ? AND user_id = ?',
        [client_id, req.workspaceUserId]
      );
      if (existing) return res.status(409).json({ error: 'Dieser Kunde ist bereits ein Lead' });

      const client = await getOne(
        'SELECT id FROM clients WHERE id = ? AND user_id = ?',
        [client_id, req.workspaceUserId]
      );
      if (!client) return res.status(404).json({ error: 'Kunde nicht gefunden' });
    }

    const result = await run(
      `INSERT INTO sales_leads
         (user_id, client_id, company_name, contact_person, phone, email,
          branch, city, website_status, domain,
          status, notes, priority, next_followup_date, next_followup_note, deal_value)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
      [
        req.workspaceUserId,
        client_id || null,
        company_name || null, contact_person || null, phone || null, email || null,
        branch || null, city || null, website_status || null, domain || null,
        status || 'neu', notes || '', priority ?? 0,
        next_followup_date || null, next_followup_note || '', deal_value || null,
      ]
    );

    const created = await getOne(
      LEAD_SELECT + ' WHERE sl.id = ?',
      [result.lastInsertRowid]
    );
    res.status(201).json(created);
  } catch (err) {
    console.error('[sales/leads POST]', err);
    res.status(500).json({ error: 'Fehler beim Erstellen des Leads' });
  }
});

// POST /api/sales/leads/import  — bulk Excel import
router.post('/leads/import', async (req, res) => {
  try {
    const { leads } = req.body;
    if (!Array.isArray(leads) || leads.length === 0) {
      return res.status(400).json({ error: 'Keine Leads übergeben' });
    }

    let imported = 0;
    let skipped  = 0;

    for (const lead of leads) {
      const { company_name, contact_person, phone, email, branch, city,
              website_status, domain, status, notes, priority,
              next_followup_date, deal_value } = lead;

      if (!company_name) { skipped++; continue; }

      // Skip if exact same company already exists as lead for this user
      const dup = await getOne(
        `SELECT id FROM sales_leads
         WHERE user_id = ? AND LOWER(TRIM(COALESCE(company_name, ''))) = LOWER(TRIM(?)) AND client_id IS NULL`,
        [req.workspaceUserId, company_name]
      );
      if (dup) { skipped++; continue; }

      await run(
        `INSERT INTO sales_leads
           (user_id, company_name, contact_person, phone, email, branch, city,
            website_status, domain, status, notes, priority, next_followup_date, deal_value)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          req.workspaceUserId,
          company_name, contact_person || null, phone || null, email || null,
          branch || null, city || null, website_status || null, domain || null,
          status || 'neu', notes || '', priority ?? 0,
          next_followup_date || null, deal_value || null,
        ]
      );
      imported++;
    }

    res.json({ imported, skipped });
  } catch (err) {
    console.error('[sales/leads/import POST]', err);
    res.status(500).json({ error: 'Fehler beim Import' });
  }
});

// POST /api/sales/leads/:id/convert  — convert lead to client
router.post('/leads/:id/convert', async (req, res) => {
  try {
    const lead = await getOne(
      LEAD_SELECT + ' WHERE sl.id = ? AND sl.user_id = ?',
      [req.params.id, req.workspaceUserId]
    );
    if (!lead) return res.status(404).json({ error: 'Lead nicht gefunden' });
    if (lead.client_id) return res.status(409).json({ error: 'Lead ist bereits ein Kunde' });

    // Create client from lead data
    const client = await run(
      `INSERT INTO clients
         (user_id, company_name, contact_person, phone, email, industry, website, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
      [
        req.workspaceUserId,
        lead.company_name || 'Unbekannt',
        lead.contact_person || null,
        lead.phone || null,
        lead.email || null,
        lead.branch || null,
        lead.domain ? `https://${lead.domain}` : null,
        lead.notes || null,
      ]
    );

    const clientId = client.lastInsertRowid;

    // Link lead to new client
    await run(
      'UPDATE sales_leads SET client_id = ?, status = ?, updated_at = NOW() WHERE id = ? AND user_id = ?',
      ['demo', clientId, req.params.id, req.workspaceUserId]
    );

    // Update any existing calls for this lead
    await run(
      'UPDATE sales_calls SET client_id = ? WHERE lead_id = ? AND user_id = ?',
      [clientId, req.params.id, req.workspaceUserId]
    );

    const updated = await getOne(LEAD_SELECT + ' WHERE sl.id = ?', [req.params.id]);
    res.json({ client_id: clientId, lead: updated });
  } catch (err) {
    console.error('[sales/leads/:id/convert POST]', err);
    res.status(500).json({ error: 'Fehler bei der Konvertierung' });
  }
});

// PUT /api/sales/leads/:id
router.put('/leads/:id', async (req, res) => {
  try {
    const lead = await getOne(
      'SELECT * FROM sales_leads WHERE id = ? AND user_id = ?',
      [req.params.id, req.workspaceUserId]
    );
    if (!lead) return res.status(404).json({ error: 'Lead nicht gefunden' });

    const {
      status, notes, priority, next_followup_date, next_followup_note, deal_value,
      company_name, contact_person, phone, email, branch, city, website_status, domain,
    } = req.body;

    const updates = [];
    const params  = [];

    if (status !== undefined) {
      updates.push('status = ?'); params.push(status);
      if (status === 'gewonnen' || status === 'abgeschlossen') updates.push('won_at = NOW()');
      if (status === 'verloren') updates.push('lost_at = NOW()');
    }
    if (notes           !== undefined) { updates.push('notes = ?');                params.push(notes); }
    if (priority        !== undefined) { updates.push('priority = ?');             params.push(priority); }
    if (next_followup_date !== undefined) { updates.push('next_followup_date = ?'); params.push(next_followup_date || null); }
    if (next_followup_note !== undefined) { updates.push('next_followup_note = ?'); params.push(next_followup_note); }
    if (deal_value      !== undefined) { updates.push('deal_value = ?');           params.push(deal_value); }
    if (company_name    !== undefined) { updates.push('company_name = ?');         params.push(company_name); }
    if (contact_person  !== undefined) { updates.push('contact_person = ?');       params.push(contact_person); }
    if (phone           !== undefined) { updates.push('phone = ?');                params.push(phone); }
    if (email           !== undefined) { updates.push('email = ?');                params.push(email); }
    if (branch          !== undefined) { updates.push('branch = ?');               params.push(branch); }
    if (city            !== undefined) { updates.push('city = ?');                 params.push(city); }
    if (website_status  !== undefined) { updates.push('website_status = ?');       params.push(website_status); }
    if (domain          !== undefined) { updates.push('domain = ?');               params.push(domain); }

    if (updates.length === 0) return res.json(lead);

    updates.push('updated_at = NOW()');
    params.push(req.params.id, req.workspaceUserId);

    await run(
      `UPDATE sales_leads SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
      params
    );

    const updated = await getOne(LEAD_SELECT + ' WHERE sl.id = ?', [req.params.id]);
    res.json(updated);
  } catch (err) {
    console.error('[sales/leads PUT]', err);
    res.status(500).json({ error: 'Fehler beim Aktualisieren des Leads' });
  }
});

// DELETE /api/sales/leads/:id
router.delete('/leads/:id', async (req, res) => {
  try {
    const lead = await getOne(
      'SELECT id FROM sales_leads WHERE id = ? AND user_id = ?',
      [req.params.id, req.workspaceUserId]
    );
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
    const { client_id, lead_id, from, to, limit } = req.query;
    let sql = `
      SELECT sc.*,
             COALESCE(sl.company_name, c.company_name)   AS company_name,
             COALESCE(sl.contact_person, c.contact_person) AS contact_person
      FROM sales_calls sc
      LEFT JOIN clients c ON c.id = sc.client_id
      LEFT JOIN sales_leads sl ON sl.id = sc.lead_id
      WHERE sc.user_id = ?
    `;
    const params = [req.workspaceUserId];

    if (client_id) { sql += ' AND sc.client_id = ?';          params.push(client_id); }
    if (lead_id)   { sql += ' AND sc.lead_id = ?';            params.push(lead_id); }
    if (from)      { sql += ' AND sc.started_at >= ?::timestamp'; params.push(from); }
    if (to)        { sql += ' AND sc.started_at <= ?::timestamp'; params.push(to + 'T23:59:59'); }

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
    const { client_id, lead_id, outcome, notes, duration_sec } = req.body;
    if (!client_id && !lead_id) {
      return res.status(400).json({ error: 'client_id oder lead_id erforderlich' });
    }

    // Auto-link to lead if client_id given
    let resolvedLeadId = lead_id || null;
    if (client_id && !lead_id) {
      const lead = await getOne(
        'SELECT id FROM sales_leads WHERE client_id = ? AND user_id = ?',
        [client_id, req.workspaceUserId]
      );
      resolvedLeadId = lead?.id || null;
    }

    const result = await run(
      `INSERT INTO sales_calls (user_id, client_id, lead_id, outcome, notes, duration_sec)
       VALUES (?, ?, ?, ?, ?, ?) RETURNING id`,
      [req.workspaceUserId, client_id || null, resolvedLeadId, outcome || 'reached', notes || '', duration_sec || null]
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
    const call = await getOne(
      'SELECT * FROM sales_calls WHERE id = ? AND user_id = ?',
      [req.params.id, req.workspaceUserId]
    );
    if (!call) return res.status(404).json({ error: 'Anruf nicht gefunden' });

    const { outcome, notes, duration_sec, created_followup } = req.body;

    if (outcome          !== undefined) await run('UPDATE sales_calls SET outcome = ? WHERE id = ?',          [outcome, req.params.id]);
    if (notes            !== undefined) await run('UPDATE sales_calls SET notes = ? WHERE id = ?',            [notes, req.params.id]);
    if (duration_sec     !== undefined) await run('UPDATE sales_calls SET duration_sec = ? WHERE id = ?',     [duration_sec, req.params.id]);
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
    const call = await getOne(
      'SELECT id FROM sales_calls WHERE id = ? AND user_id = ?',
      [req.params.id, req.workspaceUserId]
    );
    if (!call) return res.status(404).json({ error: 'Anruf nicht gefunden' });
    await run('DELETE FROM sales_calls WHERE id = ? AND user_id = ?', [req.params.id, req.workspaceUserId]);
    res.json({ success: true });
  } catch (err) {
    console.error('[sales/calls DELETE]', err);
    res.status(500).json({ error: 'Fehler beim Löschen' });
  }
});

// ── STATS ────────────────────────────────────────────────────────────────────

router.get('/stats', async (req, res) => {
  try {
    const uid = req.workspaceUserId;
    const today = todayStr();
    const weekStart = weekStartStr();

    const todayStats = await getOne(`
      SELECT
        COUNT(*)::int AS calls_total,
        COUNT(*) FILTER (WHERE outcome = 'reached')::int AS calls_reached,
        COUNT(*) FILTER (WHERE outcome = 'not_reached')::int AS calls_not_reached
      FROM sales_calls
      WHERE user_id = ? AND started_at::date = ?::date
    `, [uid, today]);

    const todayClosings = await getOne(`
      SELECT COUNT(*)::int AS count FROM sales_leads
      WHERE user_id = ? AND (won_at::date = ?::date)
    `, [uid, today]);

    const weekStats = await getOne(`
      SELECT
        COUNT(*)::int AS calls_total,
        COUNT(*) FILTER (WHERE outcome = 'reached')::int AS calls_reached
      FROM sales_calls
      WHERE user_id = ? AND started_at::date >= ?::date
    `, [uid, weekStart]);

    const weekClosings = await getOne(`
      SELECT COUNT(*)::int AS count FROM sales_leads
      WHERE user_id = ? AND won_at::date >= ?::date
    `, [uid, weekStart]);

    const followupsDue = await getOne(`
      SELECT COUNT(*)::int AS count FROM sales_leads
      WHERE user_id = ? AND next_followup_date IS NOT NULL AND next_followup_date <= ?
        AND status NOT IN ('gewonnen', 'abgeschlossen', 'verloren', 'kein_interesse')
    `, [uid, today]);

    const demosActive = await getOne(`
      SELECT COUNT(*)::int AS count FROM sales_leads
      WHERE user_id = ? AND status = 'demo'
    `, [uid]);

    let targets = await getOne('SELECT * FROM sales_targets WHERE user_id = ?', [uid]);
    if (!targets) {
      await run('INSERT INTO sales_targets (user_id) VALUES (?) RETURNING id', [uid]);
      targets = await getOne('SELECT * FROM sales_targets WHERE user_id = ?', [uid]);
    }

    const callsTotal  = todayStats?.calls_total   || 0;
    const callsReached = todayStats?.calls_reached || 0;
    const closings    = todayClosings?.count       || 0;
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
        calls_total: weekStats?.calls_total   || 0,
        calls_reached: weekStats?.calls_reached || 0,
        closings: weekClosings?.count         || 0,
      },
      targets: {
        daily_calls:    targets.daily_calls,
        daily_connects: targets.daily_connects,
        daily_closings: targets.daily_closings,
        weekly_calls:   targets.weekly_calls,
        weekly_closings: targets.weekly_closings,
      },
      followups_due: followupsDue?.count || 0,
      demos_active:  demosActive?.count  || 0,
      motivation: motivation(callsTotal, callsReached, closings, targets),
    });
  } catch (err) {
    console.error('[sales/stats GET]', err);
    res.status(500).json({ error: 'Fehler beim Laden der Statistiken' });
  }
});

router.get('/stats/chart', async (req, res) => {
  try {
    const days = parseInt(req.query.days, 10) || 14;
    const uid  = req.workspaceUserId;

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

    const map = {};
    rows.forEach(r => {
      map[r.date instanceof Date ? r.date.toISOString().slice(0, 10) : r.date] = r;
    });

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
    `, [daily_calls ?? 30, daily_connects ?? 10, daily_closings ?? 2, weekly_calls ?? 150, weekly_closings ?? 8, req.workspaceUserId]);

    const updated = await getOne('SELECT * FROM sales_targets WHERE user_id = ?', [req.workspaceUserId]);
    res.json(updated);
  } catch (err) {
    console.error('[sales/targets PUT]', err);
    res.status(500).json({ error: 'Fehler beim Aktualisieren der Ziele' });
  }
});

module.exports = router;
