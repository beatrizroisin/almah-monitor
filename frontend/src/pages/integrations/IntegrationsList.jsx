import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle } from '../../components/ui/Card';
import { ResponsiveTable } from '../../components/ui/ResponsiveTable';
import { Avatar } from '../../components/ui/Avatar';
import { Tag } from '../../components/ui/Tag';
import { Button } from '../../components/ui/Button';
import { IconPlug } from '../../components/ui/Icons';
import { integrationsService } from '../../api/integrations.service';
import './IntegrationsList.scss';

const toneMap = { red: 'red', orange: 'orange', green: 'green' };

export function IntegrationsListPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    integrationsService
      .listAll()
      .then((data) => setRows(data.items ?? data))
      .finally(() => setLoading(false));
  }, []);

  const columns = [
    {
      key: 'clientName',
      header: 'Cliente',
      primary: true,
      render: (r) => (
        <div className="cell-name">
          <Avatar initials={r.initials} tone={toneMap[r.tone] || 'blue'} />
          <span className="fw">{r.clientName}</span>
        </div>
      ),
    },
    { key: 'vtexStatus', header: 'VTEX', render: (r) => <Tag color={r.vtexStatus === 'CONNECTED' ? 'green' : 'red'}>{r.vtexStatus === 'CONNECTED' ? 'Conectada' : 'Erro'}</Tag> },
    { key: 'googleStatus', header: 'Google Merchant', render: (r) => <Tag color={r.googleStatus === 'CONNECTED' ? 'green' : 'red'}>{r.googleStatus === 'CONNECTED' ? 'Conectada' : 'Erro'}</Tag> },
    { key: 'lastSyncLabel', header: 'Último sync' },
    {
      key: 'actions',
      header: 'Ação',
      render: (r) => (
        <Button size="sm" onClick={() => navigate(`/integracoes/${r.clientId}`)}>
          Gerenciar
        </Button>
      ),
    },
  ];

  return (
    <div className="integrations-list">
      <Card>
        <CardHeader>
          <CardTitle icon={<IconPlug />} title="Todas as integrações" subtitle="Status de conexão por cliente" />
        </CardHeader>
        {loading ? (
          <div className="page-loading">Carregando integrações...</div>
        ) : (
          <ResponsiveTable columns={columns} rows={rows} rowKey="clientId" onRowClick={(r) => navigate(`/integracoes/${r.clientId}`)} />
        )}
      </Card>
    </div>
  );
}
