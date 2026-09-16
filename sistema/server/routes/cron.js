const express = require('express');
const { generateMonthlyReceivables } = require('../services/contractBillingService');

const router = express.Router();

// Endpoint pensado para ser chamado por um Cron Job do cPanel (1x ao dia), ex:
//   curl -X POST -H "x-cron-secret: SEU_SEGREDO" https://seudominio.com/api/cron/generate-contract-receivables
// Não usa login JWT (o cron não tem sessão de usuário), e sim um segredo
// compartilhado definido em CRON_SECRET no .env.
router.post('/generate-contract-receivables', (req, res) => {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers['x-cron-secret'] !== secret) {
    return res.status(401).json({ error: 'Segredo de cron inválido' });
  }

  const created = generateMonthlyReceivables();
  res.json({ created: created.length, receivables: created });
});

module.exports = router;
