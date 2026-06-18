import { NavLink } from 'react-router-dom';
import { IconDashboard, IconAlert, IconBox, IconUsers, IconPlug } from '../ui/Icons';
import './MobileTabBar.scss';

export function MobileTabBar() {
  return (
    <nav className="mtabbar">
      <TabItem to="/" icon={<IconDashboard />} label="Início" />
      <TabItem to="/alertas" icon={<IconAlert />} label="Alertas" />
      <TabItem to="/skus" icon={<IconBox />} label="SKUs" />
      <TabItem to="/clientes" icon={<IconUsers />} label="Clientes" />
      <TabItem to="/integracoes" icon={<IconPlug />} label="Integrações" />
    </nav>
  );
}

function TabItem({ to, icon, label }) {
  return (
    <NavLink to={to} className={({ isActive }) => `mtabbar__item ${isActive ? 'mtabbar__item--active' : ''}`} end={to === '/'}>
      {icon}
      <span>{label}</span>
    </NavLink>
  );
}
