const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { lookupCnpj } = require('../services/cnpjLookup');

const router = express.Router();
router.use(requireAuth);

// Consulta pública de CNPJ para pré-preencher o cadastro automaticamente.
// Precisa vir antes de "/:id" para não ser interpretada como um ID de cliente.
router.get('/cnpj/:cnpj', async (req, res) => {
  try {
    const data = await lookupCnpj(req.params.cnpj);
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

router.get('/', (req, res) => {
  const { q } = req.query;
  let rows;
  if (q) {
    rows = db
      .prepare('SELECT * FROM clients WHERE name LIKE ? OR document LIKE ? OR email LIKE ? ORDER BY name')
      .all(`%${q}%`, `%${q}%`, `%${q}%`);
  } else {
    rows = db.prepare('SELECT * FROM clients ORDER BY name').all();
  }
  res.json(rows);
});

router.get('/:id', (req, res) => {
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);
  if (!client) return res.status(404).json({ error: 'Cliente não encontrado' });

  const budgets = db.prepare('SELECT * FROM budgets WHERE client_id = ? ORDER BY created_at DESC').all(client.id);
  const serviceOrders = db.prepare('SELECT * FROM service_orders WHERE client_id = ? ORDER BY created_at DESC').all(client.id);
  const contracts = db.prepare('SELECT * FROM contracts WHERE client_id = ? ORDER BY created_at DESC').all(client.id);

  res.json({ ...client, budgets, serviceOrders, contracts });
});

router.post('/', (req, res) => {
  const { name, document, type, email, phone, address, city, state, zip, notes } = req.body || {};
  if (!name) return res.status(400).json({ error: 'Nome é obrigatório' });

  const info = db
    .prepare(
      `INSERT INTO clients (name, document, type, email, phone, address, city, state, zip, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(name, document || null, type || 'pessoa_fisica', email || null, phone || null, address || null, city || null, state || null, zip || null, notes || null);

  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(client);
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Cliente não encontrado' });

  const merged = { ...existing, ...req.body };
  db.prepare(
    `UPDATE clients SET name=?, document=?, type=?, email=?, phone=?, address=?, city=?, state=?, zip=?, notes=?, updated_at=datetime('now')
     WHERE id=?`
  ).run(
    merged.name,
    merged.document,
    merged.type,
    merged.email,
    merged.phone,
    merged.address,
    merged.city,
    merged.state,
    merged.zip,
    merged.notes,
    req.params.id
  );

  res.json(db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM clients WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

module.exports = router;
