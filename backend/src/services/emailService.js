const nodemailer = require('nodemailer');

/** Build transporter from .env — returns null if not configured */
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

/** Format a number as German currency string: 1234.5 → "1.234,50 €" */
function fmt(n) {
  return Number(n || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

/** Format ISO date string to German format: 2026-03-21 → "21.03.2026" */
function fmtDate(s) {
  if (!s) return '';
  const [y, m, d] = s.split('T')[0].split('-');
  return `${d}.${m}.${y}`;
}

/**
 * Build the HTML email body.
 * @param {'invoice'|'quote'} type
 * @param {object} doc - invoice or quote object (with client fields)
 * @param {string} agencyName - from settings.company_name
 * @param {string} customMessage - user-edited text (plain text, line breaks honored)
 */
function buildHtml(type, doc, agencyName, customMessage) {
  const greeting   = doc.contact_person || doc.client_name || 'Sehr geehrte Damen und Herren';
  const salutation = greeting.length > 40 ? 'Sehr geehrte Damen und Herren' : `Sehr geehrte(r) ${greeting}`;
  const agency     = agencyName || 'Ihre Agentur';

  const infoRows = type === 'invoice'
    ? `
      <tr><td style="color:#6E6E73;padding:6px 0;width:50%">Rechnungsnummer</td>
          <td style="font-weight:600;text-align:right">${doc.invoice_number}</td></tr>
      <tr><td style="color:#6E6E73;padding:6px 0">Betrag</td>
          <td style="font-weight:600;text-align:right">${fmt(doc.total)}</td></tr>
      <tr><td style="color:#6E6E73;padding:6px 0">Fällig bis</td>
          <td style="font-weight:600;text-align:right">${fmtDate(doc.due_date)}</td></tr>`
    : `
      <tr><td style="color:#6E6E73;padding:6px 0;width:50%">Angebotsnummer</td>
          <td style="font-weight:600;text-align:right">${doc.quote_number}</td></tr>
      <tr><td style="color:#6E6E73;padding:6px 0">Betrag</td>
          <td style="font-weight:600;text-align:right">${fmt(doc.total)}</td></tr>
      <tr><td style="color:#6E6E73;padding:6px 0">Gültig bis</td>
          <td style="font-weight:600;text-align:right">${fmtDate(doc.valid_until)}</td></tr>`;

  const intro = type === 'invoice'
    ? `anbei erhalten Sie Ihre <strong>Rechnung ${doc.invoice_number}</strong>.`
    : `vielen Dank für Ihr Interesse. Anbei finden Sie unser <strong>Angebot ${doc.quote_number}</strong>.`;

  const customHtml = customMessage
    ? customMessage.split('\n').map(l => l.trim() ? `<p style="margin:0 0 8px">${l}</p>` : '<br>').join('')
    : '';

  return `<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F5F5F7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F5F7;padding:40px 20px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08)">

        <!-- Header Bar -->
        <tr><td style="background:#0071E3;padding:24px 32px">
          <p style="margin:0;color:#fff;font-size:18px;font-weight:600">${agency}</p>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:32px">
          <p style="margin:0 0 16px;font-size:15px;color:#1D1D1F">${salutation},</p>
          <p style="margin:0 0 24px;font-size:15px;color:#1D1D1F">${intro}</p>

          <!-- Info Card -->
          <table width="100%" cellpadding="0" cellspacing="0"
                 style="background:#F5F5F7;border-radius:12px;padding:16px 20px;margin-bottom:24px">
            ${infoRows}
          </table>

          ${customHtml ? `<div style="font-size:15px;color:#1D1D1F;margin-bottom:24px">${customHtml}</div>` : ''}

          <p style="margin:32px 0 4px;font-size:14px;color:#6E6E73">
            Die ${type === 'invoice' ? 'Rechnung' : 'das Angebot'} finden Sie im Anhang als PDF.
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="border-top:1px solid #E5E5EA;padding:20px 32px;text-align:right">
          <p style="margin:0;font-size:14px;color:#1D1D1F">
            Mit freundlichen Grüßen,<br>
            <strong>${agency}</strong>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/**
 * Send an invoice or quote email with PDF attachment.
 * @param {object} opts
 * @param {'invoice'|'quote'} opts.type
 * @param {object}  opts.doc        - full invoice/quote with client fields
 * @param {string}  opts.agencyName - settings.company_name
 * @param {string}  [opts.to]          - override recipient (default: doc.client_email)
 * @param {string}  [opts.subject]     - override subject
 * @param {string}  [opts.message]     - custom message body (plain text)
 * @param {string}  [opts.fromAlias]   - per-user alias, e.g. "jonas@jragencyservices.com"
 * @param {string}  [opts.signature]   - per-user signature text (plain text)
 * @param {Uint8Array} opts.pdfBytes   - PDF buffer from pdfService
 */
async function sendDocument({ type, doc, agencyName, to, subject, message, fromAlias, signature, pdfBytes }) {
  const transporter = createTransporter();
  if (!transporter) {
    throw new Error(
      'E-Mail ist nicht konfiguriert. Bitte EMAIL_HOST, EMAIL_USER und EMAIL_PASS in der .env-Datei setzen.'
    );
  }

  const recipient = to || doc.client_email;
  if (!recipient) throw new Error('Kein E-Mail-Empfänger angegeben.');

  const defaultSubject = type === 'invoice'
    ? `Ihre Rechnung ${doc.invoice_number} von ${agencyName || 'uns'}`
    : `Ihr Angebot ${doc.quote_number} von ${agencyName || 'uns'}`;

  const filename = type === 'invoice'
    ? `${doc.invoice_number}.pdf`
    : `${doc.quote_number}.pdf`;

  // Use per-user alias if set, otherwise fall back to global EMAIL_FROM
  const fromAddress = fromAlias
    ? (agencyName ? `"${agencyName}" <${fromAlias}>` : fromAlias)
    : (process.env.EMAIL_FROM || process.env.EMAIL_USER);

  // Merge user's signature into message
  const fullMessage = [message, signature].filter(Boolean).join('\n\n-- \n');

  await transporter.sendMail({
    from:        fromAddress,
    to:          recipient,
    subject:     subject || defaultSubject,
    html:        buildHtml(type, doc, agencyName, fullMessage),
    attachments: [{
      filename,
      content:     Buffer.from(pdfBytes),
      contentType: 'application/pdf',
    }],
  });
}

module.exports = { sendDocument };
