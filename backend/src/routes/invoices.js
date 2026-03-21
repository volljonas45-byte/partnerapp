const express = require('express');
const { getOne, getAll, run, pool } = require('../db/pg');
const authenticate = require('../middleware/auth');
const { generateInvoicePDF } = require('../services/pdfService');
const { sendDocument }       = require('../services/emailService');

const router = express.Router();
router.use(authenticate);

const VALID_STATUSES = ['draft', 'sent', 'paid', 'overdue', 'cancelled'];

/** Generate next invoice number */
async function generateInvoiceNumber(userId, prefix = 'RE') {
  const year = new Date().getFullYear();
  const last = await getOne(`
    SELECT invoice_number FROM invoices
    WHERE user_id = ? AND invoice_number LIKE ?
    ORDER BY id DESC LIMIT 1
  `, [userId, `${prefix}-${year}-%`]);

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
async function getFullInvoice(id) {
  const invoice = await getOne(`
    SELECT i.*, c.company_name as client_name, c.contact_person,
           c.address as client_address, c.city as client_city,
           c.postal_code as client_postal_code, c.country as client_country,
           c.email as client_email, c.phone as client_phone,
           c.vat_id as client_vat_id
    FROM invoices i
    LEFT JOIN clients c ON c.id = i.client_id
    WHERE i.id = ?
  `, [id]);
  if (!invoice) return null;
  const items = await getAll('SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY id ASC', [id]);
  return { ...invoice, items };
}

/** Record a history snapshot */
async function recordHistory(userId, documentId, invoice) {
  const last = await getOne(
    'SELECT MAX(version) as v FROM document_history WHERE document_id = ? AND document_type = ?',
    [documentId, 'invoice']
  );
  const version = (last?.v || 0) + 1;
  await run(`
    INSERT INTO document_history (user_id, document_type, document_id, version, snapshot)
    VALUES (?, 'invoice', ?, ?, ?)
  `, [userId, documentId, version, JSON.stringify(invoice)]);
}

/** Compute paid amount from payments table */
async function getPaidAmount(invoiceId) {
  const row = await getOne('SELECT COALESCE(SUM(amount), 0) as paid FROM invoice_payments WHERE invoice_id = ?', [invoiceId]);
  return parseFloat(row?.paid) || 0;
}

// ── LIST ─────────────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const rows = await getAll(`
      SELECT i.*, c.company_name as client_name, c.email as client_email,
             COALESCE((SELECT SUM(amount) FROM invoice_payments WHERE invoice_id = i.id), 0) as paid_amount
      FROM invoices i
      LEFT JOIN clients c ON c.id = i.client_id
      WHERE i.user_id = ?
      ORDER BY i.created_at DESC
    `, [req.userId]);
    res.json(rows);
  } catch (err) {
    console.error('[invoices GET /]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── STATS ────────────────────────────────────────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const now   = new Date();
    const year  = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');

    const stats = await getOne(`
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
    `, [`${year}-${month}%`, `${year}%`, req.userId]);

    res.json(stats);
  } catch (err) {
    console.error('[invoices GET /stats]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── REVENUE CHART ────────────────────────────────────────────────────────────
router.get('/revenue-chart', async (req, res) => {
  try {
    const rows = await getAll(`
      SELECT
        TO_CHAR(TO_DATE(issue_date, 'YYYY-MM-DD'), 'YYYY-MM') as month,
        COALESCE(SUM(CASE WHEN status='paid' THEN total ELSE 0 END), 0) as revenue,
        COUNT(*) as count
      FROM invoices
      WHERE user_id = ? AND issue_date >= TO_CHAR(NOW() - INTERVAL '11 months', 'YYYY-MM') || '-01'
      GROUP BY month ORDER BY month ASC
    `, [req.userId]);

    const result = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key   = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const found = rows.find(r => r.month === key);
      result.push({
        month:   key,
        label:   d.toLocaleDateString('de-DE', { month: 'short', year: '2-digit' }),
        revenue: parseFloat(found?.revenue) ?? 0,
        count:   parseInt(found?.count)     ?? 0,
      });
    }
    res.json(result);
  } catch (err) {
    console.error('[invoices GET /revenue-chart]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── SINGLE ───────────────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const invoice = await getOne(`
      SELECT i.*,
             c.company_name as client_name, c.contact_person,
             c.address as client_address, c.city as client_city,
             c.postal_code as client_postal_code, c.country as client_country,
             c.email as client_email, c.phone as client_phone,
             c.vat_id as client_vat_id
      FROM invoices i
      LEFT JOIN clients c ON c.id = i.client_id
      WHERE i.id = ? AND i.user_id = ?
    `, [req.params.id, req.userId]);

    if (!invoice) return res.status(404).json({ error: 'Rechnung nicht gefunden' });

    const items    = await getAll('SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY id ASC', [req.params.id]);
    const payments = await getAll('SELECT * FROM invoice_payments WHERE invoice_id = ? ORDER BY payment_date ASC', [req.params.id]);
    const paid_amount = payments.reduce((s, p) => s + parseFloat(p.amount), 0);

    res.json({ ...invoice, items, payments, paid_amount });
  } catch (err) {
    console.error('[invoices GET /:id]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── CREATE ───────────────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
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

    const client = await getOne('SELECT id FROM clients WHERE id = ? AND user_id = ?', [client_id, req.userId]);
    if (!client) return res.status(404).json({ error: 'Kunde nicht gefunden' });

    const settings = await getOne('SELECT invoice_prefix FROM settings WHERE user_id = ?', [req.userId]);
    const prefix   = settings?.invoice_prefix || 'RE';
    const number   = await generateInvoiceNumber(req.userId, prefix);
    const { subtotal, tax_total, total } = calcTotals(items);

    const pgClient = await pool.connect();
    let invoiceId;
    try {
      await pgClient.query('BEGIN');

      // Use direct pg client for transaction
      const insertInvoice = await pgClient.query(
        `INSERT INTO invoices
          (user_id, client_id, invoice_number, status, issue_date, due_date, leistungsdatum,
           leistungszeitraum_von, leistungszeitraum_bis, notes, invoice_type, reverse_charge,
           subtotal, tax_total, total, project_id)
         VALUES ($1, $2, $3, 'draft', $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
         RETURNING id`,
        [
          req.userId, client_id, number, issue_date, due_date,
          leistungsdatum || null, leistungszeitraum_von || null, leistungszeitraum_bis || null,
          notes || '', invoice_type, reverse_charge ? 1 : 0,
          subtotal, tax_total, total, project_id || null,
        ]
      );

      invoiceId = insertInvoice.rows[0].id;

      for (const item of items) {
        await pgClient.query(
          `INSERT INTO invoice_items (invoice_id, title, description, quantity, unit_price, tax_rate, amount, billing_cycle)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [invoiceId, item.title || '', item.description || '', item.quantity, item.unit_price, item.tax_rate || 0, item.quantity * item.unit_price, item.billing_cycle || 'once']
        );
      }

      await pgClient.query('COMMIT');
    } catch (txErr) {
      await pgClient.query('ROLLBACK');
      throw txErr;
    } finally {
      pgClient.release();
    }

    const invoice = await getOne(`
      SELECT i.*, c.company_name as client_name
      FROM invoices i LEFT JOIN clients c ON c.id = i.client_id
      WHERE i.id = ?
    `, [invoiceId]);

    res.status(201).json(invoice);
  } catch (err) {
    console.error('[invoices POST /]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── UPDATE ───────────────────────────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const existing = await getOne('SELECT * FROM invoices WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
    if (!existing) return res.status(404).json({ error: 'Rechnung nicht gefunden' });

    const {
      client_id, issue_date, due_date, leistungsdatum,
      leistungszeitraum_von, leistungszeitraum_bis,
      notes, items, status, payment_date, invoice_type, reverse_charge,
    } = req.body;

    const pgClient = await pool.connect();
    try {
      await pgClient.query('BEGIN');

      if (items && items.length > 0) {
        const { subtotal, tax_total, total } = calcTotals(items);
        await pgClient.query('DELETE FROM invoice_items WHERE invoice_id = $1', [req.params.id]);
        for (const item of items) {
          await pgClient.query(
            `INSERT INTO invoice_items (invoice_id, title, description, quantity, unit_price, tax_rate, amount, billing_cycle)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [req.params.id, item.title || '', item.description || '', item.quantity, item.unit_price, item.tax_rate || 0, item.quantity * item.unit_price, item.billing_cycle || 'once']
          );
        }
        await pgClient.query(`
          UPDATE invoices SET client_id=$1, issue_date=$2, due_date=$3, leistungsdatum=$4,
            leistungszeitraum_von=$5, leistungszeitraum_bis=$6, notes=$7,
            invoice_type=$8, reverse_charge=$9,
            subtotal=$10, tax_total=$11, total=$12
          WHERE id=$13 AND user_id=$14
        `, [
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
        ]);
      }
      if (status && VALID_STATUSES.includes(status)) {
        await pgClient.query('UPDATE invoices SET status=$1, payment_date=$2 WHERE id=$3 AND user_id=$4',
          [status, payment_date || null, req.params.id, req.userId]);
      }

      await pgClient.query('COMMIT');
    } catch (txErr) {
      await pgClient.query('ROLLBACK');
      throw txErr;
    } finally {
      pgClient.release();
    }

    // Record history snapshot
    const updated = await getOne(`
      SELECT i.*, c.company_name as client_name
      FROM invoices i LEFT JOIN clients c ON c.id = i.client_id WHERE i.id = ?
    `, [req.params.id]);
    const updatedItems = await getAll('SELECT * FROM invoice_items WHERE invoice_id = ?', [req.params.id]);
    await recordHistory(req.userId, req.params.id, { ...updated, items: updatedItems });

    res.json(updated);
  } catch (err) {
    console.error('[invoices PUT /:id]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── STATUS ───────────────────────────────────────────────────────────────────
router.patch('/:id/status', async (req, res) => {
  try {
    const { status, payment_date } = req.body;
    if (!VALID_STATUSES.includes(status))
      return res.status(400).json({ error: `Status muss einer von: ${VALID_STATUSES.join(', ')} sein` });

    const invoice = await getOne('SELECT id FROM invoices WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
    if (!invoice) return res.status(404).json({ error: 'Rechnung nicht gefunden' });

    const pd = status === 'paid' ? (payment_date || new Date().toISOString().split('T')[0]) : null;
    await run('UPDATE invoices SET status=?, payment_date=? WHERE id=? AND user_id=?',
      [status, pd, req.params.id, req.userId]);

    res.json(await getOne('SELECT * FROM invoices WHERE id = ?', [req.params.id]));
  } catch (err) {
    console.error('[invoices PATCH /:id/status]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── DUPLICATE ─────────────────────────────────────────────────────────────────
router.post('/:id/duplicate', async (req, res) => {
  try {
    const original = await getFullInvoice(req.params.id);
    if (!original || original.user_id !== req.userId)
      return res.status(404).json({ error: 'Rechnung nicht gefunden' });

    const settings = await getOne('SELECT invoice_prefix FROM settings WHERE user_id = ?', [req.userId]);
    const prefix   = settings?.invoice_prefix || 'RE';
    const number   = await generateInvoiceNumber(req.userId, prefix);
    const today    = new Date().toISOString().split('T')[0];
    const dueDate  = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

    const pgClient = await pool.connect();
    let newId;
    try {
      await pgClient.query('BEGIN');

      const r = await pgClient.query(`
        INSERT INTO invoices
          (user_id, client_id, invoice_number, status, issue_date, due_date, leistungsdatum,
           leistungszeitraum_von, leistungszeitraum_bis, notes, invoice_type, reverse_charge,
           subtotal, tax_total, total)
        VALUES ($1, $2, $3, 'draft', $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING id
      `, [
        req.userId, original.client_id, number, today, dueDate,
        original.leistungsdatum || null,
        original.leistungszeitraum_von || null,
        original.leistungszeitraum_bis || null,
        original.notes || '',
        original.invoice_type || 'standard',
        original.reverse_charge || 0,
        original.subtotal, original.tax_total, original.total,
      ]);

      newId = r.rows[0].id;

      for (const item of original.items) {
        await pgClient.query(
          `INSERT INTO invoice_items (invoice_id, title, description, quantity, unit_price, tax_rate, amount, billing_cycle)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [newId, item.title || '', item.description || '', item.quantity, item.unit_price, item.tax_rate || 0, item.amount, item.billing_cycle || 'once']
        );
      }

      await pgClient.query('COMMIT');
    } catch (txErr) {
      await pgClient.query('ROLLBACK');
      throw txErr;
    } finally {
      pgClient.release();
    }

    const invoice = await getOne(`
      SELECT i.*, c.company_name as client_name
      FROM invoices i LEFT JOIN clients c ON c.id = i.client_id WHERE i.id = ?
    `, [newId]);

    res.status(201).json(invoice);
  } catch (err) {
    console.error('[invoices POST /:id/duplicate]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── STORNO ────────────────────────────────────────────────────────────────────
router.post('/:id/storno', async (req, res) => {
  try {
    const original = await getFullInvoice(req.params.id);
    if (!original || original.user_id !== req.userId)
      return res.status(404).json({ error: 'Rechnung nicht gefunden' });
    if (original.storno_of_id)
      return res.status(409).json({ error: 'Stornorechnung kann nicht erneut storniert werden' });

    const settings  = await getOne('SELECT storno_prefix, invoice_prefix FROM settings WHERE user_id = ?', [req.userId]);
    const prefix    = settings?.storno_prefix || 'ST';
    const number    = await generateInvoiceNumber(req.userId, prefix);
    const today     = new Date().toISOString().split('T')[0];

    const pgClient = await pool.connect();
    let stornoId;
    try {
      await pgClient.query('BEGIN');

      // Create storno invoice (negative amounts)
      const r = await pgClient.query(`
        INSERT INTO invoices
          (user_id, client_id, invoice_number, status, issue_date, due_date, notes,
           invoice_type, reverse_charge, subtotal, tax_total, total, storno_of_id)
        VALUES ($1, $2, $3, 'cancelled', $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id
      `, [
        req.userId, original.client_id, number, today, today,
        `Stornorechnung zu ${original.invoice_number}`,
        original.invoice_type || 'standard',
        original.reverse_charge || 0,
        -(original.subtotal), -(original.tax_total), -(original.total),
        original.id,
      ]);

      stornoId = r.rows[0].id;

      for (const item of original.items) {
        await pgClient.query(
          `INSERT INTO invoice_items (invoice_id, title, description, quantity, unit_price, tax_rate, amount, billing_cycle)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [stornoId, item.title || '', item.description || '', item.quantity, -(item.unit_price), item.tax_rate || 0, -(item.amount), item.billing_cycle || 'once']
        );
      }

      // Mark original as cancelled
      await pgClient.query("UPDATE invoices SET status='cancelled' WHERE id=$1 AND user_id=$2", [original.id, req.userId]);

      await pgClient.query('COMMIT');
    } catch (txErr) {
      await pgClient.query('ROLLBACK');
      throw txErr;
    } finally {
      pgClient.release();
    }

    const stornoInvoice = await getOne(`
      SELECT i.*, c.company_name as client_name
      FROM invoices i LEFT JOIN clients c ON c.id = i.client_id WHERE i.id = ?
    `, [stornoId]);

    res.status(201).json({ storno_invoice: stornoInvoice, original_id: original.id });
  } catch (err) {
    console.error('[invoices POST /:id/storno]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── PAYMENTS ─────────────────────────────────────────────────────────────────
router.get('/:id/payments', async (req, res) => {
  try {
    const invoice = await getOne('SELECT id, user_id, total FROM invoices WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
    if (!invoice) return res.status(404).json({ error: 'Rechnung nicht gefunden' });

    const payments = await getAll('SELECT * FROM invoice_payments WHERE invoice_id = ? ORDER BY payment_date ASC', [req.params.id]);
    const paid     = payments.reduce((s, p) => s + parseFloat(p.amount), 0);
    res.json({ payments, paid_amount: paid, outstanding: parseFloat(invoice.total) - paid });
  } catch (err) {
    console.error('[invoices GET /:id/payments]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:id/payments', async (req, res) => {
  try {
    const invoice = await getOne('SELECT id, user_id, total FROM invoices WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
    if (!invoice) return res.status(404).json({ error: 'Rechnung nicht gefunden' });

    const { amount, payment_date, notes } = req.body;
    if (!amount || !payment_date)
      return res.status(400).json({ error: 'amount und payment_date sind erforderlich' });
    if (Number(amount) <= 0)
      return res.status(400).json({ error: 'Betrag muss positiv sein' });

    const payment = await run(`
      INSERT INTO invoice_payments (invoice_id, amount, payment_date, notes)
      VALUES (?, ?, ?, ?)
      RETURNING id
    `, [req.params.id, Number(amount), payment_date, notes || '']);

    // Update status based on total paid
    const paid = await getPaidAmount(req.params.id);
    if (paid >= parseFloat(invoice.total)) {
      await run("UPDATE invoices SET status='paid', payment_date=? WHERE id=?",
        [payment_date, req.params.id]);
    } else if (paid > 0) {
      // partial — keep sent status but don't change unless draft
      const current = await getOne('SELECT status FROM invoices WHERE id=?', [req.params.id]);
      if (current?.status === 'draft') {
        await run("UPDATE invoices SET status='sent' WHERE id=?", [req.params.id]);
      }
    }

    res.status(201).json(await getOne('SELECT * FROM invoice_payments WHERE id = ?', [payment.lastInsertRowid]));
  } catch (err) {
    console.error('[invoices POST /:id/payments]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id/payments/:paymentId', async (req, res) => {
  try {
    const invoice = await getOne('SELECT id FROM invoices WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
    if (!invoice) return res.status(404).json({ error: 'Rechnung nicht gefunden' });

    const payment = await getOne('SELECT id FROM invoice_payments WHERE id = ? AND invoice_id = ?', [req.params.paymentId, req.params.id]);
    if (!payment) return res.status(404).json({ error: 'Zahlung nicht gefunden' });

    await run('DELETE FROM invoice_payments WHERE id = ?', [req.params.paymentId]);

    // Revert status if no more payments
    const paid = await getPaidAmount(req.params.id);
    const inv  = await getOne('SELECT status, total FROM invoices WHERE id=?', [req.params.id]);
    if (paid < parseFloat(inv.total) && inv?.status === 'paid') {
      await run("UPDATE invoices SET status='sent', payment_date=NULL WHERE id=?", [req.params.id]);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[invoices DELETE /:id/payments/:paymentId]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── REMINDERS ────────────────────────────────────────────────────────────────
router.get('/:id/reminders', async (req, res) => {
  try {
    const invoice = await getOne('SELECT id FROM invoices WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
    if (!invoice) return res.status(404).json({ error: 'Rechnung nicht gefunden' });

    const reminders = await getAll('SELECT * FROM invoice_reminders WHERE invoice_id = ? ORDER BY sent_at ASC', [req.params.id]);
    res.json(reminders);
  } catch (err) {
    console.error('[invoices GET /:id/reminders]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:id/reminders', async (req, res) => {
  try {
    const invoice = await getOne('SELECT id FROM invoices WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
    if (!invoice) return res.status(404).json({ error: 'Rechnung nicht gefunden' });

    const { reminder_level, sent_at, notes } = req.body;
    if (!reminder_level || !sent_at)
      return res.status(400).json({ error: 'reminder_level und sent_at sind erforderlich' });

    const r = await run(`
      INSERT INTO invoice_reminders (invoice_id, reminder_level, sent_at, notes)
      VALUES (?, ?, ?, ?)
      RETURNING id
    `, [req.params.id, reminder_level, sent_at, notes || '']);

    res.status(201).json(await getOne('SELECT * FROM invoice_reminders WHERE id = ?', [r.lastInsertRowid]));
  } catch (err) {
    console.error('[invoices POST /:id/reminders]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id/reminders/:reminderId', async (req, res) => {
  try {
    const invoice = await getOne('SELECT id FROM invoices WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
    if (!invoice) return res.status(404).json({ error: 'Rechnung nicht gefunden' });

    await run('DELETE FROM invoice_reminders WHERE id = ? AND invoice_id = ?', [req.params.reminderId, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('[invoices DELETE /:id/reminders/:reminderId]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── HISTORY ──────────────────────────────────────────────────────────────────
router.get('/:id/history', async (req, res) => {
  try {
    const invoice = await getOne('SELECT id FROM invoices WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
    if (!invoice) return res.status(404).json({ error: 'Rechnung nicht gefunden' });

    const history = await getAll(`
      SELECT id, version, changed_at FROM document_history
      WHERE document_id = ? AND document_type = 'invoice' AND user_id = ?
      ORDER BY version DESC
    `, [req.params.id, req.userId]);
    res.json(history);
  } catch (err) {
    console.error('[invoices GET /:id/history]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── SEND (E-Mail mit PDF-Anhang) ──────────────────────────────────────────────
router.post('/:id/send', async (req, res) => {
  try {
    const invoice = await getOne(`
      SELECT i.*, c.company_name as client_name, c.contact_person,
             c.address as client_address, c.city as client_city,
             c.postal_code as client_postal_code, c.country as client_country,
             c.email as client_email, c.phone as client_phone, c.vat_id as client_vat_id
      FROM invoices i LEFT JOIN clients c ON c.id = i.client_id
      WHERE i.id = ? AND i.user_id = ?
    `, [req.params.id, req.userId]);

    if (!invoice) return res.status(404).json({ error: 'Rechnung nicht gefunden' });

    const { to, subject, message } = req.body || {};
    const recipient = to || invoice.client_email;
    if (!recipient) return res.status(422).json({ error: 'Kunde hat keine E-Mail-Adresse' });

    const items    = await getAll('SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY id ASC', [req.params.id]);
    const settings = await getOne('SELECT * FROM settings WHERE user_id = ?', [req.userId]);

    const pdfBytes = await generateInvoicePDF({ ...invoice, items }, settings);

    await sendDocument({
      type:       'invoice',
      doc:        invoice,
      agencyName: settings?.company_name || '',
      to:         recipient,
      subject,
      message,
      pdfBytes,
    });

    await run("UPDATE invoices SET status='sent' WHERE id=? AND user_id=?", [req.params.id, req.userId]);
    res.json({ success: true, sentTo: recipient });
  } catch (err) {
    console.error('Fehler beim Senden:', err);
    const msg = err.message?.includes('konfiguriert') || err.message?.includes('Empfänger')
      ? err.message
      : 'Rechnung konnte nicht gesendet werden';
    res.status(500).json({ error: msg });
  }
});

// ── DELETE (only drafts) ──────────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const invoice = await getOne('SELECT id, status FROM invoices WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
    if (!invoice) return res.status(404).json({ error: 'Rechnung nicht gefunden' });
    if (invoice.status !== 'draft')
      return res.status(409).json({ error: 'Nur Entwürfe können gelöscht werden. Verwende Stornierung für versendete Rechnungen.' });
    await run('DELETE FROM invoices WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
    res.json({ success: true });
  } catch (err) {
    console.error('[invoices DELETE /:id]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── PDF ───────────────────────────────────────────────────────────────────────
router.get('/:id/pdf', async (req, res) => {
  try {
    const invoice = await getOne(`
      SELECT i.*, c.company_name as client_name, c.contact_person,
             c.address as client_address, c.city as client_city,
             c.postal_code as client_postal_code, c.country as client_country,
             c.email as client_email, c.phone as client_phone, c.vat_id as client_vat_id
      FROM invoices i LEFT JOIN clients c ON c.id = i.client_id
      WHERE i.id = ? AND i.user_id = ?
    `, [req.params.id, req.userId]);

    if (!invoice) return res.status(404).json({ error: 'Rechnung nicht gefunden' });

    const items    = await getAll('SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY id ASC', [req.params.id]);
    const settings = await getOne('SELECT * FROM settings WHERE user_id = ?', [req.userId]);

    const pdfBytes = await generateInvoicePDF({ ...invoice, items }, settings);

    // Auto-archive PDF
    try {
      await run(`
        INSERT INTO pdf_archive (user_id, document_type, document_id, document_number, pdf_data, file_size)
        VALUES (?, 'invoice', ?, ?, ?, ?)
      `, [req.userId, invoice.id, invoice.invoice_number, Buffer.from(pdfBytes), pdfBytes.length]);
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
router.get('/:id/archive', async (req, res) => {
  try {
    const invoice = await getOne('SELECT id FROM invoices WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
    if (!invoice) return res.status(404).json({ error: 'Rechnung nicht gefunden' });

    const archives = await getAll(`
      SELECT id, document_number, file_size, generated_at FROM pdf_archive
      WHERE document_id = ? AND document_type = 'invoice' AND user_id = ?
      ORDER BY generated_at DESC
    `, [req.params.id, req.userId]);
    res.json(archives);
  } catch (err) {
    console.error('[invoices GET /:id/archive]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── DOWNLOAD ARCHIVED PDF ─────────────────────────────────────────────────────
router.get('/:id/archive/:archiveId', async (req, res) => {
  try {
    const archive = await getOne(`
      SELECT * FROM pdf_archive WHERE id = ? AND document_id = ? AND user_id = ?
    `, [req.params.archiveId, req.params.id, req.userId]);

    if (!archive) return res.status(404).json({ error: 'Archiv nicht gefunden' });

    res.set({
      'Content-Type':        'application/pdf',
      'Content-Disposition': `attachment; filename="${archive.document_number}.pdf"`,
      'Content-Length':      archive.file_size,
    });
    res.send(archive.pdf_data);
  } catch (err) {
    console.error('[invoices GET /:id/archive/:archiveId]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
