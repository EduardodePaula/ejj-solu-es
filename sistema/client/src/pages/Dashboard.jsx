import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

function fmt(v) {
  return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function Dashboard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/dashboard').then((res) => setData(res.data));
  }, []);

  if (!data) return <p>Carregando...</p>;

  return (
    <div>
      <div className="page-header">
        <h1>Visão geral</h1>
      </div>

      <div className="grid-cards">
        <div className="card stat-card">
          <div className="label">Clientes cadastrados</div>
          <div className="value">{data.totalClients}</div>
        </div>
        <div className="card stat-card warning">
          <div className="label">Orçamentos em aberto</div>
          <div className="value">{data.budgetsPending}</div>
        </div>
        <div className="card stat-card">
          <div className="label">Ordens de serviço em andamento</div>
          <div className="value">{data.openServiceOrders}</div>
        </div>
        <div className="card stat-card green">
          <div className="label">Contratos ativos</div>
          <div className="value">{data.activeContracts}</div>
        </div>
      </div>

      <div className="grid-cards">
        <div className="card stat-card">
          <div className="label">A receber (em dia)</div>
          <div className="value">{fmt(data.financial.pendente)}</div>
        </div>
        <div className="card stat-card danger">
          <div className="label">A receber (vencido)</div>
          <div className="value">{fmt(data.financial.vencido)}</div>
        </div>
        <div className="card stat-card green">
          <div className="label">Recebido este mês</div>
          <div className="value">{fmt(data.financial.recebido_mes)}</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ marginTop: 0 }}>Orçamentos recentes</h3>
        <table>
          <thead>
            <tr>
              <th>Código</th>
              <th>Cliente</th>
              <th>Status</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {data.recentBudgets.map((b) => (
              <tr key={b.id}>
                <td>
                  <Link to={`/orcamentos/${b.id}`}>{b.code}</Link>
                </td>
                <td>{b.client_name}</td>
                <td>{b.status}</td>
                <td>{fmt(b.total)}</td>
              </tr>
            ))}
            {data.recentBudgets.length === 0 && (
              <tr>
                <td colSpan={4} className="text-muted">
                  Nenhum orçamento ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {data.contractsExpiringSoon.length > 0 && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Contratos vencendo em até 30 dias</h3>
          <table>
            <thead>
              <tr>
                <th>Código</th>
                <th>Vencimento</th>
              </tr>
            </thead>
            <tbody>
              {data.contractsExpiringSoon.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link to={`/contratos/${c.id}`}>{c.code}</Link>
                  </td>
                  <td>{new Date(c.end_date).toLocaleDateString('pt-BR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
