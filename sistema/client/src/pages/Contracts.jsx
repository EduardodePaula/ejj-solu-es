import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';

function fmt(v) {
  return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const statusBadge = { ativo: 'green', cancelado: 'danger' };

const emptyForm = {
  client_id: '',
  frequency: 'mensal',
  equipment_covered: '',
  sla_hours: 24,
  monthly_value: '',
  duration_months: 12,
  auto_renew: true,
  payment_day: 10,
  start_date: new Date().toISOString().slice(0, 10),
};

export default function Contracts() {
  const [contracts, setContracts] = useState([]);
  const [clients, setClients] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  function load() {
    api.get('/contracts').then((res) => setContracts(res.data));
  }

  useEffect(() => {
    load();
    api.get('/clients').then((res) => setClients(res.data));
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    try {
      const { data } = await api.post('/contracts', {
        ...form,
        client_id: Number(form.client_id),
        sla_hours: Number(form.sla_hours),
        monthly_value: Number(form.monthly_value),
        duration_months: Number(form.duration_months),
        payment_day: Number(form.payment_day),
        auto_renew: form.auto_renew ? 1 : 0,
      });
      setShowForm(false);
      navigate(`/contratos/${data.id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao gerar contrato');
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Contratos de Manutenção Preventiva</h1>
        <button className="btn" onClick={() => setShowForm(true)}>
          + Gerar contrato
        </button>
      </div>

      <table>
        <thead>
          <tr>
            <th>Código</th>
            <th>Cliente</th>
            <th>Frequência</th>
            <th>Mensalidade</th>
            <th>Vigência</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {contracts.map((c) => (
            <tr key={c.id}>
              <td>
                <Link to={`/contratos/${c.id}`}>{c.code}</Link>
              </td>
              <td>{c.client_name}</td>
              <td>{c.frequency}</td>
              <td>{fmt(c.monthly_value)}</td>
              <td>
                {new Date(c.start_date).toLocaleDateString('pt-BR')} até{' '}
                {c.end_date ? new Date(c.end_date).toLocaleDateString('pt-BR') : '-'}
              </td>
              <td>
                <span className={`badge ${statusBadge[c.status] || 'muted'}`}>{c.status}</span>
              </td>
            </tr>
          ))}
          {contracts.length === 0 && (
            <tr>
              <td colSpan={6} className="text-muted">
                Nenhum contrato gerado ainda.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {showForm && (
        <div className="modal-backdrop" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginTop: 0 }}>Gerar contrato de manutenção preventiva</h2>
            <p className="text-muted" style={{ marginTop: 0 }}>
              As cláusulas do contrato são geradas automaticamente com base nestes parâmetros.
            </p>
            <form onSubmit={handleCreate}>
              <label>Cliente *</label>
              <select required value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })}>
                <option value="">Selecione...</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <label>Equipamentos cobertos</label>
              <textarea
                rows={2}
                placeholder="Ex: 4 câmeras IP, 1 central de alarme, cerca elétrica de 40 metros"
                value={form.equipment_covered}
                onChange={(e) => setForm({ ...form, equipment_covered: e.target.value })}
              />

              <div className="form-row">
                <div>
                  <label>Frequência da manutenção</label>
                  <select value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })}>
                    <option value="mensal">Mensal</option>
                    <option value="bimestral">Bimestral</option>
                    <option value="trimestral">Trimestral</option>
                    <option value="semestral">Semestral</option>
                  </select>
                </div>
                <div>
                  <label>SLA de atendimento (horas)</label>
                  <input type="number" min="1" value={form.sla_hours} onChange={(e) => setForm({ ...form, sla_hours: e.target.value })} />
                </div>
              </div>

              <div className="form-row">
                <div>
                  <label>Valor mensal (R$) *</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    value={form.monthly_value}
                    onChange={(e) => setForm({ ...form, monthly_value: e.target.value })}
                  />
                </div>
                <div>
                  <label>Dia de vencimento</label>
                  <input
                    type="number"
                    min="1"
                    max="28"
                    value={form.payment_day}
                    onChange={(e) => setForm({ ...form, payment_day: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-row">
                <div>
                  <label>Início da vigência</label>
                  <input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
                </div>
                <div>
                  <label>Duração (meses)</label>
                  <input
                    type="number"
                    min="1"
                    value={form.duration_months}
                    onChange={(e) => setForm({ ...form, duration_months: e.target.value })}
                  />
                </div>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.9rem' }}>
                <input
                  type="checkbox"
                  style={{ width: 'auto' }}
                  checked={form.auto_renew}
                  onChange={(e) => setForm({ ...form, auto_renew: e.target.checked })}
                />
                Renovação automática ao final da vigência
              </label>

              {error && <p className="error-text">{error}</p>}

              <div className="modal-actions">
                <button type="button" className="btn secondary" onClick={() => setShowForm(false)}>
                  Cancelar
                </button>
                <button className="btn">Gerar contrato</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
