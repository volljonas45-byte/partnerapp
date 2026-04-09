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

function buildNotificationHtml({ title, subtitle, rows }) {
  const rowsHtml = rows
    .map(([l, v]) => `<tr><td style="color:#6E6E73;padding:6px 0;width:38%;font-size:13px">${l}</td><td style="font-weight:600;font-size:13px">${v}</td></tr>`)
    .join('');
  return `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#F5F5F7;font-family:-apple-system,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F5F7;padding:40px 20px">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08)">
<tr><td style="background:#0071E3;padding:22px 32px">
  <p style="margin:0;color:#fff;font-size:17px;font-weight:700">JR Agency Services</p>
  <p style="margin:4px 0 0;color:rgba(255,255,255,.7);font-size:13px">${subtitle}</p>
</td></tr>
<tr><td style="padding:28px 32px">
  <p style="margin:0 0 20px;font-size:15px;color:#1D1D1F">${title}</p>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F5F7;border-radius:12px;padding:14px 20px">${rowsHtml}</table>
  <p style="margin:20px 0 0;font-size:14px;color:#6E6E73">Den vollständigen Eintrag findest du in Vecturo unter <strong>Intake → Posteingang</strong>.</p>
</td></tr>
<tr><td style="border-top:1px solid #E5E5EA;padding:18px 32px">
  <p style="margin:0;font-size:13px;color:#86868B">Erstellt automatisch · ${new Date().toLocaleString('de-DE')}</p>
</td></tr>
</table></td></tr></table></body></html>`;
}

// ── Label maps ────────────────────────────────────────────────────────────────

const PROJECT_TYPE_LABELS = {
  unternehmenswebsite: 'Unternehmenswebsite', portfolio: 'Portfolio',
  funnel: 'Sales Funnel', shop: 'Online-Shop', buchung: 'Buchungswebsite',
  blog: 'Blog / Magazine', community: 'Community / Verein',
};
const GOAL_LABELS = {
  leads: 'Leads generieren', bookings: 'Buchungen erhalten',
  sales: 'Produkte verkaufen', branding: 'Marke aufbauen',
  portfolio: 'Portfolio zeigen', information: 'Informieren',
};
const PAGE_LABELS = {
  startseite: 'Startseite', ueber_uns: 'Über uns', leistungen: 'Leistungen',
  portfolio: 'Portfolio', referenzen: 'Referenzen', blog: 'Blog',
  shop: 'Shop', kontakt: 'Kontakt', impressum: 'Impressum',
  datenschutz: 'Datenschutz', faq: 'FAQ', karriere: 'Karriere',
};

// ── Templates ─────────────────────────────────────────────────────────────────

const TEMPLATES = {
  webdesign: {
    name:   'Website-Anfrage v4 (JR Agency)',
    fields: [
      { id: 'company_name',   label: 'Unternehmen',          type: 'text' },
      { id: 'contact_person', label: 'Ansprechpartner',      type: 'text' },
      { id: 'email',          label: 'E-Mail',               type: 'text' },
      { id: 'phone',          label: 'Telefon',              type: 'text' },
      { id: 'industry',       label: 'Branche',              type: 'text' },
      { id: 'has_website',    label: 'Website vorhanden',    type: 'text' },
      { id: 'website_url',    label: 'Website-URL',          type: 'text' },
      { id: 'project_type',   label: 'Projekttyp',           type: 'text' },
      { id: 'goal',           label: 'Ziel',                 type: 'text' },
      { id: 'pages',          label: 'Gewünschte Seiten',    type: 'text' },
      { id: 'timeline',       label: 'Zeitplan',             type: 'text' },
      { id: 'first_notes',    label: 'Hinweise & Wünsche',   type: 'text' },
      { id: 'appointment',    label: 'Gebuchter Termin',     type: 'text' },
    ],
  },
  branding: {
    name:   'Branding-Anfrage v1 (JR Agency)',
    fields: [
      { id: 'company_name',   label: 'Unternehmen',          type: 'text' },
      { id: 'contact_person', label: 'Ansprechpartner',      type: 'text' },
      { id: 'email',          label: 'E-Mail',               type: 'text' },
      { id: 'phone',          label: 'Telefon',              type: 'text' },
      { id: 'industry',       label: 'Branche',              type: 'text' },
      { id: 'leistungen',     label: 'Gewünschte Leistungen',type: 'text' },
      { id: 'stil',           label: 'Gewünschter Stil',     type: 'text' },
      { id: 'first_notes',    label: 'Hinweise & Wünsche',   type: 'text' },
      { id: 'appointment',    label: 'Gebuchter Termin',     type: 'text' },
    ],
  },
  'social-media': {
    name:   'Social-Media-Anfrage v1 (JR Agency)',
    fields: [
      { id: 'company_name',   label: 'Unternehmen',          type: 'text' },
      { id: 'contact_person', label: 'Ansprechpartner',      type: 'text' },
      { id: 'email',          label: 'E-Mail',               type: 'text' },
      { id: 'phone',          label: 'Telefon',              type: 'text' },
      { id: 'industry',       label: 'Branche',              type: 'text' },
      { id: 'kanaele',        label: 'Kanäle',               type: 'text' },
      { id: 'ziel',           label: 'Hauptziel',            type: 'text' },
      { id: 'first_notes',    label: 'Hinweise & Wünsche',   type: 'text' },
      { id: 'appointment',    label: 'Gebuchter Termin',     type: 'text' },
    ],
  },
};

async function getOrCreateTemplate(userId, formType) {
  const tmpl_def = TEMPLATES[formType] || TEMPLATES.webdesign;
  let tmpl = await getOne(
    'SELECT id FROM intake_templates WHERE user_id = ? AND name = ?',
    [userId, tmpl_def.name]
  );
  if (tmpl) return tmpl.id;
  const r = await run(
    'INSERT INTO intake_templates (user_id, name, description, fields) VALUES (?, ?, ?, ?) RETURNING id',
    [userId, tmpl_def.name, `Anfragen von der JR Agency Website (${formType})`, JSON.stringify(tmpl_def.fields)]
  );
  return r.lastInsertRowid;
}

// ── Build responses per formType ──────────────────────────────────────────────

function buildResponses(formType, body) {
  const { name, email, phone, companyName, contactPerson, industry,
          hasWebsite, websiteUrl, projectType, goal, goalLabel,
          pages, firstNotes, timelineLabel, appointmentDate, appointmentTime } = body;

  const appointment = appointmentDate && appointmentTime
    ? `${appointmentDate} um ${appointmentTime} Uhr`
    : '';

  if (formType === 'branding') {
    return {
      form_type:      'branding',
      company_name:   companyName || '',
      contact_person: contactPerson || name || '',
      email:          email,
      phone:          phone || '',
      industry:       industry || '',
      leistungen:     goalLabel || goal || '',   // e.g. "Logo Design, Corporate Identity"
      stil:           pages || '',               // e.g. "Modern & Clean"
      first_notes:    firstNotes || '',
      appointment,
    };
  }

  if (formType === 'social-media') {
    return {
      form_type:      'social-media',
      company_name:   companyName || '',
      contact_person: contactPerson || name || '',
      email:          email,
      phone:          phone || '',
      industry:       industry || '',
      kanaele:        pages || '',               // e.g. "Instagram, LinkedIn"
      ziel:           goalLabel || goal || '',   // e.g. "Reichweite aufbauen"
      first_notes:    firstNotes || '',
      appointment,
    };
  }

  // default: webdesign
  const pagesArray = Array.isArray(pages) ? pages : (pages ? pages.split(', ') : []);
  const pagesLabel = pagesArray.map(p => PAGE_LABELS[p] || p).join(', ');
  return {
    form_type:      'webdesign',
    company_name:   companyName || '',
    contact_person: contactPerson || name || '',
    email:          email,
    phone:          phone || '',
    industry:       industry || '',
    has_website:    hasWebsite || '',
    website_url:    websiteUrl || '',
    project_type:   projectType || '',
    goal:           goal || '',
    pages:          pagesLabel,
    timeline:       timelineLabel || '',
    first_notes:    firstNotes || '',
    appointment,
  };
}

// ── Build email per formType ───────────────────────────────────────────────────

function buildEmailData(formType, body, responses) {
  const appt = responses.appointment || '—';

  if (formType === 'branding') {
    return {
      subject:  `Neue Branding-Anfrage: ${responses.contact_person || responses.company_name}`,
      title:    'Eine neue Branding-Anfrage wurde über die Website eingereicht.',
      subtitle: 'Neue Branding-Anfrage eingegangen',
      rows: [
        ['Ansprechpartner',       responses.contact_person || '—'],
        ['Unternehmen',           responses.company_name || '—'],
        ['E-Mail',                `<a href="mailto:${responses.email}">${responses.email}</a>`],
        ['Telefon',               responses.phone || '—'],
        ['Branche',               responses.industry || '—'],
        ['Gewünschte Leistungen', responses.leistungen || '—'],
        ['Gewünschter Stil',      responses.stil || '—'],
        ['Hinweise',              responses.first_notes || '—'],
        ['Gebuchter Termin',      appt],
      ],
    };
  }

  if (formType === 'social-media') {
    return {
      subject:  `Neue Social-Media-Anfrage: ${responses.contact_person || responses.company_name}`,
      title:    'Eine neue Social-Media-Anfrage wurde über die Website eingereicht.',
      subtitle: 'Neue Social-Media-Anfrage eingegangen',
      rows: [
        ['Ansprechpartner', responses.contact_person || '—'],
        ['Unternehmen',     responses.company_name || '—'],
        ['E-Mail',          `<a href="mailto:${responses.email}">${responses.email}</a>`],
        ['Telefon',         responses.phone || '—'],
        ['Branche',         responses.industry || '—'],
        ['Kanäle',          responses.kanaele || '—'],
        ['Hauptziel',       responses.ziel || '—'],
        ['Hinweise',        responses.first_notes || '—'],
        ['Gebuchter Termin',appt],
      ],
    };
  }

  // default: webdesign
  const projectTypeLabel = PROJECT_TYPE_LABELS[body.projectType] || body.projectType || '';
  const goalLabel        = GOAL_LABELS[body.goal] || body.goalLabel || body.goal || '';
  return {
    subject:  `Neue Website-Anfrage: ${responses.contact_person || responses.company_name}`,
    title:    'Eine neue Demo-Anfrage wurde soeben über die Website eingereicht.',
    subtitle: 'Neue Website-Anfrage eingegangen',
    rows: [
      ['Ansprechpartner',  responses.contact_person || '—'],
      ['Unternehmen',      responses.company_name || '—'],
      ['E-Mail',           `<a href="mailto:${responses.email}">${responses.email}</a>`],
      ['Telefon',          responses.phone || '—'],
      ['Branche',          responses.industry || '—'],
      ['Website vorhanden',responses.has_website || '—'],
      ['Website-URL',      responses.website_url || '—'],
      ['Projekttyp',       projectTypeLabel],
      ['Ziel',             goalLabel],
      ['Gewünschte Seiten',responses.pages || '—'],
      ['Zeitplan',         responses.timeline || '—'],
      ['Hinweise',         responses.first_notes || '—'],
      ['Gebuchter Termin', appt],
    ],
  };
}

// ── POST /api/webhook/anfrage ─────────────────────────────────────────────────

router.post('/anfrage', async (req, res) => {
  try {
    const { secret, name, email, formType = 'webdesign', companyName, contactPerson } = req.body;

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

    // Template holen oder erstellen
    const templateId = await getOrCreateTemplate(userId, formType);

    // Responses aufbauen
    const responses  = buildResponses(formType, req.body);
    const displayName = contactPerson || companyName || name;

    // Intake-Formular speichern
    await run(
      `INSERT INTO intake_forms (user_id, template_id, title, token, status, responses, submitted_at, seen)
       VALUES (?, ?, ?, ?, 'submitted', ?, NOW(), 0) RETURNING id`,
      [userId, templateId, `Anfrage: ${displayName}`, crypto.randomBytes(24).toString('hex'), JSON.stringify(responses)]
    );

    // E-Mail Benachrichtigung
    try {
      const transporter = createTransporter();
      if (transporter) {
        const emailData = buildEmailData(formType, req.body, responses);
        await transporter.sendMail({
          from:    process.env.EMAIL_FROM || process.env.EMAIL_USER,
          to:      process.env.EMAIL_USER,
          subject: emailData.subject,
          html:    buildNotificationHtml(emailData),
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
