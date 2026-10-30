import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';
import {
  IconDashboard,
  IconClients,
  IconCatalog,
  IconBudgets,
  IconServiceOrders,
  IconFinancial,
  IconContracts,
  IconLogout,
  IconCollapse,
} from './icons.jsx';

const links = [
  { to: '/', label: 'Dashboard', end: true, Icon: IconDashboard },
  { to: '/clientes', label: 'Clientes', Icon: IconClients },
  { to: '/catalogo', label: 'Catálogo', Icon: IconCatalog },
  { to: '/orcamentos', label: 'Orçamentos', Icon: IconBudgets },
  { to: '/ordens-servico', label: 'Ordens de Serviço', Icon: IconServiceOrders },
  { to: '/financeiro', label: 'Financeiro', Icon: IconFinancial },
  { to: '/contratos', label: 'Contratos', Icon: IconContracts },
];

function initials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
}

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar${collapsed ? ' collapsed' : ''}`}>
        <div className="sidebar-top">
          <div className="brand">
            <img src="/logo.jpg" alt="EJJ Soluções" />
            <span>EJJ Soluções</span>
          </div>
          <button className="collapse-toggle" onClick={() => setCollapsed((c) => !c)} aria-label="Recolher menu">
            <IconCollapse size={14} />
          </button>
        </div>

        <div className="user-card">
          <div className="avatar">{initials(user?.name)}</div>
          <div className="user-info">
            <div className="name">{user?.name}</div>
            <div className="role">{user?.email}</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-label">Geral</div>
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.end}>
              <link.Icon size={18} />
              <span className="nav-label">{link.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <button onClick={handleLogout}>
            <IconLogout size={18} />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      <main className="main-content">{children}</main>
    </div>
  );
}
