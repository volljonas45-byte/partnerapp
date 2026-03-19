const express = require('express');
const db = require('../db/database');
const authenticate = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/clients
 * Returns all clients for the authenticated user.
 */
router.get('/', (req, res) => {
  const clients = db.prepare(
    'SELECT * FROM clients WHERE user_id = ? ORDER BY company_name ASC'
  ).all(req.userId);
  res.json(clients);
});

/**
 * GET /api/clients/:id
 * Returns a single client by ID, enriched with invoice statistics.
 */
router.get('/:id', (req, res) => {
  const client = db.prepare(
    'SELECT * FROM clients WHERE id = ? AND user_id = ?'
  ).get(req.params.id, req.userId);

  if (!client) return res.status(404).json({ error: 'Client not found' });

  // Attach invoice stats in the same response
  const stats = db.prepare(`
    SELECT
      COUNT(*) as invoice_count,
      COALESCE(SUM(total), 0) as total_revenue,
      COALESCE(SUM(CASE WHEN status = 'paid' THEN total ELSE 0 END), 0) as paid_revenue,
      MAX(issue_date) as last_invoice_date
    FROM invoices
    WHERE client_id = ? AND user_id = ?
  `).get(req.params.id, req.userId);

  res.json({ ...client, ...stats });
});

/**
 * GET /api/clients/:id/invoices
 * Returns all invoices for a specific client.
 */
router.get('/:id/invoices', (req, res) => {
  const client = db.prepare('SELECT id FROM clients WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.userId);
  if (!client) return res.status(404).json({ error: 'Client not found' });

  const invoices = db.prepare(`
    SELECT * FROM invoices
    WHERE client_id = ? AND user_id = ?
    ORDER BY created_at DESC
  `).all(req.params.id, req.userId);

  res.json(invoices);
});

/**
 * POST /api/clients
 * Creates a new client.
 */
router.post('/', (req, res) => {
  const {
    company_name, contact_person, address, city,
    postal_code, country, email, phone, vat_id,
    brand_color, brand_logo,
  } = req.body;

  if (!company_name) {
    return res.status(400).json({ error: 'Company name is required' });
  }

  const result = db.prepare(`
    INSERT INTO clients
      (user_id, company_name, contact_person, address, city, postal_code, country, email, phone, vat_id, brand_color, brand_logo)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
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
  );

  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(client);
});

/**
 * PUT /api/clients/:id
 * Updates an existing client.
 */
router.put('/:id', (req, res) => {
  const client = db.prepare(
    'SELECT * FROM clients WHERE id = ? AND user_id = ?'
  ).get(req.params.id, req.userId);

  if (!client) return res.status(404).json({ error: 'Client not found' });

  const {
    company_name, contact_person, address, city,
    postal_code, country, email, phone, vat_id,
    brand_color, brand_logo,
  } = req.body;

  if (!company_name) {
    return res.status(400).json({ error: 'Company name is required' });
  }

  db.prepare(`
    UPDATE clients SET
      company_name = ?, contact_person = ?, address = ?, city = ?,
      postal_code = ?, country = ?, email = ?, phone = ?, vat_id = ?,
      brand_color = ?, brand_logo = ?
    WHERE id = ? AND user_id = ?
  `).run(
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
    req.params.id,
    req.userId
  );

  const updated = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);
  res.json(updated);
});

/**
 * DELETE /api/clients/:id
 * Deletes a client (only if no invoices are associated).
 */
router.delete('/:id', (req, res) => {
  const client = db.prepare(
    'SELECT * FROM clients WHERE id = ? AND user_id = ?'
  ).get(req.params.id, req.userId);

  if (!client) return res.status(404).json({ error: 'Client not found' });

  const invoiceCount = db.prepare(
    'SELECT COUNT(*) as count FROM invoices WHERE client_id = ? AND user_id = ?'
  ).get(req.params.id, req.userId);

  if (invoiceCount.count > 0) {
    return res.status(409).json({
      error: `Cannot delete: client has ${invoiceCount.count} invoice(s)`
    });
  }

  db.prepare('DELETE FROM clients WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  res.json({ success: true });
});

module.exports = router;
