const express = require('express');
const db = require('../db');
const { approveBudget, rejectBudget } = require('../services/budgetService');
const { renderBudgetPdf } = require('../services/pdfService');

const router = express.Router();

// Rotas SEM autenticação: o token aleatório do orçamento (48 caracteres hex)
// é o próprio "segredo" que dá acesso a este orçamento específico, para o
// cliente poder aprovar/assinar pelo link sem precisar de login no sistema.
function getBudgetByToken(token) {
  const budget = db.prepare('SELECT * FROM budgets WHERE public_token = ?').get(token);
  if (!budget) return null;
  const items = db
    .prepare(
      `SELECT bi.*, COALESCE(ci.category, 'servico') AS category
       FROM budget_items bi
       LEFT JOIN catalog_items ci ON ci.id = bi.catalog_item_id
       WHERE bi.budget_id = ?`
    )
    .all(budget.id);
  const client = db.prepare('SELECT id, name, document, email, phone FROM clients WHERE id = ?').get(budget.client_id);
  return { ...budget, items, client };
}

router.get('/:token', (req, res) => {
  const budget = getBudgetByToken(req.params.token);
  if (!budget) return res.status(404).json({ error: 'Orçamento não encontrado' });
  res.json(budget);
});

router.get('/:token/pdf', (req, res) => {
  const budget = getBudgetByToken(req.params.token);
  if (!budget) return res.status(404).json({ error: 'Orçamento não encontrado' });
  renderBudgetPdf(res, budget, budget.client, budget.items);
});

router.post('/:token/approve', (req, res) => {
  const budget = getBudgetByToken(req.params.token);
  if (!budget) return res.status(404).json({ error: 'Orçamento não encontrado' });

  const { name } = req.body || {};
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Informe seu nome completo para confirmar a aprovação.' });
  }

  try {
    approveBudget(budget.id, { clientSignatureName: name.trim() });
    res.json(getBudgetByToken(req.params.token));
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

router.post('/:token/reject', (req, res) => {
  const budget = getBudgetByToken(req.params.token);
  if (!budget) return res.status(404).json({ error: 'Orçamento não encontrado' });

  try {
    rejectBudget(budget.id);
    res.json(getBudgetByToken(req.params.token));
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

module.exports = router;
