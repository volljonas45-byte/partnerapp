const express = require('express');
const { getOne, getAll, run } = require('../db/pg');
const authenticate = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/clients
 * Returns all clients for the authenticated user.
 */
router.get('/', async (req, res) => {
  try {
    const clients = await getAll(
      'SELECT * FROM clients WHERE user_id = ? ORDER BY company_name ASC',
      [req.userId]
    );
    res.json(clients);
  } catch (err) {
    console.error('[clients GET /]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/clients/:id
 * Returns a single client by ID, enriched with invoice statistics.
 */
router.get('/:id', async (req, res) => {
  try {
    const client = await getOne(
      'SELECT * FROM clients WHERE id = ? AND user_id = ?',
      [req.params.id, req.userId]
    );

    if (!client) return res.status(404).json({ error: 'Client not found' });

    // Attach invoice stats in the same response
    const stats = await getOne(`
      SELECT
        COUNT(*) as invoice_count,
        COALESCE(SUM(total), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN status = 'paid' THEN total ELSE 0 END), 0) as paid_revenue,
        MAX(issue_date) as last_invoice_date
      FROM invoices
      WHERE client_id = ? AND user_id = ?
    `, [req.params.id, req.userId]);

    res.json({ ...client, ...stats });
  } catch (err) {
    console.error('[clients GET /:id]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/clients/:id/invoices
 * Returns all invoices for a specific client.
 */
router.get('/:id/invoices', async (req, res) => {
  try {
    const client = await getOne('SELECT id FROM clients WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
    if (!client) return res.status(404).json({ error: 'Client not found' });

    const invoices = await getAll(`
      SELECT * FROM invoices
      WHERE client_id = ? AND user_id = ?
      ORDER BY created_at DESC
    `, [req.params.id, req.userId]);

    res.json(invoices);
  } catch (err) {
    console.error('[clients GET /:id/invoices]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/clients
 * Creates a new client.
 */
router.post('/', async (req, res) => {
  try {
    const {
      company_name, contact_person, address, city,
      postal_code, country, email, phone, vat_id,
      brand_color, brand_logo, industry, website,
    } = req.body;

    if (!company_name) {
      return res.status(400).json({ error: 'Company name is required' });
    }

    const result = await run(`
      INSERT INTO clients
        (user_id, company_name, contact_person, address, city, postal_code, country, email, phone, vat_id, brand_color, brand_logo, industry, website)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING id
    `, [
      req.userId,
      company_name,
      contact_person || '',
      address || '',
      city || '',
      postal_code || '',
      country || '',
      email || '',
      phone || '',
      vat_id || '',
      brand_color || '#111827',
      brand_logo || null,
      industry || '',
      website || '',
    ]);

    const client = await getOne('SELECT * FROM clients WHERE id = ?', [result.lastInsertRowid]);

    // Auto-seed legal setup with company name + address
    await run(`
      INSERT INTO client_legal (client_id, company_name, address, vat_id, dsgvo_provider, updated_at)
      VALUES (?, ?, ?, '', '', NOW())
      ON CONFLICT (client_id) DO NOTHING
    `, [client.id, company_name, address || '']);

    res.status(201).json(client);
  } catch (err) {
    console.error('[clients POST /]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/clients/:id
 * Updates an existing client.
 */
router.put('/:id', async (req, res) => {
  try {
    const client = await getOne(
      'SELECT * FROM clients WHERE id = ? AND user_id = ?',
      [req.params.id, req.userId]
    );

    if (!client) return res.status(404).json({ error: 'Client not found' });

    const {
      company_name, contact_person, address, city,
      postal_code, country, email, phone, vat_id,
      brand_color, brand_logo, industry, website,
    } = req.body;

    if (!company_name) {
      return res.status(400).json({ error: 'Company name is required' });
    }

    await run(`
      UPDATE clients SET
        company_name = ?, contact_person = ?, address = ?, city = ?,
        postal_code = ?, country = ?, email = ?, phone = ?, vat_id = ?,
        brand_color = ?, brand_logo = ?, industry = ?, website = ?
      WHERE id = ? AND user_id = ?
    `, [
      company_name,
      contact_person || '',
      address || '',
      city || '',
      postal_code || '',
      country || '',
      email || '',
      phone || '',
      vat_id || '',
      brand_color !== undefined ? brand_color : client.brand_color,
      brand_logo !== undefined ? (brand_logo || null) : client.brand_logo,
      industry !== undefined ? (industry || '') : (client.industry || ''),
      website !== undefined ? (website || '') : (client.website || ''),
      req.params.id,
      req.userId,
    ]);

    // Sync legal setup: pre-fill company_name/address if legal record is still empty
    await run(`
      INSERT INTO client_legal (client_id, company_name, address, vat_id, dsgvo_provider, updated_at)
      VALUES (?, ?, ?, '', '', NOW())
      ON CONFLICT (client_id) DO UPDATE SET
        company_name = CASE WHEN client_legal.company_name = '' THEN EXCLUDED.company_name ELSE client_legal.company_name END,
        address      = CASE WHEN client_legal.address = ''      THEN EXCLUDED.address      ELSE client_legal.address      END,
        updated_at   = NOW()
    `, [req.params.id, company_name, address || '']);

    const updated = await getOne('SELECT * FROM clients WHERE id = ?', [req.params.id]);
    res.json(updated);
  } catch (err) {
    console.error('[clients PUT /:id]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/clients/:id
 * Deletes a client (only if no invoices are associated).
 */
router.delete('/:id', async (req, res) => {
  try {
    const client = await getOne(
      'SELECT * FROM clients WHERE id = ? AND user_id = ?',
      [req.params.id, req.userId]
    );

    if (!client) return res.status(404).json({ error: 'Client not found' });

    const invoiceCount = await getOne(
      'SELECT COUNT(*) as count FROM invoices WHERE client_id = ? AND user_id = ?',
      [req.params.id, req.userId]
    );

    if (parseInt(invoiceCount.count) > 0) {
      return res.status(409).json({
        error: `Cannot delete: client has ${invoiceCount.count} invoice(s)`,
      });
    }

    await run('DELETE FROM clients WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
    res.json({ success: true });
  } catch (err) {
    console.error('[clients DELETE /:id]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
