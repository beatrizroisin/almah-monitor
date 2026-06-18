import './HealthScore.scss';

function tier(score) {
  if (score >= 90) return 'green';
  if (score >= 70) return 'yellow';
  if (score >= 40) return 'orange';
  return 'red';
}

const colorMap = {
  green: { bg: 'var(--green-light)', text: 'var(--green-text)', bar: 'var(--green)' },
  yellow: { bg: 'var(--orange-light)', text: 'var(--orange-text)', bar: 'var(--orange)' },
  orange: { bg: 'var(--orange-light)', text: 'var(--orange-text)', bar: 'var(--orange)' },
  red: { bg: 'var(--red-light)', text: 'var(--red-text)', bar: 'var(--red)' },
};

export function HealthScore({ score }) {
  const t = tier(score);
  const c = colorMap[t];
  return (
    <div className="health-score">
      <div className="health-score__badge" style={{ background: c.bg, color: c.text }}>
        {score}
      </div>
      <div className="health-score__bar">
        <div className="health-score__fill" style={{ width: `${score}%`, background: c.bar }} />
      </div>
    </div>
  );
}
