import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getDaily(clientId: string, dateStr?: string) {
    const client = await this.prisma.client.findUnique({ where: { id: clientId } });
    if (!client) throw new NotFoundException('Cliente não encontrado.');

    const date = dateStr ? new Date(dateStr) : new Date();
    date.setHours(0, 0, 0, 0);

    const snapshot = await this.prisma.skuHealthSnapshot.findUnique({
      where: { clientId_snapshotDate: { clientId, snapshotDate: date } },
    });

    const topCauses = await this.prisma.merchantProduct.findMany({
      where: { clientId, approvalStatus: { in: ['DISAPPROVED', 'EXPIRING'] } },
      select: { issues: true },
      take: 1000,
    });

    const counter: Record<string, number> = {};
    for (const p of topCauses) {
      const issues = Array.isArray(p.issues) ? (p.issues as any[]) : [];
      for (const issue of issues) {
        const label = issue.description ?? 'Outro problema';
        counter[label] = (counter[label] ?? 0) + 1;
      }
    }

    return {
      clientName: client.name,
      statusLabel: client.status === 'ACTIVE' ? 'Saudável' : client.status === 'ERROR' ? 'Crítico' : 'Atenção',
      vtexSkus: snapshot?.totalVtexSkus ?? 0,
      merchantSkus: snapshot?.totalMerchantSkus ?? 0,
      approvedToday: snapshot?.approvedSkus ?? 0,
      lostSkus: snapshot?.deltaApproved ? Math.abs(snapshot.deltaApproved) : 0,
      dropPct: snapshot?.deltaApprovedPct ?? 0,
      mainProblems: Object.entries(counter)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([label, count]) => ({ label, count })),
      recommendedActions: [
        'Verificar conector VTEX Google',
        'Reprocessar envio dos SKUs afetados',
        'Validar preço e estoque',
        'Corrigir atributos obrigatórios',
        'Priorizar SKUs com maior investimento em mídia ou maior receita',
      ],
    };
  }
}
