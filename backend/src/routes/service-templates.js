const express = require('express');
const { getOne, getAll, run, pool } = require('../db/pg');
const authenticate = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const rows = await getAll(
      'SELECT * FROM service_templates WHERE user_id = ? ORDER BY name ASC',
      [req.userId]
    );
    res.json(rows);
  } catch (err) {
    console.error('[service-templates GET /]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, description = '', unit = 'Stunde', unit_price = 0, tax_rate = 19 } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'name ist erforderlich' });

    const r = await run(
      'INSERT INTO service_templates (user_id, name, description, unit, unit_price, tax_rate) VALUES (?, ?, ?, ?, ?, ?) RETURNING id',
      [req.userId, name.trim(), description, unit, Number(unit_price) || 0, Number(tax_rate) || 0]
    );

    res.status(201).json(await getOne('SELECT * FROM service_templates WHERE id = ?', [r.lastInsertRowid]));
  } catch (err) {
    console.error('[service-templates POST /]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const tmpl = await getOne('SELECT id FROM service_templates WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
    if (!tmpl) return res.status(404).json({ error: 'Vorlage nicht gefunden' });

    const { name, description, unit, unit_price, tax_rate } = req.body;
    const sets = [], values = [];
    let paramIdx = 1;
    if (name        !== undefined) { sets.push(`name=$${paramIdx++}`);        values.push(name); }
    if (description !== undefined) { sets.push(`description=$${paramIdx++}`); values.push(description); }
    if (unit        !== undefined) { sets.push(`unit=$${paramIdx++}`);        values.push(unit); }
    if (unit_price  !== undefined) { sets.push(`unit_price=$${paramIdx++}`);  values.push(Number(unit_price) || 0); }
    if (tax_rate    !== undefined) { sets.push(`tax_rate=$${paramIdx++}`);    values.push(Number(tax_rate) || 0); }

    if (sets.length > 0) {
      values.push(req.params.id, req.userId);
      const pgClient = await pool.connect();
      try {
        await pgClient.query(
          `UPDATE service_templates SET ${sets.join(', ')} WHERE id = $${paramIdx} AND user_id = $${paramIdx + 1}`,
          values
        );
      } finally {
        pgClient.release();
      }
    }

    res.json(await getOne('SELECT * FROM service_templates WHERE id = ?', [req.params.id]));
  } catch (err) {
    console.error('[service-templates PUT /:id]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const tmpl = await getOne('SELECT id FROM service_templates WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
    if (!tmpl) return res.status(404).json({ error: 'Vorlage nicht gefunden' });

    await run('DELETE FROM service_templates WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
    res.json({ success: true });
  } catch (err) {
    console.error('[service-templates DELETE /:id]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
