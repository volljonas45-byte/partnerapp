const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');

// ── COLOUR PALETTE ────────────────────────────────────────────────────────────
// Only four values; accent is used solely for the Gesamtbetrag box.

const INK    = rgb(0.04, 0.05, 0.09);   // near-black – headings & bold values
const BODY   = rgb(0.18, 0.20, 0.25);   // body text
const MID    = rgb(0.42, 0.44, 0.50);   // secondary / labels
const RULE   = rgb(0.84, 0.85, 0.87);   // dividers & table borders
const FAINT  = rgb(0.96, 0.96, 0.97);   // subtle alternate-row tint + footer bg
const WHITE  = rgb(1, 1, 1);

// ── HELPERS ───────────────────────────────────────────────────────────────────

function hexToRgb(hex) {
  const c = (hex || '#111827').replace('#', '');
  return rgb(
    parseInt(c.substring(0, 2), 16) / 255,
    parseInt(c.substring(2, 4), 16) / 255,
    parseInt(c.substring(4, 6), 16) / 255,
  );
}

function fmtCur(n) {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency', currency: 'EUR', minimumFractionDigits: 2,
  }).format(n || 0);
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('de-DE');
}

function trunc(t, n) {
  if (!t) return '';
  return t.length > n ? t.slice(0, n - 1) + '…' : t;
}

function wrapText(text, max) {
  const words = (text || '').split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w;
    if (test.length <= max) { cur = test; }
    else { if (cur) lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  return lines;
}

/** Draw text right-aligned so its right edge sits at x = rx. */
function right(page, text, rx, y, size, font, color) {
  page.drawText(text, { x: rx - font.widthOfTextAtSize(text, size), y, size, font, color });
}

/** Horizontal rule */
function rule(page, x1, x2, y, thick = 0.5, color = RULE) {
  page.drawLine({ start: { x: x1, y }, end: { x: x2, y }, thickness: thick, color });
}

// ── MAIN GENERATOR ────────────────────────────────────────────────────────────

async function generateDocumentPDF(doc, settings = {}, type = 'invoice') {
  const pdfDoc = await PDFDocument.create();
  const page   = pdfDoc.addPage([595, 842]); // A4
  const { width, height } = page.getSize();

  const B = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const R = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const ML = 55;          // left margin
  const MR = 540;         // right edge
  const CW = MR - ML;     // content width 485 px

  const isInvoice    = type === 'invoice';
  const isKlein      = settings?.kleinunternehmer === 1 || settings?.kleinunternehmer === true;
  const isReverseCharge = doc.reverse_charge === 1 || doc.reverse_charge === true;
  const invoiceType  = doc.invoice_type || 'standard';
  const accent       = hexToRgb(settings?.primary_color || '#111827');

  // ── SECTION 1 · HEADER ────────────────────────────────────────────────────
  // Logo or company name — white background, no decorative bars.

  let headerH = 0;

  if (settings?.logo_base64) {
    try {
      const [meta, b64] = settings.logo_base64.split(',');
      const bytes = Buffer.from(b64, 'base64');
      const img   = meta.includes('png')
        ? await pdfDoc.embedPng(bytes)
        : await pdfDoc.embedJpg(bytes);
      const dims  = img.scaleToFit(150, 52);
      page.drawImage(img, { x: ML, y: height - 18 - dims.height, width: dims.width, height: dims.height });
      headerH = dims.height + 18;
    } catch { /* skip broken image */ }
  }

  if (!headerH) {
    // Company name as typographic logo
    page.drawText(trunc(settings?.company_name || 'Unternehmen', 34), {
      x: ML, y: height - 44, size: 20, font: B, color: INK,
    });
    if (settings?.legal_form) {
      page.drawText(settings.legal_form, {
        x: ML, y: height - 60, size: 8, font: R, color: MID,
      });
    }
    headerH = 64;
  }

  // ── SECTION 2 · DOCUMENT TITLE + META ────────────────────────────────────
  // "ANGEBOT" large on the left; meta info right-aligned on the right.

  const docTitle = isInvoice
    ? (invoiceType === 'abschlag' ? 'ABSCHLAGSRECHNUNG'
      : invoiceType === 'schluss' ? 'SCHLUSSRECHNUNG'
      : doc.storno_of_id          ? 'STORNORECHNUNG'
      : 'RECHNUNG')
    : 'ANGEBOT';
  const docNumber = isInvoice ? (doc.invoice_number || '') : (doc.quote_number || '');

  const lzVon = doc.leistungszeitraum_von;
  const lzBis = doc.leistungszeitraum_bis;
  const metaFields = isInvoice
    ? [
        ['Rechnungsnummer',  doc.invoice_number || ''],
        ['Rechnungsdatum',   fmtDate(doc.issue_date)],
        ['Fälligkeitsdatum', fmtDate(doc.due_date)],
        ...(doc.leistungsdatum ? [['Leistungsdatum', fmtDate(doc.leistungsdatum)]] : []),
        ...(lzVon && lzBis ? [['Leistungszeitraum', `${fmtDate(lzVon)} – ${fmtDate(lzBis)}`]] : []),
        ...(doc.payment_date   ? [['Zahlungsdatum',  fmtDate(doc.payment_date)]]   : []),
      ]
    : [
        ['Angebotsnummer', doc.quote_number || ''],
        ['Angebotsdatum',  fmtDate(doc.issue_date)],
        ['Gültig bis',     fmtDate(doc.valid_until)],
      ];

  let y = height - headerH - 30;

  // Title
  page.drawText(docTitle, { x: ML, y, size: 32, font: B, color: INK });
  page.drawText(docNumber, { x: ML + 2, y: y - 24, size: 10, font: R, color: MID });

  // Meta block — right-aligned labels + values
  let mY = y + 4;
  for (const [label, value] of metaFields) {
    right(page, label.toUpperCase(), MR, mY,      6.5, B, MID);
    right(page, value,               MR, mY - 14, 10,  B, INK);
    mY -= 32;
  }

  // Advance y past whichever is taller: title block or meta block
  const titleBottom = y - 42;                          // "ANGEBOT" + number
  const metaBottom  = mY + 32 - 14 - 10;              // bottom of last value
  y = Math.min(titleBottom, metaBottom) - 18;

  // ── DIVIDER ───────────────────────────────────────────────────────────────
  rule(page, ML, MR, y, 0.75);

  // ── SECTION 3 · ADDRESS BLOCK ─────────────────────────────────────────────
  // Two columns: ABSENDER (left) / EMPFÄNGER (right). No boxes, just type.

  y -= 22;
  const addrY = y;
  const COL2  = ML + Math.round(CW / 2) + 8;

  // Section labels
  page.drawText('ABSENDER',  { x: ML,   y: addrY, size: 7, font: B, color: MID });
  page.drawText('EMPFÄNGER', { x: COL2, y: addrY, size: 7, font: B, color: MID });

  // Sender
  const senderLines = [
    settings?.company_name || '',
    settings?.address      || '',
    [settings?.postal_code, settings?.city].filter(Boolean).join(' '),
    settings?.country      || '',
    settings?.email        || '',
    settings?.phone  ? `Tel: ${settings.phone}` : '',
    settings?.vat_id       ? `USt-IdNr.: ${settings.vat_id}`       : '',
    settings?.steuernummer ? `Steuernr.: ${settings.steuernummer}` : '',
  ].filter(Boolean);

  let sY = addrY - 16;
  for (let i = 0; i < senderLines.length; i++) {
    page.drawText(trunc(senderLines[i], 42), {
      x: ML, y: sY,
      size: i === 0 ? 10   : 8.5,
      font: i === 0 ? B    : R,
      color: i === 0 ? BODY : MID,
    });
    sY -= i === 0 ? 15 : 12;
  }

  // Recipient
  const recipLines = [
    doc.client_name    || '',
    doc.contact_person || '',
    doc.client_address || '',
    [doc.client_postal_code, doc.client_city].filter(Boolean).join(' '),
    doc.client_country || '',
    doc.client_email   || '',
    doc.client_vat_id  ? `USt-IdNr.: ${doc.client_vat_id}` : '',
  ].filter(Boolean);

  let rY = addrY - 16;
  for (let i = 0; i < recipLines.length; i++) {
    page.drawText(trunc(recipLines[i], 40), {
      x: COL2, y: rY,
      size: i === 0 ? 10   : 8.5,
      font: i === 0 ? B    : R,
      color: i === 0 ? BODY : MID,
    });
    rY -= i === 0 ? 15 : 12;
  }

  y = Math.min(sY, rY) - 24;
  rule(page, ML, MR, y, 0.75);

  // ── SECTION 4 · ITEM TABLE ────────────────────────────────────────────────
  // Header row: uppercase labels, no background fill, bottom border only.
  // Numeric columns are right-aligned.

  y -= 22;

  // Column right-edges (Menge, Einzelpreis, MwSt., Gesamt are right-aligned)
  const C_D = ML;           // description — left-aligned
  const C_Q = ML + 308;     // Menge     right edge
  const C_P = ML + 393;     // Einzelpreis right edge
  const C_T = ML + 448;     // MwSt.     right edge
  const C_A = MR;           // Gesamt    right edge

  // Column headers
  const hY = y - 2;
  page.drawText('LEISTUNG', { x: C_D, y: hY, size: 7.5, font: B, color: MID });
  right(page, 'MENGE',        C_Q,     hY, 7.5, B, MID);
  right(page, 'EINZELPREIS',  C_P,     hY, 7.5, B, MID);
  right(page, 'MWST.',        C_T,     hY, 7.5, B, MID);
  right(page, 'GESAMT',       C_A,     hY, 7.5, B, MID);

  y -= 17;
  rule(page, ML, MR, y, 0.75);   // header bottom border

  // Rows
  const items  = doc.items || [];

  for (let idx = 0; idx < items.length; idx++) {
    const item    = items[idx];
    const amt     = Number(item.quantity) * Number(item.unit_price);
    const taxRate = isKlein ? 0 : (item.tax_rate || 0);

    // Determine display title and optional description
    const displayTitle = item.title || item.description || '';
    const displayDesc  = item.title ? (item.description || '') : '';
    const hasDesc      = displayDesc.trim().length > 0;
    const ROW_H        = hasDesc ? 36 : 24;

    // Subtle alternate-row tint
    if (idx % 2 === 1) {
      page.drawRectangle({ x: ML, y: y - ROW_H + 5, width: CW, height: ROW_H, color: FAINT });
    }

    // Vertical center for numeric columns
    const numY = hasDesc ? y - 15 : y - 11;

    // Title — bold
    const titleY = hasDesc ? y - 9 : y - 11;
    page.drawText(trunc(displayTitle, 42), { x: C_D, y: titleY, size: 9, font: B, color: BODY });

    // Optional description line — smaller, gray
    if (hasDesc) {
      page.drawText(trunc(displayDesc, 56), { x: C_D, y: titleY - 11, size: 7.5, font: R, color: MID });
    }

    right(page, String(item.quantity),              C_Q, numY, 9, R, MID);
    right(page, fmtCur(item.unit_price),            C_P, numY, 9, R, BODY);
    right(page, isKlein ? '0 %' : `${taxRate} %`,  C_T, numY, 9, R, MID);
    right(page, fmtCur(amt),                        C_A, numY, 9, B, BODY);

    rule(page, ML, MR, y - ROW_H + 5, 0.3);
    y -= ROW_H;
  }

  // ── SECTION 5 · TOTALS ────────────────────────────────────────────────────
  // Right-aligned sub-rows then a visually emphasised Gesamtbetrag box.

  y -= 18;

  const subtotal = Number(doc.subtotal)  || 0;
  const taxTotal = isKlein ? 0 : (Number(doc.tax_total) || 0);
  const total    = subtotal + taxTotal;

  const TL = MR - 200;   // totals block left edge
  const TV = MR;         // value right edge

  const subRow = (label, value) => {
    page.drawText(label, { x: TL, y, size: 9, font: R, color: MID });
    right(page, value, TV, y, 9, R, BODY);
    y -= 18;
  };

  subRow('Zwischensumme', fmtCur(subtotal));
  if (!isKlein) subRow('Umsatzsteuer', fmtCur(taxTotal));

  y += 4;
  rule(page, TL - 14, MR, y, 1.0, INK);   // thick top border before total
  y -= 14;

  // Gesamtbetrag — no background, bold dark type
  page.drawText('GESAMTBETRAG', { x: TL - 14, y, size: 9, font: B, color: INK });
  right(page, fmtCur(total), MR, y, 13, B, INK);

  y -= 10;
  rule(page, TL - 14, MR, y, 0.5);        // thin bottom border after total
  y -= 14;

  // ── SECTION 6 · NOTES ────────────────────────────────────────────────────
  // §19 UStG notice (if Kleinunternehmer) + optional free-text notes.

  if (isKlein) {
    y -= 20;
    page.drawText('Hinweis zur Umsatzsteuer', { x: ML, y, size: 8.5, font: B, color: BODY });
    y -= 13;
    page.drawText(
      'Kein Umsatzsteuerausweis gemäß §19 UStG (Kleinunternehmerregelung).',
      { x: ML, y, size: 8.5, font: R, color: MID }
    );
    y -= 14;
  }

  if (isReverseCharge) {
    y -= 20;
    page.drawText('Steuerschuldnerschaft des Leistungsempfängers', { x: ML, y, size: 8.5, font: B, color: BODY });
    y -= 13;
    const rcLines = [
      'Die Steuerschuldnerschaft geht auf den Leistungsempfänger über (Reverse Charge,',
      '§13b UStG). Der Leistungsempfänger hat die Umsatzsteuer zu erklären und abzuführen.',
    ];
    for (const line of rcLines) {
      page.drawText(line, { x: ML, y, size: 8.5, font: R, color: MID });
      y -= 12;
    }
    y -= 4;
  }

  if (doc.notes) {
    y -= 20;
    rule(page, ML, MR, y + 12, 0.5);
    page.drawText('Hinweise', { x: ML, y, size: 9, font: B, color: BODY });
    y -= 13;
    for (const line of wrapText(doc.notes, 92)) {
      page.drawText(line, { x: ML, y, size: 8.5, font: R, color: MID });
      y -= 12;
    }
  }

  // ── SECTION 7 · FOOTER ────────────────────────────────────────────────────
  // Thin top border, faint background, three columns.

  const FH  = 70;
  const FLH = 10.5;   // footer line height
  const FS  = 7.5;    // footer font size
  const FY  = FH - 18;

  page.drawRectangle({ x: 0, y: 0, width, height: FH, color: FAINT });
  rule(page, 0, width, FH, 0.5);

  const F1 = ML;
  const F2 = ML + Math.round(CW / 3);
  const F3 = ML + Math.round((2 * CW) / 3);

  // Col 1 — Company
  const fc1 = [
    trunc(settings?.company_name || '', 28),
    [
      settings?.address,
      [settings?.postal_code, settings?.city].filter(Boolean).join(' '),
    ].filter(Boolean).join(', '),
    settings?.country || '',
  ].filter(Boolean);

  fc1.forEach((line, i) =>
    page.drawText(line, { x: F1, y: FY - i * FLH, size: FS, font: i === 0 ? B : R, color: MID })
  );

  // Col 2 — Bank
  const fc2 = [
    settings?.bank_name || '',
    settings?.iban ? `IBAN: ${settings.iban}` : '',
    settings?.bic  ? `BIC: ${settings.bic}`   : '',
  ].filter(Boolean);

  fc2.forEach((line, i) =>
    page.drawText(line, { x: F2, y: FY - i * FLH, size: FS, font: R, color: MID })
  );

  // Col 3 — Contact
  const fc3 = [
    settings?.email   || '',
    settings?.phone   || '',
    settings?.website || '',
  ].filter(Boolean);

  fc3.forEach((line, i) =>
    page.drawText(line, { x: F3, y: FY - i * FLH, size: FS, font: R, color: MID })
  );

  // Legal line for GmbH / UG / AG
  const lf = settings?.legal_form || '';
  if (['GmbH', 'UG (haftungsbeschränkt)', 'AG'].some(f => lf.includes(f))) {
    const lp = [
      settings?.geschaeftsfuehrer ? `Geschäftsführer: ${settings.geschaeftsfuehrer}` : '',
      settings?.handelsregister   ? `HRB: ${settings.handelsregister}`               : '',
      settings?.registergericht   ? `Registergericht: ${settings.registergericht}`   : '',
    ].filter(Boolean);
    if (lp.length) {
      page.drawText(trunc(lp.join('  ·  '), 95), {
        x: ML, y: 10, size: 6.5, font: R, color: RULE,
      });
    }
  }

  return pdfDoc.save();
}

// ── EXPORTS ───────────────────────────────────────────────────────────────────

async function generateInvoicePDF(invoice, settings) {
  return generateDocumentPDF(invoice, settings, 'invoice');
}

module.exports = { generateInvoicePDF, generateDocumentPDF };
