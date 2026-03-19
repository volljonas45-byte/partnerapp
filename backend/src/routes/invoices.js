const express = require('express');
const db = require('../db/database');
const authenticate = require('../middleware/auth');
const { generateInvoicePDF } = require('../services/pdfService');

const router = express.Router();
router.use(authenticate);

const VALID_STATUSES = ['draft', 'sent', 'paid', 'overdue', 'cancelled'];

/** Generate next invoice number */
function generateInvoiceNumber(userId, prefix = 'RE') {
  const year = new Date().getFullYear();
  const last = db.prepare(`
    SELECT invoice_number FROM invoices
    WHERE user_id = ? AND invoice_number LIKE ?
    ORDER BY id DESC LIMIT 1
  `).get(userId, `${prefix}-${year}-%`);

  if (!last) return `${prefix}-${year}-0001`;
  const lastNum = parseInt(last.invoice_number.split('-').pop(), 10);
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

/** Get full invoice with items and client info */
function getFullInvoice(id) {
  const invoice = db.prepare(`
    SELECT i.*, c.company_name as client_name, c.contact_person,
           c.address as client_address, c.city as client_city,
           c.postal_code as client_postal_code, c.country as client_country,
           c.email as client_email, c.phone as client_phone,
           c.vat_id as client_vat_id
    FROM invoices i
    LEFT JOIN clients c ON c.id = i.client_id
    WHERE i.id = ?
  `).get(id);
  if (!invoice) return null;
  const items = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY id ASC').all(id);
  return { ...invoice, items };
}

/** Record a history snapshot */
function recordHistory(userId, documentId, invoice) {
  const last = db.prepare(
    'SELECT MAX(version) as v FROM document_history WHERE document_id = ? AND document_type = ?'
  ).get(documentId, 'invoice');
  const version = (last?.v || 0) + 1;
  db.prepare(`
    INSERT INTO document_history (user_id, document_type, document_id, version, snapshot)
    VALUES (?, 'invoice', ?, ?, ?)
  `).run(userId, documentId, version, JSON.stringify(invoice));
}

/** Compute paid amount from payments table */
function getPaidAmount(invoiceId) {
  const row = db.prepare('SELECT COALESCE(SUM(amount), 0) as paid FROM invoice_payments WHERE invoice_id = ?').get(invoiceId);
  return row?.paid || 0;
}

// ── LIST ─────────────────────────────────────────────────────────────────────
router.get('/', (req, res) => {
  const rows = db.prepare(`
    SELECT i.*, c.company_name as client_name, c.email as client_email,
           COALESCE((SELECT SUM(amount) FROM invoice_payments WHERE invoice_id = i.id), 0) as paid_amount
    FROM invoices i
    LEFT JOIN clients c ON c.id = i.client_id
    WHERE i.user_id = ?
    ORDER BY i.created_at DESC
  `).all(req.userId);
  res.json(rows);
});

// ── STATS ────────────────────────────────────────────────────────────────────
router.get('/stats', (req, res) => {
  const now   = new Date();
  const year  = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');

  const stats = db.prepare(`
    SELECT
      COUNT(*) as total_count,
      COALESCE(SUM(total), 0) as total_revenue,
      COALESCE(AVG(total), 0) as avg_invoice_value,
      COALESCE(SUM(CASE WHEN status='paid' THEN total ELSE 0 END), 0) as paid_revenue,
      COALESCE(SUM(CASE WHEN status IN('sent','unpaid') THEN total ELSE 0 END), 0) as unpaid_revenue,
      COALESCE(SUM(CASE WHEN status='overdue' THEN total ELSE 0 END), 0) as overdue_revenue,
      COALESCE(SUM(CASE WHEN status='paid' AND issue_date LIKE ? THEN total ELSE 0 END), 0) as revenue_this_month,
      COALESCE(SUM(CASE WHEN status='paid' AND issue_date LIKE ? THEN total ELSE 0 END), 0) as revenue_this_year,
      COUNT(CASE WHEN status='draft'     THEN 1 END) as draft_count,
      COUNT(CASE WHEN status='sent'      THEN 1 END) as sent_count,
      COUNT(CASE WHEN status='paid'      THEN 1 END) as paid_count,
      COUNT(CASE WHEN status='overdue'   THEN 1 END) as overdue_count,
      COUNT(CASE WHEN status='cancelled' THEN 1 END) as cancelled_count,
      COUNT(CASE WHEN status IN('sent','unpaid') THEN 1 END) as unpaid_count
    FROM invoices WHERE user_id = ?
  `).get(`${year}-${month}%`, `${year}%`, req.userId);

  res.json(stats);
});

// ── REVENUE CHART ────────────────────────────────────────────────────────────
router.get('/revenue-chart', (req, res) => {
  const rows = db.prepare(`
    SELECT
      strftime('%Y-%m', issue_date) as month,
      COALESCE(SUM(CASE WHEN status='paid' THEN total ELSE 0 END), 0) as revenue,
      COUNT(*) as count
    FROM invoices
    WHERE user_id = ? AND issue_date >= date('now', '-11 months', 'start of month')
    GROUP BY month ORDER BY month ASC
  `).all(req.userId);

  const result = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const key   = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const found = rows.find(r => r.month === key);
    result.push({
      month:   key,
      label:   d.toLocaleDateString('de-DE', { month: 'short', year: '2-digit' }),
      revenue: found?.revenue ?? 0,
      count:   found?.count   ?? 0,
    });
  }
  res.json(result);
});

// ── SINGLE ───────────────────────────────────────────────────────────────────
router.get('/:id', (req, res) => {
  const invoice = db.prepare(`
    SELECT i.*,
           c.company_name as client_name, c.contact_person,
           c.address as client_address, c.city as client_city,
           c.postal_code as client_postal_code, c.country as client_country,
           c.email as client_email, c.phone as client_phone,
           c.vat_id as client_vat_id
    FROM invoices i
    LEFT JOIN clients c ON c.id = i.client_id
    WHERE i.id = ? AND i.user_id = ?
  `).get(req.params.id, req.userId);

  if (!invoice) return res.status(404).json({ error: 'Rechnung nicht gefunden' });

  const items    = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY id ASC').all(req.params.id);
  const payments = db.prepare('SELECT * FROM invoice_payments WHERE invoice_id = ? ORDER BY payment_date ASC').all(req.params.id);
  const paid_amount = payments.reduce((s, p) => s + p.amount, 0);

  res.json({ ...invoice, items, payments, paid_amount });
});

// ── CREATE ───────────────────────────────────────────────────────────────────
router.post('/', (req, res) => {
  const {
    client_id, issue_date, due_date, leistungsdatum,
    leistungszeitraum_von, leistungszeitraum_bis,
    notes, items, invoice_type = 'standard', reverse_charge = 0,
    project_id,
  } = req.body;

  if (!client_id || !issue_date || !due_date)
    return res.status(400).json({ error: 'client_id, issue_date und due_date sind erforderlich' });
  if (!items || items.length === 0)
    return res.status(400).json({ error: 'Mindestens eine Position ist erforderlich' });

  const client = db.prepare('SELECT id FROM clients WHERE id = ? AND user_id = ?').get(client_id, req.userId);
  if (!client) return res.status(404).json({ error: 'Kunde nicht gefunden' });

  const settings = db.prepare('SELECT invoice_prefix FROM settings WHERE user_id = ?').get(req.userId);
  const prefix   = settings?.invoice_prefix || 'RE';
  const number   = generateInvoiceNumber(req.userId, prefix);
  const { subtotal, tax_total, total } = calcTotals(items);

  const invoiceId = db.transaction(() => {
    const r = db.prepare(`
      INSERT INTO invoices
        (user_id, client_id, invoice_number, status, issue_date, due_date, leistungsdatum,
         leistungszeitraum_von, leistungszeitraum_bis, notes, invoice_type, reverse_charge,
         subtotal, tax_total, total, project_id)
      VALUES (?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      req.userId, client_id, number, issue_date, due_date,
      leistungsdatum || null, leistungszeitraum_von || null, leistungszeitraum_bis || null,
      notes || '', invoice_type, reverse_charge ? 1 : 0,
      subtotal, tax_total, total, project_id || null,
    );

    const id = r.lastInsertRowid;
    const ins = db.prepare(`
      INSERT INTO invoice_items (invoice_id, title, description, quantity, unit_price, tax_rate, amount)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    items.forEach(item =>
      ins.run(id, item.title || '', item.description || '', item.quantity, item.unit_price, item.tax_rate || 0, item.quantity * item.unit_price)
    );
    return id;
  })();

  const invoice = db.prepare(`
    SELECT i.*, c.company_name as client_name
    FROM invoices i LEFT JOIN clients c ON c.id = i.client_id
    WHERE i.id = ?
  `).get(invoiceId);

  res.status(201).json(invoice);
});

// ── UPDATE ───────────────────────────────────────────────────────────────────
router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM invoices WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!existing) return res.status(404).json({ error: 'Rechnung nicht gefunden' });

  const {
    client_id, issue_date, due_date, leistungsdatum,
    leistungszeitraum_von, leistungszeitraum_bis,
    notes, items, status, payment_date, invoice_type, reverse_charge,
  } = req.body;

  db.transaction(() => {
    if (items && items.length > 0) {
      const { subtotal, tax_total, total } = calcTotals(items);
      db.prepare('DELETE FROM invoice_items WHERE invoice_id = ?').run(req.params.id);
      const ins = db.prepare(`
        INSERT INTO invoice_items (invoice_id, title, description, quantity, unit_price, tax_rate, amount)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      items.forEach(item =>
        ins.run(req.params.id, item.title || '', item.description || '', item.quantity, item.unit_price, item.tax_rate || 0, item.quantity * item.unit_price)
      );
      db.prepare(`
        UPDATE invoices SET client_id=?, issue_date=?, due_date=?, leistungsdatum=?,
          leistungszeitraum_von=?, leistungszeitraum_bis=?, notes=?,
          invoice_type=?, reverse_charge=?,
          subtotal=?, tax_total=?, total=?
        WHERE id=? AND user_id=?
      `).run(
        client_id                !== undefined ? client_id        : existing.client_id,
        issue_date               || existing.issue_date,
        due_date                 || existing.due_date,
        leistungsdatum           !== undefined ? leistungsdatum           : existing.leistungsdatum,
        leistungszeitraum_von    !== undefined ? leistungszeitraum_von    : existing.leistungszeitraum_von,
        leistungszeitraum_bis    !== undefined ? leistungszeitraum_bis    : existing.leistungszeitraum_bis,
        notes                    !== undefined ? notes                    : existing.notes,
        invoice_type             || existing.invoice_type || 'standard',
        reverse_charge           !== undefined ? (reverse_charge ? 1 : 0) : existing.reverse_charge,
        subtotal, tax_total, total,
        req.params.id, req.userId,
      );
    }
    if (status && VALID_STATUSES.includes(status)) {
      db.prepare('UPDATE invoices SET status=?, payment_date=? WHERE id=? AND user_id=?')
        .run(status, payment_date || null, req.params.id, req.userId);
    }
  })();

  // Record history snapshot
  const updated = db.prepare(`
    SELECT i.*, c.company_name as client_name
    FROM invoices i LEFT JOIN clients c ON c.id = i.client_id WHERE i.id = ?
  `).get(req.params.id);
  const updatedItems = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?').all(req.params.id);
  recordHistory(req.userId, req.params.id, { ...updated, items: updatedItems });

  res.json(updated);
});

// ── STATUS ───────────────────────────────────────────────────────────────────
router.patch('/:id/status', (req, res) => {
  const { status, payment_date } = req.body;
  if (!VALID_STATUSES.includes(status))
    return res.status(400).json({ error: `Status muss einer von: ${VALID_STATUSES.join(', ')} sein` });

  const invoice = db.prepare('SELECT id FROM invoices WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!invoice) return res.status(404).json({ error: 'Rechnung nicht gefunden' });

  const pd = status === 'paid' ? (payment_date || new Date().toISOString().split('T')[0]) : null;
  db.prepare('UPDATE invoices SET status=?, payment_date=? WHERE id=? AND user_id=?')
    .run(status, pd, req.params.id, req.userId);

  res.json(db.prepare('SELECT * FROM invoices WHERE id = ?').get(req.params.id));
});

// ── DUPLICATE ─────────────────────────────────────────────────────────────────
router.post('/:id/duplicate', (req, res) => {
  const original = getFullInvoice(req.params.id);
  if (!original || original.user_id !== req.userId)
    return res.status(404).json({ error: 'Rechnung nicht gefunden' });

  const settings = db.prepare('SELECT invoice_prefix FROM settings WHERE user_id = ?').get(req.userId);
  const prefix   = settings?.invoice_prefix || 'RE';
  const number   = generateInvoiceNumber(req.userId, prefix);
  const today    = new Date().toISOString().split('T')[0];
  const dueDate  = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

  const newId = db.transaction(() => {
    const r = db.prepare(`
      INSERT INTO invoices
        (user_id, client_id, invoice_number, status, issue_date, due_date, leistungsdatum,
         leistungszeitraum_von, leistungszeitraum_bis, notes, invoice_type, reverse_charge,
         subtotal, tax_total, total)
      VALUES (?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      req.userId, original.client_id, number, today, dueDate,
      original.leistungsdatum || null,
      original.leistungszeitraum_von || null,
      original.leistungszeitraum_bis || null,
      original.notes || '',
      original.invoice_type || 'standard',
      original.reverse_charge || 0,
      original.subtotal, original.tax_total, original.total,
    );

    const id = r.lastInsertRowid;
    const ins = db.prepare(`
      INSERT INTO invoice_items (invoice_id, title, description, quantity, unit_price, tax_rate, amount)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    original.items.forEach(item =>
      ins.run(id, item.title || '', item.description || '', item.quantity, item.unit_price, item.tax_rate || 0, item.amount)
    );
    return id;
  })();

  const invoice = db.prepare(`
    SELECT i.*, c.company_name as client_name
    FROM invoices i LEFT JOIN clients c ON c.id = i.client_id WHERE i.id = ?
  `).get(newId);

  res.status(201).json(invoice);
});

// ── STORNO ────────────────────────────────────────────────────────────────────
router.post('/:id/storno', (req, res) => {
  const original = getFullInvoice(req.params.id);
  if (!original || original.user_id !== req.userId)
    return res.status(404).json({ error: 'Rechnung nicht gefunden' });
  if (original.storno_of_id)
    return res.status(409).json({ error: 'Stornorechnung kann nicht erneut storniert werden' });

  const settings  = db.prepare('SELECT storno_prefix, invoice_prefix FROM settings WHERE user_id = ?').get(req.userId);
  const prefix    = settings?.storno_prefix || 'ST';
  const number    = generateInvoiceNumber(req.userId, prefix);
  const today     = new Date().toISOString().split('T')[0];

  const stornoId = db.transaction(() => {
    // Create storno invoice (negative amounts)
    const r = db.prepare(`
      INSERT INTO invoices
        (user_id, client_id, invoice_number, status, issue_date, due_date, notes,
         invoice_type, reverse_charge, subtotal, tax_total, total, storno_of_id)
      VALUES (?, ?, ?, 'cancelled', ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      req.userId, original.client_id, number, today, today,
      `Stornorechnung zu ${original.invoice_number}`,
      original.invoice_type || 'standard',
      original.reverse_charge || 0,
      -(original.subtotal), -(original.tax_total), -(original.total),
      original.id,
    );

    const id = r.lastInsertRowid;
    const ins = db.prepare(`
      INSERT INTO invoice_items (invoice_id, title, description, quantity, unit_price, tax_rate, amount)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    original.items.forEach(item =>
      ins.run(id, item.title || '', item.description || '', item.quantity, -(item.unit_price), item.tax_rate || 0, -(item.amount))
    );

    // Mark original as cancelled
    db.prepare("UPDATE invoices SET status='cancelled' WHERE id=? AND user_id=?").run(original.id, req.userId);

    return id;
  })();

  const stornoInvoice = db.prepare(`
    SELECT i.*, c.company_name as client_name
    FROM invoices i LEFT JOIN clients c ON c.id = i.client_id WHERE i.id = ?
  `).get(stornoId);

  res.status(201).json({ storno_invoice: stornoInvoice, original_id: original.id });
});

// ── PAYMENTS ─────────────────────────────────────────────────────────────────
router.get('/:id/payments', (req, res) => {
  const invoice = db.prepare('SELECT id, user_id, total FROM invoices WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!invoice) return res.status(404).json({ error: 'Rechnung nicht gefunden' });

  const payments = db.prepare('SELECT * FROM invoice_payments WHERE invoice_id = ? ORDER BY payment_date ASC').all(req.params.id);
  const paid     = payments.reduce((s, p) => s + p.amount, 0);
  res.json({ payments, paid_amount: paid, outstanding: invoice.total - paid });
});

router.post('/:id/payments', (req, res) => {
  const invoice = db.prepare('SELECT id, user_id, total FROM invoices WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!invoice) return res.status(404).json({ error: 'Rechnung nicht gefunden' });

  const { amount, payment_date, notes } = req.body;
  if (!amount || !payment_date)
    return res.status(400).json({ error: 'amount und payment_date sind erforderlich' });
  if (Number(amount) <= 0)
    return res.status(400).json({ error: 'Betrag muss positiv sein' });

  const payment = db.prepare(`
    INSERT INTO invoice_payments (invoice_id, amount, payment_date, notes)
    VALUES (?, ?, ?, ?)
  `).run(req.params.id, Number(amount), payment_date, notes || '');

  // Update status based on total paid
  const paid = getPaidAmount(req.params.id);
  if (paid >= invoice.total) {
    db.prepare("UPDATE invoices SET status='paid', payment_date=? WHERE id=?")
      .run(payment_date, req.params.id);
  } else if (paid > 0) {
    // partial — keep sent status but don't change unless draft
    const current = db.prepare('SELECT status FROM invoices WHERE id=?').get(req.params.id);
    if (current?.status === 'draft') {
      db.prepare("UPDATE invoices SET status='sent' WHERE id=?").run(req.params.id);
    }
  }

  res.status(201).json(db.prepare('SELECT * FROM invoice_payments WHERE id = ?').get(payment.lastInsertRowid));
});

router.delete('/:id/payments/:paymentId', (req, res) => {
  const invoice = db.prepare('SELECT id FROM invoices WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!invoice) return res.status(404).json({ error: 'Rechnung nicht gefunden' });

  const payment = db.prepare('SELECT id FROM invoice_payments WHERE id = ? AND invoice_id = ?').get(req.params.paymentId, req.params.id);
  if (!payment) return res.status(404).json({ error: 'Zahlung nicht gefunden' });

  db.prepare('DELETE FROM invoice_payments WHERE id = ?').run(req.params.paymentId);

  // Revert status if no more payments
  const paid = getPaidAmount(req.params.id);
  const inv  = db.prepare('SELECT status FROM invoices WHERE id=?').get(req.params.id);
  if (paid < invoice.total && inv?.status === 'paid') {
    db.prepare("UPDATE invoices SET status='sent', payment_date=NULL WHERE id=?").run(req.params.id);
  }

  res.json({ success: true });
});

// ── REMINDERS ────────────────────────────────────────────────────────────────
router.get('/:id/reminders', (req, res) => {
  const invoice = db.prepare('SELECT id FROM invoices WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!invoice) return res.status(404).json({ error: 'Rechnung nicht gefunden' });

  const reminders = db.prepare('SELECT * FROM invoice_reminders WHERE invoice_id = ? ORDER BY sent_at ASC').all(req.params.id);
  res.json(reminders);
});

router.post('/:id/reminders', (req, res) => {
  const invoice = db.prepare('SELECT id FROM invoices WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!invoice) return res.status(404).json({ error: 'Rechnung nicht gefunden' });

  const { reminder_level, sent_at, notes } = req.body;
  if (!reminder_level || !sent_at)
    return res.status(400).json({ error: 'reminder_level und sent_at sind erforderlich' });

  const r = db.prepare(`
    INSERT INTO invoice_reminders (invoice_id, reminder_level, sent_at, notes)
    VALUES (?, ?, ?, ?)
  `).run(req.params.id, reminder_level, sent_at, notes || '');

  res.status(201).json(db.prepare('SELECT * FROM invoice_reminders WHERE id = ?').get(r.lastInsertRowid));
});

router.delete('/:id/reminders/:reminderId', (req, res) => {
  const invoice = db.prepare('SELECT id FROM invoices WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!invoice) return res.status(404).json({ error: 'Rechnung nicht gefunden' });

  db.prepare('DELETE FROM invoice_reminders WHERE id = ? AND invoice_id = ?').run(req.params.reminderId, req.params.id);
  res.json({ success: true });
});

// ── HISTORY ──────────────────────────────────────────────────────────────────
router.get('/:id/history', (req, res) => {
  const invoice = db.prepare('SELECT id FROM invoices WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!invoice) return res.status(404).json({ error: 'Rechnung nicht gefunden' });

  const history = db.prepare(`
    SELECT id, version, changed_at FROM document_history
    WHERE document_id = ? AND document_type = 'invoice' AND user_id = ?
    ORDER BY version DESC
  `).all(req.params.id, req.userId);
  res.json(history);
});

// ── SEND (email placeholder) ──────────────────────────────────────────────────
router.post('/:id/send', async (req, res) => {
  const invoice = db.prepare(`
    SELECT i.*, c.company_name as client_name, c.contact_person,
           c.address as client_address, c.city as client_city,
           c.postal_code as client_postal_code, c.country as client_country,
           c.email as client_email, c.phone as client_phone, c.vat_id as client_vat_id
    FROM invoices i LEFT JOIN clients c ON c.id = i.client_id
    WHERE i.id = ? AND i.user_id = ?
  `).get(req.params.id, req.userId);

  if (!invoice) return res.status(404).json({ error: 'Rechnung nicht gefunden' });
  if (!invoice.client_email) return res.status(422).json({ error: 'Kunde hat keine E-Mail-Adresse' });

  const items    = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY id ASC').all(req.params.id);
  const settings = db.prepare('SELECT * FROM settings WHERE user_id = ?').get(req.userId);

  try {
    const pdfBytes = await generateInvoicePDF({ ...invoice, items }, settings);
    console.log(`[EMAIL] An:      ${invoice.client_email}`);
    console.log(`[EMAIL] Rechnung: ${invoice.invoice_number}`);
    console.log(`[EMAIL] PDF:     ${pdfBytes.length} Bytes`);

    db.prepare("UPDATE invoices SET status='sent' WHERE id=? AND user_id=?").run(req.params.id, req.userId);
    res.json({ success: true, sentTo: invoice.client_email });
  } catch (err) {
    console.error('Fehler beim Senden:', err);
    res.status(500).json({ error: 'Rechnung konnte nicht gesendet werden' });
  }
});

// ── DELETE (only drafts) ──────────────────────────────────────────────────────
router.delete('/:id', (req, res) => {
  const invoice = db.prepare('SELECT id, status FROM invoices WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!invoice) return res.status(404).json({ error: 'Rechnung nicht gefunden' });
  if (invoice.status !== 'draft')
    return res.status(409).json({ error: 'Nur Entwürfe können gelöscht werden. Verwende Stornierung für versendete Rechnungen.' });
  db.prepare('DELETE FROM invoices WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  res.json({ success: true });
});

// ── PDF ───────────────────────────────────────────────────────────────────────
router.get('/:id/pdf', async (req, res) => {
  const invoice = db.prepare(`
    SELECT i.*, c.company_name as client_name, c.contact_person,
           c.address as client_address, c.city as client_city,
           c.postal_code as client_postal_code, c.country as client_country,
           c.email as client_email, c.phone as client_phone, c.vat_id as client_vat_id
    FROM invoices i LEFT JOIN clients c ON c.id = i.client_id
    WHERE i.id = ? AND i.user_id = ?
  `).get(req.params.id, req.userId);

  if (!invoice) return res.status(404).json({ error: 'Rechnung nicht gefunden' });

  const items    = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY id ASC').all(req.params.id);
  const settings = db.prepare('SELECT * FROM settings WHERE user_id = ?').get(req.userId);

  try {
    const pdfBytes = await generateInvoicePDF({ ...invoice, items }, settings);

    // Auto-archive PDF
    try {
      db.prepare(`
        INSERT INTO pdf_archive (user_id, document_type, document_id, document_number, pdf_data, file_size)
        VALUES (?, 'invoice', ?, ?, ?, ?)
      `).run(req.userId, invoice.id, invoice.invoice_number, Buffer.from(pdfBytes), pdfBytes.length);
    } catch (archiveErr) {
      console.warn('[PDF Archive] Fehler beim Archivieren:', archiveErr.message);
    }

    res.set({
      'Content-Type':        'application/pdf',
      'Content-Disposition': `attachment; filename="${invoice.invoice_number}.pdf"`,
      'Content-Length':      pdfBytes.length,
    });
    res.send(Buffer.from(pdfBytes));
  } catch (err) {
    console.error('PDF-Fehler:', err);
    res.status(500).json({ error: 'PDF konnte nicht generiert werden' });
  }
});

// ── PDF ARCHIVE LIST ──────────────────────────────────────────────────────────
router.get('/:id/archive', (req, res) => {
  const invoice = db.prepare('SELECT id FROM invoices WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!invoice) return res.status(404).json({ error: 'Rechnung nicht gefunden' });

  const archives = db.prepare(`
    SELECT id, document_number, file_size, generated_at FROM pdf_archive
    WHERE document_id = ? AND document_type = 'invoice' AND user_id = ?
    ORDER BY generated_at DESC
  `).all(req.params.id, req.userId);
  res.json(archives);
});

// ── DOWNLOAD ARCHIVED PDF ─────────────────────────────────────────────────────
router.get('/:id/archive/:archiveId', (req, res) => {
  const archive = db.prepare(`
    SELECT * FROM pdf_archive WHERE id = ? AND document_id = ? AND user_id = ?
  `).get(req.params.archiveId, req.params.id, req.userId);

  if (!archive) return res.status(404).json({ error: 'Archiv nicht gefunden' });

  res.set({
    'Content-Type':        'application/pdf',
    'Content-Disposition': `attachment; filename="${archive.document_number}.pdf"`,
    'Content-Length':      archive.file_size,
  });
  res.send(archive.pdf_data);
});

module.exports = router;
