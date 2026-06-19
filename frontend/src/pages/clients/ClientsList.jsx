import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle } from '../../components/ui/Card';
import { ResponsiveTable } from '../../components/ui/ResponsiveTable';
import { Avatar } from '../../components/ui/Avatar';
import { Tag } from '../../components/ui/Tag';
import { Button } from '../../components/ui/Button';
import { IconUsers } from '../../components/ui/Icons';
import { useClientsStore } from '../../store/clientsStore';
import './ClientsList.scss';

const toneMap = { Crítico: 'red', Atenção: 'orange', Saudável: 'green' };

export function ClientsListPage() {
  const { clients, fetchClients, loading, removeClient } = useClientsStore();
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  async function handleDelete(client) {
    if (!window.confirm(`Tem certeza que deseja excluir o cliente "${client.name}"? Esta ação não pode ser desfeita.`)) return;
    await removeClient(client.id);
  }

  useEffect(() => {
    fetchClients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = clients.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));
  const inAlertCount = clients.filter((c) => c.status !== 'Saudável').length;

  const columns = [
    {
      key: 'name',
      header: 'Cliente',
      primary: true,
      render: (r) => (
        <div className="cell-name">
          <Avatar initials={r.initials} tone={toneMap[r.status]} />
          <span className="fw">{r.name}</span>
        </div>
      ),
    },
    { key: 'vtexAccount', header: 'VTEX account', render: (r) => <span className="mono">{r.vtexAccount}</span> },
    { key: 'merchantId', header: 'Merchant ID', render: (r) => <span className="mono">{r.merchantId}</span> },
    {
      key: 'integrations',
      header: 'Integrações',
      render: (r) => (
        <>
          <Tag color={r.vtexStatus === 'CONNECTED' ? 'green' : 'red'}>VTEX</Tag>{' '}
          <Tag color={r.googleStatus === 'CONNECTED' ? 'green' : 'red'}>Google</Tag>
        </>
      ),
    },
    { key: 'mediaOwner', header: 'Responsável mídia' },
    { key: 'lastSyncLabel', header: 'Último sync' },
    { key: 'status', header: 'Status', render: (r) => <Tag color={toneMap[r.status]}>{r.status}</Tag> },
    {
      key: 'actions',
      header: 'Ações',
      render: (r) => (
        <div className="clients-list__row-actions" onClick={(e) => e.stopPropagation()}>
          <Button size="sm" onClick={() => navigate(`/clientes/${r.id}/editar`)}>Editar</Button>
          <Button size="sm" onClick={() => navigate(`/integracoes/${r.id}`)}>Integrações</Button>
          <Button size="sm" variant="danger" onClick={() => handleDelete(r)}>Excluir</Button>
        </div>
      ),
    },
  ];

  return (
    <div className="clients-list">
      <Card>
        <CardHeader
          actions={
            <input
              type="text"
              placeholder="Buscar cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="clients-list__search"
            />
          }
        >
          <CardTitle
            icon={<IconUsers />}
            title="Clientes cadastrados"
            subtitle={`${clients.length} clientes · ${inAlertCount} com alertas`}
          />
        </CardHeader>

        {loading ? (
          <div className="page-loading">Carregando clientes...</div>
        ) : (
          <ResponsiveTable columns={columns} rows={filtered} onRowClick={(r) => navigate(`/clientes/${r.id}`)} />
        )}
      </Card>
    </div>
  );
}
