const express = require('express');
const router  = express.Router(); // v2
const gemini  = require('../services/gemini');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const { getOne, getAll, run } = require('../db/pg');
const authenticate = require('../middleware/auth');

// ── PUBLIC ────────────────────────────────────────────────────────────────────

// Google OAuth login/register
router.post('/google-auth', async (req, res) => {
  const { access_token, credential, workspace_owner_id } = req.body;
  if (!access_token && !credential) return res.status(400).json({ error: 'Token fehlt.' });

  try {
    let email, name;
    if (credential) {
      // ID token flow (GoogleLogin button) — verify via tokeninfo endpoint
      const gRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
      const payload = await gRes.json();
      if (payload.error || !payload.email) return res.status(401).json({ error: 'Ungültiger Google-Token.' });
      email = payload.email;
      name = payload.name;
    } else {
      // Access token flow (fallback)
      const gRes = await fetch(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${access_token}`);
      if (!gRes.ok) return res.status(401).json({ error: 'Ungültiger Google-Token.' });
      const data = await gRes.json();
      email = data.email;
      name = data.name;
    }

    // Check if partner already exists
    let user = await getOne(
      `SELECT u.id, u.name, u.email, u.role,
              p.id AS partner_id, p.workspace_owner_id, p.status AS partner_status,
              p.commission_rate_pool, p.commission_rate_own
       FROM users u JOIN partners p ON p.user_id = u.id
       WHERE u.email = ? AND u.role = 'partner'`,
      [email]
    );

    if (user) {
      // Existing partner — return JWT
      const token = jwt.sign(
        { userId: user.id, partnerId: user.partner_id, workspaceOwnerId: user.workspace_owner_id },
        process.env.JWT_SECRET, { expiresIn: '30d' }
      );
      return res.json({
        token,
        partnerStatus: user.partner_status,
        user: {
          id: user.id, name: user.name, email: user.email, role: user.role,
          partnerId: user.partner_id, workspaceOwnerId: user.workspace_owner_id,
          partnerStatus: user.partner_status,
          commissionRatePool: user.commission_rate_pool,
          commissionRateOwn: user.commission_rate_own,
        },
      });
    }

    // New user — create pending partner
    const wid = workspace_owner_id || 1;
    const newUser = await getOne(
      `INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, '', 'partner') RETURNING id, name, email`,
      [name, email]
    );
    await run(
      `INSERT INTO partners (user_id, workspace_owner_id, status) VALUES (?, ?, 'pending')`,
      [newUser.id, wid]
    );

    return res.json({
      partnerStatus: 'new',
      user: { id: newUser.id, name: newUser.name, email: newUser.email, partnerStatus: 'new' },
    });
  } catch (err) {
    console.error('Google auth error:', err.message);
    res.status(500).json({ error: 'Anmeldung fehlgeschlagen.' });
  }
});

// Update partner profile (phone + message after Google signup)
router.put('/profile', authenticatePartner, async (req, res) => {
  const { phone, application_message } = req.body;
  await run(
    `UPDATE partners SET phone = COALESCE(?, phone), application_message = COALESCE(?, application_message) WHERE id = ?`,
    [phone || null, application_message || null, req.partnerId]
  );
  res.json({ ok: true });
});

// Submit partner application (no auth required)
router.post('/apply', async (req, res) => {
  const { name, email, password, phone, application_message, workspace_owner_id } = req.body;
  if (!name || !email || !password || !workspace_owner_id) {
    return res.status(400).json({ error: 'Name, E-Mail, Passwort und Workspace erforderlich.' });
  }
  const existing = await getOne('SELECT id FROM users WHERE email = ?', [email]);
  if (existing) return res.status(409).json({ error: 'E-Mail bereits registriert.' });

  const hash = await bcrypt.hash(password, 12);
  const user = await getOne(
    `INSERT INTO users (name, email, password_hash, role, workspace_owner_id)
     VALUES (?, ?, ?, 'partner', NULL) RETURNING id`,
    [name, email, hash]
  );
  await run(
    `INSERT INTO partners (user_id, workspace_owner_id, phone, application_message)
     VALUES (?, ?, ?, ?)`,
    [user.id, workspace_owner_id, phone || '', application_message || '']
  );
  res.status(201).json({ message: 'Bewerbung eingereicht.' });
});

// Partner login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'E-Mail und Passwort erforderlich.' });

  const user = await getOne(
    `SELECT u.id, u.name, u.email, u.password_hash, u.role,
            p.id AS partner_id, p.workspace_owner_id, p.status AS partner_status,
            p.commission_rate_pool, p.commission_rate_own
     FROM users u
     JOIN partners p ON p.user_id = u.id
     WHERE u.email = ? AND u.role = 'partner'`,
    [email]
  );
  if (!user) return res.status(401).json({ error: 'Ungültige Zugangsdaten.' });

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'Ungültige Zugangsdaten.' });

  const token = jwt.sign(
    { userId: user.id, partnerId: user.partner_id, workspaceOwnerId: user.workspace_owner_id },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      partnerId: user.partner_id,
      workspaceOwnerId: user.workspace_owner_id,
      partnerStatus: user.partner_status,
      commissionRatePool: user.commission_rate_pool,
      commissionRateOwn: user.commission_rate_own,
    },
  });
});

// ── PARTNER AUTH MIDDLEWARE ───────────────────────────────────────────────────

async function authenticatePartner(req, res, next) {
  const header = req.headers['authorization'];
  const token  = header && header.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Kein Token.' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId          = payload.userId;
    req.partnerId       = payload.partnerId;
    req.workspaceOwnerId = payload.workspaceOwnerId;

    const partner = await getOne('SELECT status FROM partners WHERE id = ?', [req.partnerId]);
    if (!partner || partner.status !== 'approved') {
      return res.status(403).json({ error: 'Partner-Konto nicht freigegeben.' });
    }
    next();
  } catch {
    res.status(401).json({ error: 'Ungültiger Token.' });
  }
}

// ── PARTNER ENDPOINTS ─────────────────────────────────────────────────────────

// Status check — works for pending partners too (no approved check)
router.get('/status', async (req, res) => {
  const header = req.headers['authorization'];
  const token  = header && header.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Kein Token.' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const partner = await getOne(
      `SELECT p.status, p.id, u.name, u.email, p.workspace_owner_id,
              p.commission_rate_pool, p.commission_rate_own
       FROM partners p JOIN users u ON u.id = p.user_id WHERE p.id = ?`,
      [payload.partnerId]
    );
    if (!partner) return res.status(404).json({ error: 'Nicht gefunden.' });

    let responseToken = null;
    if (partner.status === 'approved') {
      // Issue fresh token so frontend can proceed without re-login
      responseToken = jwt.sign(
        { userId: payload.userId, partnerId: payload.partnerId, workspaceOwnerId: partner.workspace_owner_id },
        process.env.JWT_SECRET, { expiresIn: '30d' }
      );
    }
    res.json({
      partnerStatus: partner.status,
      token: responseToken,
      user: {
        id: payload.userId, name: partner.name, email: partner.email,
        partnerId: partner.id, workspaceOwnerId: partner.workspace_owner_id,
        partnerStatus: partner.status,
        commissionRatePool: partner.commission_rate_pool,
        commissionRateOwn: partner.commission_rate_own,
      },
    });
  } catch {
    res.status(401).json({ error: 'Ungültiger Token.' });
  }
});

router.get('/me', authenticatePartner, async (req, res) => {
  const partner = await getOne(
    `SELECT p.*, u.name, u.email FROM partners p JOIN users u ON u.id = p.user_id WHERE p.id = ?`,
    [req.partnerId]
  );
  res.json(partner);
});

// Leads
router.get('/leads', authenticatePartner, async (req, res) => {
  const leads = await getAll(
    `SELECT * FROM partner_leads WHERE partner_id = ? ORDER BY updated_at DESC`,
    [req.partnerId]
  );
  res.json(leads);
});

router.post('/leads', authenticatePartner, async (req, res) => {
  const { company, contact_person, phone, email, website, address, city, industry,
          deal_value, notes, follow_up_date, priority } = req.body;
  if (!company) return res.status(400).json({ error: 'Firmenname erforderlich.' });

  const partner = await getOne('SELECT commission_rate_own, workspace_owner_id FROM partners WHERE id = ?', [req.partnerId]);
  const lead = await getOne(
    `INSERT INTO partner_leads
       (workspace_owner_id, partner_id, company, contact_person, phone, email, website, address, city, industry, source, deal_value, notes, follow_up_date, priority, commission_rate)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'own', ?, ?, ?, ?, ?) RETURNING *`,
    [partner.workspace_owner_id, req.partnerId, company, contact_person || '', phone || '',
     email || '', website || '', address || '', city || '', industry || '',
     deal_value || null, notes || '', follow_up_date || null, priority || 'medium',
     partner.commission_rate_own]
  );
  res.status(201).json(lead);
});

router.put('/leads/:id', authenticatePartner, async (req, res) => {
  const lead = await getOne('SELECT id FROM partner_leads WHERE id = ? AND partner_id = ?', [req.params.id, req.partnerId]);
  if (!lead) return res.status(404).json({ error: 'Lead nicht gefunden.' });

  const fields = ['company','contact_person','phone','email','website','address','city',
                  'industry','status','priority','deal_value','notes','follow_up_date'];
  const sets = fields.filter(f => req.body[f] !== undefined).map(f => `${f} = ?`).join(', ');
  const vals = fields.filter(f => req.body[f] !== undefined).map(f => req.body[f]);
  if (!sets) return res.status(400).json({ error: 'Keine Felder zum Aktualisieren.' });

  const updated = await getOne(
    `UPDATE partner_leads SET ${sets}, updated_at = NOW() WHERE id = ? RETURNING *`,
    [...vals, req.params.id]
  );
  res.json(updated);
});

// Lead Pool (unassigned)
router.get('/leads/pool', authenticatePartner, async (req, res) => {
  const leads = await getAll(
    `SELECT * FROM partner_leads WHERE workspace_owner_id = ? AND partner_id IS NULL ORDER BY created_at DESC`,
    [req.workspaceOwnerId]
  );
  res.json(leads);
});

// Claim a pool lead
router.post('/leads/:id/claim', authenticatePartner, async (req, res) => {
  const lead = await getOne(
    'SELECT id FROM partner_leads WHERE id = ? AND workspace_owner_id = ? AND partner_id IS NULL',
    [req.params.id, req.workspaceOwnerId]
  );
  if (!lead) return res.status(404).json({ error: 'Lead nicht verfügbar.' });
  const partner = await getOne('SELECT commission_rate_pool FROM partners WHERE id = ?', [req.partnerId]);
  const updated = await getOne(
    `UPDATE partner_leads SET partner_id = ?, commission_rate = ?, updated_at = NOW() WHERE id = ? RETURNING *`,
    [req.partnerId, partner.commission_rate_pool, req.params.id]
  );
  res.json(updated);
});

// Call log
router.post('/leads/:id/calllog', authenticatePartner, async (req, res) => {
  const lead = await getOne('SELECT id FROM partner_leads WHERE id = ? AND partner_id = ?', [req.params.id, req.partnerId]);
  if (!lead) return res.status(404).json({ error: 'Lead nicht gefunden.' });
  const entry = await getOne(
    `INSERT INTO partner_call_log (lead_id, partner_id, outcome, notes) VALUES (?, ?, ?, ?) RETURNING *`,
    [req.params.id, req.partnerId, req.body.outcome || '', req.body.notes || '']
  );
  await run(`UPDATE partner_leads SET status = COALESCE(?, status), updated_at = NOW() WHERE id = ?`,
    [req.body.new_status || null, req.params.id]);
  res.status(201).json(entry);
});

router.get('/leads/:id/calllog', authenticatePartner, async (req, res) => {
  const entries = await getAll(
    `SELECT * FROM partner_call_log WHERE lead_id = ? AND partner_id = ? ORDER BY called_at DESC`,
    [req.params.id, req.partnerId]
  );
  res.json(entries);
});

// Appointments
router.get('/appointments', authenticatePartner, async (req, res) => {
  const appts = await getAll(
    `SELECT a.*, l.company, l.contact_person FROM partner_appointments a
     LEFT JOIN partner_leads l ON l.id = a.lead_id
     WHERE a.partner_id = ? ORDER BY a.scheduled_at`,
    [req.partnerId]
  );
  res.json(appts);
});

router.post('/appointments', authenticatePartner, async (req, res) => {
  const { lead_id, scheduled_at, industry, demo_goal, google_meet_link } = req.body;
  if (!scheduled_at) return res.status(400).json({ error: 'Datum/Uhrzeit erforderlich.' });
  const partner = await getOne('SELECT workspace_owner_id FROM partners WHERE id = ?', [req.partnerId]);
  const appt = await getOne(
    `INSERT INTO partner_appointments (workspace_owner_id, partner_id, lead_id, scheduled_at, industry, demo_goal, google_meet_link)
     VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING *`,
    [partner.workspace_owner_id, req.partnerId, lead_id || null, scheduled_at,
     industry || '', demo_goal || '', google_meet_link || '']
  );
  // Auto-update lead status if lead_id given
  if (lead_id) {
    await run(`UPDATE partner_leads SET status = 'termin_gesetzt', updated_at = NOW() WHERE id = ? AND partner_id = ?`,
      [lead_id, req.partnerId]);
  }
  // Auto-create commission entry for appointment
  await run(
    `INSERT INTO partner_commissions (workspace_owner_id, partner_id, lead_id, appointment_id, amount, rate, deal_value, type)
     SELECT p.workspace_owner_id, p.id, ?, ?, 0, p.commission_rate_pool, NULL, 'appointment'
     FROM partners p WHERE p.id = ?`,
    [lead_id || null, appt.id, req.partnerId]
  );
  res.status(201).json(appt);
});

router.put('/appointments/:id', authenticatePartner, async (req, res) => {
  const appt = await getOne('SELECT id FROM partner_appointments WHERE id = ? AND partner_id = ?', [req.params.id, req.partnerId]);
  if (!appt) return res.status(404).json({ error: 'Termin nicht gefunden.' });
  const updated = await getOne(
    `UPDATE partner_appointments SET scheduled_at = COALESCE(?, scheduled_at),
     industry = COALESCE(?, industry), demo_goal = COALESCE(?, demo_goal),
     google_meet_link = COALESCE(?, google_meet_link), status = COALESCE(?, status)
     WHERE id = ? RETURNING *`,
    [req.body.scheduled_at||null, req.body.industry||null, req.body.demo_goal||null,
     req.body.google_meet_link||null, req.body.status||null, req.params.id]
  );
  res.json(updated);
});

// Commissions
router.get('/commissions', authenticatePartner, async (req, res) => {
  const rows = await getAll(
    `SELECT c.*, l.company FROM partner_commissions c
     LEFT JOIN partner_leads l ON l.id = c.lead_id
     WHERE c.partner_id = ? ORDER BY c.created_at DESC`,
    [req.partnerId]
  );
  const totals = await getOne(
    `SELECT
       COALESCE(SUM(CASE WHEN status='paid' THEN amount END),0)    AS paid,
       COALESCE(SUM(CASE WHEN status='pending' THEN amount END),0) AS pending,
       COALESCE(SUM(CASE WHEN status='open' THEN amount END),0)    AS open,
       COALESCE(SUM(amount),0) AS total
     FROM partner_commissions WHERE partner_id = ?`,
    [req.partnerId]
  );
  res.json({ commissions: rows, totals });
});

// ── ADMIN ENDPOINTS ───────────────────────────────────────────────────────────

function requireAdmin(req, res, next) {
  if (!['admin', 'ceo', 'pm'].includes(req.userRole)) {
    return res.status(403).json({ error: 'Keine Berechtigung.' });
  }
  next();
}

router.use('/admin', authenticate, requireAdmin);

// Temp: debug all partners (no workspace filter)
router.get('/admin/debug-all', async (req, res) => {
  const rows = await getAll(`SELECT p.id, p.workspace_owner_id, p.status, u.email FROM partners p JOIN users u ON u.id = p.user_id`);
  const me = await getOne('SELECT id, role, workspace_owner_id FROM users WHERE id = ?', [req.workspaceUserId]);
  res.json({ wid: req.workspaceUserId, userId: req.userId, me, partners: rows });
});

// Temp: delete partner by email (admin only)
router.delete('/admin/partner-by-email', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });
  const user = await getOne('SELECT id FROM users WHERE email = ? AND role = \'partner\'', [email]);
  if (!user) return res.status(404).json({ error: 'Not found' });
  await run('DELETE FROM partners WHERE user_id = ?', [user.id]);
  await run('DELETE FROM users WHERE id = ?', [user.id]);
  res.json({ ok: true, deleted: email });
});

// Stats overview
router.get('/admin/stats', async (req, res) => {
  const wid = req.workspaceUserId;
  const [pending, active, leads, appts, openComm] = await Promise.all([
    getOne(`SELECT COUNT(*)::int AS cnt FROM partners WHERE workspace_owner_id = ? AND status = 'pending'`, [wid]),
    getOne(`SELECT COUNT(*)::int AS cnt FROM partners WHERE workspace_owner_id = ? AND status = 'approved'`, [wid]),
    getOne(`SELECT COUNT(*)::int AS cnt FROM partner_leads WHERE workspace_owner_id = ?`, [wid]),
    getOne(`SELECT COUNT(*)::int AS cnt FROM partner_appointments WHERE workspace_owner_id = ? AND status = 'scheduled'`, [wid]),
    getOne(`SELECT COALESCE(SUM(amount),0) AS total FROM partner_commissions WHERE workspace_owner_id = ? AND status = 'open'`, [wid]),
  ]);
  res.json({
    pendingApplications: pending.cnt,
    activePartners: active.cnt,
    totalLeads: leads.cnt,
    upcomingAppointments: appts.cnt,
    openCommissions: parseFloat(openComm.total),
  });
});

// Partners list
router.get('/admin/partners', async (req, res) => {
  const { status } = req.query;
  const rows = await getAll(
    `SELECT p.*, u.name, u.email,
            (SELECT COUNT(*)::int FROM partner_leads pl WHERE pl.partner_id = p.id) AS lead_count,
            (SELECT COUNT(*)::int FROM partner_appointments pa WHERE pa.partner_id = p.id) AS appt_count,
            (SELECT COALESCE(SUM(amount),0) FROM partner_commissions pc WHERE pc.partner_id = p.id AND pc.status = 'paid') AS total_paid
     FROM partners p JOIN users u ON u.id = p.user_id
     WHERE p.workspace_owner_id = ?
       ${status ? `AND p.status = '${status}'` : ''}
     ORDER BY p.created_at DESC`,
    [req.workspaceUserId]
  );
  res.json(rows);
});

router.put('/admin/partners/:id', async (req, res) => {
  const { status, commission_rate_pool, commission_rate_own } = req.body;
  const partner = await getOne('SELECT id FROM partners WHERE id = ? AND workspace_owner_id = ?', [req.params.id, req.workspaceUserId]);
  if (!partner) return res.status(404).json({ error: 'Partner nicht gefunden.' });
  const updated = await getOne(
    `UPDATE partners SET
       status = COALESCE(?, status),
       commission_rate_pool = COALESCE(?, commission_rate_pool),
       commission_rate_own  = COALESCE(?, commission_rate_own),
       approved_at = CASE WHEN ? = 'approved' AND approved_at IS NULL THEN NOW() ELSE approved_at END
     WHERE id = ? RETURNING *`,
    [status||null, commission_rate_pool||null, commission_rate_own||null, status||null, req.params.id]
  );
  res.json(updated);
});

// Pool leads management
router.get('/admin/leads', async (req, res) => {
  const { partner_id, status } = req.query;
  const rows = await getAll(
    `SELECT l.*, p.id AS p_id,
            (SELECT u.name FROM users u JOIN partners pp ON pp.user_id = u.id WHERE pp.id = l.partner_id) AS partner_name
     FROM partner_leads l
     LEFT JOIN partners p ON p.id = l.partner_id
     WHERE l.workspace_owner_id = ?
       ${partner_id ? `AND l.partner_id = ${parseInt(partner_id)}` : ''}
       ${status ? `AND l.status = '${status}'` : ''}
     ORDER BY l.created_at DESC`,
    [req.workspaceUserId]
  );
  res.json(rows);
});

router.post('/admin/leads', async (req, res) => {
  const { company, contact_person, phone, email, website, city, industry, deal_value, notes, priority } = req.body;
  if (!company) return res.status(400).json({ error: 'Firmenname erforderlich.' });
  const lead = await getOne(
    `INSERT INTO partner_leads (workspace_owner_id, company, contact_person, phone, email, website, city, industry, deal_value, notes, priority, source)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pool') RETURNING *`,
    [req.workspaceUserId, company, contact_person||'', phone||'', email||'', website||'',
     city||'', industry||'', deal_value||null, notes||'', priority||'medium']
  );
  res.status(201).json(lead);
});

router.put('/admin/leads/:id', async (req, res) => {
  const lead = await getOne('SELECT id FROM partner_leads WHERE id = ? AND workspace_owner_id = ?', [req.params.id, req.workspaceUserId]);
  if (!lead) return res.status(404).json({ error: 'Lead nicht gefunden.' });
  const fields = ['company','contact_person','phone','email','website','city','industry','status','priority','deal_value','notes'];
  const sets = fields.filter(f => req.body[f] !== undefined).map(f => `${f} = ?`).join(', ');
  const vals = fields.filter(f => req.body[f] !== undefined).map(f => req.body[f]);
  if (!sets) return res.status(400).json({ error: 'Keine Felder.' });
  const updated = await getOne(
    `UPDATE partner_leads SET ${sets}, updated_at = NOW() WHERE id = ? RETURNING *`,
    [...vals, req.params.id]
  );
  res.json(updated);
});

router.delete('/admin/leads/:id', async (req, res) => {
  await run('DELETE FROM partner_leads WHERE id = ? AND workspace_owner_id = ?', [req.params.id, req.workspaceUserId]);
  res.json({ ok: true });
});

// Appointments
router.get('/admin/appointments', async (req, res) => {
  const rows = await getAll(
    `SELECT a.*, l.company, l.contact_person,
            u.name AS partner_name
     FROM partner_appointments a
     LEFT JOIN partner_leads l ON l.id = a.lead_id
     LEFT JOIN partners p ON p.id = a.partner_id
     LEFT JOIN users u ON u.id = p.user_id
     WHERE a.workspace_owner_id = ?
     ORDER BY a.scheduled_at`,
    [req.workspaceUserId]
  );
  res.json(rows);
});

router.put('/admin/appointments/:id', async (req, res) => {
  const appt = await getOne('SELECT id FROM partner_appointments WHERE id = ? AND workspace_owner_id = ?', [req.params.id, req.workspaceUserId]);
  if (!appt) return res.status(404).json({ error: 'Termin nicht gefunden.' });
  const updated = await getOne(
    `UPDATE partner_appointments SET
       status = COALESCE(?, status),
       google_meet_link = COALESCE(?, google_meet_link),
       scheduled_at = COALESCE(?, scheduled_at)
     WHERE id = ? RETURNING *`,
    [req.body.status||null, req.body.google_meet_link||null, req.body.scheduled_at||null, req.params.id]
  );
  res.json(updated);
});

// Commissions
router.get('/admin/commissions', async (req, res) => {
  const { partner_id, status } = req.query;
  const rows = await getAll(
    `SELECT c.*, l.company, u.name AS partner_name
     FROM partner_commissions c
     LEFT JOIN partner_leads l ON l.id = c.lead_id
     LEFT JOIN partners p ON p.id = c.partner_id
     LEFT JOIN users u ON u.id = p.user_id
     WHERE c.workspace_owner_id = ?
       ${partner_id ? `AND c.partner_id = ${parseInt(partner_id)}` : ''}
       ${status ? `AND c.status = '${status}'` : ''}
     ORDER BY c.created_at DESC`,
    [req.workspaceUserId]
  );
  const totals = await getOne(
    `SELECT
       COALESCE(SUM(CASE WHEN status='paid' THEN amount END),0)    AS paid,
       COALESCE(SUM(CASE WHEN status='pending' THEN amount END),0) AS pending,
       COALESCE(SUM(CASE WHEN status='open' THEN amount END),0)    AS open
     FROM partner_commissions WHERE workspace_owner_id = ?`,
    [req.workspaceUserId]
  );
  res.json({ commissions: rows, totals });
});

router.put('/admin/commissions/:id', async (req, res) => {
  const comm = await getOne('SELECT id FROM partner_commissions WHERE id = ? AND workspace_owner_id = ?', [req.params.id, req.workspaceUserId]);
  if (!comm) return res.status(404).json({ error: 'Provision nicht gefunden.' });
  const updated = await getOne(
    `UPDATE partner_commissions SET
       status = COALESCE(?, status),
       amount = COALESCE(?, amount),
       notes  = COALESCE(?, notes),
       paid_at = CASE WHEN ? = 'paid' AND paid_at IS NULL THEN NOW() ELSE paid_at END
     WHERE id = ? RETURNING *`,
    [req.body.status||null, req.body.amount||null, req.body.notes||null, req.body.status||null, req.params.id]
  );
  res.json(updated);
});

// ── Screenshot Import (Gemini) ─────────────────────────────────────────────────

router.post('/screenshot-import', authenticatePartner, async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) return res.status(400).json({ error: 'Kein Bild übergeben' });

    const allKeys = (process.env.GEMINI_API_KEY || '').split(',').map(k => k.trim()).filter(Boolean);
    if (allKeys.length === 0) return res.status(500).json({ error: 'GEMINI_API_KEY nicht konfiguriert' });

    const base64 = image.replace(/^data:image\/\w+;base64,/, '');
    const mimeType = image.match(/^data:(image\/\w+);/)?.[1] || 'image/png';

    const payload = {
      contents: [{
        parts: [
          {
            text: `Analysiere diesen Google Maps Screenshot und extrahiere die Firmendaten.
Antworte NUR mit einem JSON-Objekt (kein Markdown, kein Text drumrum). Felder:
{
  "company": "Firmenname",
  "contact_person": null,
  "phone": "Telefonnummer oder null",
  "email": null,
  "industry": "Branche/Kategorie oder null",
  "city": "Stadt oder null",
  "website": "Website-URL oder null",
  "address": "Vollständige Adresse oder null"
}
Wenn ein Feld nicht erkennbar ist, setze null. Telefonnummer immer mit Vorwahl.`
          },
          { inline_data: { mime_type: mimeType, data: base64 } }
        ]
      }],
      generationConfig: { temperature: 0, maxOutputTokens: 500 },
    };

    const models = ['gemini-2.5-flash-lite', 'gemini-2.0-flash-lite', 'gemini-2.0-flash'];
    const fetchOpts = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) };

    let response;
    outer:
    for (const key of allKeys) {
      for (const model of models) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
        response = await fetch(url, fetchOpts);
        if (response.status !== 429) break outer;
      }
    }

    if (response.status === 429) return res.status(429).json({ error: 'API-Limit erreicht. Bitte 30 Sekunden warten.' });
    if (!response.ok) return res.status(502).json({ error: 'Fehler bei der Bildanalyse' });

    const result = await response.json();
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(422).json({ error: 'Konnte keine Daten aus dem Bild extrahieren' });

    const extracted = JSON.parse(jsonMatch[0]);
    if (!extracted.company) return res.status(422).json({ error: 'Kein Firmenname erkannt' });

    res.json(extracted);
  } catch (err) {
    console.error('[partner/screenshot-import]', err);
    res.status(500).json({ error: 'Fehler bei der Screenshot-Analyse' });
  }
});

// ── AI CHAT ───────────────────────────────────────────────────────────────────
router.post('/ai-chat', authenticate, async (req, res) => {
  const { messages } = req.body;
  if (!Array.isArray(messages) || !messages.length) {
    return res.status(400).json({ error: 'messages required' });
  }
  try {
    const reply = await gemini.chat(messages);
    res.json({ reply });
  } catch (err) {
    console.error('[partner/ai-chat]', err.message);
    if (err.message === 'QUOTA_EXCEEDED') {
      return res.status(429).json({ error: 'API-Limit erreicht. Bitte neue Gemini-Keys hinterlegen.' });
    }
    res.status(500).json({ error: 'KI-Anfrage fehlgeschlagen.' });
  }
});

module.exports = router;
