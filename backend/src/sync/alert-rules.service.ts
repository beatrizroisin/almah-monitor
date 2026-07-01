import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

interface SnapshotComparison {
  clientId: string;
  clientName: string;
  approvedSkus: number;
  approvedYesterday: number;
  deltaApprovedPct: number;
  missingSkus: number;
  totalVtexSkus: number;
  vtexConnectorStale: boolean;
  mainCauses: { label: string; count: number }[];
}

@Injectable()
export class AlertRulesService {
  private readonly logger = new Logger(AlertRulesService.name);

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  /** Regras do doc 1, seção 6 — Alerta vermelho — crítico
   *
   * ATENÇÃO: missingPct foi removida como critério isolado de alerta vermelho.
   * Clientes novos ou com catálogo parcial no Merchant naturalmente têm muitos
   * SKUs "ausentes" — isso não é uma queda crítica, é estado normal do negócio.
   * O alerta só dispara quando há queda real de aprovados em relação a ontem,
   * ou quando o conector VTEX parou de sincronizar.
   */
  private isRedAlert(s: SnapshotComparison) {
    // Só avalia queda se havia dados ontem — evita falso positivo no primeiro sync
    const hadDataYesterday = s.approvedYesterday > 0;
    const dropPct = Math.abs(s.deltaApprovedPct);
    const dropAbsolute = s.approvedYesterday - s.approvedSkus;

    return (
      s.vtexConnectorStale ||
      (hadDataYesterday && dropPct > 10) ||
      (hadDataYesterday && dropAbsolute > 100)
    );
  }

  /** Regras do doc 1, seção 6 — Alerta laranja — atenção */
  private isOrangeAlert(s: SnapshotComparison) {
    const hadDataYesterday = s.approvedYesterday > 0;
    const dropPct = Math.abs(s.deltaApprovedPct);
    return hadDataYesterday && dropPct >= 3 && dropPct <= 10;
  }

  async fireRed(s: SnapshotComparison) {
    const affectedSkus = s.approvedYesterday - s.approvedSkus;
    const dropPct = Math.abs(s.deltaApprovedPct);
    const message = this.notifications.buildAlertMessage(
      s.clientName,
      affectedSkus,
      dropPct,
      s.mainCauses.map((c) => c.label),
    );

    const alert = await this.prisma.alert.create({
      data: {
        clientId: s.clientId,
        severity: 'RED',
        title: 'Queda crítica de SKUs aprovados',
        message,
        affectedSkusCount: affectedSkus,
        mainCauses: s.mainCauses,
        ruleCode: 'DROP_GT_10_PCT',
        status: 'OPEN',
      },
    });

    // Disparar notificação externa (Discord + e-mail) com log detalhado
    try {
      const results = await this.notifications.dispatchCriticalAlert(
        s.clientName,
        affectedSkus,
        dropPct,
        s.mainCauses.map((c) => c.label),
      );
      // Promise.allSettled — loga canais que falharam individualmente
      results.forEach((r, i) => {
        if (r.status === 'rejected') {
          this.logger.error(`Canal ${i} falhou ao enviar alerta: ${r.reason}`);
        }
      });
    } catch (err) {
      this.logger.error(`Falha ao despachar notificação externa do alerta crítico: ${err}`);
    }

    return alert;
  }

  async fireOrange(s: SnapshotComparison) {
    return this.prisma.alert.create({
      data: {
        clientId: s.clientId,
        severity: 'ORANGE',
        title: 'Aumento de reprovações',
        message: `Queda de ${Math.abs(s.deltaApprovedPct)}% nos SKUs aprovados em relação a ontem.`,
        affectedSkusCount: s.approvedYesterday - s.approvedSkus,
        mainCauses: s.mainCauses,
        ruleCode: 'DROP_3_10_PCT',
        status: 'OPEN',
      },
    });
  }

  /** Ponto de entrada chamado pelo SyncService após cada snapshot */
  async evaluate(s: SnapshotComparison) {
    const alertsCreated: any[] = [];
    if (this.isRedAlert(s)) {
      alertsCreated.push(await this.fireRed(s));
    } else if (this.isOrangeAlert(s)) {
      alertsCreated.push(await this.fireOrange(s));
    }
    return alertsCreated;
  }
}