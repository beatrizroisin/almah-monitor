import { useNavigate } from 'react-router-dom';
import { useDashboardOverview } from '../../hooks/useDashboardOverview';
import { Card, CardHeader, CardBody, CardTitle } from '../../components/ui/Card';
import { MetricsGrid, Metric } from '../../components/ui/Metric';
import { ResponsiveTable } from '../../components/ui/ResponsiveTable';
import { HealthScore } from '../../components/ui/HealthScore';
import { Avatar } from '../../components/ui/Avatar';
import { Tag } from '../../components/ui/Tag';
import { Button } from '../../components/ui/Button';
import { CausesList } from '../../components/client/CausesList';
import { AlertItem } from '../../components/alerts/AlertItem';
import { IconUsers } from '../../components/ui/Icons';
import { alertsService } from '../../api';
import { toast } from '../../components/ui/Toast';
import './Dashboard.scss';

const toneMap = { Crítico: 'red', Atenção: 'orange', Saudável: 'green' };

export function DashboardPage() {
  const { data, loading, error, refresh } = useDashboardOverview();
  const navigate = useNavigate();

  if (loading) return <div className="page-loading">Carregando dashboard...</div>;
  if (error) return <div className="page-error">{error}</div>;
  if (!data) return null;

  const { overview, causes, alerts } = data;

  async function handleResolve(alertId) {
    await alertsService.resolve(alertId);
    toast('Alerta marcado como resolvido');
    refresh();
  }

  const columns = [
    {
      key: 'name',
      header: 'Cliente',
      primary: true,
      render: (row) => (
        <div className="cell-name">
          <Avatar initials={row.initials} tone={toneMap[row.status]} />
          <span className="fw">{row.name}</span>
        </div>
      ),
    },
    { key: 'healthScore', header: 'Health Score', render: (row) => <HealthScore score={row.healthScore} /> },
    { key: 'vtexSkus', header: 'SKUs VTEX', render: (row) => row.vtexSkus.toLocaleString('pt-BR') },
    { key: 'merchantSkus', header: 'Merchant', render: (row) => row.merchantSkus.toLocaleString('pt-BR') },
    {
      key: 'approvedSkus',
      header: 'Aprovados',
      render: (row) => (
        <span style={{ color: row.status === 'Saudável' ? undefined : 'var(--red)', fontWeight: 600 }}>
          {row.approvedSkus.toLocaleString('pt-BR')}
        </span>
      ),
    },
    { key: 'disapprovedSkus', header: 'Reprovados', render: (row) => row.disapprovedSkus.toLocaleString('pt-BR') },
    { key: 'limitedSkus', header: 'Limitados', render: (row) => (row.limitedSkus ?? 0).toLocaleString('pt-BR') },
    {
      key: 'variation',
      header: 'Variação 24h',
      render: (row) => <Tag color={toneMap[row.status]}>{row.variation}</Tag>,
    },
    { key: 'status', header: 'Status', render: (row) => <Tag color={toneMap[row.status]}>{row.status}</Tag> },
  ];

  return (
    <div className="dashboard">
      <MetricsGrid>
        <Metric label="Clientes monitorados" value={overview.totalClients} delta={`${overview.clientsInAlert} em alerta`} />
        <Metric
          label="SKUs ativos (VTEX)"
          value={overview.totalVtexSkus.toLocaleString('pt-BR')}
          delta={overview.vtexDeltaLabel}
          deltaDirection={overview.vtexDeltaDirection}
        />
        <Metric
          label="SKUs aprovados"
          value={overview.totalApprovedSkus.toLocaleString('pt-BR')}
          valueColor={overview.approvedDeltaDirection === 'down' ? 'var(--red)' : undefined}
          delta={overview.approvedDeltaLabel}
          deltaDirection={overview.approvedDeltaDirection}
        />
        <Metric
          label="SKUs ausentes"
          value={overview.totalMissingSkus.toLocaleString('pt-BR')}
          valueColor="var(--red)"
          delta={`${overview.missingPct}% do total VTEX`}
        />
      </MetricsGrid>

      <MetricsGrid>
        <Metric label="Reprovados" value={overview.totalDisapproved.toLocaleString('pt-BR')} valueColor="var(--red)" delta={overview.disapprovedDeltaLabel} deltaDirection="down" />
        <Metric label="Limitados" value={overview.totalLimitedSkus.toLocaleString('pt-BR')} valueColor="var(--orange)" delta="visibilidade restrita" />
        <Metric label="Pendentes" value={overview.totalPending.toLocaleString('pt-BR')} valueColor="var(--orange)" delta="aguardando revisão" />
        <Metric label="Alertas críticos" value={overview.criticalAlertsCount} valueColor="var(--red)" delta={overview.alertsSummaryLabel} />
      </MetricsGrid>

      <MetricsGrid columns={2}>
        <Metric label="Fora do Shopping Ads" value={overview.totalOutsideShopping.toLocaleString('pt-BR')} valueColor="var(--red)" delta="reprovados no Shopping Ads" />
        <Metric label="SKUs únicos no Merchant" value={overview.clients.reduce((s, c) => s + (c.merchantSkus || 0), 0).toLocaleString('pt-BR')} delta="total coletado na última sync" />
      </MetricsGrid>

      <Card>
        <CardHeader>
          <CardTitle
            icon={<IconUsers />}
            title="Status dos clientes"
            subtitle={overview.lastSyncLabel}
          />
        </CardHeader>
        <ResponsiveTable columns={columns} rows={overview.clients} onRowClick={(row) => navigate(`/clientes/${row.id}`)} />
      </Card>

      <div className="dashboard__two-col">
        <Card>
          <CardHeader>
            <CardTitle title="Principais causas de reprovação" />
          </CardHeader>
          <CardBody>
            <CausesList causes={causes} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader actions={<Button size="sm" onClick={() => navigate('/alertas')}>Ver todos</Button>}>
            <CardTitle title="Alertas recentes" />
          </CardHeader>
          <div>
            {alerts.length === 0 ? (
              <div className="dashboard__no-alerts">Nenhum alerta nas últimas 24h.</div>
            ) : (
              alerts.map((a) => (
                <AlertItem key={a.id} alert={a} compact onResolve={handleResolve} onViewClient={(id) => navigate(`/clientes/${id}`)} />
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
