import { Tag } from '../ui/Tag';
import { Button } from '../ui/Button';
import { IconAlertTriangle, IconAlertCircle } from '../ui/Icons';
import './AlertItem.scss';

const severityConfig = {
  RED: { tone: 'red', icon: IconAlertTriangle, label: 'Crítico' },
  ORANGE: { tone: 'orange', icon: IconAlertCircle, label: 'Atenção' },
  YELLOW: { tone: 'orange', icon: IconAlertCircle, label: 'Monitoramento' },
};

export function AlertItem({ alert, onResolve, onViewClient, compact = false }) {
  const cfg = severityConfig[alert.severity] || severityConfig.ORANGE;
  const Icon = cfg.icon;
  const resolved = alert.status === 'RESOLVED';

  return (
    <div className={`alert-item alert-item--${cfg.tone} ${resolved ? 'alert-item--resolved' : ''}`}>
      <div className={`alert-item__icon alert-item__icon--${cfg.tone}`}>
        <Icon />
      </div>
      <div className="alert-item__info">
        <div className="alert-item__title">
          {alert.title}
          <Tag color={cfg.tone}>{cfg.label}</Tag>
          {alert.clientName && <Tag color="gray">{alert.clientName}</Tag>}
        </div>
        {!compact && <div className="alert-item__desc">{alert.message}</div>}
        <div className="alert-item__meta">
          {resolved && alert.resolvedAtLabel ? `Resolvido em ${alert.resolvedAtLabel}` : alert.timeAgo}
          {alert.affectedSkusCount ? ` · SKUs afetados: ${alert.affectedSkusCount.toLocaleString('pt-BR')}` : ''}
        </div>
        {!compact && (
          <div className="alert-item__actions">
            {alert.clientId && (
              <Button size="sm" onClick={() => onViewClient?.(alert.clientId)}>
                Ver cliente
              </Button>
            )}
            {!resolved && (
              <Button size="sm" variant="success" onClick={() => onResolve?.(alert.id)}>
                ✓ Marcar resolvido
              </Button>
            )}
            {resolved && <Button size="sm" disabled>✓ Resolvido</Button>}
          </div>
        )}
      </div>
    </div>
  );
}
