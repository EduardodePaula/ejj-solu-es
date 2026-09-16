import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';

function fmt(v) {
  return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const statusBadge = {
  rascunho: 'muted',
  enviado: 'warning',
  aprovado: 'green',
  rejeitado: 'danger',
};

export default function Budgets() {
  const [budgets, setBudgets] = useState([]);
  const [clients, setClients] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [clientId, setClientId] = useState('');
  const [discountPct, setDiscountPct] = useState(0);
  const [validityDays, setValidityDays] = useState(15);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([{ catalog_item_id: '', description: '', quantity: 1, unit_price: 0 }]);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  function loadBudgets() {
    api.get('/budgets').then((res) => setBudgets(res.data));
  }

  useEffect(() => {
    loadBudgets();
    api.get('/clients').then((res) => setClients(res.data));
    api.get('/catalog').then((res) => setCatalog(res.data));
  }, []);

  function updateItem(index, patch) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }

  function handlePickCatalog(index, catalogItemId) {
    const catalogItem = catalog.find((c) => String(c.id) === String(catalogItemId));
    if (catalogItem) {
      updateItem(index, {
        catalog_item_id: catalogItem.id,
        description: catalogItem.name,
        unit_price: catalogItem.unit_price,
      });
    } else {
      updateItem(index, { catalog_item_id: '' });
    }
  }

  function addItem() {
    setItems((prev) => [...prev, { catalog_item_id: '', description: '', quantity: 1, unit_price: 0 }]);
  }

  function removeItem(index) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  const subtotal = items.reduce((sum, it) => sum + Number(it.quantity || 0) * Number(it.unit_price || 0), 0);
  const discountValue = subtotal * (Number(discountPct || 0) / 100);
  const total = subtotal - discountValue;

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    if (!clientId) {
      setError('Selecione um cliente');
      return;
    }
    try {
      const payload = {
        client_id: Number(clientId),
        discount_pct: Number(discountPct),
        validity_days: Number(validityDays),
        notes,
        items: items
          .filter((it) => it.description)
          .map((it) => ({
            catalog_item_id: it.catalog_item_id || null,
            description: it.description,
            quantity: Number(it.quantity),
            unit_price: Number(it.unit_price),
          })),
      };
      const { data } = await api.post('/budgets', payload);
      setShowForm(false);
      navigate(`/orcamentos/${data.id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao gerar orçamento');
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Orçamentos</h1>
        <button className="btn" onClick={() => setShowForm(true)}>
          + Gerar orçamento
        </button>
      </div>

      <table>
        <thead>
          <tr>
            <th>Código</th>
            <th>Cliente</th>
            <th>Status</th>
            <th>Total</th>
            <th>Criado em</th>
          </tr>
        </thead>
        <tbody>
          {budgets.map((b) => (
            <tr key={b.id}>
              <td>
                <Link to={`/orcamentos/${b.id}`}>{b.code}</Link>
              </td>
              <td>{b.client_name}</td>
              <td>
                <span className={`badge ${statusBadge[b.status] || 'muted'}`}>{b.status}</span>
              </td>
              <td>{fmt(b.total)}</td>
              <td>{new Date(b.created_at).toLocaleDateString('pt-BR')}</td>
            </tr>
          ))}
          {budgets.length === 0 && (
            <tr>
              <td colSpan={5} className="text-muted">
                Nenhum orçamento gerado ainda.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {showForm && (
        <div className="modal-backdrop" onClick={() => setShowForm(false)}>
          <div className="modal" style={{ maxWidth: 760 }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginTop: 0 }}>Gerar orçamento automático</h2>
            <form onSubmit={handleCreate}>
              <label>Cliente *</label>
              <select required value={clientId} onChange={(e) => setClientId(e.target.value)}>
                <option value="">Selecione...</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <label>Itens</label>
              <table className="items-table">
                <thead>
                  <tr>
                    <th style={{ width: '32%' }}>Item do catálogo</th>
                    <th>Descrição</th>
                    <th style={{ width: 80 }}>Qtd</th>
                    <th style={{ width: 110 }}>Preço un.</th>
                    <th style={{ width: 90 }}>Total</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, index) => (
                    <tr key={index}>
                      <td>
                        <select value={it.catalog_item_id} onChange={(e) => handlePickCatalog(index, e.target.value)}>
                          <option value="">Avulso</option>
                          {catalog.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          value={it.description}
                          onChange={(e) => updateItem(index, { description: e.target.value })}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={it.quantity}
                          onChange={(e) => updateItem(index, { quantity: e.target.value })}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={it.unit_price}
                          onChange={(e) => updateItem(index, { unit_price: e.target.value })}
                        />
                      </td>
                      <td>{fmt(Number(it.quantity || 0) * Number(it.unit_price || 0))}</td>
                      <td>
                        <button type="button" className="btn danger small" onClick={() => removeItem(index)}>
                          x
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button type="button" className="btn secondary small" onClick={addItem} style={{ marginTop: '0.5rem' }}>
                + Adicionar item
              </button>

              <div className="form-row" style={{ marginTop: '1rem' }}>
                <div>
                  <label>Desconto (%)</label>
                  <input type="number" min="0" max="100" value={discountPct} onChange={(e) => setDiscountPct(e.target.value)} />
                </div>
                <div>
                  <label>Validade (dias)</label>
                  <input type="number" min="1" value={validityDays} onChange={(e) => setValidityDays(e.target.value)} />
                </div>
              </div>

              <label>Observações</label>
              <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />

              <div className="card" style={{ marginTop: '1rem', background: '#fafcfb' }}>
                <div>Subtotal: {fmt(subtotal)}</div>
                <div>Desconto: {fmt(discountValue)}</div>
                <strong>Total: {fmt(total)}</strong>
              </div>

              {error && <p className="error-text">{error}</p>}

              <div className="modal-actions">
                <button type="button" className="btn secondary" onClick={() => setShowForm(false)}>
                  Cancelar
                </button>
                <button className="btn">Gerar orçamento</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
