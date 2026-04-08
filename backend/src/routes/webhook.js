const express  = require('express');
const crypto   = require('crypto');
const nodemailer = require('nodemailer');
const { getOne, getAll, run } = require('../db/pg');

const router = express.Router();

// ── Helpers ───────────────────────────────────────────────────────────────────

function createTransporter() {
  const { EMAIL_HOST, EMAIL_USER, EMAIL_PASS } = process.env;
  if (!EMAIL_HOST || !EMAIL_USER || !EMAIL_PASS) return null;
  return nodemailer.createTransport({
    host:   EMAIL_HOST,
    port:   parseInt(process.env.EMAIL_PORT || '587', 10),
    secure: process.env.EMAIL_SECURE === 'true',
    auth:   { user: EMAIL_USER, pass: EMAIL_PASS },
  });
}

// ── Notification email HTML ───────────────────────────────────────────────────

function buildNotificationHtml({ name, email, phone, websiteTypeLabel, businessTypeLabel, featuresLabels, timelineLabel, appointmentDate, appointmentTime, message }) {
  const rows = [
    ['Name',            name],
    ['E-Mail',          `<a href="mailto:${email}" style="color:#0071E3">${email}</a>`],
    ['Telefon',         phone || '—'],
    ['Website-Typ',     websiteTypeLabel || '—'],
    ['Branche',         businessTypeLabel || '—'],
    ['Gewünschte Ziele', (featuresLabels || []).join(', ') || '—'],
    ['Zeitplan',        timelineLabel || '—'],
    ['Gebuchter Termin', appointmentDate && appointmentTime ? `${appointmentDate} um ${appointmentTime} Uhr` : '—'],
    ['Hinweise',        message || '—'],
  ].map(([label, val]) => `
    <tr>
      <td style="color:#6E6E73;padding:7px 0;width:38%;vertical-align:top;font-size:13px">${label}</td>
      <td style="font-weight:600;padding:7px 0;font-size:13px;color:#1D1D1F">${val}</td>
    </tr>`).join('');

  return `<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#F5F5F7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F5F7;padding:40px 20px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08)">

        <tr><td style="background:#0071E3;padding:22px 32px">
          <p style="margin:0;color:#fff;font-size:17px;font-weight:700">JR Agency Services</p>
          <p style="margin:4px 0 0;color:rgba(255,255,255,.7);font-size:13px">Neue Website-Anfrage eingegangen</p>
        </td></tr>

        <tr><td style="padding:28px 32px">
          <p style="margin:0 0 20px;font-size:15px;color:#1D1D1F">
            Eine neue Demo-Anfrage wurde soeben über die Website eingereicht.
          </p>

          <table width="100%" cellpadding="0" cellspacing="0"
                 style="background:#F5F5F7;border-radius:12px;padding:14px 20px;margin-bottom:8px">
            ${rows}
          </table>
        </td></tr>

        <tr><td style="border-top:1px solid #E5E5EA;padding:18px 32px">
          <p style="margin:0;font-size:13px;color:#86868B">
            Erstellt automatisch von der JR Agency Website · ${new Date().toLocaleString('de-DE')}
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── TEMPLATE: find existing or create ───────────────────────────────────────

const TEMPLATE_NAME = 'Website-Anfrage (JR Agency)';

const TEMPLATE_FIELDS = [
  { key: 'website_type',   label: 'Website-Typ',           type: 'text' },
  { key: 'business_type',  label: 'Branche',                type: 'text' },
  { key: 'features',       label: 'Gewünschte Funktionen',  type: 'text' },
  { key: 'timeline',       label: 'Zeitplan',               type: 'text' },
  { key: 'contact_name',   label: 'Name',                   type: 'text' },
  { key: 'contact_email',  label: 'E-Mail',                 type: 'text' },
  { key: 'contact_phone',  label: 'Telefon',                type: 'text' },
  { key: 'appointment',    label: 'Gebuchter Termin',       type: 'text' },
  { key: 'message',        label: 'Hinweise & Wünsche',     type: 'text' },
];

async function getOrCreateTemplate(userId) {
  let tmpl = await getOne(
    'SELECT id FROM intake_templates WHERE user_id = ? AND name = ?',
    [userId, TEMPLATE_NAME]
  );
  if (tmpl) return tmpl.id;

  const r = await run(
    'INSERT INTO intake_templates (user_id, name, description, fields) VALUES (?, ?, ?, ?) RETURNING id',
    [userId, TEMPLATE_NAME, 'Automatisch erstellte Anfragen von der JR Agency Website', JSON.stringify(TEMPLATE_FIELDS)]
  );
  return r.lastInsertRowid;
}

// ─── POST /api/webhook/anfrage ────────────────────────────────────────────────

router.post('/anfrage', async (req, res) => {
  try {
    // 1. Validate secret
    const { secret, name, email, phone, message,
            websiteType, websiteTypeLabel,
            businessType, businessTypeLabel,
            features, featuresLabels,
            timeline, timelineLabel,
            appointmentDate, appointmentTime } = req.body;

    if (!secret || secret !== process.env.WEBHOOK_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!name || !email) {
      return res.status(400).json({ error: 'name und email sind Pflichtfelder' });
    }

    // 2. Find workspace user
    const userEmail = process.env.WEBHOOK_USER_EMAIL;
    if (!userEmail) return res.status(500).json({ error: 'WEBHOOK_USER_EMAIL nicht konfiguriert' });

    const user = await getOne('SELECT id FROM users WHERE email = ?', [userEmail]);
    if (!user) return res.status(500).json({ error: `Kein Benutzer mit E-Mail ${userEmail} gefunden` });
    const userId = user.id;

    // 3. Create client
    const clientResult = await run(
      `INSERT INTO clients (user_id, company_name, contact_person, email, phone, industry)
       VALUES (?, ?, ?, ?, ?, ?) RETURNING id`,
      [userId, name, name, email, phone || '', businessTypeLabel || '']
    );
    const clientId = clientResult.lastInsertRowid;

    // Also create client_legal entry (like the wizard does)
    await run(
      `INSERT INTO client_legal (client_id, company_name, address)
       VALUES (?, ?, ?) ON CONFLICT DO NOTHING`,
      [clientId, name, '']
    );

    // 4. Create project
    const year = new Date().getFullYear();
    const projectName = `${name} – Website ${year}`;
    const description = [
      websiteTypeLabel   ? `Website-Typ: ${websiteTypeLabel}` : null,
      businessTypeLabel  ? `Branche: ${businessTypeLabel}`     : null,
      featuresLabels?.length ? `Ziele: ${featuresLabels.join(', ')}` : null,
      timelineLabel      ? `Zeitplan: ${timelineLabel}`         : null,
      appointmentDate && appointmentTime ? `Termin: ${appointmentDate} um ${appointmentTime} Uhr` : null,
      message            ? `Hinweise: ${message}`               : null,
    ].filter(Boolean).join('\n');

    const projectResult = await run(
      `INSERT INTO projects (user_id, client_id, name, type, status, description, project_type)
       VALUES (?, ?, ?, ?, 'planned', ?, 'website') RETURNING id`,
      [userId, clientId, projectName, websiteTypeLabel || '', description]
    );
    const projectId = projectResult.lastInsertRowid;

    // 5. Set workflow decision (goal from features) — optional
    try {
      const goalMap = { anfragen: 'leads', seo: 'branding', verkaufen: 'sales', termin: 'bookings', mobil: 'information', schnell: 'information' };
      const firstFeature = (features || [])[0];
      const goal = goalMap[firstFeature] || 'leads';
      const existingWf = await getOne('SELECT id, decisions FROM project_workflows WHERE project_id = ?', [projectId]);
      if (existingWf) {
        const merged = { ...(JSON.parse(existingWf.decisions || '{}')), goal, build_type: 'gecodet' };
        await run('UPDATE project_workflows SET decisions = ? WHERE project_id = ?', [JSON.stringify(merged), projectId]);
      } else {
        await run(
          `INSERT INTO project_workflows (user_id, project_id, current_phase, decisions) VALUES (?, ?, 'demo', ?)`,
          [userId, projectId, JSON.stringify({ goal, build_type: 'gecodet' })]
        );
      }
    } catch (_) { /* workflow optional */ }

    // 6. Intake template + form (pre-submitted)
    const templateId = await getOrCreateTemplate(userId);
    const token = crypto.randomBytes(24).toString('hex');
    const responses = {
      website_type:  websiteTypeLabel  || '',
      business_type: businessTypeLabel || '',
      features:      (featuresLabels  || []).join(', '),
      timeline:      timelineLabel     || '',
      contact_name:  name,
      contact_email: email,
      contact_phone: phone  || '',
      appointment:   appointmentDate && appointmentTime ? `${appointmentDate} um ${appointmentTime} Uhr` : '',
      message:       message || '',
    };

    await run(
      `INSERT INTO intake_forms
         (user_id, template_id, project_id, client_id, title, token, status, responses, submitted_at, seen)
       VALUES (?, ?, ?, ?, ?, ?, 'submitted', ?, NOW(), 0) RETURNING id`,
      [userId, templateId, projectId, clientId,
       `Demo-Anfrage: ${name}`, token, JSON.stringify(responses)]
    );

    // 7. Send notification email
    try {
      const transporter = createTransporter();
      if (transporter) {
        await transporter.sendMail({
          from:    process.env.EMAIL_FROM || process.env.EMAIL_USER,
          to:      process.env.EMAIL_USER,
          subject: `Neue Website-Anfrage: ${name}`,
          html:    buildNotificationHtml({ name, email, phone, websiteTypeLabel, businessTypeLabel, featuresLabels, timelineLabel, appointmentDate, appointmentTime, message }),
        });
      }
    } catch (emailErr) {
      console.error('[webhook] E-Mail fehlgeschlagen:', emailErr.message);
      // Don't fail the whole request because of email
    }

    res.json({ success: true, clientId, projectId });

  } catch (err) {
    console.error('[webhook POST /anfrage]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
