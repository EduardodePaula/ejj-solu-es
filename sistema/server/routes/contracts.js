const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { nextCode } = require('../services/codeGenerator');
const { generateContractText } = require('../clauseTemplates');
const { renderContractPdf } = require('../services/pdfService');

const router = express.Router();
router.use(requireAuth);

router.get('/', (req, res) => {
  const rows = db
    .prepare(
      `SELECT ct.*, cl.name AS client_name FROM contracts ct
       JOIN clients cl ON cl.id = ct.client_id
       ORDER BY ct.created_at DESC`
    )
    .all();
  res.json(rows);
});

router.get('/:id', (req, res) => {
  const contract = db.prepare('SELECT * FROM contracts WHERE id = ?').get(req.params.id);
  if (!contract) return res.status(404).json({ error: 'Contrato não encontrado' });
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(contract.client_id);
  res.json({ ...contract, client });
});

// Cria o contrato e já gera automaticamente o texto completo com as cláusulas
// aplicáveis, a partir dos parâmetros informados (frequência, SLA, equipamentos
// cobertos, valor, vigência, renovação automática etc.)
router.post('/', (req, res) => {
  const {
    client_id,
    frequency,
    equipment_covered,
    sla_hours,
    monthly_value,
    duration_months,
    auto_renew,
    payment_day,
    start_date,
  } = req.body || {};

  if (!client_id || !monthly_value || !start_date) {
    return res.status(400).json({ error: 'Informe client_id, monthly_value e start_date' });
  }

  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(client_id);
  if (!client) return res.status(404).json({ error: 'Cliente não encontrado' });

  const code = nextCode('CTR', 'contracts');
  const durationMonths = duration_months || 12;

  const endDate = new Date(start_date);
  endDate.setMonth(endDate.getMonth() + durationMonths);

  const contractDraft = {
    code,
    frequency: frequency || 'mensal',
    equipment_covered: equipment_covered || null,
    sla_hours: sla_hours || 24,
    monthly_value,
    duration_months: durationMonths,
    auto_renew: auto_renew === undefined ? 1 : (auto_renew ? 1 : 0),
    payment_day: payment_day || 10,
    start_date,
  };

  const generatedText = generateContractText(contractDraft, client);

  const info = db
    .prepare(
      `INSERT INTO contracts
        (code, client_id, status, frequency, equipment_covered, sla_hours, monthly_value,
         duration_months, auto_renew, payment_day, start_date, end_date, generated_text)
       VALUES (?, ?, 'ativo', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      code,
      client_id,
      contractDraft.frequency,
      contractDraft.equipment_covered,
      contractDraft.sla_hours,
      contractDraft.monthly_value,
      contractDraft.duration_months,
      contractDraft.auto_renew,
      contractDraft.payment_day,
      start_date,
      endDate.toISOString().slice(0, 10),
      generatedText
    );

  res.status(201).json(db.prepare('SELECT * FROM contracts WHERE id = ?').get(info.lastInsertRowid));
});

// Regenera o texto do contrato (útil após editar algum parâmetro).
router.put('/:id', (req, res) => {
  const contract = db.prepare('SELECT * FROM contracts WHERE id = ?').get(req.params.id);
  if (!contract) return res.status(404).json({ error: 'Contrato não encontrado' });

  const merged = { ...contract, ...req.body };
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(merged.client_id);

  const endDate = new Date(merged.start_date);
  endDate.setMonth(endDate.getMonth() + Number(merged.duration_months));

  const generatedText = generateContractText(merged, client);

  db.prepare(
    `UPDATE contracts SET status=?, frequency=?, equipment_covered=?, sla_hours=?, monthly_value=?,
       duration_months=?, auto_renew=?, payment_day=?, start_date=?, end_date=?, generated_text=?, updated_at=datetime('now')
     WHERE id=?`
  ).run(
    merged.status,
    merged.frequency,
    merged.equipment_covered,
    merged.sla_hours,
    merged.monthly_value,
    merged.duration_months,
    merged.auto_renew,
    merged.payment_day,
    merged.start_date,
    endDate.toISOString().slice(0, 10),
    generatedText,
    req.params.id
  );

  res.json(db.prepare('SELECT * FROM contracts WHERE id = ?').get(req.params.id));
});

router.post('/:id/cancel', (req, res) => {
  db.prepare(`UPDATE contracts SET status='cancelado', updated_at=datetime('now') WHERE id=?`).run(req.params.id);
  res.json(db.prepare('SELECT * FROM contracts WHERE id = ?').get(req.params.id));
});

router.get('/:id/pdf', (req, res) => {
  const contract = db.prepare('SELECT * FROM contracts WHERE id = ?').get(req.params.id);
  if (!contract) return res.status(404).json({ error: 'Contrato não encontrado' });
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(contract.client_id);
  renderContractPdf(res, contract, client);
});

module.exports = router;
