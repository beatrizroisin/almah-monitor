import { useNavigate } from 'react-router-dom';
import { useWizardStore } from '../../store/wizardStore';
import { WizardSteps } from '../../components/wizard/WizardSteps';
import { Card, CardHeader, CardBody, CardTitle } from '../../components/ui/Card';
import { Divider, SectionLabel } from '../../components/ui/Form';
import { Button } from '../../components/ui/Button';
import { InfoBox } from '../../components/ui/InfoBox';
import { Tag } from '../../components/ui/Tag';
import './WizardStep.scss';

export function WizardStep3() {
  const wizard = useWizardStore();
  const navigate = useNavigate();

  async function handleAuthorize() {
    await wizard.startGoogleOAuth();
    // Sondagem simples: confere o status a cada 2s por até 60s, ou o
    // usuário pode clicar de novo manualmente após autorizar no popup.
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts += 1;
      const connected = await wizard.checkGoogleStatus();
      if (connected || attempts > 30) clearInterval(interval);
    }, 2000);
  }

  function handleNext() {
    navigate('/clientes/novo/4');
  }

  return (
    <div className="wizard-step">
      <WizardSteps current={3} />
      <Card>
        <CardHeader>
          <CardTitle title="Google Merchant Center" subtitle="Autenticação OAuth 2.0 com a conta do cliente" />
        </CardHeader>
        <CardBody>
          <InfoBox tone="blue" className="wizard-step__info">
            A autenticação é feita via OAuth 2.0. O responsável da conta Google Merchant precisa autorizar o acesso.
            Use uma conta com permissão Admin à conta Merchant.
          </InfoBox>

          <SectionLabel>Merchant ID configurado</SectionLabel>
          <div className="wizard-step__merchant-id">{wizard.merchantId || '—'}</div>

          <SectionLabel>Escopos solicitados</SectionLabel>
          <div className="perm-row">
            <div>
              <div className="perm-name">Merchant Center — Leitura completa</div>
              <div className="perm-scope">https://www.googleapis.com/auth/content</div>
            </div>
            <Tag color="blue">Obrigatório</Tag>
          </div>

          <Divider />

          {!wizard.googleConnected ? (
            <button className="oauth-btn" onClick={handleAuthorize}>
              <div className="g-icon">G</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>Autorizar com Google</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Abre janela de consentimento OAuth 2.0</div>
              </div>
            </button>
          ) : (
            <>
              <InfoBox tone="green" className="wizard-step__result">
                ✓ Autorização concedida com sucesso
                <br />
                <span style={{ fontSize: 11, opacity: 0.8 }}>Renovação automática ativa</span>
              </InfoBox>
              {wizard.googleSummary && (
                <>
                  <SectionLabel>Dados encontrados</SectionLabel>
                  <div className="summary-row">
                    <span className="summary-label">Total de produtos no Merchant</span>
                    <span className="summary-value">{wizard.googleSummary.totalProducts?.toLocaleString('pt-BR')}</span>
                  </div>
                  <div className="summary-row">
                    <span className="summary-label">Produtos aprovados</span>
                    <span className="summary-value" style={{ color: 'var(--green-text)' }}>
                      {wizard.googleSummary.approvedProducts?.toLocaleString('pt-BR')}
                    </span>
                  </div>
                  <div className="summary-row">
                    <span className="summary-label">Produtos reprovados</span>
                    <span className="summary-value" style={{ color: 'var(--red-text)' }}>
                      {wizard.googleSummary.disapprovedProducts?.toLocaleString('pt-BR')}
                    </span>
                  </div>
                </>
              )}
            </>
          )}

          <div className="form-actions">
            <Button onClick={() => navigate('/clientes/novo/2')}>← Voltar</Button>
            <Button variant="primary" disabled={!wizard.googleConnected} onClick={handleNext}>
              Próximo: Notificações →
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
