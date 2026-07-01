import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle } from '../../components/ui/Card';
import { IntegrationCard } from '../../components/client/IntegrationCard';
import { InfoBox } from '../../components/ui/InfoBox';
import { Button } from '../../components/ui/Button';
import { Avatar } from '../../components/ui/Avatar';
import { integrationsService } from '../../api/integrations.service';
import { syncService } from '../../api/index';
import { toast } from '../../components/ui/Toast';
import './ClientIntegrations.scss';

export function ClientIntegrationsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [vtexAppKey, setVtexAppKey] = useState('');
  const [vtexAppToken, setVtexAppToken] = useState('');
  const [saving, setSaving] = useState(false);
  const [logs, setLogs] = useState([]);
  const [syncing, setSyncing] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [res, logsRes] = await Promise.all([
        integrationsService.getByClient(id),
        syncService.getLogs(id).catch(() => []),
      ]);
      setData(res);
      setLogs(logsRes);
    } finally {
      setLoading(false);
    }
  }

  async function handleSyncNow() {
    setSyncing(true);
    try {
      await syncService.triggerNow(id);
      toast('Sync iniciado — atualizando logs...');
      setTimeout(() => load(), 4000);
    } catch (err) {
      toast('Erro ao iniciar sync: ' + (err?.response?.data?.message || err.message));
    } finally {
      setSyncing(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function hasVtexInput() {
    if (vtexAppKey && vtexAppToken) return true;
    toast('Por segurança a AppKey/AppToken não ficam salvas na tela — digite as duas para testar ou salvar');
    return false;
  }

  async function handleTestVtex() {
    if (!hasVtexInput()) return;
    try {
      await integrationsService.testVtex(id, { appKey: vtexAppKey, appToken: vtexAppToken });
      toast('Conexão VTEX estabelecida com sucesso');
    } catch {
      toast('Falha ao testar conexão VTEX');
    }
  }

  async function handleSaveVtex() {
    if (!hasVtexInput()) return;
    setSaving(true);
    try {
      await integrationsService.updateVtexCredentials(id, { appKey: vtexAppKey, appToken: vtexAppToken });
      toast('Credenciais VTEX salvas com sucesso');
      setVtexAppKey('');
      setVtexAppToken('');
      load();
    } catch {
      toast('Erro ao salvar credenciais');
    } finally {
      setSaving(false);
    }
  }

  async function handleRevokeGoogle() {
    if (!window.confirm('Desconectar a integração Google?')) return;
    await integrationsService.revokeGoogle(id);
    toast('Integração removida');
    load();
  }

  async function handleReconnectGoogle() {
    const { url } = await integrationsService.getGoogleAuthUrl(id);
    window.open(url, '_blank', 'width=520,height=640');
  }

  if (loading || !data) return <div className="page-loading">Carregando integrações...</div>;

  return (
    <div className="client-integrations">
      <Card>
        <CardHeader actions={<Button size="sm" onClick={() => navigate('/clientes')}>← Voltar</Button>}>
          <div className="client-integrations__title">
            <Avatar initials={data.initials} tone={data.tone || 'blue'} size={36} />
            <CardTitle title={`Integrações — ${data.clientName}`} subtitle="Gerenciar conexões ativas" />
          </div>
        </CardHeader>
      </Card>

      <IntegrationCard
        status={data.vtex?.status}
        logo={<div className="int-icon" style={{ color: '#FF3366' }}>VX</div>}
        name="VTEX Catalog API"
        description="Leitura de SKUs, estoque e preço"
        primaryAction={
          data.vtex?.status !== 'CONNECTED' && (
            <Button variant="primary" size="sm" onClick={handleTestVtex}>↺ Reconectar</Button>
          )
        }
      >
        {data.vtex?.status === 'ERROR' && (
          <InfoBox tone="red" className="client-integrations__info">
            AppToken expirado ou revogado. Regenerar as credenciais no painel VTEX e atualizar aqui.
          </InfoBox>
        )}
        <div className="int-fields">
          <div className="int-field">
            <span className="int-field-label">AppKey</span>
            <input
              type="password"
              placeholder={data.vtex?.hasCredentials ? '•••••••• (configurada — digite para trocar)' : 'Nova AppKey'}
              value={vtexAppKey}
              onChange={(e) => setVtexAppKey(e.target.value)}
              className="mono-input"
              autoComplete="off"
            />
          </div>
          <div className="int-field">
            <span className="int-field-label">AppToken</span>
            <input
              type="password"
              placeholder={data.vtex?.hasCredentials ? '•••••••• (configurado — digite para trocar)' : 'Novo AppToken'}
              value={vtexAppToken}
              onChange={(e) => setVtexAppToken(e.target.value)}
              className="mono-input"
              autoComplete="off"
            />
          </div>
          <div className="int-field">
            <span className="int-field-label">Último sync</span>
            <span style={{ fontSize: 12, color: data.vtex?.status === 'ERROR' ? 'var(--red-text)' : 'var(--text-secondary)' }}>
              {data.vtex?.lastSyncLabel || '—'}
            </span>
          </div>
        </div>
        <div className="client-integrations__btn-row">
          <Button size="sm" onClick={handleTestVtex}>Testar conexão</Button>
          <Button size="sm" variant="primary" loading={saving} onClick={handleSaveVtex}>
            💾 Salvar credenciais
          </Button>
        </div>
      </IntegrationCard>

      <IntegrationCard
        status={data.google?.status}
        logo={<div className="int-icon" style={{ background: 'var(--blue-light)' }}>G</div>}
        name="Google Merchant API"
        description="Status de produtos · OAuth 2.0"
        primaryAction={
          data.google?.status === 'CONNECTED' ? (
            <Button variant="danger" size="sm" onClick={handleRevokeGoogle}>Desconectar</Button>
          ) : (
            <Button variant="primary" size="sm" onClick={handleReconnectGoogle}>↺ Reconectar</Button>
          )
        }
      >
        {data.google?.status === 'CONNECTED' && (
          <InfoBox tone="green" className="client-integrations__info">
            ✓ OAuth 2.0 autorizado · Token válido até {data.google?.tokenExpiresAtLabel} (renovação automática ativa)
          </InfoBox>
        )}
        <div className="int-fields">
          <div className="int-field">
            <span className="int-field-label">Conta autorizada</span>
            <span style={{ fontSize: 12 }}>{data.google?.account || '—'}</span>
          </div>
          <div className="int-field">
            <span className="int-field-label">Merchant ID</span>
            <span className="mono" style={{ fontSize: 12 }}>{data.google?.merchantId || '—'}</span>
          </div>
          <div className="int-field">
            <span className="int-field-label">Último sync</span>
            <span style={{ fontSize: 12, color: 'var(--green-text)' }}>{data.google?.lastSyncLabel || '—'}</span>
          </div>
        </div>
      </IntegrationCard>

      <Card>
        <CardHeader actions={<Button size="sm" loading={syncing} onClick={handleSyncNow}>Sincronizar agora</Button>}>
          <CardTitle title="Logs de sincronização" subtitle="Últimas 10 execuções" />
        </CardHeader>
        {logs.length === 0 ? (
          <div style={{ padding: '16px 24px', color: 'var(--text-secondary)', fontSize: 13 }}>Nenhum sync registrado.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Data', 'Status', 'SKUs VTEX', 'Produtos Merchant', 'Erro'].map((h) => (
                  <th key={h} style={{ padding: '8px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.slice(0, 10).map((log) => (
                <tr key={log.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                  <td style={{ padding: '8px 16px', color: 'var(--text-secondary)' }}>
                    {new Date(log.startedAt).toLocaleString('pt-BR')}
                  </td>
                  <td style={{ padding: '8px 16px' }}>
                    <span style={{ fontWeight: 600, color: log.status === 'SUCCESS' ? 'var(--green-text)' : log.status === 'RUNNING' ? 'var(--orange-text)' : 'var(--red-text)' }}>
                      {log.status}
                    </span>
                  </td>
                  <td style={{ padding: '8px 16px' }}>{log.vtexSkusCollected ?? '—'}</td>
                  <td style={{ padding: '8px 16px' }}>{log.merchantProductsCollected ?? '—'}</td>
                  <td style={{ padding: '8px 16px', color: 'var(--red-text)', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {log.errorMessage || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
