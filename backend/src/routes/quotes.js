const express = require('express');
const db = require('../db/database');
const authenticate = require('../middleware/auth');
const { generateDocumentPDF } = require('../services/pdfService');

const router = express.Router();
router.use(authenticate);

const VALID_STATUSES = ['draft', 'sent', 'accepted', 'rejected', 'expired', 'converted'];

/** Generate next quote number: AN-2026-0001 */
function generateQuoteNumber(userId, prefix = 'AN') {
  const year = new Date().getFullYear();
  const last = db.prepare(`
    SELECT quote_number FROM quotes
    WHERE user_id = ? AND quote_number LIKE ?
    ORDER BY id DESC LIMIT 1
  `).get(userId, `${prefix}-${year}-%`);

  if (!last) return `${prefix}-${year}-0001`;
  const lastNum = parseInt(last.quote_number.split('-').pop(), 10);
  return `${prefix}-${year}-${String(lastNum + 1).padStart(4, '0')}`;
}

/** Calculate totals from items array */
function calcTotals(items) {
  let subtotal = 0, taxTotal = 0;
  items.forEach(item => {
    const amount = item.quantity * item.unit_price;
    subtotal  += amount;
    taxTotal  += amount * (item.tax_rate / 100);
  });
  return { subtotal, tax_total: taxTotal, total: subtotal + taxTotal };
}

// ── LIST ─────────────────────────────────────────────────────────────────────
router.get('/', (req, res) => {
  const rows = db.prepare(`
    SELECT q.*, c.company_name as client_name, c.email as client_email
    FROM quotes q
    LEFT JOIN clients c ON c.id = q.client_id
    WHERE q.user_id = ?
    ORDER BY q.created_at DESC
  `).all(req.userId);
  res.json(rows);
});

// ── STATS ────────────────────────────────────────────────────────────────────
router.get('/stats', (req, res) => {
  const stats = db.prepare(`
    SELECT
      COUNT(*) as total_count,
      COALESCE(SUM(total), 0) as total_volume,
      COALESCE(SUM(CASE WHEN status='accepted' THEN total ELSE 0 END), 0) as accepted_volume,
      COUNT(CASE WHEN status='draft'     THEN 1 END) as draft_count,
      COUNT(CASE WHEN status='sent'      THEN 1 END) as sent_count,
      COUNT(CASE WHEN status='accepted'  THEN 1 END) as accepted_count,
      COUNT(CASE WHEN status='rejected'  THEN 1 END) as rejected_count,
      COUNT(CASE WHEN status='expired'   THEN 1 END) as expired_count,
      COUNT(CASE WHEN status='converted' THEN 1 END) as converted_count
    FROM quotes WHERE user_id = ?
  `).get(req.userId);
  res.json(stats);
});

// ── SINGLE ───────────────────────────────────────────────────────────────────
router.get('/:id', (req, res) => {
  const quote = db.prepare(`
    SELECT q.*,
           c.company_name as client_name, c.contact_person,
           c.address as client_address, c.city as client_city,
           c.postal_code as client_postal_code, c.country as client_country,
           c.email as client_email, c.phone as client_phone,
           c.vat_id as client_vat_id
    FROM quotes q
    LEFT JOIN clients c ON c.id = q.client_id
    WHERE q.id = ? AND q.user_id = ?
  `).get(req.params.id, req.userId);

  if (!quote) return res.status(404).json({ error: 'Angebot nicht gefunden' });

  const items = db.prepare(
    'SELECT * FROM quote_items WHERE quote_id = ? ORDER BY id ASC'
  ).all(req.params.id);

  res.json({ ...quote, items });
});

// ── CREATE ───────────────────────────────────────────────────────────────────
router.post('/', (req, res) => {
  const { client_id, issue_date, valid_until, notes, items, project_id } = req.body;

  if (!client_id || !issue_date || !valid_until)
    return res.status(400).json({ error: 'client_id, issue_date und valid_until sind erforderlich' });
  if (!items || items.length === 0)
    return res.status(400).json({ error: 'Mindestens eine Position ist erforderlich' });

  const client = db.prepare('SELECT id FROM clients WHERE id = ? AND user_id = ?').get(client_id, req.userId);
  if (!client) return res.status(404).json({ error: 'Kunde nicht gefunden' });

  const settings = db.prepare('SELECT quote_prefix FROM settings WHERE user_id = ?').get(req.userId);
  const prefix   = settings?.quote_prefix || 'AN';
  const number   = generateQuoteNumber(req.userId, prefix);
  const { subtotal, tax_total, total } = calcTotals(items);

  const quoteId = db.transaction(() => {
    const r = db.prepare(`
      INSERT INTO quotes
        (user_id, client_id, quote_number, status, issue_date, valid_until, notes, subtotal, tax_total, total, project_id)
      VALUES (?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?)
    `).run(req.userId, client_id, number, issue_date, valid_until, notes || '', subtotal, tax_total, total, project_id || null);

    const id = r.lastInsertRowid;
    const ins = db.prepare(`
      INSERT INTO quote_items (quote_id, title, description, quantity, unit_price, tax_rate, amount)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    items.forEach(item =>
      ins.run(id, item.title || '', item.description || '', item.quantity, item.unit_price, item.tax_rate || 0, item.quantity * item.unit_price)
    );
    return id;
  })();

  const quote = db.prepare(`
    SELECT q.*, c.company_name as client_name
    FROM quotes q LEFT JOIN clients c ON c.id = q.client_id
    WHERE q.id = ?
  `).get(quoteId);

  res.status(201).json(quote);
});

// ── UPDATE ───────────────────────────────────────────────────────────────────
router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM quotes WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!existing) return res.status(404).json({ error: 'Angebot nicht gefunden' });

  const { client_id, issue_date, valid_until, notes, items, status } = req.body;

  db.transaction(() => {
    if (items && items.length > 0) {
      const { subtotal, tax_total, total } = calcTotals(items);
      db.prepare('DELETE FROM quote_items WHERE quote_id = ?').run(req.params.id);
      const ins = db.prepare(`
        INSERT INTO quote_items (quote_id, title, description, quantity, unit_price, tax_rate, amount)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      items.forEach(item =>
        ins.run(req.params.id, item.title || '', item.description || '', item.quantity, item.unit_price, item.tax_rate || 0, item.quantity * item.unit_price)
      );
      db.prepare(`
        UPDATE quotes SET client_id=?, issue_date=?, valid_until=?, notes=?,
          subtotal=?, tax_total=?, total=?
        WHERE id=? AND user_id=?
      `).run(
        client_id    || existing.client_id,
        issue_date   || existing.issue_date,
        valid_until  || existing.valid_until,
        notes !== undefined ? notes : existing.notes,
        subtotal, tax_total, total,
        req.params.id, req.userId
      );
    }
    if (status && VALID_STATUSES.includes(status)) {
      db.prepare('UPDATE quotes SET status=? WHERE id=? AND user_id=?')
        .run(status, req.params.id, req.userId);
    }
  })();

  const updated = db.prepare(`
    SELECT q.*, c.company_name as client_name
    FROM quotes q LEFT JOIN clients c ON c.id = q.client_id WHERE q.id = ?
  `).get(req.params.id);
  res.json(updated);
});

// ── STATUS ───────────────────────────────────────────────────────────────────
router.patch('/:id/status', (req, res) => {
  const { status } = req.body;
  if (!VALID_STATUSES.includes(status))
    return res.status(400).json({ error: `Status muss einer von: ${VALID_STATUSES.join(', ')} sein` });

  const quote = db.prepare('SELECT id FROM quotes WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!quote) return res.status(404).json({ error: 'Angebot nicht gefunden' });

  db.prepare('UPDATE quotes SET status=? WHERE id=? AND user_id=?')
    .run(status, req.params.id, req.userId);

  res.json(db.prepare('SELECT * FROM quotes WHERE id = ?').get(req.params.id));
});

// ── CONVERT TO INVOICE ────────────────────────────────────────────────────────
router.post('/:id/convert', (req, res) => {
  const quote = db.prepare(`
    SELECT q.*,
           c.company_name as client_name
    FROM quotes q
    LEFT JOIN clients c ON c.id = q.client_id
    WHERE q.id = ? AND q.user_id = ?
  `).get(req.params.id, req.userId);

  if (!quote) return res.status(404).json({ error: 'Angebot nicht gefunden' });
  if (quote.status === 'converted')
    return res.status(409).json({ error: 'Angebot wurde bereits umgewandelt' });

  const items = db.prepare('SELECT * FROM quote_items WHERE quote_id = ? ORDER BY id ASC').all(req.params.id);
  const settings = db.prepare('SELECT invoice_prefix FROM settings WHERE user_id = ?').get(req.userId);
  const prefix   = settings?.invoice_prefix || 'RE';

  // Generate invoice number (reuse logic)
  const year = new Date().getFullYear();
  const lastInv = db.prepare(`
    SELECT invoice_number FROM invoices
    WHERE user_id = ? AND invoice_number LIKE ?
    ORDER BY id DESC LIMIT 1
  `).get(req.userId, `${prefix}-${year}-%`);
  const lastNum  = lastInv ? parseInt(lastInv.invoice_number.split('-').pop(), 10) : 0;
  const invoiceNumber = `${prefix}-${year}-${String(lastNum + 1).padStart(4, '0')}`;

  const today     = new Date().toISOString().split('T')[0];
  const dueDate   = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

  const invoiceId = db.transaction(() => {
    const r = db.prepare(`
      INSERT INTO invoices
        (user_id, client_id, invoice_number, status, issue_date, due_date, notes, subtotal, tax_total, total)
      VALUES (?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?)
    `).run(req.userId, quote.client_id, invoiceNumber, today, dueDate, quote.notes || '', quote.subtotal, quote.tax_total, quote.total);

    const id = r.lastInsertRowid;
    const ins = db.prepare(`
      INSERT INTO invoice_items (invoice_id, title, description, quantity, unit_price, tax_rate, amount)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    items.forEach(item =>
      ins.run(id, item.title || '', item.description || '', item.quantity, item.unit_price, item.tax_rate || 0, item.amount)
    );

    // Mark quote as converted, store reference
    db.prepare('UPDATE quotes SET status=?, converted_invoice_id=? WHERE id=?')
      .run('converted', id, req.params.id);

    return id;
  })();

  const invoice = db.prepare(`
    SELECT i.*, c.company_name as client_name
    FROM invoices i LEFT JOIN clients c ON c.id = i.client_id
    WHERE i.id = ?
  `).get(invoiceId);

  res.status(201).json({ invoice, quote_id: parseInt(req.params.id) });
});

// ── DELETE ───────────────────────────────────────────────────────────────────
router.delete('/:id', (req, res) => {
  const quote = db.prepare('SELECT id FROM quotes WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!quote) return res.status(404).json({ error: 'Angebot nicht gefunden' });
  db.prepare('DELETE FROM quotes WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  res.json({ success: true });
});

// ── PDF ───────────────────────────────────────────────────────────────────────
router.get('/:id/pdf', async (req, res) => {
  const quote = db.prepare(`
    SELECT q.*, c.company_name as client_name, c.contact_person,
           c.address as client_address, c.city as client_city,
           c.postal_code as client_postal_code, c.country as client_country,
           c.email as client_email, c.phone as client_phone, c.vat_id as client_vat_id
    FROM quotes q LEFT JOIN clients c ON c.id = q.client_id
    WHERE q.id = ? AND q.user_id = ?
  `).get(req.params.id, req.userId);

  if (!quote) return res.status(404).json({ error: 'Angebot nicht gefunden' });

  const items    = db.prepare('SELECT * FROM quote_items WHERE quote_id = ? ORDER BY id ASC').all(req.params.id);
  const settings = db.prepare('SELECT * FROM settings WHERE user_id = ?').get(req.userId);

  try {
    const pdfBytes = await generateDocumentPDF({ ...quote, items }, settings, 'quote');
    res.set({
      'Content-Type':        'application/pdf',
      'Content-Disposition': `attachment; filename="${quote.quote_number}.pdf"`,
      'Content-Length':      pdfBytes.length,
    });
    res.send(Buffer.from(pdfBytes));
  } catch (err) {
    console.error('PDF-Fehler:', err);
    res.status(500).json({ error: 'PDF konnte nicht generiert werden' });
  }
});

module.exports = router;
