import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api';

function fmt(v) {
  return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function BudgetDetail() {
  const { id } = useParams();
  const [budget, setBudget] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  function load() {
    api.get(`/budgets/${id}`).then((res) => setBudget(res.data));
  }

  useEffect(load, [id]);

  async function handleAction(action) {
    setError('');
    try {
      const { data } = await api.post(`/budgets/${id}/${action}`);
      if (action === 'approve') setResult(data);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao processar');
    }
  }

  if (!budget) return <p>Carregando...</p>;

  return (
    <div>
      <div className="page-header">
        <h1>Orçamento {budget.code}</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <a className="btn secondary" href={`/api/budgets/${id}/pdf`} target="_blank" rel="noreferrer">
            Ver PDF
          </a>
          <Link className="btn secondary" to="/orcamentos">
            Voltar
          </Link>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <p>
          <strong>Cliente:</strong> {budget.client.name} &nbsp;|&nbsp; <strong>Status:</strong>{' '}
          <span className="badge green">{budget.status}</span>
        </p>
        <p>
          <strong>Validade:</strong> {budget.validity_days} dias &nbsp;|&nbsp; <strong>Criado em:</strong>{' '}
          {new Date(budget.created_at).toLocaleDateString('pt-BR')}
        </p>

        <table style={{ marginTop: '1rem' }}>
          <thead>
            <tr>
              <th>Descrição</th>
              <th>Qtd</th>
              <th>Preço un.</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {budget.items.map((item) => (
              <tr key={item.id}>
                <td>{item.description}</td>
                <td>{item.quantity}</td>
                <td>{fmt(item.unit_price)}</td>
                <td>{fmt(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ marginTop: '1rem', textAlign: 'right' }}>
          <div>Subtotal: {fmt(budget.subtotal)}</div>
          <div>Desconto: {fmt(budget.discount_value)}</div>
          <strong style={{ fontSize: '1.2rem' }}>Total: {fmt(budget.total)}</strong>
        </div>

        {error && <p className="error-text">{error}</p>}

        {budget.status === 'rascunho' && (
          <div style={{ marginTop: '1.25rem', display: 'flex', gap: '0.5rem' }}>
            <button className="btn secondary" onClick={() => handleAction('send')}>
              Marcar como enviado
            </button>
            <button className="btn" onClick={() => handleAction('approve')}>
              Aprovar (gera OS + conta a receber)
            </button>
            <button className="btn danger" onClick={() => handleAction('reject')}>
              Rejeitar
            </button>
          </div>
        )}
        {budget.status === 'enviado' && (
          <div style={{ marginTop: '1.25rem', display: 'flex', gap: '0.5rem' }}>
            <button className="btn" onClick={() => handleAction('approve')}>
              Aprovar (gera OS + conta a receber)
            </button>
            <button className="btn danger" onClick={() => handleAction('reject')}>
              Rejeitar
            </button>
          </div>
        )}
      </div>

      {result && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Gerado automaticamente após a aprovação</h3>
          <p>
            Ordem de serviço: <strong>{result.serviceOrder.code}</strong> —{' '}
            <Link to="/ordens-servico">ver ordens de serviço</Link>
          </p>
          <p>
            Conta a receber: <strong>{result.receivable.code}</strong> — vencimento em{' '}
            {new Date(result.receivable.due_date).toLocaleDateString('pt-BR')} —{' '}
            <Link to="/financeiro">ver financeiro</Link>
          </p>
        </div>
      )}
    </div>
  );
}
