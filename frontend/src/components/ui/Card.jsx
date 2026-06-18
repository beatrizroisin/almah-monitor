import './Card.scss';

export function Card({ children, className = '' }) {
  return <div className={`card ${className}`}>{children}</div>;
}

export function CardHeader({ children, actions = null }) {
  return (
    <div className="card__header">
      <div className="card__header-left">{children}</div>
      {actions && <div className="card__header-actions">{actions}</div>}
    </div>
  );
}

export function CardTitle({ title, subtitle, icon = null, iconBg = 'var(--blue-light)' }) {
  return (
    <div className="card__title-block">
      {icon && (
        <div className="card__icon" style={{ background: iconBg }}>
          {icon}
        </div>
      )}
      <div>
        <div className="card__title">{title}</div>
        {subtitle && <div className="card__subtitle">{subtitle}</div>}
      </div>
    </div>
  );
}

export function CardBody({ children, className = '' }) {
  return <div className={`card__body ${className}`}>{children}</div>;
}
