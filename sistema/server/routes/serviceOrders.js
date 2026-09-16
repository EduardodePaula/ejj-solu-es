const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { nextCode } = require('../services/codeGenerator');

const router = express.Router();
router.use(requireAuth);

router.get('/', (req, res) => {
  const { status } = req.query;
  let rows;
  if (status) {
    rows = db
      .prepare(
        `SELECT so.*, c.name AS client_name FROM service_orders so
         JOIN clients c ON c.id = so.client_id
         WHERE so.status = ? ORDER BY so.created_at DESC`
      )
      .all(status);
  } else {
    rows = db
      .prepare(
        `SELECT so.*, c.name AS client_name FROM service_orders so
         JOIN clients c ON c.id = so.client_id
         ORDER BY so.created_at DESC`
      )
      .all();
  }
  res.json(rows);
});

router.get('/:id', (req, res) => {
  const so = db.prepare('SELECT * FROM service_orders WHERE id = ?').get(req.params.id);
  if (!so) return res.status(404).json({ error: 'Ordem de serviço não encontrada' });
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(so.client_id);
  res.json({ ...so, client });
});

// Permite abrir uma OS avulsa (sem orçamento prévio), ex: chamado corretivo.
router.post('/', (req, res) => {
  const { client_id, description, technician, scheduled_date, total } = req.body || {};
  if (!client_id || !description) {
    return res.status(400).json({ error: 'Informe client_id e descrição' });
  }

  const code = nextCode('OS', 'service_orders');
  const info = db
    .prepare(
      `INSERT INTO service_orders (code, client_id, status, description, technician, scheduled_date, total)
       VALUES (?, ?, 'aberta', ?, ?, ?, ?)`
    )
    .run(code, client_id, description, technician || null, scheduled_date || null, total || 0);

  res.status(201).json(db.prepare('SELECT * FROM service_orders WHERE id = ?').get(info.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const so = db.prepare('SELECT * FROM service_orders WHERE id = ?').get(req.params.id);
  if (!so) return res.status(404).json({ error: 'Ordem de serviço não encontrada' });

  const { status, technician, scheduled_date, description, total } = req.body || {};
  const merged = {
    status: status || so.status,
    technician: technician !== undefined ? technician : so.technician,
    scheduled_date: scheduled_date !== undefined ? scheduled_date : so.scheduled_date,
    description: description !== undefined ? description : so.description,
    total: total !== undefined ? total : so.total,
  };

  const completedAt = merged.status === 'concluida' ? new Date().toISOString() : so.completed_at;

  db.prepare(
    `UPDATE service_orders SET status=?, technician=?, scheduled_date=?, description=?, total=?, completed_at=?, updated_at=datetime('now')
     WHERE id=?`
  ).run(merged.status, merged.technician, merged.scheduled_date, merged.description, merged.total, completedAt, req.params.id);

  res.json(db.prepare('SELECT * FROM service_orders WHERE id = ?').get(req.params.id));
});

module.exports = router;
