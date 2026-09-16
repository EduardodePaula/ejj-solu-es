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
      <header className="topbar">
        <div className="brand">
          <img src="/logo.jpg" alt="EJJ Soluções" />
          <span>EJJ Soluções</span>
        </div>
        <div className="user-box">
          <span>{user?.name}</span>
          <button className="btn secondary small" onClick={handleLogout}>
            Sair
          </button>
        </div>
      </header>

      <nav className="subnav">
        {links.map((link) => (
          <NavLink key={link.to} to={link.to} end={link.end}>
            {link.label}
          </NavLink>
        ))}
      </nav>

      <main className="main-content">{children}</main>
    </div>
  );
}
