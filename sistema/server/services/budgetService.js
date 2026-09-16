const db = require('../db');
const { createFromBudget } = require('./serviceOrderService');
const { createReceivable } = require('./financialService');

// Recalcula subtotal/desconto/total de um orçamento a partir dos seus itens.
// Isso é o que permite "gerar orçamentos de forma automática": a partir de uma
// lista de itens do catálogo (ou avulsos) e um percentual de desconto, o
// sistema calcula os valores sem intervenção manual.
function recalcBudgetTotals(budgetId) {
  const items = db.prepare('SELECT * FROM budget_items WHERE budget_id = ?').all(budgetId);
  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const budget = db.prepare('SELECT * FROM budgets WHERE id = ?').get(budgetId);

  const discountValue = subtotal * ((budget.discount_pct || 0) / 100);
  const total = subtotal - discountValue;

  db.prepare(
    `UPDATE budgets SET subtotal=?, discount_value=?, total=?, updated_at=datetime('now') WHERE id=?`
  ).run(subtotal, discountValue, total, budgetId);

  return db.prepare('SELECT * FROM budgets WHERE id = ?').get(budgetId);
}

function replaceBudgetItems(budgetId, items) {
  const del = db.prepare('DELETE FROM budget_items WHERE budget_id = ?');
  const insert = db.prepare(
    `INSERT INTO budget_items (budget_id, catalog_item_id, description, quantity, unit_price, total)
     VALUES (?, ?, ?, ?, ?, ?)`
  );

  const tx = db.transaction((rows) => {
    del.run(budgetId);
    rows.forEach((item) => {
      const quantity = Number(item.quantity || 1);
      const unitPrice = Number(item.unit_price || 0);
      insert.run(
        budgetId,
        item.catalog_item_id || null,
        item.description,
        quantity,
        unitPrice,
        quantity * unitPrice
      );
    });
  });

  tx(items);
  return recalcBudgetTotals(budgetId);
}

// Aprova um orçamento (seja pelo dono do sistema ou pelo próprio cliente via
// link público) e gera automaticamente a Ordem de Serviço e a conta a
// receber correspondentes. Compartilhada pelas duas rotas para não duplicar
// essa regra de negócio.
function approveBudget(budgetId, { clientSignatureName } = {}) {
  const budget = db.prepare('SELECT * FROM budgets WHERE id = ?').get(budgetId);
  if (!budget) {
    const err = new Error('Orçamento não encontrado');
    err.status = 404;
    throw err;
  }
  if (budget.status === 'aprovado') {
    const err = new Error('Orçamento já aprovado');
    err.status = 400;
    throw err;
  }
  if (budget.status === 'rejeitado') {
    const err = new Error('Orçamento já foi rejeitado e não pode mais ser aprovado');
    err.status = 400;
    throw err;
  }

  if (clientSignatureName) {
    db.prepare(
      `UPDATE budgets SET status='aprovado', approved_at=datetime('now'), updated_at=datetime('now'),
         client_signature_name=?, client_approved_at=datetime('now') WHERE id=?`
    ).run(clientSignatureName, budgetId);
  } else {
    db.prepare(
      `UPDATE budgets SET status='aprovado', approved_at=datetime('now'), updated_at=datetime('now') WHERE id=?`
    ).run(budgetId);
  }

  const updatedBudget = db.prepare('SELECT * FROM budgets WHERE id = ?').get(budgetId);
  const serviceOrder = createFromBudget(updatedBudget);
  const receivable = createReceivable({
    client_id: updatedBudget.client_id,
    service_order_id: serviceOrder.id,
    description: `Referente ao orçamento ${updatedBudget.code} / OS ${serviceOrder.code}`,
    amount: updatedBudget.total,
    dueInDays: 7,
  });

  return { serviceOrder, receivable };
}

function rejectBudget(budgetId) {
  const budget = db.prepare('SELECT * FROM budgets WHERE id = ?').get(budgetId);
  if (!budget) {
    const err = new Error('Orçamento não encontrado');
    err.status = 404;
    throw err;
  }
  if (budget.status === 'aprovado') {
    const err = new Error('Orçamento já foi aprovado e não pode mais ser rejeitado');
    err.status = 400;
    throw err;
  }

  db.prepare(
    `UPDATE budgets SET status='rejeitado', rejected_at=datetime('now'), updated_at=datetime('now') WHERE id=?`
  ).run(budgetId);
}

module.exports = { recalcBudgetTotals, replaceBudgetItems, approveBudget, rejectBudget };
