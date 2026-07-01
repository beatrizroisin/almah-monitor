import { useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { MobileTabBar } from './MobileTabBar';
import { Topbar } from './Topbar';
import { ToastHost, toast } from '../ui/Toast';
import { useClientsStore } from '../../store/clientsStore';
import { formatTimeAgo } from '../../utils/time';
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
  const [now, setNow] = useState(() => Date.now());
  const { overview, fetchOverview } = useClientsStore();

  const title = titleMap[location.pathname] || 'ALMAH Monitor';

  useEffect(() => {
    fetchOverview();
    const interval = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // "now" só existe para forçar o recálculo do label a cada minuto (ver interval acima)
  const lastSyncLabel = useMemo(() => formatTimeAgo(overview?.lastSyncAt), [overview?.lastSyncAt, now]);

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="app-layout__main">
        <Topbar title={title} onSync={handleSync} syncing={syncing} lastSyncLabel={lastSyncLabel} />
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
