import { useEffect, useState } from 'react';
import api from '../api';

function fmt(v) {
  return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const statusOptions = ['aberta', 'em_andamento', 'concluida', 'cancelada'];
const statusBadge = { aberta: 'warning', em_andamento: 'muted', concluida: 'green', cancelada: 'danger' };

export default function ServiceOrders() {
  const [orders, setOrders] = useState([]);

  function load() {
    api.get('/service-orders').then((res) => setOrders(res.data));
  }

  useEffect(load, []);

  async function updateOrder(id, patch) {
    await api.put(`/service-orders/${id}`, patch);
    load();
  }

  return (
    <div>
      <div className="page-header">
        <h1>Ordens de Serviço</h1>
      </div>

      <table>
        <thead>
          <tr>
            <th>Código</th>
            <th>Cliente</th>
            <th>Descrição</th>
            <th>Técnico</th>
            <th>Status</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((so) => (
            <tr key={so.id}>
              <td>{so.code}</td>
              <td>{so.client_name}</td>
              <td style={{ maxWidth: 260 }}>{so.description}</td>
              <td>
                <input
                  defaultValue={so.technician || ''}
                  onBlur={(e) => {
                    if (e.target.value !== (so.technician || '')) updateOrder(so.id, { technician: e.target.value });
                  }}
                  style={{ minWidth: 120 }}
                />
              </td>
              <td>
                <select value={so.status} onChange={(e) => updateOrder(so.id, { status: e.target.value })}>
                  {statusOptions.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <div>
                  <span className={`badge ${statusBadge[so.status] || 'muted'}`} style={{ marginTop: 4 }}>
                    {so.status}
                  </span>
                </div>
              </td>
              <td>{fmt(so.total)}</td>
            </tr>
          ))}
          {orders.length === 0 && (
            <tr>
              <td colSpan={6} className="text-muted">
                Nenhuma ordem de serviço. Elas são geradas automaticamente ao aprovar um orçamento.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
