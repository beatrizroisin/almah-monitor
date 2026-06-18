import { Injectable } from '@nestjs/common';
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
  vtexConnectorStale: boolean; // sem atualização recente
  mainCauses: { label: string; count: number }[];
}

@Injectable()
export class AlertRulesService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  /** Regras do doc 1, seção 6 — Alerta vermelho — crítico */
  private isRedAlert(s: SnapshotComparison) {
    const dropPct = Math.abs(s.deltaApprovedPct);
    const missingPct = s.totalVtexSkus > 0 ? (s.missingSkus / s.totalVtexSkus) * 100 : 0;
    return (
      dropPct > 10 ||
      s.approvedYesterday - s.approvedSkus > 100 ||
      s.vtexConnectorStale ||
      missingPct > 20
    );
  }

  /** Regras do doc 1, seção 6 — Alerta laranja — atenção */
  private isOrangeAlert(s: SnapshotComparison) {
    const dropPct = Math.abs(s.deltaApprovedPct);
    return dropPct >= 3 && dropPct <= 10;
  }

  async fireRed(s: SnapshotComparison) {
    const causesLabel = s.mainCauses.map((c) => c.label).join(', ');
    const message = this.notifications.buildAlertMessage(
      s.clientName,
      s.approvedYesterday - s.approvedSkus,
      Math.abs(s.deltaApprovedPct),
      s.mainCauses.map((c) => c.label),
    );

    return this.prisma.alert.create({
      data: {
        clientId: s.clientId,
        severity: 'RED',
        title: 'Queda crítica de SKUs aprovados',
        message,
        affectedSkusCount: s.approvedYesterday - s.approvedSkus,
        mainCauses: s.mainCauses,
        ruleCode: 'DROP_GT_10_PCT',
        status: 'OPEN',
      },
    });
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
