import { useEffect, useState } from 'react';
import { Card, CardHeader, CardBody, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { IconBell } from '../../components/ui/Icons';
import { notificationsService } from '../../api';
import { toast } from '../../components/ui/Toast';
import '../wizard/WizardStep.scss';
import './Notifications.scss';

function Toggle({ on, onClick }) {
  return <div className={`toggle ${on ? '' : 'toggle--off'}`} onClick={onClick} />;
}

export function NotificationsPage() {
  const [config, setConfig] = useState({
    discordEnabled: true,
    discordWebhook: '',
    emailEnabled: true,
    emailAddress: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    notificationsService
      .getGlobalConfig()
      .then((data) => setConfig(data))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      await notificationsService.updateGlobalConfig(config);
      toast('Configurações de notificação salvas');
    } catch {
      toast('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="page-loading">Carregando configurações...</div>;

  return (
    <div className="notifications-page">
      <Card>
        <CardHeader>
          <CardTitle
            icon={<IconBell />}
            title="Configurações globais de notificação"
            subtitle="Canais padrão quando o cliente não tem configuração própria"
            iconBg="var(--orange-light)"
          />
        </CardHeader>
        <CardBody>
          <div className="notif-item">
            <div className="notif-left">
              <div className="notif-icon" style={{ background: 'var(--blue-light)' }}>🎮</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>Discord — #alertas-merchant</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Todos os alertas críticos da Almah</div>
              </div>
            </div>
            <div className="notif-right">
              <input
                className="notif-input"
                type="text"
                value={config.discordWebhook}
                onChange={(e) => setConfig((c) => ({ ...c, discordWebhook: e.target.value }))}
              />
              <Toggle on={config.discordEnabled} onClick={() => setConfig((c) => ({ ...c, discordEnabled: !c.discordEnabled }))} />
            </div>
          </div>

          <div className="notif-item">
            <div className="notif-left">
              <div className="notif-icon" style={{ background: 'var(--blue-light)' }}>📧</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>E-mail — time@almah.com.br</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Relatório diário consolidado</div>
              </div>
            </div>
            <div className="notif-right">
              <input
                className="notif-input"
                type="email"
                value={config.emailAddress}
                onChange={(e) => setConfig((c) => ({ ...c, emailAddress: e.target.value }))}
              />
              <Toggle on={config.emailEnabled} onClick={() => setConfig((c) => ({ ...c, emailEnabled: !c.emailEnabled }))} />
            </div>
          </div>

          <div className="divider" />
          <Button variant="primary" loading={saving} onClick={handleSave}>
            💾 Salvar configurações
          </Button>
        </CardBody>
      </Card>
    </div>
  );
}
