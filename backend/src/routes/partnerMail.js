/**
 * Partner Mail Routes  —  /api/partner/mail/*
 *
 * GET  /api/partner/mail              → list all mails for this partner (sent + received)
 * POST /api/partner/mail/send         → send a new mail from partner alias
 * POST /api/partner/mail/sync         → poll Gmail for new incoming mails for this partner
 * GET  /api/partner/mail/alias        → get / suggest alias for this partner
 * PUT  /api/partner/mail/alias        → set alias (admin: workspace owner only)
 */

const express      = require('express');
const router       = express.Router();
const authenticate = require('../middleware/auth');
const { getOne, getAll, run } = require('../db/pg');
const { sendPartnerMail, fetchIncomingForAlias } = require('../services/gmailService');

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getPartner(userId) {
  return getOne(`SELECT p.*, u.name, u.email as user_email
                 FROM partners p JOIN users u ON u.id = p.user_id
                 WHERE p.user_id = $1`, [userId]);
}

// ── GET /api/partner/mail  →  list inbox + sent ───────────────────────────────

router.get('/', authenticate, async (req, res) => {
  try {
    const partner = await getPartner(req.user.id);
    if (!partner) return res.status(404).json({ error: 'Partner nicht gefunden.' });

    const mails = await getAll(
      `SELECT pm.*, pl.company as lead_company
       FROM partner_emails pm
       LEFT JOIN partner_leads pl ON pl.id = pm.lead_id
       WHERE pm.partner_id = $1
       ORDER BY pm.sent_at DESC
       LIMIT 100`,
      [partner.id]
    );

    res.json(mails);
  } catch (e) {
    console.error('[partnerMail GET /]', e.message);
    res.status(500).json({ error: 'Fehler beim Laden der Mails.' });
  }
});

// ── POST /api/partner/mail/send ───────────────────────────────────────────────

router.post('/send', authenticate, async (req, res) => {
  const { to, subject, body, lead_id } = req.body;
  if (!to || !subject || !body) return res.status(400).json({ error: 'to, subject und body sind Pflichtfelder.' });

  try {
    const partner = await getPartner(req.user.id);
    if (!partner) return res.status(404).json({ error: 'Partner nicht gefunden.' });

    const alias = partner.email_alias;
    if (!alias) return res.status(400).json({ error: 'Kein E-Mail-Alias gesetzt. Bitte wende dich an den Administrator.' });

    const partnerName = [partner.name, partner.last_name].filter(Boolean).join(' ');

    await sendPartnerMail({ alias, partnerName, to, subject, body });

    // Persist sent mail
    const saved = await getOne(
      `INSERT INTO partner_emails (partner_id, direction, from_address, to_address, subject, body, lead_id)
       VALUES ($1, 'out', $2, $3, $4, $5, $6)
       RETURNING *`,
      [partner.id, alias, to, subject, body, lead_id || null]
    );

    res.json(saved);
  } catch (e) {
    console.error('[partnerMail POST /send]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── POST /api/partner/mail/sync  →  poll Gmail for incoming ──────────────────

router.post('/sync', authenticate, async (req, res) => {
  try {
    const partner = await getPartner(req.user.id);
    if (!partner) return res.status(404).json({ error: 'Partner nicht gefunden.' });

    const alias = partner.email_alias;
    if (!alias) return res.json({ synced: 0 });

    const incoming = await fetchIncomingForAlias(alias, 30);
    let synced = 0;

    for (const mail of incoming) {
      // Skip if already stored
      const exists = await getOne(
        `SELECT id FROM partner_emails WHERE gmail_msg_id = $1 AND partner_id = $2`,
        [mail.gmailMsgId, partner.id]
      );
      if (exists) continue;

      await run(
        `INSERT INTO partner_emails (partner_id, direction, from_address, to_address, subject, body, gmail_msg_id, sent_at)
         VALUES ($1, 'in', $2, $3, $4, $5, $6, $7)`,
        [partner.id, mail.from, alias, mail.subject, mail.body, mail.gmailMsgId, mail.receivedAt]
      );
      synced++;
    }

    res.json({ synced });
  } catch (e) {
    console.error('[partnerMail POST /sync]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── GET /api/partner/mail/alias ───────────────────────────────────────────────

router.get('/alias', authenticate, async (req, res) => {
  try {
    const partner = await getPartner(req.user.id);
    if (!partner) return res.status(404).json({ error: 'Partner nicht gefunden.' });

    // Suggest alias from name if not set
    const suggestion = partner.email_alias || buildAlias(partner.name, partner.last_name);
    res.json({ alias: partner.email_alias || '', suggestion });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── PUT /api/partner/mail/alias  (workspace owner only) ──────────────────────

router.put('/alias', authenticate, async (req, res) => {
  const { partner_id, alias } = req.body;
  if (!partner_id || !alias) return res.status(400).json({ error: 'partner_id und alias sind Pflichtfelder.' });

  try {
    // Only the workspace owner may set aliases
    const owner = await getOne(`SELECT id FROM users WHERE id = $1`, [req.user.id]);
    if (!owner) return res.status(403).json({ error: 'Nicht berechtigt.' });

    await run(`UPDATE partners SET email_alias = $1 WHERE id = $2`, [alias.toLowerCase().trim(), partner_id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Alias helper ──────────────────────────────────────────────────────────────

function buildAlias(firstName, lastName) {
  const domain = (process.env.GMAIL_PARTNER_USER || process.env.EMAIL_USER || '').split('@')[1] || 'jragencyservices.com';
  const first  = (firstName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const last   = (lastName  || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (first && last) return `${first}.${last}@${domain}`;
  if (first)         return `${first}@${domain}`;
  return '';
}

module.exports = router;
