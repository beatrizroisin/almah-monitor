import { useNavigate } from 'react-router-dom';
import { useWizardStore } from '../../store/wizardStore';
import { WizardSteps } from '../../components/wizard/WizardSteps';
import { Card, CardHeader, CardBody, CardTitle } from '../../components/ui/Card';
import { FormGrid, Field, Divider } from '../../components/ui/Form';
import { Button } from '../../components/ui/Button';
import { IconBell } from '../../components/ui/Icons';
import './WizardStep.scss';

function Toggle({ on, onClick }) {
  return <div className={`toggle ${on ? '' : 'toggle--off'}`} onClick={onClick} />;
}

export function WizardStep4() {
  const wizard = useWizardStore();
  const navigate = useNavigate();

  async function handleNext() {
    const ok = await wizard.submitStep4();
    if (ok) navigate('/clientes/novo/5');
  }

  return (
    <div className="wizard-step">
      <WizardSteps current={4} />
      <Card>
        <CardHeader>
          <CardTitle icon={<IconBell />} title="Canais de notificação" subtitle="Configure como a equipe receberá os alertas" iconBg="var(--orange-light)" />
        </CardHeader>
        <CardBody>
          <div className="notif-item">
            <div className="notif-left">
              <div className="notif-icon" style={{ background: 'var(--blue-light)' }}>📧</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>E-mail</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Alertas críticos e relatório diário</div>
              </div>
            </div>
            <div className="notif-right">
              <input
                className="notif-input"
                type="email"
                placeholder="email@almah.com.br"
                value={wizard.notifyEmail.value}
                onChange={(e) => wizard.setField('notifyEmail', { ...wizard.notifyEmail, value: e.target.value })}
              />
              <Toggle on={wizard.notifyEmail.enabled} onClick={() => wizard.setField('notifyEmail', { ...wizard.notifyEmail, enabled: !wizard.notifyEmail.enabled })} />
            </div>
          </div>

          <div className="notif-item">
            <div className="notif-left">
              <div className="notif-icon" style={{ background: 'var(--blue-light)' }}>🎮</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>Discord</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Webhook para canal do cliente</div>
              </div>
            </div>
            <div className="notif-right">
              <input
                className="notif-input"
                type="text"
                placeholder="https://discord.com/api/webhooks/..."
                value={wizard.notifyDiscord.value}
                onChange={(e) => wizard.setField('notifyDiscord', { ...wizard.notifyDiscord, value: e.target.value })}
              />
              <Toggle on={wizard.notifyDiscord.enabled} onClick={() => wizard.setField('notifyDiscord', { ...wizard.notifyDiscord, enabled: !wizard.notifyDiscord.enabled })} />
            </div>
          </div>

          <div className="notif-item">
            <div className="notif-left">
              <div className="notif-icon" style={{ background: 'var(--green-light)' }}>📱</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>WhatsApp</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Via Evolution API ou Z-API</div>
              </div>
            </div>
            <div className="notif-right">
              <input
                className="notif-input"
                type="text"
                placeholder="+55 11 99999-9999"
                value={wizard.notifyWhatsapp.value}
                onChange={(e) => wizard.setField('notifyWhatsapp', { ...wizard.notifyWhatsapp, value: e.target.value })}
              />
              <Toggle on={wizard.notifyWhatsapp.enabled} onClick={() => wizard.setField('notifyWhatsapp', { ...wizard.notifyWhatsapp, enabled: !wizard.notifyWhatsapp.enabled })} />
            </div>
          </div>

          <Divider />
          <div className="section-label">Alertas que disparam notificação</div>
          <div className="perm-row">
            <div>
              <div className="perm-name">Vermelho — crítico</div>
              <div className="perm-scope">Queda &gt;10% · Conector sem sync · Merchant com problema de conta</div>
            </div>
            <Toggle on={wizard.severityRed} onClick={() => wizard.setField('severityRed', !wizard.severityRed)} />
          </div>
          <div className="perm-row">
            <div>
              <div className="perm-name">Laranja — atenção</div>
              <div className="perm-scope">Queda 3-10% · GTIN inválido · Produtos expirados</div>
            </div>
            <Toggle on={wizard.severityOrange} onClick={() => wizard.setField('severityOrange', !wizard.severityOrange)} />
          </div>
          <div className="perm-row">
            <div>
              <div className="perm-name">Amarelo — monitoramento</div>
              <div className="perm-scope">Pequenas variações · Novos problemas de dados</div>
            </div>
            <Toggle on={wizard.severityYellow} onClick={() => wizard.setField('severityYellow', !wizard.severityYellow)} />
          </div>

          <Divider />
          <FormGrid>
            <Field label="Horário do relatório diário">
              <select value={wizard.reportTime} onChange={(e) => wizard.setField('reportTime', e.target.value)}>
                <option value="06:00">06:00</option>
                <option value="08:00">08:00</option>
                <option value="09:00">09:00</option>
                <option value="18:00">18:00</option>
              </select>
            </Field>
            <Field label="Fuso horário">
              <select defaultValue="America/Sao_Paulo">
                <option value="America/Sao_Paulo">America/Sao_Paulo (UTC-3)</option>
              </select>
            </Field>
          </FormGrid>

          {wizard.error && <div className="wizard-step__error">{wizard.error}</div>}

          <div className="form-actions">
            <Button onClick={() => navigate('/clientes/novo/3')}>← Voltar</Button>
            <Button variant="primary" loading={wizard.submitting} onClick={handleNext}>
              Próximo: Revisão →
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
