const express = require('express');
const router  = express.Router(); // v2
const gemini  = require('../services/gemini');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const { getOne, getAll, run } = require('../db/pg');
const authenticate = require('../middleware/auth');
const { sendDemoEmail } = require('../services/emailService');

// ── DB MIGRATION ──────────────────────────────────────────────────────────────
(async () => {
  try {
    await run(`ALTER TABLE partner_leads ADD COLUMN IF NOT EXISTS milestones jsonb`);
    await run(`ALTER TABLE partner_leads ADD COLUMN IF NOT EXISTS demo_link text`);
    await run(`ALTER TABLE partner_leads ADD COLUMN IF NOT EXISTS agreed_budget decimal(12,2)`);
    await run(`UPDATE partner_leads SET milestones = '[]' WHERE milestones IS NULL`);
  } catch (e) { console.error('[partner migration]', e.message); }
})();

const MILESTONES_INIT = () => JSON.stringify([
  { id: 'demo',   label: 'Demo vereinbart',  done: true,  done_at: new Date().toISOString() },
  { id: 'offer',  label: 'Angebot erstellt', done: false, done_at: null },
  { id: 'order',  label: 'Auftrag erteilt',  done: false, done_at: null },
  { id: 'design', label: 'Konzept & Design', done: false, done_at: null },
  { id: 'dev',    label: 'Entwicklung',      done: false, done_at: null },
  { id: 'live',   label: 'Live geschaltet',  done: false, done_at: null },
]);

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
  const wsSettings = await getOne(
    `SELECT email, phone, company_name FROM settings WHERE user_id = ?`,
    [partner.workspace_owner_id]
  );
  res.json({ ...partner, ws_email: wsSettings?.email || '', ws_phone: wsSettings?.phone || '', ws_company: wsSettings?.company_name || '' });
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
  const [pending, active, leads, appts, openComm] = await Promise.all([
    getOne(`SELECT COUNT(*)::int AS cnt FROM partners WHERE status = 'pending'`),
    getOne(`SELECT COUNT(*)::int AS cnt FROM partners WHERE status = 'approved'`),
    getOne(`SELECT COUNT(*)::int AS cnt FROM partner_leads`),
    getOne(`SELECT COUNT(*)::int AS cnt FROM partner_appointments WHERE status = 'scheduled'`),
    getOne(`SELECT COALESCE(SUM(amount),0) AS total FROM partner_commissions WHERE status = 'open'`),
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
     ${status ? `WHERE p.status = '${status}'` : ''}
     ORDER BY p.created_at DESC`
  );
  res.json(rows);
});

router.put('/admin/partners/:id', async (req, res) => {
  const { status, commission_rate_pool, commission_rate_own } = req.body;
  const partner = await getOne('SELECT id FROM partners WHERE id = ?', [req.params.id]);
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
  const conditions = [];
  const params = [];
  if (partner_id) { conditions.push(`l.partner_id = ${parseInt(partner_id)}`); }
  if (status)     { conditions.push(`l.status = '${status}'`); }
  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  const rows = await getAll(
    `SELECT l.*, p.id AS p_id,
            (SELECT u.name FROM users u JOIN partners pp ON pp.user_id = u.id WHERE pp.id = l.partner_id) AS partner_name
     FROM partner_leads l
     LEFT JOIN partners p ON p.id = l.partner_id
     ${where}
     ORDER BY l.created_at DESC`
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
  const lead = await getOne(
    `SELECT pl.*, u.email AS partner_email, u.name AS partner_name
     FROM partner_leads pl
     LEFT JOIN partners p ON p.id = pl.partner_id
     LEFT JOIN users u ON u.id = p.user_id
     WHERE pl.id = ?`,
    [req.params.id]
  );
  if (!lead) return res.status(404).json({ error: 'Lead nicht gefunden.' });

  const scalarFields = ['company','contact_person','phone','email','website','city','industry',
                        'status','priority','deal_value','notes','demo_link','agreed_budget'];
  const sets = scalarFields.filter(f => req.body[f] !== undefined).map(f => `${f} = ?`).join(', ');
  const vals = scalarFields.filter(f => req.body[f] !== undefined).map(f => req.body[f]);

  const hasMilestones = req.body.milestones !== undefined;
  const milestoneSet  = hasMilestones ? (sets ? ', milestones = ?' : 'milestones = ?') : '';
  const milestoneVal  = hasMilestones ? [JSON.stringify(req.body.milestones)] : [];

  const allSets = [sets, milestoneSet].filter(Boolean).join('');
  if (!allSets) return res.status(400).json({ error: 'Keine Felder.' });

  const updated = await getOne(
    `UPDATE partner_leads SET ${allSets}, updated_at = NOW() WHERE id = ? RETURNING *`,
    [...vals, ...milestoneVal, req.params.id]
  );

  // ── Notify partner ─────────────────────────────────────────────────────────
  if (lead.partner_email) {
    const sendMail = async (subject, html) => {
      try {
        const nodemailer = require('nodemailer');
        const t = nodemailer.createTransport({
          host: process.env.EMAIL_HOST, port: parseInt(process.env.EMAIL_PORT || '587'),
          secure: process.env.EMAIL_SECURE === 'true',
          auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
        });
        await t.sendMail({ from: process.env.EMAIL_FROM || process.env.EMAIL_USER, to: lead.partner_email, subject, html });
      } catch (e) { console.error('[admin leads notify]', e.message); }
    };

    const wrap = (body) => `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#0D0D12;color:#F2F2F7;border-radius:16px;padding:32px;">
        <p style="color:#AEAEB2;margin:0 0 6px;font-size:13px;">${lead.company}</p>
        ${body}
      </div>`;

    // Newly completed milestones
    if (hasMilestones) {
      const oldMs = Array.isArray(lead.milestones) ? lead.milestones : [];
      const newMs = req.body.milestones;
      const newlyDone = newMs.filter(nm => nm.done && !oldMs.find(om => om.id === nm.id && om.done));
      for (const m of newlyDone) {
        await sendMail(
          `✅ Neuer Meilenstein: ${m.label} — ${lead.company}`,
          wrap(`<h2 style="margin:0 0 12px;font-size:18px;color:#34D399;">✅ ${m.label}</h2>
                <p style="color:#AEAEB2;font-size:14px;margin:0;line-height:1.6;">
                  Gute Neuigkeiten! Für <strong style="color:#F2F2F7;">${lead.company}</strong>
                  wurde der Meilenstein <strong style="color:#34D399;">${m.label}</strong> abgeschlossen.
                  Melde dich gerne im Partner-Portal für den aktuellen Stand.
                </p>`)
        );
      }
    }

    // Budget agreed
    const newBudget = req.body.agreed_budget;
    if (newBudget && parseFloat(newBudget) !== parseFloat(lead.agreed_budget || 0)) {
      const fmt = (n) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
      await sendMail(
        `💰 Budget vereinbart: ${fmt(newBudget)} — ${lead.company}`,
        wrap(`<h2 style="margin:0 0 12px;font-size:18px;color:#FF9F0A;">💰 Budget vereinbart</h2>
              <p style="color:#AEAEB2;font-size:14px;margin:0 0 16px;line-height:1.6;">
                Für <strong style="color:#F2F2F7;">${lead.company}</strong> wurde ein Projektbudget vereinbart.
              </p>
              <div style="background:#16161E;border-radius:12px;padding:16px;text-align:center;">
                <div style="font-size:28px;font-weight:800;color:#FF9F0A;">${fmt(newBudget)}</div>
                <div style="font-size:12px;color:#636366;margin-top:4px;">Vereinbartes Projektbudget</div>
              </div>`)
      );
    }

    // Demo link added
    const newLink = req.body.demo_link;
    if (newLink && newLink !== lead.demo_link) {
      await sendMail(
        `🔗 Demo-Link verfügbar — ${lead.company}`,
        wrap(`<h2 style="margin:0 0 12px;font-size:18px;color:#5B8CF5;">🔗 Demo ist fertig!</h2>
              <p style="color:#AEAEB2;font-size:14px;margin:0 0 16px;line-height:1.6;">
                Die Demo-Website für <strong style="color:#F2F2F7;">${lead.company}</strong> ist verfügbar.
              </p>
              <a href="${newLink}" style="display:inline-block;padding:10px 20px;border-radius:10px;
                background:#5B8CF5;color:#fff;text-decoration:none;font-weight:600;font-size:14px;">
                Demo ansehen →
              </a>`)
      );
    }
  }

  res.json(updated);
});

router.delete('/admin/leads/:id', async (req, res) => {
  await run('DELETE FROM partner_leads WHERE id = ?', [req.params.id]);
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
     ORDER BY a.scheduled_at`
  );
  res.json(rows);
});

router.put('/admin/appointments/:id', async (req, res) => {
  const appt = await getOne('SELECT id FROM partner_appointments WHERE id = ?', [req.params.id]);
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
  const conditions = [];
  if (partner_id) { conditions.push(`c.partner_id = ${parseInt(partner_id)}`); }
  if (status)     { conditions.push(`c.status = '${status}'`); }
  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  const rows = await getAll(
    `SELECT c.*, l.company, u.name AS partner_name
     FROM partner_commissions c
     LEFT JOIN partner_leads l ON l.id = c.lead_id
     LEFT JOIN partners p ON p.id = c.partner_id
     LEFT JOIN users u ON u.id = p.user_id
     ${where}
     ORDER BY c.created_at DESC`
  );
  const totals = await getOne(
    `SELECT
       COALESCE(SUM(CASE WHEN status='paid' THEN amount END),0)    AS paid,
       COALESCE(SUM(CASE WHEN status='pending' THEN amount END),0) AS pending,
       COALESCE(SUM(CASE WHEN status='open' THEN amount END),0)    AS open
     FROM partner_commissions`
  );
  res.json({ commissions: rows, totals });
});

router.put('/admin/commissions/:id', async (req, res) => {
  const comm = await getOne('SELECT id FROM partner_commissions WHERE id = ?', [req.params.id]);
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

// ── LEAD REQUESTS ─────────────────────────────────────────────────────────────

router.post('/lead-requests', authenticatePartner, async (req, res) => {
  const { industry, quantity, message } = req.body;
  if (!industry || !quantity) return res.status(400).json({ error: 'Branche und Anzahl erforderlich.' });

  try {
    const request = await getOne(
      `INSERT INTO partner_lead_requests (partner_id, workspace_owner_id, industry, quantity, message)
       VALUES (?, ?, ?, ?, ?) RETURNING *`,
      [req.partnerId, req.workspaceOwnerId, industry, parseInt(quantity), message || null]
    );

    // Notify workspace owner via email
    const [partner, owner] = await Promise.all([
      getOne(`SELECT u.name, u.email FROM users u JOIN partners p ON p.user_id = u.id WHERE p.id = ?`, [req.partnerId]),
      getOne(`SELECT email, name FROM users WHERE id = ?`, [req.workspaceOwnerId]),
    ]);

    if (owner?.email) {
      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST, port: parseInt(process.env.EMAIL_PORT || '587'),
        secure: process.env.EMAIL_SECURE === 'true',
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
      });
      await transporter.sendMail({
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: owner.email,
        subject: `🔔 Neue Lead-Anfrage von ${partner?.name || 'Partner'}`,
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#0D0D12;color:#F2F2F7;border-radius:16px;padding:32px;">
            <h2 style="margin:0 0 8px;font-size:20px;color:#ffffff;">Neue Lead-Anfrage</h2>
            <p style="color:#AEAEB2;margin:0 0 24px;font-size:14px;">Ein Partner möchte Leads aus eurem Pool erhalten.</p>
            <table style="width:100%;border-collapse:collapse;">
              <tr><td style="padding:8px 0;color:#636366;font-size:13px;">Partner</td><td style="padding:8px 0;color:#F2F2F7;font-size:13px;font-weight:600;">${partner?.name || '—'}</td></tr>
              <tr><td style="padding:8px 0;color:#636366;font-size:13px;">Branche</td><td style="padding:8px 0;color:#5B8CF5;font-size:13px;font-weight:600;">${industry}</td></tr>
              <tr><td style="padding:8px 0;color:#636366;font-size:13px;">Anzahl</td><td style="padding:8px 0;color:#BF5AF2;font-size:13px;font-weight:600;">${quantity} Leads</td></tr>
              ${message ? `<tr><td style="padding:8px 0;color:#636366;font-size:13px;vertical-align:top;">Nachricht</td><td style="padding:8px 0;color:#AEAEB2;font-size:13px;">${message}</td></tr>` : ''}
            </table>
          </div>`,
      }).catch(err => console.error('[lead-request email]', err.message));
    }

    res.json(request);
  } catch (err) {
    console.error('[partner/lead-requests POST]', err.message);
    res.status(500).json({ error: 'Anfrage fehlgeschlagen.' });
  }
});

router.get('/lead-requests', authenticatePartner, async (req, res) => {
  try {
    const requests = await getAll(
      `SELECT * FROM partner_lead_requests WHERE partner_id = ? ORDER BY created_at DESC`,
      [req.partnerId]
    );
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: 'Fehler beim Laden.' });
  }
});

// ── ADMIN: LEAD REQUESTS ──────────────────────────────────────────────────────
router.get('/admin/lead-requests', async (req, res) => {
  const rows = await getAll(
    `SELECT lr.*, u.name AS partner_name, u.email AS partner_email
     FROM partner_lead_requests lr
     JOIN partners p ON p.id = lr.partner_id
     JOIN users u ON u.id = p.user_id
     ORDER BY lr.created_at DESC`
  );
  res.json(rows);
});

router.put('/admin/lead-requests/:id', async (req, res) => {
  const { status } = req.body;
  const updated = await getOne(
    `UPDATE partner_lead_requests SET status = ? WHERE id = ? RETURNING *`,
    [status, req.params.id]
  );
  if (!updated) return res.status(404).json({ error: 'Nicht gefunden.' });
  res.json(updated);
});

// ── AI CHAT ───────────────────────────────────────────────────────────────────
router.post('/ai-chat', authenticatePartner, async (req, res) => {
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

// ── DEMO WIZARD ───────────────────────────────────────────────────────────────
// Creates a lead and either books an appointment or sends a demo email.
router.post('/demo-wizard', authenticatePartner, async (req, res) => {
  const {
    company, contact_person, phone, email, website, city, industry, notes,
    action,        // 'appointment' | 'email' | 'none'
    scheduled_at,  // ISO string — required when action === 'appointment'
    demo_goal,     // optional text for appointment
    demo_notes,    // optional text appended to demo email
  } = req.body;

  if (!company) return res.status(400).json({ error: 'Firmenname erforderlich.' });
  if (action === 'appointment' && !scheduled_at) return res.status(400).json({ error: 'Termin-Datum erforderlich.' });
  if (action === 'email' && !email) return res.status(400).json({ error: 'E-Mail-Adresse erforderlich.' });

  const partner = await getOne(
    `SELECT p.commission_rate_own, p.workspace_owner_id, u.name AS partner_name
     FROM partners p JOIN users u ON u.id = p.user_id WHERE p.id = ?`,
    [req.partnerId]
  );

  const leadStatus = action === 'appointment' ? 'termin_gesetzt' : 'kontaktiert';
  const lead = await getOne(
    `INSERT INTO partner_leads
       (workspace_owner_id, partner_id, company, contact_person, phone, email, website, city, industry, source, status, notes, commission_rate, milestones)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'demo_wizard', ?, ?, ?, ?) RETURNING *`,
    [partner.workspace_owner_id, req.partnerId, company, contact_person || '', phone || '',
     email || '', website || '', city || '', industry || '', leadStatus, notes || '',
     partner.commission_rate_own, MILESTONES_INIT()]
  );

  // Notify workspace owner
  try {
    const owner = await getOne(`SELECT email FROM users WHERE id = ?`, [partner.workspace_owner_id]);
    if (owner?.email) {
      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST, port: parseInt(process.env.EMAIL_PORT || '587'),
        secure: process.env.EMAIL_SECURE === 'true',
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
      });
      const actionLabel = action === 'appointment'
        ? '📅 Termin vereinbart'
        : action === 'email'
        ? '📧 Demo-Mail gesendet'
        : '📋 Lead eingereicht';
      const scheduledLine = action === 'appointment' && scheduled_at
        ? `<tr><td style="padding:8px 0;color:#636366;font-size:13px;width:120px;">Termin</td><td style="padding:8px 0;color:#BF5AF2;font-size:13px;font-weight:600;">${new Date(scheduled_at).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' })}</td></tr>`
        : '';
      await transporter.sendMail({
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: owner.email,
        subject: `🔔 Neuer Demo-Lead: ${company} (via ${partner.partner_name || 'Partner'})`,
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#0D0D12;color:#F2F2F7;border-radius:16px;padding:32px;">
            <h2 style="margin:0 0 8px;font-size:20px;color:#ffffff;">Neuer Demo-Lead eingegangen</h2>
            <p style="color:#AEAEB2;margin:0 0 24px;font-size:14px;">Ein Caller hat über den Demo-Wizard einen Lead eingereicht.</p>
            <div style="background:#16161E;border-radius:12px;padding:20px;margin-bottom:20px;">
              <table style="width:100%;border-collapse:collapse;">
                <tr><td style="padding:8px 0;color:#636366;font-size:13px;width:120px;">Partner</td><td style="padding:8px 0;color:#F2F2F7;font-size:13px;font-weight:600;">${partner.partner_name || '—'}</td></tr>
                <tr><td style="padding:8px 0;color:#636366;font-size:13px;">Firma</td><td style="padding:8px 0;color:#5B8CF5;font-size:13px;font-weight:600;">${company}</td></tr>
                ${contact_person ? `<tr><td style="padding:8px 0;color:#636366;font-size:13px;">Kontakt</td><td style="padding:8px 0;color:#F2F2F7;font-size:13px;">${contact_person}</td></tr>` : ''}
                ${phone ? `<tr><td style="padding:8px 0;color:#636366;font-size:13px;">Telefon</td><td style="padding:8px 0;color:#F2F2F7;font-size:13px;">${phone}</td></tr>` : ''}
                ${email ? `<tr><td style="padding:8px 0;color:#636366;font-size:13px;">E-Mail</td><td style="padding:8px 0;color:#F2F2F7;font-size:13px;">${email}</td></tr>` : ''}
                ${city ? `<tr><td style="padding:8px 0;color:#636366;font-size:13px;">Stadt</td><td style="padding:8px 0;color:#F2F2F7;font-size:13px;">${city}</td></tr>` : ''}
                ${industry ? `<tr><td style="padding:8px 0;color:#636366;font-size:13px;">Branche</td><td style="padding:8px 0;color:#F2F2F7;font-size:13px;">${industry}</td></tr>` : ''}
                <tr><td style="padding:8px 0;color:#636366;font-size:13px;">Aktion</td><td style="padding:8px 0;color:#34D399;font-size:13px;font-weight:600;">${actionLabel}</td></tr>
                ${scheduledLine}
              </table>
            </div>
            ${notes ? `<p style="color:#AEAEB2;font-size:13px;margin:0;line-height:1.6;"><strong style="color:#F2F2F7;">Notizen:</strong> ${notes}</p>` : ''}
          </div>`,
      }).catch(err => console.error('[demo-wizard notify]', err.message));
    }
  } catch (err) {
    console.error('[demo-wizard notify]', err.message);
  }

  if (action === 'appointment') {
    const appt = await getOne(
      `INSERT INTO partner_appointments
         (workspace_owner_id, partner_id, lead_id, scheduled_at, industry, demo_goal, status)
       VALUES (?, ?, ?, ?, ?, ?, 'scheduled') RETURNING *`,
      [partner.workspace_owner_id, req.partnerId, lead.id, scheduled_at, industry || '', demo_goal || '']
    );
    return res.json({ success: true, lead, appointment: appt, action: 'appointment' });
  }

  if (action === 'email') {
    const settings = await getOne('SELECT company_name FROM settings WHERE user_id = ?', [partner.workspace_owner_id]);
    const agencyName = settings?.company_name || 'Vecturo';
    try {
      await sendDemoEmail({
        to: email,
        contactPerson: contact_person,
        company,
        agencyName,
        partnerName: partner.partner_name || '',
        demoNotes: demo_notes || '',
      });
      return res.json({ success: true, lead, action: 'email', emailSent: true });
    } catch (err) {
      return res.json({ success: true, lead, action: 'email', emailSent: false, emailError: err.message });
    }
  }

  res.json({ success: true, lead, action: 'none' });
});

// Meine Kunden — leads submitted via demo wizard
router.get('/customers', authenticatePartner, async (req, res) => {
  const rows = await getAll(
    `SELECT pl.*, pc.amount AS commission_amount, pc.status AS commission_status, pc.rate AS commission_rate_pct
     FROM partner_leads pl
     LEFT JOIN partner_commissions pc ON pc.lead_id = pl.id
     WHERE pl.partner_id = ? AND pl.source = 'demo_wizard'
     ORDER BY pl.updated_at DESC`,
    [req.partnerId]
  );
  res.json(rows);
});

module.exports = router;
