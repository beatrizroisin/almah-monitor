import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HealthService } from '../health/health.service';
import { DiffService } from './diff.service';

@Injectable()
export class SnapshotService {
  constructor(
    private prisma: PrismaService,
    private health: HealthService,
    private diff: DiffService,
  ) {}

  async createSnapshot(clientId: string, vtexSkus: any[], merchantProducts: any[]) {
    const counts = this.diff.classify(vtexSkus, merchantProducts);

    const yesterday = await this.prisma.skuHealthSnapshot.findFirst({
      where: { clientId },
      orderBy: { snapshotDate: 'desc' },
    });

    const { deltaAbsolute, deltaPct } = this.diff.calculateDelta(
      counts.approvedSkus,
      yesterday?.approvedSkus ?? counts.approvedSkus,
    );

    const healthScore = await this.health.calculateForClient(clientId, {
      approvedSkus: counts.approvedSkus,
      totalMerchantSkus: counts.totalMerchantSkus,
      missingSkus: counts.missingSkus,
      totalVtexSkus: counts.totalVtexSkus,
      deltaApprovedPct: deltaPct,
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const snapshot = await this.prisma.skuHealthSnapshot.upsert({
      where: { clientId_snapshotDate: { clientId, snapshotDate: today } },
      update: {
        ...counts,
        deltaApproved: deltaAbsolute,
        deltaApprovedPct: deltaPct,
        healthScore,
      },
      create: {
        clientId,
        snapshotDate: today,
        ...counts,
        deltaApproved: deltaAbsolute,
        deltaApprovedPct: deltaPct,
        healthScore,
      },
    });

    return { snapshot, deltaAbsolute, deltaPct, counts, approvedYesterday: yesterday?.approvedSkus ?? counts.approvedSkus };
  }
}
