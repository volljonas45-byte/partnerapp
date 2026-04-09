const express    = require('express');
const crypto     = require('crypto');
const nodemailer = require('nodemailer');
const { getOne, run } = require('../db/pg');

const router = express.Router();

// ── Email ─────────────────────────────────────────────────────────────────────

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

function buildNotificationHtml(data) {
  const rows = [
    ['Name',             data.name],
    ['E-Mail',           `<a href="mailto:${data.email}">${data.email}</a>`],
    ['Telefon',          data.phone || '—'],
    ['Website-Typ',      data.websiteTypeLabel || '—'],
    ['Branche',          data.businessTypeLabel || '—'],
    ['Ziele',            (data.featuresLabels || []).join(', ') || '—'],
    ['Zeitplan',         data.timelineLabel || '—'],
    ['Gebuchter Termin', data.appointmentDate && data.appointmentTime ? `${data.appointmentDate} um ${data.appointmentTime} Uhr` : '—'],
    ['Hinweise',         data.message || '—'],
  ].map(([l, v]) => `<tr><td style="color:#6E6E73;padding:6px 0;width:38%;font-size:13px">${l}</td><td style="font-weight:600;font-size:13px">${v}</td></tr>`).join('');

  return `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#F5F5F7;font-family:-apple-system,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F5F7;padding:40px 20px">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08)">
<tr><td style="background:#0071E3;padding:22px 32px">
  <p style="margin:0;color:#fff;font-size:17px;font-weight:700">JR Agency Services</p>
  <p style="margin:4px 0 0;color:rgba(255,255,255,.7);font-size:13px">Neue Website-Anfrage eingegangen</p>
</td></tr>
<tr><td style="padding:28px 32px">
  <p style="margin:0 0 20px;font-size:15px;color:#1D1D1F">Eine neue Demo-Anfrage wurde soeben über die Website eingereicht.</p>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F5F7;border-radius:12px;padding:14px 20px">${rows}</table>
  <p style="margin:20px 0 0;font-size:14px;color:#6E6E73">Den vollständigen Eintrag findest du in Vecturo unter <strong>Intake → Posteingang</strong>.</p>
</td></tr>
<tr><td style="border-top:1px solid #E5E5EA;padding:18px 32px">
  <p style="margin:0;font-size:13px;color:#86868B">Erstellt automatisch · ${new Date().toLocaleString('de-DE')}</p>
</td></tr>
</table></td></tr></table></body></html>`;
}

// ── Template ──────────────────────────────────────────────────────────────────

const TEMPLATE_NAME = 'Website-Anfrage (JR Agency)';

const TEMPLATE_FIELDS = [
  { key: 'contact_name',    label: 'Name',                    type: 'text' },
  { key: 'contact_email',   label: 'E-Mail',                  type: 'text' },
  { key: 'contact_phone',   label: 'Telefon',                 type: 'text' },
  { key: 'website_type',    label: 'Website-Typ',             type: 'text' },
  { key: 'business_type',   label: 'Branche',                 type: 'text' },
  { key: 'features',        label: 'Gewünschte Funktionen',   type: 'text' },
  { key: 'timeline',        label: 'Zeitplan',                type: 'text' },
  { key: 'appointment',     label: 'Gebuchter Termin',        type: 'text' },
  { key: 'message',         label: 'Hinweise & Wünsche',      type: 'text' },
];

async function getOrCreateTemplate(userId) {
  let tmpl = await getOne(
    'SELECT id FROM intake_templates WHERE user_id = ? AND name = ?',
    [userId, TEMPLATE_NAME]
  );
  if (tmpl) return tmpl.id;
  const r = await run(
    'INSERT INTO intake_templates (user_id, name, description, fields) VALUES (?, ?, ?, ?) RETURNING id',
    [userId, TEMPLATE_NAME, 'Anfragen von der JR Agency Website', JSON.stringify(TEMPLATE_FIELDS)]
  );
  return r.lastInsertRowid;
}

// ── POST /api/webhook/anfrage ─────────────────────────────────────────────────

router.post('/anfrage', async (req, res) => {
  try {
    const { secret, name, email, phone, message,
            websiteTypeLabel, businessTypeLabel,
            featuresLabels, timelineLabel,
            appointmentDate, appointmentTime } = req.body;

    if (!secret || secret !== process.env.WEBHOOK_SECRET)
      return res.status(401).json({ error: 'Unauthorized' });
    if (!name || !email)
      return res.status(400).json({ error: 'name und email sind Pflichtfelder' });

    // Workspace-User ermitteln
    const userEmail = process.env.WEBHOOK_USER_EMAIL;
    if (!userEmail) return res.status(500).json({ error: 'WEBHOOK_USER_EMAIL nicht konfiguriert' });
    const user = await getOne('SELECT id, workspace_owner_id FROM users WHERE email = ?', [userEmail]);
    if (!user) return res.status(500).json({ error: `Kein Benutzer mit E-Mail ${userEmail} gefunden` });
    const userId = user.workspace_owner_id ?? user.id;

    // Intake-Template holen oder erstellen
    const templateId = await getOrCreateTemplate(userId);

    // Intake-Formular als bereits eingereicht speichern
    const token = crypto.randomBytes(24).toString('hex');
    const responses = {
      contact_name:  name,
      contact_email: email,
      contact_phone: phone || '',
      website_type:  websiteTypeLabel || '',
      business_type: businessTypeLabel || '',
      features:      (featuresLabels || []).join(', '),
      timeline:      timelineLabel || '',
      appointment:   appointmentDate && appointmentTime ? `${appointmentDate} um ${appointmentTime} Uhr` : '',
      message:       message || '',
    };

    await run(
      `INSERT INTO intake_forms (user_id, template_id, title, token, status, responses, submitted_at, seen)
       VALUES (?, ?, ?, ?, 'submitted', ?, NOW(), 0) RETURNING id`,
      [userId, templateId, `Demo-Anfrage: ${name}`, token, JSON.stringify(responses)]
    );

    // E-Mail Benachrichtigung
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
      console.error('[webhook] E-Mail Fehler:', emailErr.message);
    }

    res.json({ success: true });

  } catch (err) {
    console.error('[webhook POST /anfrage]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
