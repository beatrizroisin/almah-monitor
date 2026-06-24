import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getOverview() {
    const clients = await this.prisma.client.findMany({
      where: { deletedAt: null, status: { not: 'PENDING' } },
      include: {
        healthSnapshots: { orderBy: { snapshotDate: 'desc' }, take: 1 },
      },
    });

    let totalVtexSkus = 0;
    let totalApprovedSkus = 0;
    let totalLimitedSkus = 0;
    let totalMissingSkus = 0;
    let totalDisapproved = 0;
    let totalPending = 0;
    let clientsInAlert = 0;

    const clientRows = clients.map((c) => {
      const snap = c.healthSnapshots[0];
      totalVtexSkus += snap?.totalVtexSkus ?? 0;
      totalApprovedSkus += snap?.approvedSkus ?? 0;
      totalLimitedSkus += snap?.limitedSkus ?? 0;
      totalMissingSkus += snap?.missingSkus ?? 0;
      totalDisapproved += snap?.disapprovedSkus ?? 0;
      totalPending += snap?.pendingSkus ?? 0;

      const score = snap?.healthScore ?? 0;
      const statusLabel = score >= 90 ? 'Saudável' : score >= 70 ? 'Atenção' : score >= 40 ? 'Atenção' : 'Crítico';
      if (statusLabel !== 'Saudável') clientsInAlert += 1;

      return {
        id: c.id,
        name: c.name,
        initials: c.name.split(' ').slice(0, 2).map((w) => w[0]).join(''),
        healthScore: score,
        vtexSkus: snap?.totalVtexSkus ?? 0,
        merchantSkus: snap?.totalMerchantSkus ?? 0,
        approvedSkus: snap?.approvedSkus ?? 0,
        limitedSkus: snap?.limitedSkus ?? 0,
        disapprovedSkus: snap?.disapprovedSkus ?? 0,
        variation: snap?.deltaApprovedPct ? `${Number(snap.deltaApprovedPct) > 0 ? '+' : ''}${snap.deltaApprovedPct}%` : '—',
        status: statusLabel,
      };
    });

    const criticalAlertsCount = await this.prisma.alert.count({ where: { severity: 'RED', status: 'OPEN' } });
    const orangeAlertsCount = await this.prisma.alert.count({ where: { severity: 'ORANGE', status: 'OPEN' } });

    return {
      totalClients: clients.length,
      clientsInAlert,
      totalVtexSkus,
      totalApprovedSkus,
      totalLimitedSkus,
      totalMissingSkus,
      totalDisapproved,
      totalPending,
      missingPct: totalVtexSkus > 0 ? ((totalMissingSkus / totalVtexSkus) * 100).toFixed(1) : '0',
      // "Fora do Shopping Ads" = reprovados no Shopping (já contabilizado em
      // totalDisapproved, pois approvalStatus reflete o status agregado, que
      // por decisão de produto é calculado com base no destino Shopping Ads).
      totalOutsideShopping: totalDisapproved,
      criticalAlertsCount,
      alertsSummaryLabel: `${criticalAlertsCount} críticos, ${orangeAlertsCount} atenção`,
      lastSyncLabel: new Date().toLocaleString('pt-BR'),
      vtexDeltaLabel: '',
      vtexDeltaDirection: undefined,
      approvedDeltaLabel: '',
      approvedDeltaDirection: totalDisapproved > 0 ? 'down' : undefined,
      disapprovedDeltaLabel: '',
      clients: clientRows,
    };
  }

  async getTopCauses(params: { clientId?: string } = {}) {
    const products = await this.prisma.merchantProduct.findMany({
      where: {
        approvalStatus: { in: ['DISAPPROVED', 'EXPIRING', 'LIMITED'] },
        ...(params.clientId ? { clientId: params.clientId } : {}),
      },
      select: { issues: true },
      take: 5000,
    });

    const counter: Record<string, number> = {};
    for (const p of products) {
      const issues = Array.isArray(p.issues) ? (p.issues as any[]) : [];
      for (const issue of issues) {
        const label = issue?.description ?? 'Outro problema';
        counter[label] = (counter[label] ?? 0) + 1;
      }
    }

    return Object.entries(counter)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([label, count]) => ({
        label,
        count,
        severity: count > 800 ? 'high' : count > 300 ? 'medium' : 'low',
      }));
  }

  async getRecentAlerts(limit: number) {
    const alerts = await this.prisma.alert.findMany({
      where: { status: 'OPEN' },
      include: { client: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return alerts.map((a) => ({
      id: a.id,
      title: a.title,
      message: a.message,
      severity: a.severity,
      status: a.status,
      affectedSkusCount: a.affectedSkusCount,
      clientId: a.clientId,
      clientName: a.client?.name,
      timeAgo: this.timeAgo(a.createdAt),
    }));
  }

  private timeAgo(date: Date) {
    const diffMs = Date.now() - new Date(date).getTime();
    const hours = Math.floor(diffMs / 3600000);
    if (hours < 1) return 'Há poucos minutos';
    if (hours < 24) return `Há ${hours} horas`;
    return `Há ${Math.floor(hours / 24)} dias`;
  }
}
