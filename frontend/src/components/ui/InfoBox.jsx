import './InfoBox.scss';

export function InfoBox({ children, tone = 'blue', className = '' }) {
  // tone: blue | red | orange | green
  return <div className={`info-box info-box--${tone} ${className}`}>{children}</div>;
}
