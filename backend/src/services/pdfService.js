const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');

// ── COLOUR PALETTE ────────────────────────────────────────────────────────────

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
  if (!text) return [];
  const result = [];
  for (const paragraph of text.split('\n')) {
    if (!paragraph.trim()) { result.push(''); continue; }
    const words = paragraph.split(' ');
    let cur = '';
    for (const w of words) {
      const test = cur ? `${cur} ${w}` : w;
      if (test.length <= max) { cur = test; }
      else { if (cur) result.push(cur); cur = w; }
    }
    if (cur) result.push(cur);
  }
  return result;
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
  const B = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const R = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const PW = 595, PH = 842; // A4
  const ML = 55;             // left margin
  const MR = 540;            // right edge
  const CW = MR - ML;        // content width 485 px

  const isInvoice    = type === 'invoice';
  const isKlein      = settings?.kleinunternehmer === 1 || settings?.kleinunternehmer === true;
  const isReverseCharge = doc.reverse_charge === 1 || doc.reverse_charge === true;
  const invoiceType  = doc.invoice_type || 'standard';
  const accent       = hexToRgb(settings?.primary_color || '#111827');

  // ── Column positions (wider spacing to prevent overlap) ───────────────────
  const C_D = ML;        // description — left-aligned
  const C_Q = 320;       // Menge     right edge
  const C_P = 400;       // Einzelpreis right edge
  const C_T = 468;       // MwSt.     right edge
  const C_A = MR;        // Gesamt    right edge

  const TITLE_WRAP = 44; // chars per line for title (9pt Bold)
  const DESC_WRAP  = 60; // chars per line for description (7.5pt Regular)

  // ── Footer / page-break thresholds ────────────────────────────────────────
  const FH     = 70;      // footer height
  const BOTTOM = FH + 25; // content must not descend below this y

  let page, y;

  // ── Draw footer on any page ───────────────────────────────────────────────
  function drawFooter(p) {
    const FLH = 10.5, FS = 7.5, FY = FH - 18;

    p.drawRectangle({ x: 0, y: 0, width: PW, height: FH, color: FAINT });
    rule(p, 0, PW, FH, 0.5);

    const F1 = ML;
    const F2 = ML + Math.round(CW / 3);
    const F3 = ML + Math.round((2 * CW) / 3);

    // Col 1 — Company
    [
      trunc(settings?.company_name || '', 28),
      [settings?.address, [settings?.postal_code, settings?.city].filter(Boolean).join(' ')].filter(Boolean).join(', '),
      settings?.country || '',
    ].filter(Boolean).forEach((line, i) =>
      p.drawText(line, { x: F1, y: FY - i * FLH, size: FS, font: i === 0 ? B : R, color: MID })
    );

    // Col 2 — Bank
    [
      settings?.bank_name || '',
      settings?.iban ? `IBAN: ${settings.iban}` : '',
      settings?.bic  ? `BIC: ${settings.bic}`   : '',
    ].filter(Boolean).forEach((line, i) =>
      p.drawText(line, { x: F2, y: FY - i * FLH, size: FS, font: R, color: MID })
    );

    // Col 3 — Contact
    [
      settings?.email   || '',
      settings?.phone   || '',
      settings?.website || '',
    ].filter(Boolean).forEach((line, i) =>
      p.drawText(line, { x: F3, y: FY - i * FLH, size: FS, font: R, color: MID })
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
        p.drawText(trunc(lp.join('  ·  '), 95), { x: ML, y: 10, size: 6.5, font: R, color: RULE });
      }
    }
  }

  // ── Create a fresh page (footer pre-drawn) ───────────────────────────────
  function createPage() {
    page = pdfDoc.addPage([PW, PH]);
    drawFooter(page);
    return page;
  }

  // ── Does the next chunk fit on the current page? ──────────────────────────
  function needsBreak(needed) {
    return y - needed < BOTTOM;
  }

  // ── Draw table column headers ─────────────────────────────────────────────
  function drawTableHeaders() {
    const hY = y - 2;
    page.drawText('LEISTUNG',    { x: C_D, y: hY, size: 7.5, font: B, color: MID });
    right(page, 'MENGE',         C_Q, hY, 7.5, B, MID);
    right(page, 'EINZELPREIS',   C_P, hY, 7.5, B, MID);
    right(page, 'MWST.',         C_T, hY, 7.5, B, MID);
    right(page, 'GESAMT',        C_A, hY, 7.5, B, MID);
    y -= 17;
    rule(page, ML, MR, y, 0.75);
  }

  // ── Page break inside item table (with Übertrag) ──────────────────────────
  function tablePageBreak(runningTotal) {
    // Übertrag line at bottom of current page
    y -= 4;
    rule(page, ML, MR, y, 0.75);
    y -= 16;
    page.drawText('Übertrag', { x: C_D, y, size: 9, font: B, color: MID });
    right(page, fmtCur(runningTotal), C_A, y, 9, B, BODY);

    // New page
    createPage();
    y = PH - 40;
    drawTableHeaders();

    // Übertrag line at top of new page
    const ubH = 22;
    const ubY = y - 12;
    page.drawText('Übertrag', { x: C_D, y: ubY, size: 9, font: B, color: MID });
    right(page, fmtCur(runningTotal), C_A, ubY, 9, B, BODY);
    y -= ubH;
    rule(page, ML, MR, y, 0.75);
  }

  // ── Generic page break (for totals / notes sections) ─────────────────────
  function sectionPageBreak() {
    createPage();
    y = PH - 40;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  PAGE 1 — Header, title, meta, addresses
  // ═══════════════════════════════════════════════════════════════════════════

  createPage();
  y = PH;

  // ── SECTION 1 · HEADER ────────────────────────────────────────────────────

  let headerH = 0;

  if (settings?.logo_base64) {
    try {
      const [meta, b64] = settings.logo_base64.split(',');
      const bytes = Buffer.from(b64, 'base64');
      const img   = meta.includes('png')
        ? await pdfDoc.embedPng(bytes)
        : await pdfDoc.embedJpg(bytes);
      const dims  = img.scaleToFit(150, 52);
      page.drawImage(img, { x: ML, y: PH - 18 - dims.height, width: dims.width, height: dims.height });
      headerH = dims.height + 18;
    } catch { /* skip broken image */ }
  }

  if (!headerH) {
    page.drawText(trunc(settings?.company_name || 'Unternehmen', 34), {
      x: ML, y: PH - 44, size: 20, font: B, color: INK,
    });
    if (settings?.legal_form) {
      page.drawText(settings.legal_form, {
        x: ML, y: PH - 60, size: 8, font: R, color: MID,
      });
    }
    headerH = 64;
  }

  // ── SECTION 2 · DOCUMENT TITLE + META ────────────────────────────────────

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

  y = PH - headerH - 30;

  page.drawText(docTitle, { x: ML, y, size: 32, font: B, color: INK });
  page.drawText(docNumber, { x: ML + 2, y: y - 24, size: 10, font: R, color: MID });

  let mY = y + 4;
  for (const [label, value] of metaFields) {
    right(page, label.toUpperCase(), MR, mY,      6.5, B, MID);
    right(page, value,               MR, mY - 14, 10,  B, INK);
    mY -= 32;
  }

  const titleBottom = y - 42;
  const metaBottom  = mY + 32 - 14 - 10;
  y = Math.min(titleBottom, metaBottom) - 18;

  rule(page, ML, MR, y, 0.75);

  // ── SECTION 3 · ADDRESS BLOCK ─────────────────────────────────────────────

  y -= 22;
  const addrY = y;
  const COL2  = ML + Math.round(CW / 2) + 8;

  page.drawText('ABSENDER',  { x: ML,   y: addrY, size: 7, font: B, color: MID });
  page.drawText('EMPFÄNGER', { x: COL2, y: addrY, size: 7, font: B, color: MID });

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

  // ═══════════════════════════════════════════════════════════════════════════
  //  SECTION 4 · ITEM TABLE — with word-wrap + multi-page + Übertrag
  // ═══════════════════════════════════════════════════════════════════════════

  y -= 22;
  drawTableHeaders();

  const items  = doc.items || [];
  const CYCLE_ORDER  = ['once', 'yearly', 'monthly'];
  const CYCLE_LABELS = { once: 'Einmalige Leistungen', yearly: 'Jährliche Kosten', monthly: 'Monatliche Kosten' };
  const hasMixed = items.some(i => (i.billing_cycle || 'once') !== 'once');

  const grouped = hasMixed
    ? CYCLE_ORDER.map(cycle => ({ cycle, rows: items.filter(i => (i.billing_cycle || 'once') === cycle) })).filter(g => g.rows.length > 0)
    : [{ cycle: 'once', rows: items }];

  let rowIdx = 0;
  let runningTotal = 0;

  for (const group of grouped) {
    // Section header (only when mixed billing cycles)
    if (hasMixed) {
      if (needsBreak(30)) tablePageBreak(runningTotal);
      const ghH = 18;
      page.drawRectangle({ x: ML, y: y - ghH + 5, width: CW, height: ghH, color: rgb(0.94, 0.96, 1.0) });
      page.drawText(CYCLE_LABELS[group.cycle] || group.cycle, { x: C_D, y: y - 10, size: 8, font: B, color: rgb(0.0, 0.44, 0.89) });
      y -= ghH;
    }

    for (const item of group.rows) {
      const amt     = Number(item.quantity) * Number(item.unit_price);
      const taxRate = isKlein ? 0 : (item.tax_rate || 0);

      const displayTitle = item.title || item.description || '';
      const displayDesc  = item.title ? (item.description || '') : '';

      // ── Wrap text instead of truncating ──────────────────────────────────
      const titleLines = wrapText(displayTitle, TITLE_WRAP);
      const descLines  = displayDesc.trim() ? wrapText(displayDesc, DESC_WRAP) : [];
      const hasDesc    = descLines.length > 0;

      // Dynamic row height based on actual wrapped lines
      const titleH  = titleLines.length * 12;
      const descH   = hasDesc ? 2 + descLines.length * 10 : 0;
      const ROW_H   = Math.max(titleH + descH + 14, 24);   // 9 top + 5 bottom padding

      // ── Page break if row doesn't fit ────────────────────────────────────
      if (needsBreak(ROW_H + 5)) {
        tablePageBreak(runningTotal);
      }

      // Alternate row tint
      if (rowIdx % 2 === 1) {
        page.drawRectangle({ x: ML, y: y - ROW_H + 5, width: CW, height: ROW_H, color: FAINT });
      }

      // ── Title lines (9pt Bold) ───────────────────────────────────────────
      let ty = y - 9;
      for (const line of titleLines) {
        page.drawText(line, { x: C_D, y: ty, size: 9, font: B, color: BODY });
        ty -= 12;
      }

      // ── Description lines (7.5pt Regular) ────────────────────────────────
      if (hasDesc) {
        ty += 2; // tighten gap slightly
        for (const line of descLines) {
          page.drawText(line, { x: C_D, y: ty, size: 7.5, font: R, color: MID });
          ty -= 10;
        }
      }

      // ── Numeric values (aligned with first title line) ───────────────────
      const numY = y - 9;
      right(page, String(item.quantity),              C_Q, numY, 9, R, MID);
      right(page, fmtCur(item.unit_price),            C_P, numY, 9, R, BODY);
      right(page, isKlein ? '0 %' : `${taxRate} %`,  C_T, numY, 9, R, MID);
      right(page, fmtCur(amt),                        C_A, numY, 9, B, BODY);

      rule(page, ML, MR, y - ROW_H + 5, 0.3);
      y -= ROW_H;
      runningTotal += amt;
      rowIdx++;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  KOSTENÜBERBLICK BOX (only when mixed billing cycles)
  // ═══════════════════════════════════════════════════════════════════════════

  if (hasMixed) {
    const cycleSums = {};
    for (const item of items) {
      const c = item.billing_cycle || 'once';
      cycleSums[c] = (cycleSums[c] || 0) + (Number(item.quantity) * Number(item.unit_price));
    }
    const summaryRows = CYCLE_ORDER.filter(c => cycleSums[c] > 0);
    const boxH = 16 + summaryRows.length * 15;

    if (needsBreak(boxH + 20)) sectionPageBreak();

    y -= 14;
    const BOX_L  = rgb(0.918, 0.953, 1.0);
    const BOX_BL = rgb(0.816, 0.898, 1.0);

    page.drawRectangle({ x: ML, y: y - boxH + 5, width: CW, height: boxH, color: BOX_L, borderColor: BOX_BL, borderWidth: 0.75 });
    page.drawText('KOSTENÜBERBLICK', { x: ML + 10, y: y - 9, size: 7.5, font: B, color: rgb(0.0, 0.44, 0.89) });
    y -= 16;

    const CYCLE_SUFFIX = { once: '', yearly: ' (jährlich)', monthly: ' (monatlich)' };
    for (const c of summaryRows) {
      const label = (CYCLE_LABELS[c] || c) + (CYCLE_SUFFIX[c] || '');
      page.drawText(label, { x: ML + 10, y: y - 8, size: 8, font: R, color: BODY });
      right(page, fmtCur(cycleSums[c]), MR - 10, y - 8, 8, B, BODY);
      y -= 15;
    }
    y -= 8;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  SECTION 5 · TOTALS
  // ═══════════════════════════════════════════════════════════════════════════

  const totalsNeeded = 80 + (isKlein ? 0 : 18);
  if (needsBreak(totalsNeeded)) sectionPageBreak();

  y -= 18;

  const subtotal = Number(doc.subtotal)  || 0;
  const taxTotal = isKlein ? 0 : (Number(doc.tax_total) || 0);
  const total    = subtotal + taxTotal;

  const TL = MR - 200;
  const TV = MR;

  const subRow = (label, value) => {
    page.drawText(label, { x: TL, y, size: 9, font: R, color: MID });
    right(page, value, TV, y, 9, R, BODY);
    y -= 18;
  };

  subRow('Zwischensumme', fmtCur(subtotal));
  if (!isKlein) subRow('Umsatzsteuer', fmtCur(taxTotal));

  y += 4;
  rule(page, TL - 14, MR, y, 1.0, INK);
  y -= 14;

  page.drawText('GESAMTBETRAG', { x: TL - 14, y, size: 9, font: B, color: INK });
  right(page, fmtCur(total), MR, y, 13, B, INK);

  y -= 10;
  rule(page, TL - 14, MR, y, 0.5);
  y -= 14;

  // ═══════════════════════════════════════════════════════════════════════════
  //  SECTION 6 · NOTES
  // ═══════════════════════════════════════════════════════════════════════════

  if (isKlein) {
    if (needsBreak(50)) sectionPageBreak();
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
    if (needsBreak(55)) sectionPageBreak();
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
    const noteLines = wrapText(doc.notes, 92);
    const notesNeeded = 35 + noteLines.length * 12;
    if (needsBreak(notesNeeded)) sectionPageBreak();

    y -= 20;
    rule(page, ML, MR, y + 12, 0.5);
    page.drawText('Hinweise', { x: ML, y, size: 9, font: B, color: BODY });
    y -= 13;
    for (const line of noteLines) {
      if (needsBreak(14)) sectionPageBreak();
      page.drawText(line, { x: ML, y, size: 8.5, font: R, color: MID });
      y -= 12;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  PAGE NUMBERS — added retroactively on every page
  // ═══════════════════════════════════════════════════════════════════════════

  const allPages   = pdfDoc.getPages();
  const totalPages = allPages.length;
  if (totalPages > 1) {
    for (let i = 0; i < totalPages; i++) {
      const p = allPages[i];
      const label = `Seite ${i + 1} von ${totalPages}`;
      right(p, label, MR, FH + 8, 7, R, MID);
    }
  }

  return pdfDoc.save();
}

// ── EXPORTS ───────────────────────────────────────────────────────────────────

async function generateInvoicePDF(invoice, settings) {
  return generateDocumentPDF(invoice, settings, 'invoice');
}

module.exports = { generateInvoicePDF, generateDocumentPDF };
