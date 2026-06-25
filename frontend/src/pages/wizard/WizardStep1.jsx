import { useNavigate } from 'react-router-dom';
import { useWizardStore } from '../../store/wizardStore';
import { WizardSteps } from '../../components/wizard/WizardSteps';
import { Card, CardHeader, CardBody, CardTitle } from '../../components/ui/Card';
import { FormGrid, FormFull, Field, Divider, SectionLabel } from '../../components/ui/Form';
import { Button } from '../../components/ui/Button';
import { IconUsers } from '../../components/ui/Icons';
import './WizardStep.scss';

export function WizardStep1() {
  const wizard = useWizardStore();
  const navigate = useNavigate();

  async function handleNext() {
    if (!wizard.name.trim()) return alert('Por favor, informe o nome do cliente.');
    if (!wizard.vtexAccount.trim()) return alert('Por favor, informe o Account Name da VTEX.');
    if (!wizard.merchantId.trim()) return alert('Por favor, informe o Merchant Center ID.');
    const ok = await wizard.submitStep1();
    if (ok) navigate('/clientes/novo/2');
  }

  return (
    <div className="wizard-step">
      <WizardSteps current={1} />
      <Card>
        <CardHeader>
          <CardTitle icon={<IconUsers />} title="Informações do cliente" subtitle="Dados gerais da loja e responsáveis internos" />
        </CardHeader>
        <CardBody>
          <FormGrid>
            <FormFull>
              <Field label="Nome do cliente" required>
                <input
                  type="text"
                  value={wizard.name}
                  onChange={(e) => wizard.setField('name', e.target.value)}
                  placeholder="ex: Lojas Exemplo"
                />
              </Field>
            </FormFull>
            <Field label="Plataforma" required>
              <select value={wizard.platform} onChange={(e) => wizard.setField('platform', e.target.value)}>
                <option value="VTEX">VTEX</option>
                <option value="Shopify">Shopify</option>
                <option value="Magento">Magento</option>
              </select>
            </Field>
          </FormGrid>

          <Divider />
          <SectionLabel>Identificadores de plataforma</SectionLabel>
          <FormGrid>
            <Field label="Account name VTEX" required hint="Parte do domínio: {account}.vtexcommercestable.com.br">
              <input
                type="text"
                value={wizard.vtexAccount}
                onChange={(e) => wizard.setField('vtexAccount', e.target.value)}
                placeholder="ex: minhaloja"
              />
            </Field>
            <Field label="Merchant Center ID" required hint="10 dígitos — encontrar em merchant.google.com">
              <input
                type="text"
                value={wizard.merchantId}
                onChange={(e) => wizard.setField('merchantId', e.target.value)}
                placeholder="ex: 9812341234"
              />
            </Field>
            <FormFull>
              <Field label="URL da loja" hint="Usada para montar links de produto no painel">
                <input
                  type="text"
                  value={wizard.storeUrl}
                  onChange={(e) => wizard.setField('storeUrl', e.target.value)}
                  placeholder="https://www.minhaloja.com.br"
                />
              </Field>
            </FormFull>
          </FormGrid>

          <Divider />
          <SectionLabel>Responsáveis internos Almah</SectionLabel>
          <FormGrid>
            <Field label="Responsável de mídia">
              <input
                type="text"
                value={wizard.mediaOwnerId}
                onChange={(e) => wizard.setField('mediaOwnerId', e.target.value)}
                placeholder="Nome do colaborador"
              />
            </Field>
            <Field label="Responsável técnico (dev)">
              <select value={wizard.devOwnerId} onChange={(e) => wizard.setField('devOwnerId', e.target.value)}>
                <option value="">Selecionar</option>
                <option value="joao-dev">João Dev</option>
                <option value="pedro-tech">Pedro Tech</option>
                <option value="lucas-backend">Lucas Backend</option>
              </select>
            </Field>
            <FormFull>
              <Field label="Observações internas">
                <textarea
                  value={wizard.notes}
                  onChange={(e) => wizard.setField('notes', e.target.value)}
                  placeholder="Informações relevantes, particularidades do catálogo, acordos especiais..."
                />
              </Field>
            </FormFull>
          </FormGrid>

          {wizard.error && <div className="wizard-step__error">{wizard.error}</div>}

          <div className="form-actions">
            <Button onClick={() => navigate('/clientes')}>← Cancelar</Button>
            <Button variant="primary" loading={wizard.submitting} onClick={handleNext}>
              Próximo: Integração VTEX →
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
