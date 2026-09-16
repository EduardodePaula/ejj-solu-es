import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

const emptyForm = { name: '', document: '', type: 'pessoa_fisica', email: '', phone: '', address: '', city: '', state: '', zip: '' };

function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [q, setQ] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [cnpjLoading, setCnpjLoading] = useState(false);
  const [cnpjError, setCnpjError] = useState('');

  function load(query) {
    api.get('/clients', { params: query ? { q: query } : {} }).then((res) => setClients(res.data));
  }

  useEffect(() => {
    load();
  }, []);

  function handleSearch(e) {
    e.preventDefault();
    load(q);
  }

  function openCreate() {
    setForm(emptyForm);
    setError('');
    setCnpjError('');
    setShowForm(true);
  }

  // Busca os dados da empresa na Receita Federal (via BrasilAPI) e preenche
  // o formulário automaticamente assim que um CNPJ válido (14 dígitos) é informado.
  async function lookupCnpj(digits) {
    setCnpjError('');
    setCnpjLoading(true);
    try {
      const { data } = await api.get(`/clients/cnpj/${digits}`);
      setForm((prev) => ({
        ...prev,
        name: data.name || prev.name,
        type: 'pessoa_juridica',
        document: data.document || digits,
        email: data.email || prev.email,
        phone: data.phone || prev.phone,
        address: data.address || prev.address,
        city: data.city || prev.city,
        state: data.state || prev.state,
        zip: data.zip || prev.zip,
      }));
    } catch (err) {
      setCnpjError(err.response?.data?.error || 'Não foi possível consultar o CNPJ.');
    } finally {
      setCnpjLoading(false);
    }
  }

  function handleDocumentChange(value) {
    setForm({ ...form, document: value });
  }

  function handleDocumentBlur() {
    const digits = onlyDigits(form.document);
    if (digits.length === 14) lookupCnpj(digits);
  }

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/clients', form);
      setShowForm(false);
      setForm(emptyForm);
      load(q);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao salvar cliente');
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Clientes</h1>
        <button className="btn" onClick={openCreate}>
          + Novo cliente
        </button>
      </div>

      <form onSubmit={handleSearch} style={{ marginBottom: '1rem', maxWidth: 320 }}>
        <input placeholder="Buscar por nome, documento ou e-mail" value={q} onChange={(e) => setQ(e.target.value)} />
      </form>

      <table>
        <thead>
          <tr>
            <th>Nome</th>
            <th>Documento</th>
            <th>Telefone</th>
            <th>E-mail</th>
          </tr>
        </thead>
        <tbody>
          {clients.map((c) => (
            <tr key={c.id}>
              <td>
                <Link to={`/clientes/${c.id}`}>{c.name}</Link>
              </td>
              <td>{c.document || '-'}</td>
              <td>{c.phone || '-'}</td>
              <td>{c.email || '-'}</td>
            </tr>
          ))}
          {clients.length === 0 && (
            <tr>
              <td colSpan={4} className="text-muted">
                Nenhum cliente cadastrado.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {showForm && (
        <div className="modal-backdrop" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginTop: 0 }}>Novo cliente</h2>
            <form onSubmit={handleCreate}>
              <div className="form-row">
                <div>
                  <label>Tipo</label>
                  <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                    <option value="pessoa_fisica">Pessoa física</option>
                    <option value="pessoa_juridica">Pessoa jurídica</option>
                  </select>
                </div>
                <div>
                  <label>Documento (CPF/CNPJ)</label>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <input
                      value={form.document}
                      onChange={(e) => handleDocumentChange(e.target.value)}
                      onBlur={handleDocumentBlur}
                      placeholder="Só CNPJ: preenche o resto sozinho"
                    />
                    {form.type === 'pessoa_juridica' && (
                      <button
                        type="button"
                        className="btn secondary small"
                        disabled={cnpjLoading || onlyDigits(form.document).length !== 14}
                        onClick={() => lookupCnpj(onlyDigits(form.document))}
                        style={{ whiteSpace: 'nowrap' }}
                      >
                        {cnpjLoading ? 'Buscando...' : 'Buscar CNPJ'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
              {cnpjError && <p className="error-text">{cnpjError}</p>}

              <label>Nome {form.type === 'pessoa_juridica' ? '(Razão social) ' : ''}*</label>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />

              <div className="form-row">
                <div>
                  <label>Telefone</label>
                  <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div>
                  <label>E-mail</label>
                  <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
              </div>

              <label>Endereço</label>
              <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />

              <div className="form-row">
                <div>
                  <label>Cidade</label>
                  <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                </div>
                <div>
                  <label>UF</label>
                  <input maxLength={2} value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
                </div>
                <div>
                  <label>CEP</label>
                  <input value={form.zip} onChange={(e) => setForm({ ...form, zip: e.target.value })} />
                </div>
              </div>

              {error && <p className="error-text">{error}</p>}

              <div className="modal-actions">
                <button type="button" className="btn secondary" onClick={() => setShowForm(false)}>
                  Cancelar
                </button>
                <button className="btn">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
