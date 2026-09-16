const db = require('../db');
const { nextCode } = require('./codeGenerator');

// Gera automaticamente uma conta a receber quando um orçamento é aprovado /
// uma OS é concluída, evitando lançamento manual no financeiro.
function createReceivable({ client_id, service_order_id, contract_id, description, amount, dueInDays }) {
  const code = nextCode('REC', 'receivables');
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + (dueInDays !== undefined ? dueInDays : 7));

  const info = db
    .prepare(
      `INSERT INTO receivables (code, client_id, service_order_id, contract_id, description, amount, due_date)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(code, client_id, service_order_id || null, contract_id || null, description || null, amount, dueDate.toISOString().slice(0, 10));

  return db.prepare('SELECT * FROM receivables WHERE id = ?').get(info.lastInsertRowid);
}

module.exports = { createReceivable };
