import './CausesList.scss';

export function CausesList({ causes }) {
  if (!causes || causes.length === 0) {
    return <div className="causes__empty">Nenhuma causa registrada no período.</div>;
  }
  const max = Math.max(...causes.map((c) => c.count));

  return (
    <div className="causes">
      {causes.map((c) => (
        <div className="causes__item" key={c.label}>
          <span>{c.label}</span>
          <div className="causes__right">
            <span className="causes__count">{c.count.toLocaleString('pt-BR')}</span>
            <div className="causes__bar-wrap">
              <div
                className="causes__bar"
                style={{ width: `${(c.count / max) * 100}%`, background: c.severity === 'high' ? 'var(--red)' : c.severity === 'medium' ? 'var(--orange)' : '#aaa' }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
