import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardBody, CardTitle } from '../../components/ui/Card';
import { FormGrid, FormFull, Field } from '../../components/ui/Form';
import { Button } from '../../components/ui/Button';
import { Avatar } from '../../components/ui/Avatar';
import { clientsService } from '../../api/clients.service';
import { toast } from '../../components/ui/Toast';
import './EditClient.scss';

export function EditClientPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    clientsService
      .getById(id)
      .then((c) => setForm(c))
      .finally(() => setLoading(false));
  }, [id]);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await clientsService.update(id, form);
      toast('Alterações salvas com sucesso');
      navigate('/clientes');
    } catch {
      toast('Erro ao salvar alterações');
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove() {
    if (!window.confirm('Tem certeza que deseja remover este cliente?')) return;
    await clientsService.remove(id);
    toast('Cliente removido');
    navigate('/clientes');
  }

  if (loading || !form) return <div className="page-loading">Carregando cliente...</div>;

  return (
    <div className="edit-client">
      <Card>
        <CardHeader
          actions={
            <div className="edit-client__header-actions">
              <Button variant="danger" size="sm" onClick={handleRemove}>🗑 Remover</Button>
              <Button size="sm" onClick={() => navigate(`/integracoes/${id}`)}>Gerenciar integrações</Button>
            </div>
          }
        >
          <div className="edit-client__title">
            <Avatar initials={form.initials} tone={form.tone || 'blue'} size={36} />
            <CardTitle title={form.name} subtitle="Editar dados do cliente" />
          </div>
        </CardHeader>
        <CardBody>
          <FormGrid>
            <FormFull>
              <Field label="Nome do cliente">
                <input type="text" value={form.name || ''} onChange={(e) => set('name', e.target.value)} />
              </Field>
            </FormFull>
            <Field label="VTEX account">
              <input type="text" value={form.vtexAccount || ''} onChange={(e) => set('vtexAccount', e.target.value)} />
            </Field>
            <Field label="Merchant Center ID">
              <input type="text" value={form.merchantId || ''} onChange={(e) => set('merchantId', e.target.value)} />
            </Field>
            <Field label="URL da loja">
              <input type="text" value={form.storeUrl || ''} onChange={(e) => set('storeUrl', e.target.value)} />
            </Field>
            <Field label="Status">
              <select value={form.status || 'ACTIVE'} onChange={(e) => set('status', e.target.value)}>
                <option value="ACTIVE">Ativo</option>
                <option value="INACTIVE">Inativo</option>
              </select>
            </Field>
            <Field label="Responsável mídia">
              <input type="text" value={form.mediaOwner || ''} onChange={(e) => set('mediaOwner', e.target.value)} />
            </Field>
            <Field label="Responsável técnico">
              <input type="text" value={form.devOwner || ''} onChange={(e) => set('devOwner', e.target.value)} />
            </Field>
            <FormFull>
              <Field label="Observações">
                <textarea value={form.notes || ''} onChange={(e) => set('notes', e.target.value)} />
              </Field>
            </FormFull>
          </FormGrid>

          <div className="form-actions">
            <Button onClick={() => navigate('/clientes')}>← Cancelar</Button>
            <Button variant="primary" loading={saving} onClick={handleSave}>
              💾 Salvar alterações
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
