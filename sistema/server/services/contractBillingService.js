const db = require('../db');
const { createReceivable } = require('./financialService');

// Gera automaticamente a conta a receber mensal de cada contrato de
// manutenção preventiva ativo, evitando lançamento manual todo mês.
// Pensado para ser chamado uma vez por dia (via cron do cPanel, por exemplo)
// batendo em /api/cron/generate-contract-receivables.
function generateMonthlyReceivables() {
  const today = new Date();
  const monthKey = today.toISOString().slice(0, 7); // YYYY-MM

  const contracts = db.prepare("SELECT * FROM contracts WHERE status = 'ativo'").all();
  const created = [];

  for (const contract of contracts) {
    const already = db
      .prepare(
        `SELECT id FROM receivables
         WHERE contract_id = ? AND strftime('%Y-%m', due_date) = ?`
      )
      .get(contract.id, monthKey);

    if (already) continue;

    const dueDate = new Date(today.getFullYear(), today.getMonth(), contract.payment_day || 10);

    const receivable = createReceivable({
      client_id: contract.client_id,
      contract_id: contract.id,
      description: `Mensalidade do contrato de manutenção ${contract.code}`,
      amount: contract.monthly_value,
      dueInDays: Math.round((dueDate - today) / (1000 * 60 * 60 * 24)),
    });

    created.push(receivable);
  }

  return created;
}

module.exports = { generateMonthlyReceivables };
