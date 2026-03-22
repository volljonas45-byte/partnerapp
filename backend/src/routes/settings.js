const express = require('express');
const { getOne, run } = require('../db/pg');
const authenticate = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

const LEGAL_FORMS = [
  'Einzelunternehmen', 'Freiberufler', 'Kleingewerbe',
  'GbR', 'UG (haftungsbeschränkt)', 'GmbH', 'AG',
];

/** Ensure a settings row exists for this user, then return it. */
async function ensureSettings(userId) {
  const existing = await getOne('SELECT id FROM settings WHERE user_id = ?', [userId]);
  if (!existing) await run('INSERT INTO settings (user_id) VALUES (?)', [userId]);
  return getOne('SELECT * FROM settings WHERE user_id = ?', [userId]);
}

/**
 * GET /api/settings
 */
router.get('/', async (req, res) => {
  try {
    res.json(await ensureSettings(req.userId));
  } catch (err) {
    console.error('[settings GET /]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/settings
 * Updates all company, banking, invoice, and branding fields.
 */
router.put('/', async (req, res) => {
  try {
    const {
      company_name, address, city, postal_code, country,
      email, phone, vat_id, steuernummer,
      bank_name, iban, bic,
      invoice_prefix, quote_prefix,
      legal_form, geschaeftsfuehrer, handelsregister, registergericht,
      kleinunternehmer,
      primary_color, footer_text,
      default_payment_days,
      email_alias, email_signature,
    } = req.body;

    await ensureSettings(req.userId);

    await run(`
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
        default_payment_days = ?,
        email_alias       = ?,
        email_signature   = ?
      WHERE user_id = ?
    `, [
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
      email_alias     || '',
      email_signature || '',
      req.userId,
    ]);

    res.json(await getOne('SELECT * FROM settings WHERE user_id = ?', [req.userId]));
  } catch (err) {
    console.error('[settings PUT /]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/settings/logo
 * Saves company logo as base64 data URL.
 */
router.post('/logo', async (req, res) => {
  try {
    const { logo_base64 } = req.body;
    if (!logo_base64) return res.status(400).json({ error: 'logo_base64 is required' });
    if (!logo_base64.startsWith('data:image/')) return res.status(400).json({ error: 'Ungültiges Bildformat' });
    if (logo_base64.length > 2_800_000) return res.status(413).json({ error: 'Logo muss kleiner als 2 MB sein' });

    await ensureSettings(req.userId);
    await run('UPDATE settings SET logo_base64 = ? WHERE user_id = ?', [logo_base64, req.userId]);
    res.json({ success: true });
  } catch (err) {
    console.error('[settings POST /logo]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/settings/logo
 */
router.delete('/logo', async (req, res) => {
  try {
    await run('UPDATE settings SET logo_base64 = NULL WHERE user_id = ?', [req.userId]);
    res.json({ success: true });
  } catch (err) {
    console.error('[settings DELETE /logo]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
