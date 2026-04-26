/**
 * Gmail service for the partner mail feature.
 *
 * Sending  → Gmail SMTP via nodemailer (same creds already used for emailService.js)
 *             From: is set to the partner's alias, e.g. jonas.voll@jragencyservices.com
 *             Reply-To: same alias so customer replies come back to the alias
 *
 * Receiving → Gmail API (OAuth2 service-account or installed-app flow).
 *             We poll the shared inbox and filter by the To:/Delivered-To: header
 *             to route each incoming message to the correct partner.
 *
 * Required env vars (add to .env AND Render environment):
 *   EMAIL_HOST       smtp.gmail.com          (already set)
 *   EMAIL_PORT       587                     (already set)
 *   EMAIL_USER       partner@jragencyservices.com   ← the ONE Google Workspace user
 *   EMAIL_PASS       <app-password for that user>
 *   GMAIL_CLIENT_ID       <OAuth2 Web client ID>
 *   GMAIL_CLIENT_SECRET   <OAuth2 client secret>
 *   GMAIL_REFRESH_TOKEN   <refresh token for partner@jragencyservices.com>
 *
 * You will fill in GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN tomorrow
 * after creating the Google Workspace user and setting up OAuth2 in Google Cloud Console.
 * Everything else already works.
 */

const nodemailer  = require('nodemailer');
const { google }  = require('googleapis');

// ── SMTP transporter (reuses existing Gmail SMTP credentials) ─────────────────

function createTransporter() {
  return nodemailer.createTransport({
    host:   process.env.EMAIL_HOST   || 'smtp.gmail.com',
    port:   parseInt(process.env.EMAIL_PORT || '587', 10),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.GMAIL_PARTNER_USER || process.env.EMAIL_USER,
      pass: process.env.GMAIL_PARTNER_PASS || process.env.EMAIL_PASS,
    },
  });
}

// ── OAuth2 client (for Gmail API — reading incoming mail) ─────────────────────

function createOAuth2Client() {
  const { GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN } = process.env;
  if (!GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET || !GMAIL_REFRESH_TOKEN) return null;

  const auth = new google.auth.OAuth2(GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET);
  auth.setCredentials({ refresh_token: GMAIL_REFRESH_TOKEN });
  return auth;
}

// ── Send a mail from a partner alias ─────────────────────────────────────────

/**
 * @param {object} opts
 * @param {string} opts.alias      - From address, e.g. "jonas.voll@jragencyservices.com"
 * @param {string} opts.partnerName
 * @param {string} opts.to         - Recipient email
 * @param {string} opts.subject
 * @param {string} opts.body       - Plain text (will be wrapped in simple HTML)
 */
async function sendPartnerMail({ alias, partnerName, to, subject, body }) {
  const transporter = createTransporter();

  const from = partnerName ? `"${partnerName}" <${alias}>` : alias;

  const html = `<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#F5F5F7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F5F7;padding:40px 20px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08)">
        <tr><td style="background:#0071E3;padding:20px 32px">
          <p style="margin:0;color:#fff;font-size:17px;font-weight:600">${partnerName || 'Partner-Portal'}</p>
        </td></tr>
        <tr><td style="padding:32px;font-size:15px;color:#1D1D1F;line-height:1.7;white-space:pre-wrap">${body.replace(/\n/g, '<br>')}</td></tr>
        <tr><td style="border-top:1px solid #E5E5EA;padding:16px 32px;text-align:right">
          <p style="margin:0;font-size:13px;color:#86868B">Gesendet über das Vecturo Partner-Portal</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  await transporter.sendMail({
    from,
    to,
    replyTo: alias,
    subject,
    html,
    text: body,
  });
}

// ── Poll Gmail inbox for messages addressed to a specific alias ───────────────

/**
 * Fetches recent messages from the shared Gmail inbox that were sent TO a given alias.
 * Returns an array of { gmailMsgId, from, subject, body, receivedAt }.
 *
 * @param {string} alias  e.g. "jonas.voll@jragencyservices.com"
 * @param {number} maxResults
 */
async function fetchIncomingForAlias(alias, maxResults = 20) {
  const auth = createOAuth2Client();
  if (!auth) return [];   // OAuth not configured yet — returns empty until credentials set

  const gmail = google.gmail({ version: 'v1', auth });
  const localPart = alias.split('@')[0];

  // Search for messages delivered to this alias
  const listRes = await gmail.users.messages.list({
    userId: 'me',
    q: `to:${alias} OR deliveredto:${localPart}`,
    maxResults,
  });

  const messages = listRes.data.messages || [];
  const results  = [];

  for (const msg of messages) {
    try {
      const full = await gmail.users.messages.get({
        userId: 'me',
        id:     msg.id,
        format: 'full',
      });

      const headers  = full.data.payload.headers || [];
      const get      = (name) => (headers.find(h => h.name.toLowerCase() === name.toLowerCase()) || {}).value || '';
      const toHeader = get('To') + ' ' + get('Delivered-To');

      // Double-check this is really for our alias
      if (!toHeader.toLowerCase().includes(localPart.toLowerCase())) continue;

      const body = extractBody(full.data.payload);

      results.push({
        gmailMsgId: msg.id,
        from:       get('From'),
        subject:    get('Subject'),
        body,
        receivedAt: new Date(parseInt(full.data.internalDate, 10)).toISOString(),
      });
    } catch (_) { /* skip malformed messages */ }
  }

  return results;
}

// ── Extract plain-text body from Gmail message payload ────────────────────────

function extractBody(payload) {
  if (!payload) return '';

  if (payload.body?.data) {
    return Buffer.from(payload.body.data, 'base64').toString('utf-8');
  }

  if (payload.parts) {
    // Prefer text/plain
    const plain = payload.parts.find(p => p.mimeType === 'text/plain');
    if (plain?.body?.data) return Buffer.from(plain.body.data, 'base64').toString('utf-8');

    // Fall back to text/html stripped of tags
    const html = payload.parts.find(p => p.mimeType === 'text/html');
    if (html?.body?.data) {
      const raw = Buffer.from(html.body.data, 'base64').toString('utf-8');
      return raw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    }

    // Recurse into multipart
    for (const part of payload.parts) {
      const nested = extractBody(part);
      if (nested) return nested;
    }
  }

  return '';
}

module.exports = { sendPartnerMail, fetchIncomingForAlias };
