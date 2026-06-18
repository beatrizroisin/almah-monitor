import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import './WizardSuccess.scss';

export function WizardSuccessPage() {
  const navigate = useNavigate();
  return (
    <div className="wsuccess">
      <div className="wsuccess__icon">✓</div>
      <h3>Cliente cadastrado com sucesso!</h3>
      <p>Sincronização inicial iniciada. Em alguns minutos os primeiros dados aparecerão no dashboard.</p>
      <div className="wsuccess__actions">
        <Button onClick={() => navigate('/clientes')}>Ver todos os clientes</Button>
        <Button variant="primary" onClick={() => navigate('/clientes/novo/1')}>+ Cadastrar outro cliente</Button>
      </div>
    </div>
  );
}
