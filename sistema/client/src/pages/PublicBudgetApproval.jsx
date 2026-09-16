import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api';

function fmt(v) {
  return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const STATUS_LABEL = {
  rascunho: 'Aguardando sua aprovação',
  enviado: 'Aguardando sua aprovação',
  aprovado: 'Aprovado',
  rejeitado: 'Rejeitado',
};

// Página pública (sem login) que o cliente acessa pelo link enviado pela
// EJJ Soluções para revisar e aprovar/assinar o orçamento com o próprio nome.
export default function PublicBudgetApproval() {
  const { token } = useParams();
  const [budget, setBudget] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function load() {
    api
      .get(`/public/budgets/${token}`)
      .then((res) => setBudget(res.data))
      .catch(() => setNotFound(true));
  }

  useEffect(load, [token]);

  async function handleApprove(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post(`/public/budgets/${token}/approve`, { name });
      setBudget(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao aprovar orçamento.');
    } finally {
      setLoading(false);
    }
  }

  async function handleReject() {
    if (!confirm('Tem certeza que deseja recusar este orçamento?')) return;
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post(`/public/budgets/${token}/reject`);
      setBudget(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao recusar orçamento.');
    } finally {
      setLoading(false);
    }
  }

  if (notFound) {
    return (
      <div className="public-page">
        <div className="public-header">
          <img src="/logo.jpg" alt="EJJ Soluções" />
          <span>EJJ Soluções</span>
        </div>
        <div className="public-content">
          <div className="card">
            <p>Link inválido ou orçamento não encontrado. Fale com a EJJ Soluções para receber um novo link.</p>
          </div>
        </div>
      </div>
    );
  }

  if (!budget) return <p style={{ padding: '2rem' }}>Carregando...</p>;

  const pending = budget.status === 'rascunho' || budget.status === 'enviado';

  return (
    <div className="public-page">
      <div className="public-header">
        <img src="/logo.jpg" alt="EJJ Soluções" />
          <span>EJJ Soluções</span>
      </div>

      <div className="public-content">
        <div className="page-header">
          <h1>Orçamento {budget.code}</h1>
          <a className="btn secondary" href={`/api/public/budgets/${token}/pdf`} target="_blank" rel="noreferrer">
            Baixar PDF
          </a>
        </div>

        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <p>
            <strong>Cliente:</strong> {budget.client.name}
          </p>
          <p>
            <strong>Status:</strong>{' '}
            <span className={`badge ${budget.status === 'aprovado' ? 'green' : budget.status === 'rejeitado' ? 'danger' : 'warning'}`}>
              {STATUS_LABEL[budget.status] || budget.status}
            </span>
          </p>
          <p>
            <strong>Validade:</strong> {budget.validity_days} dias a contar da emissão em{' '}
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
            {budget.discount_value > 0 && <div>Desconto ({budget.discount_pct}%): -{fmt(budget.discount_value)}</div>}
            <strong style={{ fontSize: '1.2rem' }}>Total: {fmt(budget.total)}</strong>
          </div>
        </div>

        {pending && (
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Aprovar orçamento</h3>
            <p className="text-muted">
              Ao aprovar, você confirma que leu e concorda com os itens e valores acima. Digite seu nome completo como
              assinatura.
            </p>
            <form onSubmit={handleApprove}>
              <label>Nome completo *</label>
              <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Digite seu nome completo" />

              {error && <p className="error-text">{error}</p>}

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.25rem' }}>
                <button className="btn" disabled={loading}>
                  {loading ? 'Enviando...' : 'Aprovar e assinar'}
                </button>
                <button type="button" className="btn danger" disabled={loading} onClick={handleReject}>
                  Recusar orçamento
                </button>
              </div>
            </form>
          </div>
        )}

        {budget.status === 'aprovado' && (
          <div className="card">
            <p style={{ margin: 0 }}>
              ✅ Orçamento aprovado por <strong>{budget.client_signature_name}</strong> em{' '}
              {new Date(budget.client_approved_at).toLocaleString('pt-BR')}.
            </p>
          </div>
        )}

        {budget.status === 'rejeitado' && (
          <div className="card">
            <p style={{ margin: 0 }}>Este orçamento foi recusado.</p>
          </div>
        )}
      </div>
    </div>
  );
}
