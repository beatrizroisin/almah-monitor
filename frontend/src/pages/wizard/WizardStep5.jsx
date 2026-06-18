import { useNavigate } from 'react-router-dom';
import { useWizardStore } from '../../store/wizardStore';
import { WizardSteps } from '../../components/wizard/WizardSteps';
import { Card, CardHeader, CardBody, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Tag } from '../../components/ui/Tag';
import { IconCheck } from '../../components/ui/Icons';
import './WizardStep.scss';

export function WizardStep5() {
  const wizard = useWizardStore();
  const navigate = useNavigate();

  async function handleSave() {
    const ok = await wizard.finish();
    if (ok) {
      navigate('/clientes/novo/sucesso');
      wizard.reset();
    }
  }

  return (
    <div className="wizard-step">
      <WizardSteps current={5} />
      <Card>
        <CardHeader>
          <CardTitle icon={<IconCheck />} title="Revisão e confirmação" subtitle="Confira todos os dados antes de salvar" iconBg="var(--green-light)" />
        </CardHeader>
        <CardBody>
          <div className="review-grid">
            <div className="review-box">
              <div className="section-label">Dados do cliente</div>
              <div className="summary-row">
                <span className="summary-label">Nome</span>
                <span className="summary-value">{wizard.name || '—'}</span>
              </div>
              <div className="summary-row">
                <span className="summary-label">VTEX account</span>
                <span className="summary-value mono">{wizard.vtexAccount || '—'}</span>
              </div>
              <div className="summary-row">
                <span className="summary-label">Merchant ID</span>
                <span className="summary-value mono">{wizard.merchantId || '—'}</span>
              </div>
            </div>

            <div className="review-box">
              <div className="section-label">Integrações</div>
              <div className="summary-row">
                <span className="summary-label">VTEX</span>
                <Tag color={wizard.vtexTestResult?.sku_count ? 'green' : 'gray'}>
                  {wizard.vtexTestResult?.sku_count ? 'Conectada' : 'Pendente'}
                </Tag>
              </div>
              <div className="summary-row">
                <span className="summary-label">Google Merchant</span>
                <Tag color={wizard.googleConnected ? 'green' : 'gray'}>{wizard.googleConnected ? 'Autorizada' : 'Pendente'}</Tag>
              </div>
              <div className="summary-row">
                <span className="summary-label">SKUs encontrados</span>
                <span className="summary-value">{wizard.vtexTestResult?.sku_count?.toLocaleString('pt-BR') ?? '—'}</span>
              </div>
            </div>

            <div className="review-box">
              <div className="section-label">Notificações</div>
              <div className="summary-row">
                <span className="summary-label">E-mail</span>
                <Tag color={wizard.notifyEmail.enabled ? 'green' : 'gray'}>{wizard.notifyEmail.enabled ? 'Ativo' : 'Inativo'}</Tag>
              </div>
              <div className="summary-row">
                <span className="summary-label">Discord</span>
                <Tag color={wizard.notifyDiscord.enabled ? 'green' : 'gray'}>{wizard.notifyDiscord.enabled ? 'Ativo' : 'Inativo'}</Tag>
              </div>
              <div className="summary-row">
                <span className="summary-label">Relatório diário</span>
                <span className="summary-value">{wizard.reportTime} BRT</span>
              </div>
            </div>

            <div className="review-box">
              <div className="section-label">Primeira sincronização</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <input
                  type="checkbox"
                  checked={wizard.syncNowOnSave}
                  onChange={(e) => wizard.setField('syncNowOnSave', e.target.checked)}
                  style={{ width: 'auto' }}
                />
                <span style={{ fontSize: 13 }}>Sincronizar agora ao salvar</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                A primeira sync pode levar alguns minutos dependendo do volume de SKUs.
              </div>
            </div>
          </div>

          {wizard.error && <div className="wizard-step__error">{wizard.error}</div>}

          <div className="form-actions">
            <Button onClick={() => navigate('/clientes/novo/4')}>← Voltar</Button>
            <Button variant="success" loading={wizard.submitting} onClick={handleSave}>
              ✓ Salvar e ativar cliente
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
