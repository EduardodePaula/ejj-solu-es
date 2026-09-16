const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/', (req, res) => {
  const totalClients = db.prepare('SELECT COUNT(*) AS c FROM clients').get().c;
  const budgetsPending = db.prepare("SELECT COUNT(*) AS c FROM budgets WHERE status IN ('rascunho','enviado')").get().c;
  const budgetsApprovedValue = db
    .prepare("SELECT COALESCE(SUM(total),0) AS v FROM budgets WHERE status = 'aprovado'")
    .get().v;
  const openServiceOrders = db.prepare("SELECT COUNT(*) AS c FROM service_orders WHERE status != 'concluida'").get().c;
  const activeContracts = db.prepare("SELECT COUNT(*) AS c FROM contracts WHERE status = 'ativo'").get().c;

  const today = new Date().toISOString().slice(0, 10);
  const monthStart = today.slice(0, 7) + '-01';
  const receivablePending = db
    .prepare("SELECT COALESCE(SUM(amount),0) AS v FROM receivables WHERE status='pendente' AND due_date >= ?")
    .get(today).v;
  const receivableOverdue = db
    .prepare("SELECT COALESCE(SUM(amount),0) AS v FROM receivables WHERE status='pendente' AND due_date < ?")
    .get(today).v;
  const receivedThisMonth = db
    .prepare("SELECT COALESCE(SUM(amount),0) AS v FROM receivables WHERE status='pago' AND paid_at >= ?")
    .get(monthStart).v;

  const in30Days = new Date();
  in30Days.setDate(in30Days.getDate() + 30);
  const contractsExpiringSoon = db
    .prepare("SELECT * FROM contracts WHERE status='ativo' AND end_date <= ? ORDER BY end_date")
    .all(in30Days.toISOString().slice(0, 10));

  const recentBudgets = db
    .prepare(
      `SELECT b.*, c.name AS client_name FROM budgets b
       JOIN clients c ON c.id = b.client_id
       ORDER BY b.created_at DESC LIMIT 5`
    )
    .all();

  res.json({
    totalClients,
    budgetsPending,
    budgetsApprovedValue,
    openServiceOrders,
    activeContracts,
    financial: {
      pendente: receivablePending,
      vencido: receivableOverdue,
      recebido_mes: receivedThisMonth,
    },
    contractsExpiringSoon,
    recentBudgets,
  });
});

module.exports = router;
