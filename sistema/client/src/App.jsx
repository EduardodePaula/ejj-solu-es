import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Clients from './pages/Clients.jsx';
import ClientDetail from './pages/ClientDetail.jsx';
import Catalog from './pages/Catalog.jsx';
import Budgets from './pages/Budgets.jsx';
import BudgetDetail from './pages/BudgetDetail.jsx';
import ServiceOrders from './pages/ServiceOrders.jsx';
import Financial from './pages/Financial.jsx';
import Contracts from './pages/Contracts.jsx';
import ContractDetail from './pages/ContractDetail.jsx';

function PrivateRoute({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/*"
        element={
          <PrivateRoute>
            <Layout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/clientes" element={<Clients />} />
                <Route path="/clientes/:id" element={<ClientDetail />} />
                <Route path="/catalogo" element={<Catalog />} />
                <Route path="/orcamentos" element={<Budgets />} />
                <Route path="/orcamentos/:id" element={<BudgetDetail />} />
                <Route path="/ordens-servico" element={<ServiceOrders />} />
                <Route path="/financeiro" element={<Financial />} />
                <Route path="/contratos" element={<Contracts />} />
                <Route path="/contratos/:id" element={<ContractDetail />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Layout>
          </PrivateRoute>
        }
      />
    </Routes>
  );
}
