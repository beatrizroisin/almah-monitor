import './WizardSteps.scss';

const STEP_LABELS = ['Dados do cliente', 'Integração VTEX', 'Google Merchant', 'Notificações', 'Revisão'];

export function WizardSteps({ current }) {
  return (
    <div className="wsteps">
      {STEP_LABELS.map((label, i) => {
        const stepNum = i + 1;
        const done = stepNum < current;
        const active = stepNum === current;
        return (
          <div className="wsteps__step" key={label}>
            <div className="wsteps__group">
              <div className={`wsteps__circle ${done ? 'wsteps__circle--done' : ''} ${active ? 'wsteps__circle--active' : ''}`}>
                {done ? '✓' : stepNum}
              </div>
              <div className={`wsteps__label ${done ? 'wsteps__label--done' : ''} ${active ? 'wsteps__label--active' : ''}`}>
                {label}
              </div>
            </div>
            {stepNum < STEP_LABELS.length && <div className={`wsteps__line ${done ? 'wsteps__line--done' : ''}`} />}
          </div>
        );
      })}
    </div>
  );
}
