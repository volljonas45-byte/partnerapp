const express    = require('express');
const db         = require('../db/database');
const authenticate = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

router.get('/:clientId', (req, res) => {
  const row = db.prepare('SELECT * FROM client_legal WHERE client_id = ?').get(req.params.clientId);
  res.json(row || { client_id: parseInt(req.params.clientId), company_name: '', address: '', vat_id: '', dsgvo_provider: '' });
});

router.put('/:clientId', (req, res) => {
  const { company_name, address, vat_id, dsgvo_provider } = req.body;
  db.prepare(`
    INSERT INTO client_legal (client_id, company_name, address, vat_id, dsgvo_provider, updated_at)
    VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(client_id) DO UPDATE SET
      company_name   = excluded.company_name,
      address        = excluded.address,
      vat_id         = excluded.vat_id,
      dsgvo_provider = excluded.dsgvo_provider,
      updated_at     = CURRENT_TIMESTAMP
  `).run(req.params.clientId, company_name || '', address || '', vat_id || '', dsgvo_provider || '');
  res.json(db.prepare('SELECT * FROM client_legal WHERE client_id = ?').get(req.params.clientId));
});

module.exports = router;
