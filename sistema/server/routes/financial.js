const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { getProvider } = require('../services/boletoProviders');

const router = express.Router();
router.use(requireAuth);

router.get('/receivables', (req, res) => {
  const { status } = req.query;
  let rows;
  if (status) {
    rows = db
      .prepare(
        `SELECT r.*, c.name AS client_name FROM receivables r
         JOIN clients c ON c.id = r.client_id
         WHERE r.status = ? ORDER BY r.due_date`
      )
      .all(status);
  } else {
    rows = db
      .prepare(
        `SELECT r.*, c.name AS client_name FROM receivables r
         JOIN clients c ON c.id = r.client_id
         ORDER BY r.due_date`
      )
      .all();
  }

  const today = new Date().toISOString().slice(0, 10);
  const withOverdue = rows.map((r) => ({
    ...r,
    status: r.status === 'pendente' && r.due_date < today ? 'vencido' : r.status,
  }));

  res.json(withOverdue);
});

router.post('/receivables', (req, res) => {
  const { client_id, description, amount, due_date, contract_id } = req.body || {};
  if (!client_id || !amount || !due_date) {
    return res.status(400).json({ error: 'Informe client_id, amount e due_date' });
  }

  const { nextCode } = require('../services/codeGenerator');
  const code = nextCode('REC', 'receivables');

  const info = db
    .prepare(
      `INSERT INTO receivables (code, client_id, contract_id, description, amount, due_date)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(code, client_id, contract_id || null, description || null, amount, due_date);

  res.status(201).json(db.prepare('SELECT * FROM receivables WHERE id = ?').get(info.lastInsertRowid));
});

router.post('/receivables/:id/pay', (req, res) => {
  const receivable = db.prepare('SELECT * FROM receivables WHERE id = ?').get(req.params.id);
  if (!receivable) return res.status(404).json({ error: 'Conta a receber não encontrada' });

  db.prepare(`UPDATE receivables SET status='pago', paid_at=datetime('now') WHERE id=?`).run(req.params.id);
  res.json(db.prepare('SELECT * FROM receivables WHERE id = ?').get(req.params.id));
});

// Emite um boleto para a conta a receber usando o provider configurado
// (simulado por padrão, ou o banco real assim que as credenciais forem
// preenchidas no .env — ver services/boletoProviders).
router.post('/receivables/:id/boleto', async (req, res) => {
  const receivable = db.prepare('SELECT * FROM receivables WHERE id = ?').get(req.params.id);
  if (!receivable) return res.status(404).json({ error: 'Conta a receber não encontrada' });

  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(receivable.client_id);

  try {
    const provider = getProvider();
    const result = await provider.emitBoleto(receivable, client);

    const info = db
      .prepare(
        `INSERT INTO boletos (receivable_id, provider, provider_status, nosso_numero, linha_digitavel, barcode, pdf_url, raw_response)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        receivable.id,
        result.provider,
        result.provider_status,
        result.nosso_numero,
        result.linha_digitavel,
        result.barcode,
        result.pdf_url,
        result.raw_response
      );

    res.status(201).json(db.prepare('SELECT * FROM boletos WHERE id = ?').get(info.lastInsertRowid));
  } catch (err) {
    res.status(502).json({ error: `Falha ao emitir boleto: ${err.message}` });
  }
});

router.get('/receivables/:id/boletos', (req, res) => {
  const rows = db
    .prepare('SELECT * FROM boletos WHERE receivable_id = ? ORDER BY created_at DESC')
    .all(req.params.id);
  res.json(rows);
});

router.get('/summary', (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = today.slice(0, 7) + '-01';

  const pendente = db
    .prepare("SELECT COALESCE(SUM(amount),0) AS v FROM receivables WHERE status='pendente' AND due_date >= ?")
    .get(today).v;
  const vencido = db
    .prepare("SELECT COALESCE(SUM(amount),0) AS v FROM receivables WHERE status='pendente' AND due_date < ?")
    .get(today).v;
  const recebidoMes = db
    .prepare("SELECT COALESCE(SUM(amount),0) AS v FROM receivables WHERE status='pago' AND paid_at >= ?")
    .get(monthStart).v;

  res.json({ pendente, vencido, recebido_mes: recebidoMes });
});

module.exports = router;
