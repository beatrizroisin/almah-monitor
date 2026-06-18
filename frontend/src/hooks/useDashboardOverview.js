import { useEffect, useState } from 'react';
import { dashboardService } from '../api';

export function useDashboardOverview() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const [overview, causes, alerts] = await Promise.all([
        dashboardService.getOverview(),
        dashboardService.getTopCauses(),
        dashboardService.getRecentAlerts(3),
      ]);
      setData({ overview, causes, alerts });
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao carregar dashboard.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  return { data, loading, error, refresh };
}
