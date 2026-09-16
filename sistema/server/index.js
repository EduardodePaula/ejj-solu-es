require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');

require('./seed');

const authRoutes = require('./routes/auth');
const clientsRoutes = require('./routes/clients');
const catalogRoutes = require('./routes/catalog');
const budgetsRoutes = require('./routes/budgets');
const serviceOrdersRoutes = require('./routes/serviceOrders');
const financialRoutes = require('./routes/financial');
const contractsRoutes = require('./routes/contracts');
const dashboardRoutes = require('./routes/dashboard');
const cronRoutes = require('./routes/cron');
const publicBudgetsRoutes = require('./routes/publicBudgets');
const proposalAi = require('./services/proposalAi');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/clients', clientsRoutes);
app.use('/api/catalog', catalogRoutes);
app.use('/api/budgets', budgetsRoutes);
app.use('/api/service-orders', serviceOrdersRoutes);
app.use('/api/financial', financialRoutes);
app.use('/api/contracts', contractsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/cron', cronRoutes);
app.use('/api/public/budgets', publicBudgetsRoutes);

app.get('/api/health', (req, res) => res.json({ ok: true }));

// Serve o build do frontend (React/Vite) em produção.
const clientDist = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDist));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(clientDist, 'index.html'), (err) => {
    if (err) next();
  });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`[server] Sistema EJJ rodando na porta ${PORT}`);
  proposalAi.logStatus();
});
