import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api';

function fmt(v) {
  return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function ContractDetail() {
  const { id } = useParams();
  const [contract, setContract] = useState(null);

  function load() {
    api.get(`/contracts/${id}`).then((res) => setContract(res.data));
  }

  useEffect(load, [id]);

  async function handleCancel() {
    if (!confirm('Cancelar este contrato?')) return;
    await api.post(`/contracts/${id}/cancel`);
    load();
  }

  if (!contract) return <p>Carregando...</p>;

  return (
    <div>
      <div className="page-header">
        <h1>Contrato {contract.code}</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <a className="btn secondary" href={`/api/contracts/${id}/pdf`} target="_blank" rel="noreferrer">
            Ver PDF
          </a>
          <Link className="btn secondary" to="/contratos">
            Voltar
          </Link>
        </div>
      </div>

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
