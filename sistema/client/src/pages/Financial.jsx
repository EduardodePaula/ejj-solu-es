import { useEffect, useState } from 'react';
import api from '../api';

function fmt(v) {
  return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const statusBadge = { pendente: 'warning', vencido: 'danger', pago: 'green' };

export default function Financial() {
  const [summary, setSummary] = useState(null);
  const [receivables, setReceivables] = useState([]);
  const [boletos, setBoletos] = useState({});
  const [loadingId, setLoadingId] = useState(null);

  function load() {
    api.get('/financial/summary').then((res) => setSummary(res.data));
    api.get('/financial/receivables').then((res) => setReceivables(res.data));
  }

  useEffect(load, []);

  async function handlePay(id) {
    await api.post(`/financial/receivables/${id}/pay`);
    load();
  }

  async function handleBoleto(id) {
    setLoadingId(id);
    try {
      const { data } = await api.post(`/financial/receivables/${id}/boleto`);
      setBoletos((prev) => ({ ...prev, [id]: data }));
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao emitir boleto');
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Financeiro</h1>
      </div>

      {summary && (
        <div className="grid-cards">
          <div className="card stat-card">
            <div className="label">A receber (em dia)</div>
            <div className="value">{fmt(summary.pendente)}</div>
          </div>
          <div className="card stat-card danger">
            <div className="label">A receber (vencido)</div>
            <div className="value">{fmt(summary.vencido)}</div>
          </div>
          <div className="card stat-card green">
            <div className="label">Recebido este mês</div>
            <div className="value">{fmt(summary.recebido_mes)}</div>
          </div>
        </div>
      )}

      <table>
        <thead>
          <tr>
            <th>Código</th>
            <th>Cliente</th>
            <th>Descrição</th>
            <th>Vencimento</th>
            <th>Valor</th>
            <th>Status</th>
            <th>Boleto</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {receivables.map((r) => (
            <tr key={r.id}>
              <td>{r.code}</td>
              <td>{r.client_name}</td>
              <td style={{ maxWidth: 220 }}>{r.description}</td>
              <td>{new Date(r.due_date).toLocaleDateString('pt-BR')}</td>
              <td>{fmt(r.amount)}</td>
              <td>
                <span className={`badge ${statusBadge[r.status] || 'muted'}`}>{r.status}</span>
              </td>
              <td style={{ maxWidth: 220, fontSize: '0.75rem' }}>
                {boletos[r.id]?.linha_digitavel || (r.status !== 'pago' ? '-' : '')}
              </td>
              <td style={{ display: 'flex', gap: '0.35rem' }}>
                {r.status !== 'pago' && (
                  <>
                    <button className="btn small secondary" disabled={loadingId === r.id} onClick={() => handleBoleto(r.id)}>
                      {loadingId === r.id ? 'Gerando...' : 'Gerar boleto'}
                    </button>
                    <button className="btn small" onClick={() => handlePay(r.id)}>
                      Marcar pago
                    </button>
                  </>
                )}
              </td>
            </tr>
          ))}
          {receivables.length === 0 && (
            <tr>
              <td colSpan={8} className="text-muted">
                Nenhuma conta a receber ainda.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
