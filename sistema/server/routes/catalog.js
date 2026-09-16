const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM catalog_items WHERE active = 1 ORDER BY category, name').all();
  res.json(rows);
});

router.post('/', (req, res) => {
  const { name, description, category, unit_price, unit } = req.body || {};
  if (!name || unit_price === undefined) {
    return res.status(400).json({ error: 'Nome e preço unitário são obrigatórios' });
  }

  const info = db
    .prepare('INSERT INTO catalog_items (name, description, category, unit_price, unit) VALUES (?, ?, ?, ?, ?)')
    .run(name, description || null, category || 'servico', unit_price, unit || 'un');

  res.status(201).json(db.prepare('SELECT * FROM catalog_items WHERE id = ?').get(info.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM catalog_items WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Item não encontrado' });

  const merged = { ...existing, ...req.body };
  db.prepare(
    'UPDATE catalog_items SET name=?, description=?, category=?, unit_price=?, unit=?, active=? WHERE id=?'
  ).run(merged.name, merged.description, merged.category, merged.unit_price, merged.unit, merged.active, req.params.id);

  res.json(db.prepare('SELECT * FROM catalog_items WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  db.prepare("UPDATE catalog_items SET active = 0 WHERE id = ?").run(req.params.id);
  res.status(204).end();
});

module.exports = router;
