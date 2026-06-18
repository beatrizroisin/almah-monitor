import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardBody, CardTitle } from '../../components/ui/Card';
import { AlertItem } from '../../components/alerts/AlertItem';
import { Tag } from '../../components/ui/Tag';
import { alertsService } from '../../api';
import { toast } from '../../components/ui/Toast';
import './Alerts.scss';

export function AlertsPage() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('OPEN');
  const navigate = useNavigate();

  async function load() {
    setLoading(true);
    try {
      const data = await alertsService.list({ status: filter === 'ALL' ? undefined : filter });
      setAlerts(data.items ?? data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  async function handleResolve(alertId) {
    await alertsService.resolve(alertId);
    toast('Alerta marcado como resolvido');
    load();
  }

  const criticalCount = alerts.filter((a) => a.severity === 'RED' && a.status === 'OPEN').length;
  const attentionCount = alerts.filter((a) => a.severity === 'ORANGE' && a.status === 'OPEN').length;

  return (
    <div className="alerts-page">
      <Card>
        <CardHeader
          actions={
            <div className="alerts-page__tags">
              <Tag color="red">{criticalCount} críticos</Tag>
              <Tag color="orange">{attentionCount} atenção</Tag>
            </div>
          }
        >
          <CardTitle title="Alertas ativos" />
        </CardHeader>

        <div className="alerts-page__filters">
          {[
            { key: 'OPEN', label: 'Abertos' },
            { key: 'RESOLVED', label: 'Resolvidos' },
            { key: 'ALL', label: 'Todos' },
          ].map((f) => (
            <button
              key={f.key}
              className={`alerts-page__filter ${filter === f.key ? 'alerts-page__filter--active' : ''}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="page-loading">Carregando alertas...</div>
        ) : alerts.length === 0 ? (
          <CardBody>
            <div className="alerts-page__empty">Nenhum alerta encontrado para este filtro.</div>
          </CardBody>
        ) : (
          alerts.map((alert) => (
            <AlertItem
              key={alert.id}
              alert={alert}
              onResolve={handleResolve}
              onViewClient={(id) => navigate(`/clientes/${id}`)}
            />
          ))
        )}
      </Card>
    </div>
  );
}
