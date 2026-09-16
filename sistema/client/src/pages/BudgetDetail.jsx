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
  const [pdfLoading, setPdfLoading] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

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

  // A rota de PDF exige login (Bearer token), então não dá para abrir com um
  // <a href> comum — o navegador não manda o token. Buscamos como blob
  // autenticado e abrimos numa aba nova a partir dele.
  async function handleViewPdf() {
    setError('');
    setPdfLoading(true);
    try {
      const res = await api.get(`/budgets/${id}/pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      window.open(url, '_blank');
    } catch (err) {
      setError('Erro ao gerar PDF do orçamento.');
    } finally {
      setPdfLoading(false);
    }
  }

  if (!budget) return <p>Carregando...</p>;

  const approvalLink = `${window.location.origin}/aprovar/${budget.public_token}`;

  function handleCopyLink() {
    navigator.clipboard.writeText(approvalLink).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  }

  return (
    <div>
      <div className="page-header">
        <h1>Orçamento {budget.code}</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn secondary" onClick={handleViewPdf} disabled={pdfLoading}>
            {pdfLoading ? 'Gerando PDF...' : 'Ver PDF'}
          </button>
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

        {budget.client_signature_name && (
          <p style={{ marginTop: '1rem' }} className="text-muted">
            ✅ Aprovado pelo próprio cliente (<strong>{budget.client_signature_name}</strong>) em{' '}
            {new Date(budget.client_approved_at).toLocaleString('pt-BR')}.
          </p>
        )}
      </div>

      {(budget.status === 'rascunho' || budget.status === 'enviado') && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ marginTop: 0 }}>Link para o cliente aprovar e assinar</h3>
          <p className="text-muted" style={{ marginTop: 0 }}>
            Envie este link para o cliente por WhatsApp ou e-mail. Ele poderá revisar o orçamento e aprovar digitando o
            nome dele, sem precisar de login no sistema.
          </p>
          <div className="share-link-box">
            <input readOnly value={approvalLink} onFocus={(e) => e.target.select()} />
            <button type="button" className="btn small" onClick={handleCopyLink}>
              {linkCopied ? 'Copiado!' : 'Copiar link'}
            </button>
          </div>
        </div>
      )}

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
