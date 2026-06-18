import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { MobileTabBar } from './MobileTabBar';
import { Topbar } from './Topbar';
import { ToastHost, toast } from '../ui/Toast';
import { useClientsStore } from '../../store/clientsStore';
import './AppLayout.scss';

const titleMap = {
  '/': 'Dashboard',
  '/alertas': 'Alertas',
  '/skus': 'SKUs problemáticos',
  '/clientes': 'Clientes',
  '/integracoes': 'Integrações',
  '/notificacoes': 'Notificações',
};

export function AppLayout() {
  const location = useLocation();
  const [syncing, setSyncing] = useState(false);
  const { fetchOverview } = useClientsStore();

  const title = titleMap[location.pathname] || 'ALMAH Monitor';

  async function handleSync() {
    setSyncing(true);
    toast('Sincronização iniciada — pode levar alguns minutos');
    try {
      // Em produção isso chamaria um endpoint global de sync ou
      // o sync do cliente selecionado, dependendo da tela.
      await fetchOverview();
      toast('Sincronização concluída com sucesso');
    } catch {
      toast('Falha ao sincronizar — tente novamente');
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="app-layout__main">
        <Topbar title={title} onSync={handleSync} syncing={syncing} />
        <div className="app-layout__scroll">
          <div className="app-layout__content">
            <Outlet />
          </div>
        </div>
      </div>
      <MobileTabBar />
      <ToastHost />
    </div>
  );
}
