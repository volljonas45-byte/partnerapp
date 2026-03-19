const express = require('express');
const db = require('../db/database');
const authenticate = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

router.get('/', (req, res) => {
  const rows = db.prepare(
    'SELECT * FROM service_templates WHERE user_id = ? ORDER BY name ASC'
  ).all(req.userId);
  res.json(rows);
});

router.post('/', (req, res) => {
  const { name, description = '', unit = 'Stunde', unit_price = 0, tax_rate = 19 } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'name ist erforderlich' });

  const r = db.prepare(
    'INSERT INTO service_templates (user_id, name, description, unit, unit_price, tax_rate) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(req.userId, name.trim(), description, unit, Number(unit_price) || 0, Number(tax_rate) || 0);

  res.status(201).json(db.prepare('SELECT * FROM service_templates WHERE id = ?').get(r.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const tmpl = db.prepare('SELECT id FROM service_templates WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!tmpl) return res.status(404).json({ error: 'Vorlage nicht gefunden' });

  const { name, description, unit, unit_price, tax_rate } = req.body;
  const sets = [], values = [];
  if (name        !== undefined) { sets.push('name=?');        values.push(name); }
  if (description !== undefined) { sets.push('description=?'); values.push(description); }
  if (unit        !== undefined) { sets.push('unit=?');        values.push(unit); }
  if (unit_price  !== undefined) { sets.push('unit_price=?');  values.push(Number(unit_price) || 0); }
  if (tax_rate    !== undefined) { sets.push('tax_rate=?');    values.push(Number(tax_rate) || 0); }

  if (sets.length > 0) {
    db.prepare(`UPDATE service_templates SET ${sets.join(', ')} WHERE id = ? AND user_id = ?`)
      .run(...values, req.params.id, req.userId);
  }

  res.json(db.prepare('SELECT * FROM service_templates WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  const tmpl = db.prepare('SELECT id FROM service_templates WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!tmpl) return res.status(404).json({ error: 'Vorlage nicht gefunden' });

  db.prepare('DELETE FROM service_templates WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  res.json({ success: true });
});

module.exports = router;
