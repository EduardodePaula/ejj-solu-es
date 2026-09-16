const express = require('express');
const crypto = require('crypto');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { nextCode } = require('../services/codeGenerator');
const { replaceBudgetItems, recalcBudgetTotals, approveBudget, rejectBudget } = require('../services/budgetService');
const { renderBudgetPdf } = require('../services/pdfService');

const router = express.Router();
router.use(requireAuth);

function getFullBudget(id) {
  const budget = db.prepare('SELECT * FROM budgets WHERE id = ?').get(id);
  if (!budget) return null;
  // category/unit/catalog_description vêm do catálogo para o PDF conseguir
  // separar equipamentos de mão de obra, mostrar a unidade de medida ao lado
  // da quantidade e compor o escopo do projeto automaticamente a partir dos
  // itens adicionados; itens avulsos (sem catalog_item_id) usam os padrões.
  const items = db
    .prepare(
      `SELECT bi.*, COALESCE(ci.category, 'servico') AS category,
              COALESCE(ci.unit, 'un') AS unit, ci.description AS catalog_description
       FROM budget_items bi
       LEFT JOIN catalog_items ci ON ci.id = bi.catalog_item_id
       WHERE bi.budget_id = ?`
    )
    .all(id);
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(budget.client_id);
  return { ...budget, items, client };
}

router.get('/', (req, res) => {
  const rows = db
    .prepare(
      `SELECT b.*, c.name AS client_name FROM budgets b
       JOIN clients c ON c.id = b.client_id
       ORDER BY b.created_at DESC`
    )
    .all();
  res.json(rows);
});

router.get('/:id', (req, res) => {
  const budget = getFullBudget(req.params.id);
  if (!budget) return res.status(404).json({ error: 'Orçamento não encontrado' });
  res.json(budget);
});

// Cria um orçamento automaticamente a partir do cliente + itens (do catálogo
// ou avulsos) + percentual de desconto. Os totais são calculados pelo backend.
router.post('/', (req, res) => {
  const { client_id, items, discount_pct, validity_days, notes } = req.body || {};
  if (!client_id || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Informe client_id e ao menos um item' });
  }

  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(client_id);
  if (!client) return res.status(404).json({ error: 'Cliente não encontrado' });

  // resolve itens vindos do catálogo (preenche descrição/preço se não vierem)
  const resolvedItems = items.map((item) => {
    if (item.catalog_item_id) {
      const catalogItem = db.prepare('SELECT * FROM catalog_items WHERE id = ?').get(item.catalog_item_id);
      if (catalogItem) {
        return {
          catalog_item_id: catalogItem.id,
          description: item.description || catalogItem.name,
          quantity: item.quantity || 1,
          unit_price: item.unit_price !== undefined ? item.unit_price : catalogItem.unit_price,
        };
      }
    }
    return {
      catalog_item_id: null,
      description: item.description,
      quantity: item.quantity || 1,
      unit_price: item.unit_price || 0,
    };
  });

  const code = nextCode('ORC', 'budgets');
  const publicToken = crypto.randomBytes(24).toString('hex');
  const info = db
    .prepare(
      `INSERT INTO budgets (code, client_id, status, discount_pct, validity_days, notes, public_token)
       VALUES (?, ?, 'rascunho', ?, ?, ?, ?)`
    )
    .run(code, client_id, discount_pct || 0, validity_days || 15, notes || null, publicToken);

  replaceBudgetItems(info.lastInsertRowid, resolvedItems);

  res.status(201).json(getFullBudget(info.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const budget = db.prepare('SELECT * FROM budgets WHERE id = ?').get(req.params.id);
  if (!budget) return res.status(404).json({ error: 'Orçamento não encontrado' });
  if (budget.status !== 'rascunho') {
    return res.status(400).json({ error: 'Somente orçamentos em rascunho podem ser editados' });
  }

  const { items, discount_pct, validity_days, notes } = req.body || {};

  db.prepare(
    `UPDATE budgets SET discount_pct=?, validity_days=?, notes=?, updated_at=datetime('now') WHERE id=?`
  ).run(
    discount_pct !== undefined ? discount_pct : budget.discount_pct,
    validity_days !== undefined ? validity_days : budget.validity_days,
    notes !== undefined ? notes : budget.notes,
    req.params.id
  );

  if (Array.isArray(items)) {
    replaceBudgetItems(req.params.id, items);
  } else {
    recalcBudgetTotals(req.params.id);
  }

  res.json(getFullBudget(req.params.id));
});

router.post('/:id/send', (req, res) => {
  const budget = db.prepare('SELECT * FROM budgets WHERE id = ?').get(req.params.id);
  if (!budget) return res.status(404).json({ error: 'Orçamento não encontrado' });

  db.prepare(`UPDATE budgets SET status='enviado', updated_at=datetime('now') WHERE id=?`).run(req.params.id);
  res.json(getFullBudget(req.params.id));
});

// Aprovar orçamento: muda status e gera automaticamente a Ordem de Serviço.
router.post('/:id/approve', (req, res) => {
  try {
    const { serviceOrder, receivable } = approveBudget(req.params.id);
    res.json({ budget: getFullBudget(req.params.id), serviceOrder, receivable });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

router.post('/:id/reject', (req, res) => {
  try {
    rejectBudget(req.params.id);
    res.json(getFullBudget(req.params.id));
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

router.get('/:id/pdf', (req, res) => {
  const budget = getFullBudget(req.params.id);
  if (!budget) return res.status(404).json({ error: 'Orçamento não encontrado' });
  renderBudgetPdf(res, budget, budget.client, budget.items);
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM budgets WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

module.exports = router;
