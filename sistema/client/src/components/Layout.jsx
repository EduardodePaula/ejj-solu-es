import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';

const links = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/clientes', label: 'Clientes' },
  { to: '/catalogo', label: 'Catálogo' },
  { to: '/orcamentos', label: 'Orçamentos' },
  { to: '/ordens-servico', label: 'Ordens de Serviço' },
  { to: '/financeiro', label: 'Financeiro' },
  { to: '/contratos', label: 'Contratos' },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">EJJ Soluções</div>
        <nav>
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.end}>
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="user-box">
          <div>{user?.name}</div>
          <button className="btn secondary small" onClick={handleLogout}>
            Sair
          </button>
        </div>
      </aside>
      <main className="main-content">{children}</main>
    </div>
  );
}
