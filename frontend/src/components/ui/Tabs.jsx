import './Tabs.scss';

export function Tabs({ tabs, active, onChange }) {
  return (
    <div className="tabs-bar">
      {tabs.map((t) => (
        <button
          key={t.key}
          className={`tabs-bar__tab ${active === t.key ? 'tabs-bar__tab--active' : ''}`}
          onClick={() => onChange(t.key)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
