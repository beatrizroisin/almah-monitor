import './Metric.scss';

export function MetricsGrid({ children, columns = 4 }) {
  return <div className={`metrics-grid metrics-grid--${columns}`}>{children}</div>;
}

export function Metric({ label, value, valueColor, delta, deltaDirection }) {
  // deltaDirection: 'up' | 'down' | undefined
  return (
    <div className="metric">
      <div className="metric__label">{label}</div>
      <div className="metric__value" style={valueColor ? { color: valueColor } : undefined}>
        {value}
      </div>
      {delta && (
        <div className={`metric__delta ${deltaDirection ? `metric__delta--${deltaDirection}` : ''}`}>{delta}</div>
      )}
    </div>
  );
}
