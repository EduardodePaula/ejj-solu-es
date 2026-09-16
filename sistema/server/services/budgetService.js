const db = require('../db');

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

module.exports = { recalcBudgetTotals, replaceBudgetItems };
