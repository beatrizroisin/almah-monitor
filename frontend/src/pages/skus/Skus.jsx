import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle } from '../../components/ui/Card';
import { ResponsiveTable } from '../../components/ui/ResponsiveTable';
import { Tag } from '../../components/ui/Tag';
import { Button } from '../../components/ui/Button';
import { IconDownload } from '../../components/ui/Icons';
import { skusService } from '../../api';
import { useClientsStore } from '../../store/clientsStore';
import { toast } from '../../components/ui/Toast';
import './Skus.scss';

const issueTone = {
  'Preço divergente': 'red',
  'Produto expirado': 'red',
  'Imagem inválida': 'orange',
  'GTIN ausente': 'orange',
  'GTIN ausente/inválido': 'orange',
};

const severityTone = { Crítico: 'red', Alto: 'orange', Médio: 'gray' };

export function SkusPage() {
  const { clients } = useClientsStore();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [clientFilter, setClientFilter] = useState('');
  const [issueFilter, setIssueFilter] = useState('');

  async function load() {
    setLoading(true);
    try {
      const data = await skusService.listProblematic({
        clientId: clientFilter || undefined,
        issueType: issueFilter || undefined,
      });
      setRows(data.items ?? data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientFilter, issueFilter]);

  async function handleExport() {
    try {
      const blob = await skusService.exportCsv({ clientId: clientFilter || undefined });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `skus-problematicos-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast('CSV exportado com sucesso');
    } catch {
      toast('Erro ao exportar CSV');
    }
  }

  async function handleReprocess(sku) {
    await skusService.reprocess(sku.id);
    toast(`Reprocessando ${sku.skuId}...`);
    load();
  }

  const columns = [
    { key: 'clientName', header: 'Cliente', primary: true, render: (r) => <Tag color={r.clientTone || 'gray'}>{r.clientName}</Tag> },
    { key: 'skuId', header: 'SKU ID', render: (r) => <span className="mono">{r.skuId}</span> },
    { key: 'productName', header: 'Produto', render: (r) => <span className="fw">{r.productName}</span> },
    { key: 'brand', header: 'Marca' },
    { key: 'issue', header: 'Problema', render: (r) => <Tag color={issueTone[r.issue] || 'gray'}>{r.issue}</Tag> },
    { key: 'statusLabel', header: 'Status' },
    { key: 'severity', header: 'Severidade', render: (r) => <Tag color={severityTone[r.severity] || 'gray'}>{r.severity}</Tag> },
    { key: 'isActiveVtex', header: 'Ativo VTEX', render: (r) => (r.isActiveVtex ? '✓' : '—') },
    {
      key: 'actions',
      header: 'Ações',
      render: (r) => (
        <Button size="sm" onClick={() => handleReprocess(r)}>
          {r.platform === 'merchant' ? 'Merchant' : 'VTEX'}
        </Button>
      ),
    },
  ];

  return (
    <div className="skus-page">
      <Card>
        <CardHeader
          actions={
            <div className="skus-page__controls">
              <select value={clientFilter} onChange={(e) => setClientFilter(e.target.value)}>
                <option value="">Todos os clientes</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <select value={issueFilter} onChange={(e) => setIssueFilter(e.target.value)}>
                <option value="">Todos os problemas</option>
                <option value="price_mismatch">Preço divergente</option>
                <option value="invalid_image">Imagem inválida</option>
                <option value="missing_gtin">GTIN ausente</option>
                <option value="expired">Expirado</option>
              </select>
              <Button size="sm" icon={<IconDownload />} onClick={handleExport}>
                Exportar CSV
              </Button>
            </div>
          }
        >
          <CardTitle title="SKUs problemáticos" subtitle={clientFilter ? undefined : 'Todos os clientes'} />
        </CardHeader>

        {loading ? (
          <div className="page-loading">Carregando SKUs...</div>
        ) : (
          <ResponsiveTable columns={columns} rows={rows} rowKey="id" />
        )}
      </Card>
    </div>
  );
}
