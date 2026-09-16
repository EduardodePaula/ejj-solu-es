import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api';

function fmt(v) {
  return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function ClientDetail() {
  const { id } = useParams();
  const [client, setClient] = useState(null);

  useEffect(() => {
    api.get(`/clients/${id}`).then((res) => setClient(res.data));
  }, [id]);

  if (!client) return <p>Carregando...</p>;

  return (
    <div>
      <div className="page-header">
        <h1>{client.name}</h1>
        <Link className="btn secondary" to="/clientes">
          Voltar
        </Link>
      </div>

      <div className="grid-cards">
        <div className="card">
          <strong>Documento:</strong> {client.document || '-'}
          <br />
          <strong>Telefone:</strong> {client.phone || '-'}
          <br />
          <strong>E-mail:</strong> {client.email || '-'}
          <br />
          <strong>Endereço:</strong> {client.address || '-'} {client.city ? `- ${client.city}/${client.state}` : ''}
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ marginTop: 0 }}>Orçamentos</h3>
        <table>
          <thead>
            <tr>
              <th>Código</th>
              <th>Status</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {client.budgets.map((b) => (
              <tr key={b.id}>
                <td>
                  <Link to={`/orcamentos/${b.id}`}>{b.code}</Link>
                </td>
                <td>{b.status}</td>
                <td>{fmt(b.total)}</td>
              </tr>
            ))}
            {client.budgets.length === 0 && (
              <tr>
                <td colSpan={3} className="text-muted">
                  Nenhum orçamento.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ marginTop: 0 }}>Ordens de serviço</h3>
        <table>
          <thead>
            <tr>
              <th>Código</th>
              <th>Status</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {client.serviceOrders.map((so) => (
              <tr key={so.id}>
                <td>{so.code}</td>
                <td>{so.status}</td>
                <td>{fmt(so.total)}</td>
              </tr>
            ))}
            {client.serviceOrders.length === 0 && (
              <tr>
                <td colSpan={3} className="text-muted">
                  Nenhuma ordem de serviço.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Contratos de manutenção</h3>
        <table>
          <thead>
            <tr>
              <th>Código</th>
              <th>Status</th>
              <th>Mensalidade</th>
            </tr>
          </thead>
          <tbody>
            {client.contracts.map((c) => (
              <tr key={c.id}>
                <td>
                  <Link to={`/contratos/${c.id}`}>{c.code}</Link>
                </td>
                <td>{c.status}</td>
                <td>{fmt(c.monthly_value)}</td>
              </tr>
            ))}
            {client.contracts.length === 0 && (
              <tr>
                <td colSpan={3} className="text-muted">
                  Nenhum contrato.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
