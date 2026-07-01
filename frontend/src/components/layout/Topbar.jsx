import { Button } from '../ui/Button';
import { IconSync, IconPlus, IconLogout } from '../ui/Icons';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import './Topbar.scss';

export function Topbar({ title, onSync, syncing = false, lastSyncLabel = 'Carregando...' }) {
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <header className="topbar">
      <div className="topbar__title">{title}</div>
      <div className="topbar__actions">
        <div className="topbar__sync-indicator">
          {syncing ? (
            <>
              <span className="topbar__spinner" /> Sincronizando...
            </>
          ) : (
            <>
              <span className="topbar__pulse" /> {lastSyncLabel}
            </>
          )}
        </div>
        <Button size="sm" icon={<IconSync />} onClick={onSync} disabled={syncing} className="topbar__sync-btn">
          Sincronizar agora
        </Button>
        <Button size="sm" variant="primary" icon={<IconPlus />} onClick={() => navigate('/clientes/novo/1')} className="topbar__new-btn">
          Novo cliente
        </Button>
        <Button size="sm" variant="ghost" icon={<IconLogout />} onClick={handleLogout} className="topbar__logout-btn" title="Sair">
          Sair
        </Button>
      </div>
    </header>
  );
}
