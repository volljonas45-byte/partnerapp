const express = require('express');
const router = express.Router();
const { getOne, getAll, run } = require('../db/pg');
const authenticate = require('../middleware/auth');

router.use(authenticate);

// ── HELPERS ──────────────────────────────────────────────────────────────────

const TZ = 'Europe/Berlin';

// Returns YYYY-MM-DD in Europe/Berlin, optionally offset by N days
function berlinDateStr(offsetDays = 0) {
  const now = new Date(Date.now() + offsetDays * 86400000);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now);
  const y = parts.find(p => p.type === 'year').value;
  const m = parts.find(p => p.type === 'month').value;
  const d = parts.find(p => p.type === 'day').value;
  return `${y}-${m}-${d}`;
}

// Returns weekday number (Mon=1..Sun=7) in Berlin
function berlinWeekday() {
  const wd = new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'short' })
    .format(new Date());
  return { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 }[wd];
}

function todayStr() {
  return berlinDateStr(0);
}

function tomorrowStr() {
  return berlinDateStr(1);
}

function weekStartStr() {
  return berlinDateStr(1 - berlinWeekday());
}

function weekEndStr() {
  return berlinDateStr(7 - berlinWeekday());
}

const MAX_LEADS_PER_DAY = 20;

// Find the next day (starting today) that has fewer than 20 leads scheduled
async function getNextAvailableDay(workspaceUserId, ownerId) {
  // Count leads per scheduled day for this owner (next_followup_date is TEXT 'YYYY-MM-DD')
  const rows = await getAll(
    `SELECT next_followup_date AS day, COUNT(*)::int AS cnt
     FROM sales_leads
     WHERE user_id = ? AND owner_id = ?
       AND next_followup_date >= ?
       AND status NOT IN ('verloren', 'kein_interesse', 'nicht_existent', 'gewonnen', 'abgeschlossen')
     GROUP BY next_followup_date
     ORDER BY next_followup_date`,
    [workspaceUserId, ownerId, todayStr()]
  );

  const counts = {};
  for (const r of rows) counts[r.day] = r.cnt;

  // Walk forward from today until we find a slot
  const d = new Date();
  for (let i = 0; i < 365; i++) {
    const key = d.toISOString().slice(0, 10);
    if ((counts[key] || 0) < MAX_LEADS_PER_DAY) return key;
    d.setDate(d.getDate() + 1);
  }
  // Fallback: today
  return todayStr();
}

function motivation(todayCalls, todayReached, todayClosings, targets) {
  const { daily_calls, daily_connects, daily_closings } = targets;
  if (todayCalls >= daily_calls) {
    const over = todayCalls - daily_calls;
    return over > 0
      ? { message: `Du bist ${over} Calls über deinem Ziel — weiter so, das ist Klasse!`, type: 'excellent' }
      : { message: 'Tagesziel erreicht! Stark gemacht, weiter geht\'s!', type: 'success' };
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
    u_owner.name AS owner_name, u_owner.color AS owner_color,
    (SELECT MAX(sc.started_at)
     FROM sales_calls sc
     WHERE sc.user_id = sl.user_id
       AND (sc.lead_id = sl.id OR (sl.client_id IS NOT NULL AND sc.client_id = sl.client_id))
    ) AS last_call_at,
    (SELECT sc.outcome FROM sales_calls sc
     WHERE sc.user_id = sl.user_id
       AND (sc.lead_id = sl.id OR (sl.client_id IS NOT NULL AND sc.client_id = sl.client_id))
     ORDER BY sc.started_at DESC LIMIT 1
    ) AS last_call_outcome,
    (SELECT COUNT(*)
     FROM sales_calls sc
     WHERE sc.user_id = sl.user_id
       AND (sc.lead_id = sl.id OR (sl.client_id IS NOT NULL AND sc.client_id = sl.client_id))
    )::int AS total_calls
  FROM sales_leads sl
  LEFT JOIN clients c ON c.id = sl.client_id
  LEFT JOIN users u_owner ON u_owner.id = sl.owner_id
`;

// ── LEADS ────────────────────────────────────────────────────────────────────

// GET /api/sales/leads
router.get('/leads', async (req, res) => {
  try {
    const { status, due_today, due_tomorrow, due_week, due_email, search, owner_id } = req.query;
    let sql = LEAD_SELECT + ' WHERE sl.user_id = ?';
    const params = [req.workspaceUserId];
    const TERMINAL = "('gewonnen', 'abgeschlossen', 'verloren', 'kein_interesse', 'nicht_existent')";

    // Owner filtering: default = my leads
    if (owner_id === 'all') {
      // show all workspace leads
    } else if (owner_id && owner_id !== 'me') {
      sql += ' AND sl.owner_id = ?';
      params.push(parseInt(owner_id, 10));
    } else {
      sql += ' AND sl.owner_id = ?';
      params.push(req.userId);
    }

    if (status) {
      // "verloren" tab shows both verloren and kein_interesse
      if (status === 'verloren') {
        sql += " AND sl.status IN ('verloren', 'kein_interesse', 'nicht_existent')";
      } else {
        sql += ' AND sl.status = ?';
        params.push(status);
      }
    } else if (due_today === '1') {
      sql += ' AND sl.next_followup_date IS NOT NULL AND sl.next_followup_date <= ?';
      params.push(todayStr());
      sql += ` AND sl.status NOT IN ${TERMINAL}`;
    } else if (due_tomorrow === '1') {
      sql += ' AND sl.next_followup_date = ?';
      params.push(tomorrowStr());
      sql += ` AND sl.status NOT IN ${TERMINAL}`;
    } else if (due_week === '1') {
      sql += ' AND sl.next_followup_date IS NOT NULL AND sl.next_followup_date >= ? AND sl.next_followup_date <= ?';
      params.push(weekStartStr(), weekEndStr());
      sql += ` AND sl.status NOT IN ${TERMINAL}`;
    } else if (due_email === '1') {
      sql += ` AND sl.next_followup_date IS NOT NULL AND sl.next_followup_date <= ?
               AND COALESCE(sl.next_followup_type, 'anruf') = 'email'
               AND sl.status NOT IN ${TERMINAL}`;
      params.push(todayStr());
    } else {
      // "Alle" tab: hide archived/terminal leads
      sql += " AND sl.status NOT IN ('verloren', 'kein_interesse', 'nicht_existent')";
    }

    if (search) {
      const q = `%${search}%`;
      const digits = search.replace(/\D/g, '');
      if (digits.length >= 3) {
        // Phone-number style search: strip all non-digits on both sides and match the last digits,
        // so "+49 123 456789", "0123-456789" and "0123 456789" all find each other.
        sql += ` AND (
          COALESCE(sl.company_name, c.company_name) ILIKE ? OR
          COALESCE(sl.contact_person, c.contact_person) ILIKE ? OR
          regexp_replace(COALESCE(sl.phone, c.phone, ''), '[^0-9]', '', 'g') LIKE ?
        )`;
        params.push(q, q, `%${digits}%`);
      } else {
        sql += ` AND (
          COALESCE(sl.company_name, c.company_name) ILIKE ? OR
          COALESCE(sl.contact_person, c.contact_person) ILIKE ? OR
          COALESCE(sl.phone, c.phone) ILIKE ?
        )`;
        params.push(q, q, q);
      }
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
      branch, city, website_status, domain, address,
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

    // Auto-schedule: if no date given, assign to next available day (max 20/day)
    const scheduledDate = next_followup_date || await getNextAvailableDay(req.workspaceUserId, req.userId);

    const result = await run(
      `INSERT INTO sales_leads
         (user_id, owner_id, client_id, company_name, contact_person, phone, email,
          branch, city, website_status, domain, address,
          status, notes, priority, next_followup_date, next_followup_note, deal_value)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
      [
        req.workspaceUserId, req.userId,
        client_id || null,
        company_name || null, contact_person || null, phone || null, email || null,
        branch || null, city || null, website_status || null, domain || null, address || null,
        status || 'neu', notes || '', priority ?? 0,
        scheduledDate, next_followup_note || '', deal_value || null,
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
              website_status, domain, address, status, notes, priority,
              next_followup_date, deal_value } = lead;

      if (!company_name) { skipped++; continue; }

      // Skip if exact same company already exists as lead for this user
      const dup = await getOne(
        `SELECT id FROM sales_leads
         WHERE user_id = ? AND LOWER(TRIM(COALESCE(company_name, ''))) = LOWER(TRIM(?)) AND client_id IS NULL`,
        [req.workspaceUserId, company_name]
      );
      if (dup) { skipped++; continue; }

      // Auto-schedule if no date given
      const scheduledDate = next_followup_date || await getNextAvailableDay(req.workspaceUserId, req.userId);

      await run(
        `INSERT INTO sales_leads
           (user_id, owner_id, company_name, contact_person, phone, email, branch, city,
            website_status, domain, address, status, notes, priority, next_followup_date, deal_value)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          req.workspaceUserId, req.userId,
          company_name, contact_person || null, phone || null, email || null,
          branch || null, city || null, website_status || null, domain || null,
          address || null, status || 'neu', notes || '', priority ?? 0,
          scheduledDate, deal_value || null,
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
      status, notes, priority, next_followup_date, next_followup_note, next_followup_type, deal_value,
      company_name, contact_person, phone, email, branch, city, website_status, domain,
      address, owner_id,
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
    if (next_followup_type !== undefined) { updates.push('next_followup_type = ?'); params.push(next_followup_type || 'anruf'); }
    if (deal_value      !== undefined) { updates.push('deal_value = ?');           params.push(deal_value); }
    if (company_name    !== undefined) { updates.push('company_name = ?');         params.push(company_name); }
    if (contact_person  !== undefined) { updates.push('contact_person = ?');       params.push(contact_person); }
    if (phone           !== undefined) { updates.push('phone = ?');                params.push(phone); }
    if (email           !== undefined) { updates.push('email = ?');                params.push(email); }
    if (branch          !== undefined) { updates.push('branch = ?');               params.push(branch); }
    if (city            !== undefined) { updates.push('city = ?');                 params.push(city); }
    if (website_status  !== undefined) { updates.push('website_status = ?');       params.push(website_status); }
    if (domain          !== undefined) { updates.push('domain = ?');               params.push(domain); }
    if (address         !== undefined) { updates.push('address = ?');              params.push(address); }
    if (owner_id        !== undefined) { updates.push('owner_id = ?');             params.push(owner_id); }

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
    const { client_id, lead_id, from, to, limit, owner_id } = req.query;
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

    // Owner filter: 'all' = no filter, specific id = that user, undefined = me
    const ownerFilterId = owner_id === 'all' ? null
      : (owner_id ? parseInt(owner_id, 10) : req.userId);
    if (ownerFilterId) { sql += ' AND sc.owner_id = ?'; params.push(ownerFilterId); }

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
      `INSERT INTO sales_calls (user_id, owner_id, client_id, lead_id, outcome, notes, duration_sec)
       VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id`,
      [req.workspaceUserId, req.userId, client_id || null, resolvedLeadId, outcome || 'reached', notes || '', duration_sec || null]
    );

    // Auto-Status: "neu" → "anrufen" sobald erster Anruf erfasst wird
    if (resolvedLeadId) {
      await run(
        `UPDATE sales_leads SET status = 'anrufen', updated_at = NOW()
         WHERE id = ? AND user_id = ? AND status = 'neu'`,
        [resolvedLeadId, req.workspaceUserId]
      );
    }

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
    const wsId = req.workspaceUserId;
    const ownerId = req.query.owner_id === 'all' ? null
      : (req.query.owner_id ? parseInt(req.query.owner_id, 10) : req.userId);
    const today = todayStr();
    const weekStart = weekStartStr();

    // Calls stats — filter by owner_id when viewing a specific user
    const callFilter = ownerId
      ? 'user_id = ? AND owner_id = ?'
      : 'user_id = ?';
    const callParams = ownerId ? [wsId, ownerId] : [wsId];

    const todayStats = await getOne(`
      SELECT
        COUNT(*)::int AS calls_total,
        COUNT(*) FILTER (WHERE outcome = 'reached')::int AS calls_reached,
        COUNT(*) FILTER (WHERE outcome = 'not_reached')::int AS calls_not_reached
      FROM sales_calls
      WHERE ${callFilter} AND (started_at AT TIME ZONE 'Europe/Berlin')::date = ?::date
    `, [...callParams, today]);

    // Lead stats — filter by owner_id
    const leadFilter = ownerId
      ? 'user_id = ? AND owner_id = ?'
      : 'user_id = ?';
    const leadParams = ownerId ? [wsId, ownerId] : [wsId];

    const todayClosings = await getOne(`
      SELECT COUNT(*)::int AS count FROM sales_leads
      WHERE ${leadFilter} AND ((won_at AT TIME ZONE 'Europe/Berlin')::date = ?::date)
    `, [...leadParams, today]);

    const weekStats = await getOne(`
      SELECT
        COUNT(*)::int AS calls_total,
        COUNT(*) FILTER (WHERE outcome = 'reached')::int AS calls_reached
      FROM sales_calls
      WHERE ${callFilter} AND (started_at AT TIME ZONE 'Europe/Berlin')::date >= ?::date
    `, [...callParams, weekStart]);

    const weekClosings = await getOne(`
      SELECT COUNT(*)::int AS count FROM sales_leads
      WHERE ${leadFilter} AND (won_at AT TIME ZONE 'Europe/Berlin')::date >= ?::date
    `, [...leadParams, weekStart]);

    const followupsDue = await getOne(`
      SELECT COUNT(*)::int AS count FROM sales_leads
      WHERE ${leadFilter} AND next_followup_date IS NOT NULL AND next_followup_date <= ?
        AND status NOT IN ('gewonnen', 'abgeschlossen', 'verloren', 'kein_interesse', 'nicht_existent')
    `, [...leadParams, today]);

    const emailFollowupsDue = await getOne(`
      SELECT COUNT(*)::int AS count FROM sales_leads
      WHERE ${leadFilter} AND next_followup_date IS NOT NULL AND next_followup_date <= ?
        AND COALESCE(next_followup_type, 'anruf') = 'email'
        AND status NOT IN ('gewonnen', 'abgeschlossen', 'verloren', 'kein_interesse', 'nicht_existent')
    `, [...leadParams, today]);

    const demosActive = await getOne(`
      SELECT COUNT(*)::int AS count FROM sales_leads
      WHERE ${leadFilter} AND status = 'demo'
    `, leadParams);

    // Targets: always per logged-in user (personal goals)
    const targetUserId = req.userId;
    let targets = await getOne('SELECT * FROM sales_targets WHERE user_id = ?', [targetUserId]);
    if (!targets) {
      await run('INSERT INTO sales_targets (user_id) VALUES (?) RETURNING id', [targetUserId]);
      targets = await getOne('SELECT * FROM sales_targets WHERE user_id = ?', [targetUserId]);
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
      email_followups_due: emailFollowupsDue?.count || 0,
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
    const wsId = req.workspaceUserId;
    const ownerId = req.query.owner_id === 'all' ? null
      : (req.query.owner_id ? parseInt(req.query.owner_id, 10) : req.userId);

    const filter = ownerId
      ? 'user_id = ? AND owner_id = ?'
      : 'user_id = ?';
    const filterParams = ownerId ? [wsId, ownerId] : [wsId];

    const rows = await getAll(`
      SELECT
        (started_at AT TIME ZONE 'Europe/Berlin')::date AS date,
        COUNT(*)::int AS calls,
        COUNT(*) FILTER (WHERE outcome = 'reached')::int AS reached,
        COUNT(*) FILTER (WHERE outcome = 'not_reached')::int AS not_reached
      FROM sales_calls
      WHERE ${filter} AND started_at >= NOW() - INTERVAL '1 day' * ?
      GROUP BY (started_at AT TIME ZONE 'Europe/Berlin')::date
      ORDER BY date ASC
    `, [...filterParams, days]);

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

// ── ANALYTICS ────────────────────────────────────────────────────────────────

router.get('/stats/analytics', async (req, res) => {
  try {
    const period = parseInt(req.query.period, 10) || 30;
    const wsId = req.workspaceUserId;
    const ownerId = req.query.owner_id === 'all' ? null
      : (req.query.owner_id ? parseInt(req.query.owner_id, 10) : req.userId);
    const today = todayStr();

    const lf = ownerId ? 'sl.user_id = ? AND sl.owner_id = ?' : 'sl.user_id = ?';
    const lp = ownerId ? [wsId, ownerId] : [wsId];
    const cf = ownerId ? 'sc.user_id = ? AND sc.owner_id = ?' : 'sc.user_id = ?';
    const cp = ownerId ? [wsId, ownerId] : [wsId];

    const [
      funnel, conversion, callPerf, callsByDow, callsByHour,
      dailyCalls, dailyClosings, dailyCreated, responseTime,
      overdue, stale, lossByBranch, team, followupCompl,
    ] = await Promise.all([
      // 1 — Pipeline funnel
      getAll(`SELECT sl.status, COUNT(*)::int AS count FROM sales_leads sl WHERE ${lf} GROUP BY sl.status`, lp),

      // 2 — Conversion metrics
      getOne(`SELECT
        COUNT(*)::int AS total_leads,
        COUNT(*) FILTER (WHERE sl.status IN ('demo','gewonnen','abgeschlossen'))::int AS reached_demo,
        COUNT(*) FILTER (WHERE sl.status IN ('gewonnen','abgeschlossen'))::int AS won,
        COUNT(*) FILTER (WHERE sl.status IN ('verloren','kein_interesse','nicht_existent'))::int AS lost,
        COALESCE(SUM(sl.deal_value) FILTER (WHERE sl.status IN ('gewonnen','abgeschlossen')), 0)::real AS revenue_won,
        COALESCE(AVG(sl.deal_value) FILTER (WHERE sl.status IN ('gewonnen','abgeschlossen')), 0)::real AS avg_deal_value,
        COALESCE(SUM(sl.deal_value) FILTER (WHERE sl.status NOT IN ('gewonnen','abgeschlossen','verloren','kein_interesse','nicht_existent')), 0)::real AS pipeline_value
      FROM sales_leads sl WHERE ${lf}`, lp),

      // 3 — Call performance (period)
      getOne(`SELECT
        COUNT(*)::int AS total_calls,
        COUNT(*) FILTER (WHERE sc.outcome = 'reached')::int AS reached,
        COUNT(*) FILTER (WHERE sc.outcome = 'not_reached')::int AS not_reached,
        COALESCE(AVG(sc.duration_sec) FILTER (WHERE sc.duration_sec > 0), 0)::real AS avg_duration_sec
      FROM sales_calls sc WHERE ${cf} AND sc.started_at >= NOW() - INTERVAL '1 day' * ?`, [...cp, period]),

      // 4 — Calls by day of week
      getAll(`SELECT EXTRACT(DOW FROM sc.started_at)::int AS dow, COUNT(*)::int AS calls,
        COUNT(*) FILTER (WHERE sc.outcome = 'reached')::int AS reached
      FROM sales_calls sc WHERE ${cf} AND sc.started_at >= NOW() - INTERVAL '1 day' * ?
      GROUP BY dow ORDER BY dow`, [...cp, period]),

      // 5 — Calls by hour
      getAll(`SELECT EXTRACT(HOUR FROM sc.started_at)::int AS hour, COUNT(*)::int AS calls,
        COUNT(*) FILTER (WHERE sc.outcome = 'reached')::int AS reached
      FROM sales_calls sc WHERE ${cf} AND sc.started_at >= NOW() - INTERVAL '1 day' * ?
      GROUP BY hour ORDER BY hour`, [...cp, period]),

      // 6 — Daily calls trend
      getAll(`SELECT (sc.started_at AT TIME ZONE 'Europe/Berlin')::date AS date, COUNT(*)::int AS calls,
        COUNT(*) FILTER (WHERE sc.outcome = 'reached')::int AS reached
      FROM sales_calls sc WHERE ${cf} AND sc.started_at >= NOW() - INTERVAL '1 day' * ?
      GROUP BY (sc.started_at AT TIME ZONE 'Europe/Berlin')::date ORDER BY date ASC`, [...cp, period]),

      // 7 — Daily closings trend
      getAll(`SELECT (sl.won_at AT TIME ZONE 'Europe/Berlin')::date AS date, COUNT(*)::int AS closings,
        COALESCE(SUM(sl.deal_value), 0)::real AS revenue
      FROM sales_leads sl WHERE ${lf} AND sl.won_at IS NOT NULL AND sl.won_at >= NOW() - INTERVAL '1 day' * ?
      GROUP BY (sl.won_at AT TIME ZONE 'Europe/Berlin')::date ORDER BY date ASC`, [...lp, period]),

      // 8 — Daily leads created
      getAll(`SELECT (sl.created_at AT TIME ZONE 'Europe/Berlin')::date AS date, COUNT(*)::int AS created
      FROM sales_leads sl WHERE ${lf} AND sl.created_at >= NOW() - INTERVAL '1 day' * ?
      GROUP BY (sl.created_at AT TIME ZONE 'Europe/Berlin')::date ORDER BY date ASC`, [...lp, period]),

      // 9 — Avg response time (hours to first call)
      getOne(`SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (fc.first_call - sl.created_at)) / 3600), 0)::real AS avg_hours
      FROM sales_leads sl
      INNER JOIN (SELECT lead_id, MIN(started_at) AS first_call FROM sales_calls WHERE ${cf.replace(/sc\./g, '')} GROUP BY lead_id) fc ON fc.lead_id = sl.id
      WHERE ${lf} AND sl.created_at >= NOW() - INTERVAL '1 day' * ?`, [...cp, ...lp, period]),

      // 10 — Overdue follow-ups
      getAll(`SELECT sl.id, sl.company_name, sl.status, sl.next_followup_date,
        u.name AS owner_name, u.color AS owner_color
      FROM sales_leads sl LEFT JOIN users u ON u.id = sl.owner_id
      WHERE ${lf} AND sl.next_followup_date IS NOT NULL AND sl.next_followup_date < ?
        AND sl.status NOT IN ('gewonnen','abgeschlossen','verloren','kein_interesse','nicht_existent')
      ORDER BY sl.next_followup_date ASC LIMIT 20`, [...lp, today]),

      // 11 — Stale leads (no call in 7+ days)
      getAll(`SELECT sl.id, sl.company_name, sl.status,
        u.name AS owner_name, u.color AS owner_color,
        EXTRACT(DAY FROM (NOW() - COALESCE(MAX(sc.started_at), sl.created_at)))::int AS days_inactive
      FROM sales_leads sl
      LEFT JOIN sales_calls sc ON sc.lead_id = sl.id AND sc.user_id = sl.user_id
      LEFT JOIN users u ON u.id = sl.owner_id
      WHERE ${lf} AND sl.status NOT IN ('gewonnen','abgeschlossen','verloren','kein_interesse','nicht_existent')
      GROUP BY sl.id, sl.company_name, sl.status, sl.created_at, sl.owner_id, u.name, u.color
      HAVING EXTRACT(DAY FROM (NOW() - COALESCE(MAX(sc.started_at), sl.created_at))) > 7
      ORDER BY days_inactive DESC LIMIT 20`, lp),

      // 12 — Loss analysis by branch
      getAll(`SELECT COALESCE(sl.branch, 'Unbekannt') AS branch,
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE sl.status IN ('verloren','kein_interesse','nicht_existent'))::int AS lost,
        COUNT(*) FILTER (WHERE sl.status IN ('gewonnen','abgeschlossen'))::int AS won
      FROM sales_leads sl WHERE ${lf}
      GROUP BY COALESCE(sl.branch, 'Unbekannt') HAVING COUNT(*) >= 2
      ORDER BY COUNT(*) FILTER (WHERE sl.status IN ('verloren','kein_interesse','nicht_existent'))::float / NULLIF(COUNT(*), 0) DESC NULLS LAST
      LIMIT 15`, lp),

      // 13 — Team comparison (only when all)
      !ownerId ? getAll(`SELECT sl.owner_id, u.name AS owner_name, u.color AS owner_color,
        COUNT(*)::int AS total_leads,
        COUNT(*) FILTER (WHERE sl.status IN ('gewonnen','abgeschlossen'))::int AS won,
        COUNT(*) FILTER (WHERE sl.status IN ('verloren','kein_interesse','nicht_existent'))::int AS lost,
        COALESCE(SUM(sl.deal_value) FILTER (WHERE sl.status IN ('gewonnen','abgeschlossen')), 0)::real AS revenue
      FROM sales_leads sl JOIN users u ON u.id = sl.owner_id
      WHERE sl.user_id = ? GROUP BY sl.owner_id, u.name, u.color ORDER BY revenue DESC`, [wsId]) : Promise.resolve([]),

      // 14 — Follow-up compliance
      getOne(`SELECT
        COUNT(*) FILTER (WHERE sc.created_followup = true)::int AS followups_created,
        COUNT(DISTINCT sc.lead_id) FILTER (WHERE sc.lead_id IS NOT NULL)::int AS leads_called
      FROM sales_calls sc WHERE ${cf} AND sc.started_at >= NOW() - INTERVAL '1 day' * ?`, [...cp, period]),
    ]);

    // Compute derived metrics
    const c = conversion || {};
    const totalLeads = c.total_leads || 0;
    const convRate = totalLeads > 0 ? Math.round((c.won || 0) / totalLeads * 1000) / 10 : 0;
    const demoRate = totalLeads > 0 ? Math.round((c.reached_demo || 0) / totalLeads * 1000) / 10 : 0;
    const lossRate = totalLeads > 0 ? Math.round((c.lost || 0) / totalLeads * 1000) / 10 : 0;
    const cp2 = callPerf || {};
    const totalCalls = cp2.total_calls || 0;
    const connectRate = totalCalls > 0 ? Math.round((cp2.reached || 0) / totalCalls * 1000) / 10 : 0;
    // Nur Werktage (Mo-Fr) für Durchschnitt zählen — Wochenende wird nicht telefoniert
    const workdays = Math.round(period * 5 / 7);
    const avgPerDay = workdays > 0 ? Math.round(totalCalls / workdays * 10) / 10 : 0;

    // Enrich team with call stats
    const teamData = [];
    for (const t of (team || [])) {
      const tc = await getOne(`SELECT COUNT(*)::int AS calls,
        COUNT(*) FILTER (WHERE outcome = 'reached')::int AS reached
      FROM sales_calls WHERE user_id = ? AND owner_id = ? AND started_at >= NOW() - INTERVAL '1 day' * ?`,
        [wsId, t.owner_id, period]);
      teamData.push({
        ...t,
        calls_period: tc?.calls || 0,
        reached_period: tc?.reached || 0,
        connect_rate: tc?.calls > 0 ? Math.round((tc.reached || 0) / tc.calls * 1000) / 10 : 0,
      });
    }

    // DOW labels
    const DOW_LABELS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
    const dowFull = Array.from({ length: 7 }, (_, i) => {
      const found = (callsByDow || []).find(r => r.dow === i);
      return { dow: i, label: DOW_LABELS[i], calls: found?.calls || 0, reached: found?.reached || 0 };
    });

    res.json({
      period,
      pipeline: {
        funnel: funnel || [],
        total_leads: totalLeads,
        reached_demo: c.reached_demo || 0,
        won: c.won || 0,
        lost: c.lost || 0,
        conversion_rate: convRate,
        demo_rate: demoRate,
        loss_rate: lossRate,
      },
      revenue: {
        total_won: c.revenue_won || 0,
        avg_deal_value: Math.round((c.avg_deal_value || 0) * 100) / 100,
        pipeline_value: c.pipeline_value || 0,
      },
      calls: {
        total: totalCalls,
        reached: cp2.reached || 0,
        not_reached: cp2.not_reached || 0,
        connect_rate: connectRate,
        avg_per_day: avgPerDay,
        avg_duration_sec: Math.round(cp2.avg_duration_sec || 0),
        by_dow: dowFull,
        by_hour: callsByHour || [],
      },
      productivity: {
        avg_hours_to_first_call: Math.round((responseTime?.avg_hours || 0) * 10) / 10,
        followups_created: followupCompl?.followups_created || 0,
        leads_called: followupCompl?.leads_called || 0,
      },
      trends: {
        daily_calls: dailyCalls || [],
        daily_closings: dailyClosings || [],
        daily_leads_created: dailyCreated || [],
      },
      problems: {
        overdue_followups: (overdue || []).map(o => ({
          ...o,
          days_overdue: Math.max(0, Math.floor((new Date(today) - new Date(o.next_followup_date)) / 86400000)),
        })),
        stale_leads: stale || [],
        loss_by_branch: (lossByBranch || []).map(b => ({
          ...b,
          loss_rate: b.total > 0 ? Math.round(b.lost / b.total * 1000) / 10 : 0,
        })),
      },
      team: teamData,
    });
  } catch (err) {
    console.error('[sales/stats/analytics GET]', err);
    res.status(500).json({ error: 'Fehler beim Laden der Analyse' });
  }
});

// ── TARGETS ──────────────────────────────────────────────────────────────────

router.get('/targets', async (req, res) => {
  try {
    const uid = req.userId; // personal targets
    let targets = await getOne('SELECT * FROM sales_targets WHERE user_id = ?', [uid]);
    if (!targets) {
      await run('INSERT INTO sales_targets (user_id) VALUES (?) RETURNING id', [uid]);
      targets = await getOne('SELECT * FROM sales_targets WHERE user_id = ?', [uid]);
    }
    res.json(targets);
  } catch (err) {
    console.error('[sales/targets GET]', err);
    res.status(500).json({ error: 'Fehler beim Laden der Ziele' });
  }
});

router.put('/targets', async (req, res) => {
  try {
    const uid = req.userId; // personal targets
    let targets = await getOne('SELECT * FROM sales_targets WHERE user_id = ?', [uid]);
    if (!targets) {
      await run('INSERT INTO sales_targets (user_id) VALUES (?) RETURNING id', [uid]);
    }
    const { daily_calls, daily_connects, daily_closings, weekly_calls, weekly_closings } = req.body;
    await run(`
      UPDATE sales_targets SET
        daily_calls = ?, daily_connects = ?, daily_closings = ?,
        weekly_calls = ?, weekly_closings = ?, updated_at = NOW()
      WHERE user_id = ?
    `, [daily_calls ?? 30, daily_connects ?? 10, daily_closings ?? 2, weekly_calls ?? 150, weekly_closings ?? 8, uid]);

    const updated = await getOne('SELECT * FROM sales_targets WHERE user_id = ?', [uid]);
    res.json(updated);
  } catch (err) {
    console.error('[sales/targets PUT]', err);
    res.status(500).json({ error: 'Fehler beim Aktualisieren der Ziele' });
  }
});

// ── CLIENTS (for Sales Engine Kunden tab) ───────────────────────────────────

router.get('/clients', async (req, res) => {
  try {
    const { search } = req.query;
    let sql = `
      SELECT
        c.*,
        (SELECT MAX(sc.started_at)
         FROM sales_calls sc WHERE sc.client_id = c.id AND sc.user_id = c.user_id
        ) AS last_call_at,
        (SELECT COUNT(*)
         FROM sales_calls sc WHERE sc.client_id = c.id AND sc.user_id = c.user_id
        )::int AS total_calls,
        (SELECT COUNT(*)
         FROM projects p WHERE p.client_id = c.id AND p.user_id = c.user_id AND p.status != 'completed'
        )::int AS active_projects
      FROM clients c
      WHERE c.user_id = ?
    `;
    const params = [req.workspaceUserId];

    if (search) {
      const q = `%${search}%`;
      const digits = search.replace(/\D/g, '');
      if (digits.length >= 3) {
        sql += ` AND (c.company_name ILIKE ? OR c.contact_person ILIKE ? OR regexp_replace(COALESCE(c.phone, ''), '[^0-9]', '', 'g') LIKE ?)`;
        params.push(q, q, `%${digits}%`);
      } else {
        sql += ` AND (c.company_name ILIKE ? OR c.contact_person ILIKE ? OR c.phone ILIKE ?)`;
        params.push(q, q, q);
      }
    }

    sql += ' ORDER BY last_call_at DESC NULLS LAST, c.company_name ASC';

    const rows = await getAll(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('[sales/clients GET]', err);
    res.status(500).json({ error: 'Fehler beim Laden der Kunden' });
  }
});

// ── SCREENSHOT IMPORT (Gemini Vision) ────────────────────────────────────────

router.post('/screenshot-import', async (req, res) => {
  try {
    const { image } = req.body; // base64 data URL
    if (!image) {
      return res.status(400).json({ error: 'Kein Bild übergeben' });
    }

    // Support multiple API keys (comma-separated) for rate limit rotation
    const allKeys = (process.env.GEMINI_API_KEY || '').split(',').map(k => k.trim()).filter(Boolean);
    if (allKeys.length === 0) {
      return res.status(500).json({ error: 'GEMINI_API_KEY nicht konfiguriert' });
    }

    // Strip data URL prefix to get raw base64
    const base64 = image.replace(/^data:image\/\w+;base64,/, '');
    const mimeType = image.match(/^data:(image\/\w+);/)?.[1] || 'image/png';

    const payload = {
      contents: [{
        parts: [
          {
            text: `Analysiere diesen Google Maps Screenshot und extrahiere die Firmendaten.
Antworte NUR mit einem JSON-Objekt (kein Markdown, kein Text drumrum). Felder:
{
  "company_name": "Firmenname",
  "contact_person": null,
  "phone": "Telefonnummer oder null",
  "email": null,
  "branch": "Branche/Kategorie oder null",
  "city": "Stadt oder null",
  "domain": "Website-Domain ohne https:// oder null",
  "website_status": "Keine Website" oder "Veraltete Website" oder null,
  "address": "Vollständige Adresse oder null"
}
Wenn ein Feld nicht erkennbar ist, setze null. Telefonnummer immer mit Vorwahl.`
          },
          {
            inline_data: {
              mime_type: mimeType,
              data: base64,
            }
          }
        ]
      }],
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 500,
      }
    };

    // Fallback chain: try multiple keys × models for max availability
    const models = ['gemini-2.5-flash-lite', 'gemini-2.0-flash-lite', 'gemini-2.0-flash'];
    const fetchOpts = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    };

    // Try each key with each model until one works
    let response;
    outer:
    for (const key of allKeys) {
      for (const model of models) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
        response = await fetch(url, fetchOpts);
        if (response.status === 429) {
          console.log(`[screenshot-import] ${model} (key ...${key.slice(-6)}) rate limited`);
          continue;
        }
        break outer;
      }
    }

    if (response.status === 429) {
      return res.status(429).json({ error: 'API-Limit erreicht. Bitte warte 30 Sekunden und versuche es erneut.' });
    }

    if (!response.ok) {
      const errText = await response.text();
      console.error('[screenshot-import] Gemini error:', errText);
      return res.status(502).json({ error: 'Fehler bei der Bildanalyse' });
    }

    const result = await response.json();
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Extract JSON from response (handles possible markdown wrapping)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('[screenshot-import] No JSON in response:', text);
      return res.status(422).json({ error: 'Konnte keine Daten aus dem Bild extrahieren' });
    }

    const extracted = JSON.parse(jsonMatch[0]);

    // Validate: at minimum company_name must exist
    if (!extracted.company_name) {
      return res.status(422).json({ error: 'Kein Firmenname erkannt' });
    }

    res.json(extracted);
  } catch (err) {
    console.error('[screenshot-import]', err);
    res.status(500).json({ error: 'Fehler bei der Screenshot-Analyse' });
  }
});

module.exports = router;
