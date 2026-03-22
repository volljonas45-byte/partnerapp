const express = require('express');
const { getOne, getAll, run, pool } = require('../db/pg');
const authenticate = require('../middleware/auth');
const { generateDocumentPDF } = require('../services/pdfService');
const { sendDocument }        = require('../services/emailService');

const router = express.Router();
router.use(authenticate);

const VALID_STATUSES = ['draft', 'sent', 'accepted', 'rejected', 'expired', 'converted'];

/** Generate next quote number: AN-2026-0001 */
async function generateQuoteNumber(userId, prefix = 'AN') {
  const year = new Date().getFullYear();
  const last = await getOne(`
    SELECT quote_number FROM quotes
    WHERE user_id = ? AND quote_number LIKE ?
    ORDER BY id DESC LIMIT 1
  `, [userId, `${prefix}-${year}-%`]);

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
router.get('/', async (req, res) => {
  try {
    const rows = await getAll(`
      SELECT q.*, c.company_name as client_name, c.email as client_email
      FROM quotes q
      LEFT JOIN clients c ON c.id = q.client_id
      WHERE q.user_id = ?
      ORDER BY q.created_at DESC
    `, [req.workspaceUserId]);
    res.json(rows);
  } catch (err) {
    console.error('[quotes GET /]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── STATS ────────────────────────────────────────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const stats = await getOne(`
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
    `, [req.workspaceUserId]);
    res.json(stats);
  } catch (err) {
    console.error('[quotes GET /stats]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── SINGLE ───────────────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const quote = await getOne(`
      SELECT q.*,
             c.company_name as client_name, c.contact_person,
             c.address as client_address, c.city as client_city,
             c.postal_code as client_postal_code, c.country as client_country,
             c.email as client_email, c.phone as client_phone,
             c.vat_id as client_vat_id
      FROM quotes q
      LEFT JOIN clients c ON c.id = q.client_id
      WHERE q.id = ? AND q.user_id = ?
    `, [req.params.id, req.workspaceUserId]);

    if (!quote) return res.status(404).json({ error: 'Angebot nicht gefunden' });

    const items = await getAll(
      'SELECT * FROM quote_items WHERE quote_id = ? ORDER BY id ASC',
      [req.params.id]
    );

    res.json({ ...quote, items });
  } catch (err) {
    console.error('[quotes GET /:id]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── CREATE ───────────────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { client_id, issue_date, valid_until, notes, items, project_id } = req.body;

    if (!client_id || !issue_date || !valid_until)
      return res.status(400).json({ error: 'client_id, issue_date und valid_until sind erforderlich' });
    if (!items || items.length === 0)
      return res.status(400).json({ error: 'Mindestens eine Position ist erforderlich' });

    const client = await getOne('SELECT id FROM clients WHERE id = ? AND user_id = ?', [client_id, req.workspaceUserId]);
    if (!client) return res.status(404).json({ error: 'Kunde nicht gefunden' });

    const settings = await getOne('SELECT quote_prefix FROM settings WHERE user_id = ?', [req.userId]);
    const prefix   = settings?.quote_prefix || 'AN';
    const number   = await generateQuoteNumber(req.workspaceUserId, prefix);
    const { subtotal, tax_total, total } = calcTotals(items);

    const pgClient = await pool.connect();
    let quoteId;
    try {
      await pgClient.query('BEGIN');

      const r = await pgClient.query(`
        INSERT INTO quotes
          (user_id, client_id, quote_number, status, issue_date, valid_until, notes, subtotal, tax_total, total, project_id)
        VALUES ($1, $2, $3, 'draft', $4, $5, $6, $7, $8, $9, $10)
        RETURNING id
      `, [req.workspaceUserId, client_id, number, issue_date, valid_until, notes || '', subtotal, tax_total, total, project_id || null]);

      quoteId = r.rows[0].id;

      for (const item of items) {
        await pgClient.query(
          `INSERT INTO quote_items (quote_id, title, description, quantity, unit_price, tax_rate, amount, billing_cycle)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [quoteId, item.title || '', item.description || '', item.quantity, item.unit_price, item.tax_rate || 0, item.quantity * item.unit_price, item.billing_cycle || 'once']
        );
      }

      await pgClient.query('COMMIT');
    } catch (txErr) {
      await pgClient.query('ROLLBACK');
      throw txErr;
    } finally {
      pgClient.release();
    }

    const quote = await getOne(`
      SELECT q.*, c.company_name as client_name
      FROM quotes q LEFT JOIN clients c ON c.id = q.client_id
      WHERE q.id = ?
    `, [quoteId]);

    res.status(201).json(quote);
  } catch (err) {
    console.error('[quotes POST /]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── UPDATE ───────────────────────────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const existing = await getOne('SELECT * FROM quotes WHERE id = ? AND user_id = ?', [req.params.id, req.workspaceUserId]);
    if (!existing) return res.status(404).json({ error: 'Angebot nicht gefunden' });

    const { client_id, issue_date, valid_until, notes, items, status } = req.body;

    const pgClient = await pool.connect();
    try {
      await pgClient.query('BEGIN');

      if (items && items.length > 0) {
        const { subtotal, tax_total, total } = calcTotals(items);
        await pgClient.query('DELETE FROM quote_items WHERE quote_id = $1', [req.params.id]);
        for (const item of items) {
          await pgClient.query(
            `INSERT INTO quote_items (quote_id, title, description, quantity, unit_price, tax_rate, amount, billing_cycle)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [req.params.id, item.title || '', item.description || '', item.quantity, item.unit_price, item.tax_rate || 0, item.quantity * item.unit_price, item.billing_cycle || 'once']
          );
        }
        await pgClient.query(`
          UPDATE quotes SET client_id=$1, issue_date=$2, valid_until=$3, notes=$4,
            subtotal=$5, tax_total=$6, total=$7
          WHERE id=$8 AND user_id=$9
        `, [
          client_id    || existing.client_id,
          issue_date   || existing.issue_date,
          valid_until  || existing.valid_until,
          notes !== undefined ? notes : existing.notes,
          subtotal, tax_total, total,
          req.params.id, req.workspaceUserId,
        ]);
      }
      if (status && VALID_STATUSES.includes(status)) {
        await pgClient.query('UPDATE quotes SET status=$1 WHERE id=$2 AND user_id=$3',
          [status, req.params.id, req.workspaceUserId]);
      }

      await pgClient.query('COMMIT');
    } catch (txErr) {
      await pgClient.query('ROLLBACK');
      throw txErr;
    } finally {
      pgClient.release();
    }

    const updated = await getOne(`
      SELECT q.*, c.company_name as client_name
      FROM quotes q LEFT JOIN clients c ON c.id = q.client_id WHERE q.id = ?
    `, [req.params.id]);
    res.json(updated);
  } catch (err) {
    console.error('[quotes PUT /:id]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── STATUS ───────────────────────────────────────────────────────────────────
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!VALID_STATUSES.includes(status))
      return res.status(400).json({ error: `Status muss einer von: ${VALID_STATUSES.join(', ')} sein` });

    const quote = await getOne('SELECT id FROM quotes WHERE id = ? AND user_id = ?', [req.params.id, req.workspaceUserId]);
    if (!quote) return res.status(404).json({ error: 'Angebot nicht gefunden' });

    await run('UPDATE quotes SET status=? WHERE id=? AND user_id=?',
      [status, req.params.id, req.workspaceUserId]);

    res.json(await getOne('SELECT * FROM quotes WHERE id = ?', [req.params.id]));
  } catch (err) {
    console.error('[quotes PATCH /:id/status]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── CONVERT TO INVOICE ────────────────────────────────────────────────────────
router.post('/:id/convert', async (req, res) => {
  try {
    const quote = await getOne(`
      SELECT q.*,
             c.company_name as client_name
      FROM quotes q
      LEFT JOIN clients c ON c.id = q.client_id
      WHERE q.id = ? AND q.user_id = ?
    `, [req.params.id, req.workspaceUserId]);

    if (!quote) return res.status(404).json({ error: 'Angebot nicht gefunden' });
    if (quote.status === 'converted')
      return res.status(409).json({ error: 'Angebot wurde bereits umgewandelt' });

    const items = await getAll('SELECT * FROM quote_items WHERE quote_id = ? ORDER BY id ASC', [req.params.id]);
    const settings = await getOne('SELECT invoice_prefix FROM settings WHERE user_id = ?', [req.userId]);
    const prefix   = settings?.invoice_prefix || 'RE';

    // Generate invoice number
    const year = new Date().getFullYear();
    const lastInv = await getOne(`
      SELECT invoice_number FROM invoices
      WHERE user_id = ? AND invoice_number LIKE ?
      ORDER BY id DESC LIMIT 1
    `, [req.workspaceUserId, `${prefix}-${year}-%`]);
    const lastNum  = lastInv ? parseInt(lastInv.invoice_number.split('-').pop(), 10) : 0;
    const invoiceNumber = `${prefix}-${year}-${String(lastNum + 1).padStart(4, '0')}`;

    const today   = new Date().toISOString().split('T')[0];
    const dueDate = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

    const pgClient = await pool.connect();
    let invoiceId;
    try {
      await pgClient.query('BEGIN');

      const r = await pgClient.query(`
        INSERT INTO invoices
          (user_id, client_id, invoice_number, status, issue_date, due_date, notes, subtotal, tax_total, total)
        VALUES ($1, $2, $3, 'draft', $4, $5, $6, $7, $8, $9)
        RETURNING id
      `, [req.workspaceUserId, quote.client_id, invoiceNumber, today, dueDate, quote.notes || '', quote.subtotal, quote.tax_total, quote.total]);

      invoiceId = r.rows[0].id;

      for (const item of items) {
        await pgClient.query(
          `INSERT INTO invoice_items (invoice_id, title, description, quantity, unit_price, tax_rate, amount, billing_cycle)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [invoiceId, item.title || '', item.description || '', item.quantity, item.unit_price, item.tax_rate || 0, item.amount, item.billing_cycle || 'once']
        );
      }

      // Mark quote as converted, store reference
      await pgClient.query('UPDATE quotes SET status=$1, converted_invoice_id=$2 WHERE id=$3',
        ['converted', invoiceId, req.params.id]);

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

    res.status(201).json({ invoice, quote_id: parseInt(req.params.id) });
  } catch (err) {
    console.error('[quotes POST /:id/convert]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── SEND (E-Mail mit PDF-Anhang) ──────────────────────────────────────────────
router.post('/:id/send', async (req, res) => {
  try {
    const quote = await getOne(`
      SELECT q.*, c.company_name as client_name, c.contact_person,
             c.address as client_address, c.city as client_city,
             c.postal_code as client_postal_code, c.country as client_country,
             c.email as client_email, c.phone as client_phone, c.vat_id as client_vat_id
      FROM quotes q LEFT JOIN clients c ON c.id = q.client_id
      WHERE q.id = ? AND q.user_id = ?
    `, [req.params.id, req.workspaceUserId]);

    if (!quote) return res.status(404).json({ error: 'Angebot nicht gefunden' });

    const { to, subject, message } = req.body || {};
    const recipient = to || quote.client_email;
    if (!recipient) return res.status(422).json({ error: 'Kunde hat keine E-Mail-Adresse' });

    const items    = await getAll('SELECT * FROM quote_items WHERE quote_id = ? ORDER BY id ASC', [req.params.id]);
    const settings = await getOne('SELECT * FROM settings WHERE user_id = ?', [req.userId]);

    const pdfBytes = await generateDocumentPDF({ ...quote, items }, settings, 'quote');

    await sendDocument({
      type:       'quote',
      doc:        quote,
      agencyName: settings?.company_name || '',
      to:         recipient,
      subject,
      message,
      fromAlias:  settings?.email_alias     || '',
      signature:  settings?.email_signature || '',
      pdfBytes,
    });

    await run("UPDATE quotes SET status='sent' WHERE id=? AND user_id=?", [req.params.id, req.workspaceUserId]);
    res.json({ success: true, sentTo: recipient });
  } catch (err) {
    console.error('Fehler beim Senden:', err);
    const msg = err.message?.includes('konfiguriert') || err.message?.includes('Empfänger')
      ? err.message
      : 'Angebot konnte nicht gesendet werden';
    res.status(500).json({ error: msg });
  }
});

// ── DELETE ───────────────────────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const quote = await getOne('SELECT id FROM quotes WHERE id = ? AND user_id = ?', [req.params.id, req.workspaceUserId]);
    if (!quote) return res.status(404).json({ error: 'Angebot nicht gefunden' });
    await run('DELETE FROM quotes WHERE id = ? AND user_id = ?', [req.params.id, req.workspaceUserId]);
    res.json({ success: true });
  } catch (err) {
    console.error('[quotes DELETE /:id]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── PDF ───────────────────────────────────────────────────────────────────────
router.get('/:id/pdf', async (req, res) => {
  try {
    const quote = await getOne(`
      SELECT q.*, c.company_name as client_name, c.contact_person,
             c.address as client_address, c.city as client_city,
             c.postal_code as client_postal_code, c.country as client_country,
             c.email as client_email, c.phone as client_phone, c.vat_id as client_vat_id
      FROM quotes q LEFT JOIN clients c ON c.id = q.client_id
      WHERE q.id = ? AND q.user_id = ?
    `, [req.params.id, req.workspaceUserId]);

    if (!quote) return res.status(404).json({ error: 'Angebot nicht gefunden' });

    const items    = await getAll('SELECT * FROM quote_items WHERE quote_id = ? ORDER BY id ASC', [req.params.id]);
    const settings = await getOne('SELECT * FROM settings WHERE user_id = ?', [req.userId]);

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
