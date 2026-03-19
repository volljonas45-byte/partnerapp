const express = require('express');
const db = require('../db/database');
const authenticate = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

const LEGAL_FORMS = [
  'Einzelunternehmen', 'Freiberufler', 'Kleingewerbe',
  'GbR', 'UG (haftungsbeschränkt)', 'GmbH', 'AG',
];

/** Ensure a settings row exists for this user, then return it. */
function ensureSettings(userId) {
  const existing = db.prepare('SELECT id FROM settings WHERE user_id = ?').get(userId);
  if (!existing) db.prepare('INSERT INTO settings (user_id) VALUES (?)').run(userId);
  return db.prepare('SELECT * FROM settings WHERE user_id = ?').get(userId);
}

/**
 * GET /api/settings
 */
router.get('/', (req, res) => {
  res.json(ensureSettings(req.userId));
});

/**
 * PUT /api/settings
 * Updates all company, banking, invoice, and branding fields.
 */
router.put('/', (req, res) => {
  const {
    company_name, address, city, postal_code, country,
    email, phone, vat_id, steuernummer,
    bank_name, iban, bic,
    invoice_prefix, quote_prefix,
    legal_form, geschaeftsfuehrer, handelsregister, registergericht,
    kleinunternehmer,
    primary_color, footer_text,
    default_payment_days,
  } = req.body;

  ensureSettings(req.userId);

  db.prepare(`
    UPDATE settings SET
      company_name      = ?,
      address           = ?,
      city              = ?,
      postal_code       = ?,
      country           = ?,
      email             = ?,
      phone             = ?,
      vat_id            = ?,
      steuernummer      = ?,
      bank_name         = ?,
      iban              = ?,
      bic               = ?,
      invoice_prefix    = ?,
      quote_prefix      = ?,
      legal_form        = ?,
      geschaeftsfuehrer = ?,
      handelsregister   = ?,
      registergericht   = ?,
      kleinunternehmer  = ?,
      primary_color     = ?,
      footer_text       = ?,
      default_payment_days = ?
    WHERE user_id = ?
  `).run(
    company_name      || '',
    address           || '',
    city              || '',
    postal_code       || '',
    country           || 'Deutschland',
    email             || '',
    phone             || '',
    vat_id            || '',
    steuernummer      || '',
    bank_name         || '',
    iban              || '',
    bic               || '',
    invoice_prefix    || 'RE',
    quote_prefix      || 'AN',
    LEGAL_FORMS.includes(legal_form) ? legal_form : 'Einzelunternehmen',
    geschaeftsfuehrer || '',
    handelsregister   || '',
    registergericht   || '',
    kleinunternehmer  ? 1 : 0,
    primary_color     || '#111827',
    footer_text       || 'Vielen Dank für Ihr Vertrauen.',
    default_payment_days != null ? parseInt(default_payment_days) || 30 : 30,
    req.userId,
  );

  res.json(db.prepare('SELECT * FROM settings WHERE user_id = ?').get(req.userId));
});

/**
 * POST /api/settings/logo
 * Saves company logo as base64 data URL.
 */
router.post('/logo', (req, res) => {
  const { logo_base64 } = req.body;
  if (!logo_base64) return res.status(400).json({ error: 'logo_base64 is required' });
  if (!logo_base64.startsWith('data:image/')) return res.status(400).json({ error: 'Ungültiges Bildformat' });
  if (logo_base64.length > 2_800_000) return res.status(413).json({ error: 'Logo muss kleiner als 2 MB sein' });

  ensureSettings(req.userId);
  db.prepare('UPDATE settings SET logo_base64 = ? WHERE user_id = ?').run(logo_base64, req.userId);
  res.json({ success: true });
});

/**
 * DELETE /api/settings/logo
 */
router.delete('/logo', (req, res) => {
  db.prepare('UPDATE settings SET logo_base64 = NULL WHERE user_id = ?').run(req.userId);
  res.json({ success: true });
});

module.exports = router;
