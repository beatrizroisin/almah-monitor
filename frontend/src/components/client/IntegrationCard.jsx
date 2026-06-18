import { useState } from 'react';
import { Button } from '../ui/Button';
import { InfoBox } from '../ui/InfoBox';
import './IntegrationCard.scss';

export function IntegrationCard({
  status, // 'CONNECTED' | 'ERROR' | 'PENDING' | 'EXPIRED'
  logo,
  name,
  description,
  children,
  primaryAction,
  dangerAction,
}) {
  const variant = status === 'CONNECTED' ? 'connected' : status === 'ERROR' || status === 'EXPIRED' ? 'error' : 'pending';
  const dotColor = variant === 'connected' ? 'var(--green)' : variant === 'error' ? 'var(--red)' : 'var(--orange)';
  const labelColor = variant === 'connected' ? 'var(--green-text)' : variant === 'error' ? 'var(--red-text)' : 'var(--orange-text)';
  const label = variant === 'connected' ? 'Conectada' : variant === 'error' ? 'Erro de autenticação' : 'Pendente';

  return (
    <div className={`int-card int-card--${variant}`}>
      <div className="int-card__header">
        <div className="int-card__logo">
          {logo}
          <div>
            <div className="int-card__name">{name}</div>
            <div className="int-card__desc">{description}</div>
          </div>
        </div>
        <div className="int-card__status-area">
          <div className="int-card__status">
            <span className="int-card__dot" style={{ background: dotColor }} />
            <span style={{ color: labelColor }}>{label}</span>
          </div>
          {primaryAction}
        </div>
      </div>
      {children}
      {dangerAction && <div className="int-card__danger-row">{dangerAction}</div>}
    </div>
  );
}
