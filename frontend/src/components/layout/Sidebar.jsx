import { NavLink } from 'react-router-dom';
import { useEffect } from 'react';
import { useClientsStore } from '../../store/clientsStore';
import { Button } from '../ui/Button';
import {
  IconDashboard,
  IconAlert,
  IconBox,
  IconUsers,
  IconPlug,
  IconBell,
  IconPlus,
} from '../ui/Icons';
import './Sidebar.scss';

const statusToTone = { Crítico: 'red', Atenção: 'orange', Saudável: 'green' };

export function Sidebar() {
  const { clients, fetchClients } = useClientsStore();

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const openAlertsCount = clients.filter((c) => c.status === 'Crítico' || c.status === 'Atenção').length;

  return (
    <aside className="sidebar">
      <div className="sidebar__logo">
        <div className="sidebar__logo-name">ALMAH Monitor</div>
        <div className="sidebar__logo-sub">Merchant Center + VTEX</div>
      </div>

      <nav>
        <div className="sidebar__section">Visão geral</div>
        <SidebarLink to="/" icon={<IconDashboard />} label="Dashboard" />
        <SidebarLink to="/alertas" icon={<IconAlert />} label="Alertas" badge={openAlertsCount || null} />
        <SidebarLink to="/skus" icon={<IconBox />} label="SKUs problemáticos" />

        <div className="sidebar__section">Clientes</div>
        {clients.map((c) => (
          <NavLink key={c.id} to={`/clientes/${c.id}`} className="sidebar__client">
            <span className={`sidebar__dot sidebar__dot--${statusToTone[c.status] || 'gray'}`} />
            {c.name}
          </NavLink>
        ))}

        <div className="sidebar__new-btn">
          <Button variant="primary" fullWidth icon={<IconPlus />} onClick={() => (window.location.href = '/clientes/novo/1')}>
            Novo cliente
          </Button>
        </div>

        <div className="sidebar__section">Configurações</div>
        <SidebarLink to="/clientes" icon={<IconUsers />} label="Clientes" />
        <SidebarLink to="/integracoes" icon={<IconPlug />} label="Integrações" />
        <SidebarLink to="/notificacoes" icon={<IconBell />} label="Notificações" />
      </nav>
    </aside>
  );
}

function SidebarLink({ to, icon, label, badge }) {
  return (
    <NavLink to={to} className={({ isActive }) => `sidebar__item ${isActive ? 'sidebar__item--active' : ''}`}>
      {icon}
      <span>{label}</span>
      {badge ? <span className="sidebar__badge">{badge}</span> : null}
    </NavLink>
  );
}
