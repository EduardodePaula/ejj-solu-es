import { useEffect, useState } from 'react';
import api from '../api';

const emptyForm = { name: '', description: '', category: 'servico', unit_price: '', unit: 'un' };

function fmt(v) {
  return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function Catalog() {
  const [items, setItems] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  function load() {
    api.get('/catalog').then((res) => setItems(res.data));
  }

  useEffect(load, []);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function openEdit(item) {
    setEditingId(item.id);
    setForm({
      name: item.name,
      description: item.description || '',
      category: item.category,
      unit_price: item.unit_price,
      unit: item.unit,
    });
    setShowForm(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const payload = { ...form, unit_price: Number(form.unit_price) };
    if (editingId) {
      await api.put(`/catalog/${editingId}`, payload);
    } else {
      await api.post('/catalog', payload);
    }
    setShowForm(false);
    setForm(emptyForm);
    setEditingId(null);
    load();
  }

  async function handleDelete(id) {
    if (!confirm('Remover este item do catálogo?')) return;
    await api.delete(`/catalog/${id}`);
    load();
  }

  return (
    <div>
      <div className="page-header">
        <h1>Catálogo de serviços e produtos</h1>
        <button className="btn" onClick={openCreate}>
          + Novo item
        </button>
      </div>

      <table>
        <thead>
          <tr>
            <th>Nome</th>
            <th>Categoria</th>
            <th>Unidade</th>
            <th>Preço unitário</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>{item.name}</td>
              <td>{item.category}</td>
              <td>{item.unit}</td>
              <td>{fmt(item.unit_price)}</td>
              <td style={{ display: 'flex', gap: '0.35rem' }}>
                <button className="btn secondary small" onClick={() => openEdit(item)}>
                  Editar
                </button>
                <button className="btn danger small" onClick={() => handleDelete(item.id)}>
                  Remover
                </button>
              </td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr>
              <td colSpan={5} className="text-muted">
                Nenhum item cadastrado.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {showForm && (
        <div className="modal-backdrop" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginTop: 0 }}>{editingId ? 'Editar item de catálogo' : 'Novo item de catálogo'}</h2>
            <form onSubmit={handleSubmit}>
              <label>Nome *</label>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />

              <label>Descrição</label>
              <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />

              <div className="form-row">
                <div>
                  <label>Categoria</label>
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                    <option value="servico">Serviço</option>
                    <option value="produto">Produto</option>
                  </select>
                </div>
                <div>
                  <label>Unidade</label>
                  <input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
                </div>
                <div>
                  <label>Preço unitário (R$) *</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    value={form.unit_price}
                    onChange={(e) => setForm({ ...form, unit_price: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() => {
                    setShowForm(false);
                    setEditingId(null);
                  }}
                >
                  Cancelar
                </button>
                <button className="btn">{editingId ? 'Salvar alterações' : 'Salvar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
