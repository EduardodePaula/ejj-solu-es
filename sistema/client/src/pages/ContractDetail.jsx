import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api';

function fmt(v) {
  return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function ContractDetail() {
  const { id } = useParams();
  const [contract, setContract] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState('');

  function load() {
    api.get(`/contracts/${id}`).then((res) => setContract(res.data));
  }

  useEffect(load, [id]);

  async function handleCancel() {
    if (!confirm('Cancelar este contrato?')) return;
    await api.post(`/contracts/${id}/cancel`);
    load();
  }

  // A rota de PDF exige login (Bearer token), então não dá para abrir com um
  // <a href> comum — o navegador não manda o token. Buscamos como blob
  // autenticado e abrimos numa aba nova a partir dele.
  async function handleViewPdf() {
    setPdfError('');
    setPdfLoading(true);
    try {
      const res = await api.get(`/contracts/${id}/pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      window.open(url, '_blank');
    } catch (err) {
      setPdfError('Erro ao gerar PDF do contrato.');
    } finally {
      setPdfLoading(false);
    }
  }

  if (!contract) return <p>Carregando...</p>;

  return (
    <div>
      <div className="page-header">
        <h1>Contrato {contract.code}</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn secondary" onClick={handleViewPdf} disabled={pdfLoading}>
            {pdfLoading ? 'Gerando PDF...' : 'Ver PDF'}
          </button>
          <Link className="btn secondary" to="/contratos">
            Voltar
          </Link>
        </div>
      </div>

      {pdfError && <p className="error-text">{pdfError}</p>}

      <div className="grid-cards">
        <div className="card">
          <strong>Cliente:</strong> {contract.client.name}
          <br />
          <strong>Status:</strong> <span className="badge green">{contract.status}</span>
          <br />
          <strong>Mensalidade:</strong> {fmt(contract.monthly_value)}
        </div>
        <div className="card">
          <strong>Frequência:</strong> {contract.frequency}
          <br />
          <strong>SLA:</strong> {contract.sla_hours}h<br />
          <strong>Vigência:</strong> {new Date(contract.start_date).toLocaleDateString('pt-BR')} até{' '}
          {new Date(contract.end_date).toLocaleDateString('pt-BR')}
        </div>
      </div>

      {contract.status === 'ativo' && (
        <button className="btn danger" style={{ marginBottom: '1.5rem' }} onClick={handleCancel}>
          Cancelar contrato
        </button>
      )}

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Contrato gerado automaticamente</h3>
        <pre className="contract-text">{contract.generated_text}</pre>
      </div>
    </div>
  );
}
