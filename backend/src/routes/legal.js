const express    = require('express');
const { getOne, run } = require('../db/pg');
const authenticate = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

router.get('/:clientId', async (req, res) => {
  try {
    const row = await getOne('SELECT * FROM client_legal WHERE client_id = ?', [req.params.clientId]);
    res.json(row || { client_id: parseInt(req.params.clientId), company_name: '', address: '', vat_id: '', dsgvo_provider: '' });
  } catch (err) {
    console.error('[legal GET /:clientId]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:clientId', async (req, res) => {
  try {
    const { company_name, address, vat_id, dsgvo_provider } = req.body;
    await run(`
      INSERT INTO client_legal (client_id, company_name, address, vat_id, dsgvo_provider, updated_at)
      VALUES (?, ?, ?, ?, ?, NOW())
      ON CONFLICT (client_id) DO UPDATE SET
        company_name   = EXCLUDED.company_name,
        address        = EXCLUDED.address,
        vat_id         = EXCLUDED.vat_id,
        dsgvo_provider = EXCLUDED.dsgvo_provider,
        updated_at     = NOW()
    `, [req.params.clientId, company_name || '', address || '', vat_id || '', dsgvo_provider || '']);
    res.json(await getOne('SELECT * FROM client_legal WHERE client_id = ?', [req.params.clientId]));
  } catch (err) {
    console.error('[legal PUT /:clientId]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
