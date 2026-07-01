import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardBody } from '../../components/ui/Card';
import { MetricsGrid, Metric } from '../../components/ui/Metric';
import { ResponsiveTable } from '../../components/ui/ResponsiveTable';
import { Tabs } from '../../components/ui/Tabs';
import { Tag } from '../../components/ui/Tag';
import { Button } from '../../components/ui/Button';
import { Avatar } from '../../components/ui/Avatar';
import { InfoBox } from '../../components/ui/InfoBox';
import { useClientsStore } from '../../store/clientsStore';
import { skusService, alertsService } from '../../api';
import { toast } from '../../components/ui/Toast';
import './ClientDetail.scss';

const toneMap = { Crítico: 'red', Atenção: 'orange', Saudável: 'green' };
const issueTone = { 'Preço divergente': 'red', 'Produto expirado': 'red', 'Imagem inválida': 'orange', 'GTIN ausente': 'orange', 'Fora de estoque': 'gray' };
const severityTone = { Crítico: 'red', Alto: 'orange', Médio: 'gray' };

export function ClientDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { selectedClient, selectedClientDashboard, selectClient, triggerSync, loading } = useClientsStore();
  const [tab, setTab] = useState('problems');
  const [missingSkus, setMissingSkus] = useState([]);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    selectClient(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (id) {
      skusService.listMissing(id).then((data) => setMissingSkus(data.items ?? data));
    }
  }, [id]);

  async function handleSync() {
    setSyncing(true);
    try {
      await triggerSync(id);
      toast('Sincronização concluída com sucesso');
    } catch {
      toast('Erro ao sincronizar — tente novamente');
    } finally {
      setSyncing(false);
    }
  }

  async function handleReprocess(sku) {
    await skusService.reprocess(sku.id);
    toast('Reprocessando...');
  }

  if (loading || !selectedClient) return <div className="page-loading">Carregando cliente...</div>;

  const c = selectedClient;
  const dash = selectedClientDashboard || {};
  const tone = toneMap[c.statusLabel] || 'gray';
  const activeAlert = dash.activeAlert;

  const problemColumns = [
    { key: 'skuId', header: 'SKU ID', primary: true, render: (r) => <span className="mono">{r.skuId}</span> },
    { key: 'productName', header: 'Produto', render: (r) => <span className="fw">{r.productName}</span> },
    { key: 'issue', header: 'Problema', render: (r) => <Tag color={issueTone[r.issue] || 'gray'}>{r.issue}</Tag> },
    { key: 'severity', header: 'Severidade', render: (r) => <Tag color={severityTone[r.severity] || 'gray'}>{r.severity}</Tag> },
    { key: 'statusLabel', header: 'Status' },
    { key: 'actions', header: 'Ações', render: (r) => <Button size="sm" onClick={() => handleReprocess(r)}>VTEX</Button> },
  ];

  const missingColumns = [
    { key: 'skuId', header: 'SKU ID', primary: true, render: (r) => <span className="mono">{r.skuId}</span> },
    { key: 'productName', header: 'Produto', render: (r) => <span className="fw">{r.productName}</span> },
    { key: 'category', header: 'Categoria' },
    { key: 'reason', header: 'Motivo', render: (r) => <Tag color={r.reason?.startsWith('Inativo') ? 'gray' : 'orange'}>{r.reason}</Tag> },
    { key: 'actions', header: 'Ação', render: (r) => <Button size="sm" onClick={() => handleReprocess(r)}>Reprocessar</Button> },
  ];

  return (
    <div className="client-detail">
      <div className="client-detail__header">
        <Avatar initials={c.initials} tone={tone} size={40} />
        <div className="client-detail__header-info">
          <div className="client-detail__name">{c.name}</div>
          <div className="client-detail__domain">
            {c.vtexAccount}.vtexcommercestable.com.br · Merchant: {c.merchantId}
          </div>
        </div>
        <div className="client-detail__header-actions">
          <Tag color={tone}>{c.statusLabel} · Score {c.healthScore}</Tag>
          <Button size="sm" onClick={() => window.open(`https://merchants.google.com/mc/overview?a=${c.merchantId}`, '_blank')}>
            Merchant Center ↗
          </Button>
          <Button size="sm" variant="primary" loading={syncing} onClick={handleSync}>
            ↺ Sincronizar
          </Button>
        </div>
      </div>

      <MetricsGrid columns={5}>
        <Metric label="SKUs ativos na VTEX" value={(dash.vtexSkus ?? 0).toLocaleString('pt-BR')} />
        <Metric label="SKUs no Merchant" value={(dash.merchantSkus ?? 0).toLocaleString('pt-BR')} delta={`${missingSkus.length} ausentes`} deltaDirection="down" />
        <Metric label="Aprovados hoje" value={(dash.approvedToday ?? 0).toLocaleString('pt-BR')} valueColor="var(--red)" delta={`vs ${dash.approvedYesterday ?? 0} ontem`} deltaDirection="down" />
        <Metric label="Limitados" value={(dash.limitedSkus ?? 0).toLocaleString('pt-BR')} valueColor="var(--orange)" delta="visibilidade restrita" />
        <Metric label="Queda 24h" value={dash.dropPctLabel ?? '—'} valueColor="var(--red)" delta={`${dash.dropAbsoluteLabel ?? ''}`} deltaDirection="down" />
      </MetricsGrid>

      <Card>
        <Tabs
          tabs={[
            { key: 'problems', label: `Problemas (${dash.problemsCount ?? 0})` },
            { key: 'missing', label: `Ausentes (${missingSkus.length})` },
            { key: 'alert', label: 'Alerta ativo' },
          ]}
          active={tab}
          onChange={setTab}
        />

        {tab === 'problems' && (
          <ResponsiveTable columns={problemColumns} rows={dash.problemSkus ?? []} rowKey="id" emptyLabel="Nenhum SKU com problema neste cliente." />
        )}

        {tab === 'missing' && (
          <CardBody>
            <InfoBox tone="blue" className="client-detail__missing-info">
              {missingSkus.length} SKUs da VTEX não foram encontrados no Google Merchant Center — veja o motivo em cada linha:
              inativos na VTEX, ou ativos mas nunca enviados ao feed do Merchant.
            </InfoBox>
            <ResponsiveTable columns={missingColumns} rows={missingSkus} rowKey="id" emptyLabel="Nenhum SKU ausente." />
          </CardBody>
        )}

        {tab === 'alert' && (
          <CardBody>
            {!activeAlert ? (
              <div className="client-detail__no-alert">Nenhum alerta ativo para este cliente.</div>
            ) : (
              <>
                <InfoBox tone="red" className="client-detail__alert-box">
                  <strong>ALERTA CRÍTICO</strong> — {activeAlert.message}
                </InfoBox>
                {activeAlert.recommendedActions?.length > 0 && (
                  <>
                    <div className="client-detail__actions-title">Ações recomendadas</div>
                    <div className="client-detail__actions-list">
                      {activeAlert.recommendedActions.map((a, i) => (
                        <div key={i}>✓ {a}</div>
                      ))}
                    </div>
                  </>
                )}
                <div className="client-detail__alert-buttons">
                  <Button
                    variant="success"
                    onClick={async () => {
                      await alertsService.resolve(activeAlert.id);
                      toast('Alerta marcado como resolvido');
                      selectClient(id);
                    }}
                  >
                    ✓ Marcar resolvido
                  </Button>
                  <Button size="sm" onClick={() => toast('Comentário adicionado')}>
                    Comentar
                  </Button>
                  <Button size="sm" onClick={() => toast('Relatório exportado')}>
                    Exportar relatório
                  </Button>
                </div>
              </>
            )}
          </CardBody>
        )}
      </Card>
    </div>
  );
}
