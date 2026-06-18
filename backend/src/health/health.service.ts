import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface HealthInputs {
  approvedSkus: number;
  totalMerchantSkus: number;
  missingSkus: number;
  totalVtexSkus: number;
  deltaApprovedPct: number; // pode ser negativo
  alertsRed7d: number;
  alertsOrange7d: number;
}

@Injectable()
export class HealthService {
  constructor(private prisma: PrismaService) {}

  /**
   * Fórmula exata do documento 03 — Plano de Integração, seção 4:
   * - % SKUs aprovados:   (approved / total_merchant) * 40
   * - % SKUs ausentes:    (1 - missing / total_vtex) * 20
   * - Variação 24h:       20 - max(0, min(20, |delta_pct| * 2))
   * - Recorrência alertas: 20 - (alerts_red_7d * 5) - (alerts_orange_7d * 2)
   */
  calculateScore(inputs: HealthInputs): number {
    const approvedComponent = inputs.totalMerchantSkus > 0 ? (inputs.approvedSkus / inputs.totalMerchantSkus) * 40 : 0;

    const missingComponent = inputs.totalVtexSkus > 0 ? (1 - inputs.missingSkus / inputs.totalVtexSkus) * 20 : 20;

    const variationPenalty = Math.max(0, Math.min(20, Math.abs(inputs.deltaApprovedPct) * 2));
    const variationComponent = 20 - variationPenalty;

    const recurrenceComponent = Math.max(
      0,
      20 - inputs.alertsRed7d * 5 - inputs.alertsOrange7d * 2,
    );

    const score = approvedComponent + missingComponent + variationComponent + recurrenceComponent;
    return Math.round(Math.max(0, Math.min(100, score)));
  }

  tierFromScore(score: number): 'Saudável' | 'Atenção' | 'Risco' | 'Crítico' {
    if (score >= 90) return 'Saudável';
    if (score >= 70) return 'Atenção';
    if (score >= 40) return 'Risco';
    return 'Crítico';
  }

  async calculateForClient(clientId: string, snapshot: {
    approvedSkus: number;
    totalMerchantSkus: number;
    missingSkus: number;
    totalVtexSkus: number;
    deltaApprovedPct: number;
  }) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [alertsRed7d, alertsOrange7d] = await Promise.all([
      this.prisma.alert.count({ where: { clientId, severity: 'RED', createdAt: { gte: sevenDaysAgo } } }),
      this.prisma.alert.count({ where: { clientId, severity: 'ORANGE', createdAt: { gte: sevenDaysAgo } } }),
    ]);

    return this.calculateScore({ ...snapshot, alertsRed7d, alertsOrange7d });
  }
}
