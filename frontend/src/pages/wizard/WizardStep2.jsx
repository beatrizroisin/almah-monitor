import { useNavigate } from 'react-router-dom';
import { useWizardStore } from '../../store/wizardStore';
import { WizardSteps } from '../../components/wizard/WizardSteps';
import { Card, CardHeader, CardBody, CardTitle } from '../../components/ui/Card';
import { FormGrid, Field, Divider, SectionLabel } from '../../components/ui/Form';
import { Button } from '../../components/ui/Button';
import { InfoBox } from '../../components/ui/InfoBox';
import { IconPlug } from '../../components/ui/Icons';
import './WizardStep.scss';

export function WizardStep2() {
  const wizard = useWizardStore();
  const navigate = useNavigate();

  if (!wizard.clientId) {
    // Proteção: se o usuário acessar a etapa 2 direto, manda de volta pra 1.
    navigate('/clientes/novo/1');
    return null;
  }

  async function handleTest() {
    if (!wizard.vtexAppKey.trim() || !wizard.vtexAppToken.trim()) {
      alert('Informe AppKey e AppToken antes de testar.');
      return;
    }
    await wizard.testVtexConnection();
  }

  async function handleNext() {
    if (!wizard.vtexTestResult || wizard.vtexTestResult.error) {
      alert('Teste a conexão com sucesso antes de avançar.');
      return;
    }
    const ok = await wizard.submitStep2();
    if (ok) navigate('/clientes/novo/3');
  }

  return (
    <div className="wizard-step">
      <WizardSteps current={2} />
      <Card>
        <CardHeader>
          <CardTitle icon={<IconPlug />} title="Credenciais VTEX" subtitle="AppKey e AppToken para leitura do catálogo" />
        </CardHeader>
        <CardBody>
          <InfoBox tone="blue" className="wizard-step__info">
            Gerar as credenciais em <strong>Configurações → Gerenciamento de conta → Chaves de acesso</strong> no painel VTEX.
            Criar uma AppKey exclusiva para o ALMAH Monitor com permissão somente leitura.
          </InfoBox>

          <FormGrid>
            <Field label="AppKey VTEX" required hint="Gerado automaticamente pelo painel VTEX">
              <input
                type="text"
                value={wizard.vtexAppKey}
                onChange={(e) => wizard.setField('vtexAppKey', e.target.value)}
                placeholder="vtexappkey-suaconta-XXXXX"
              />
            </Field>
            <Field label="AppToken VTEX" required hint="Tratar como senha — não compartilhar">
              <input
                type="password"
                value={wizard.vtexAppToken}
                onChange={(e) => wizard.setField('vtexAppToken', e.target.value)}
                placeholder="Token secreto"
              />
            </Field>
          </FormGrid>

          <Divider />
          <SectionLabel>Permissões mínimas necessárias</SectionLabel>
          <div className="perm-row">
            <div>
              <div className="perm-name">Catalog — View</div>
              <div className="perm-scope">catalog</div>
            </div>
            <div className="toggle" />
          </div>
          <div className="perm-row">
            <div>
              <div className="perm-name">Logistics Viewer — View</div>
              <div className="perm-scope">logistics-viewer</div>
            </div>
            <div className="toggle" />
          </div>
          <div className="perm-row">
            <div>
              <div className="perm-name">Pricing — View</div>
              <div className="perm-scope">pricing-view</div>
            </div>
            <div className="toggle" />
          </div>

          <Divider />
          <Button icon={<IconPlug />} loading={wizard.vtexTesting} onClick={handleTest} className="wizard-step__test-btn">
            Testar conexão VTEX
          </Button>

          {wizard.vtexTestResult && !wizard.vtexTestResult.error && (
            <InfoBox tone="green" className="wizard-step__result">
              ✓ Conexão estabelecida · {wizard.vtexTestResult.sku_count?.toLocaleString('pt-BR')} SKUs ativos encontrados
            </InfoBox>
          )}
          {wizard.vtexTestResult?.error && (
            <InfoBox tone="red" className="wizard-step__result">
              ✕ {wizard.vtexTestResult.error}
            </InfoBox>
          )}

          {wizard.error && <div className="wizard-step__error">{wizard.error}</div>}

          <div className="form-actions">
            <Button onClick={() => navigate('/clientes/novo/1')}>← Voltar</Button>
            <Button variant="primary" loading={wizard.submitting} onClick={handleNext}>
              Próximo: Google Merchant →
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
