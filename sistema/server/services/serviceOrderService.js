const db = require('../db');
const { nextCode } = require('./codeGenerator');

// Cria automaticamente uma Ordem de Serviço a partir de um orçamento aprovado,
// copiando cliente, descrição resumida dos itens e valor total.
function createFromBudget(budget) {
  const items = db.prepare('SELECT description, quantity FROM budget_items WHERE budget_id = ?').all(budget.id);
  const description = items.map((i) => `${i.description} (x${i.quantity})`).join('; ');
  const code = nextCode('OS', 'service_orders');

  const info = db
    .prepare(
      `INSERT INTO service_orders (code, budget_id, client_id, status, description, total)
       VALUES (?, ?, ?, 'aberta', ?, ?)`
    )
    .run(code, budget.id, budget.client_id, description, budget.total);

  return db.prepare('SELECT * FROM service_orders WHERE id = ?').get(info.lastInsertRowid);
}

module.exports = { createFromBudget };
