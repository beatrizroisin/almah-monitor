import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const issueTypeLabels: Record<string, string> = {
  price_mismatch: 'Preço divergente',
  invalid_image: 'Imagem inválida',
  missing_gtin: 'GTIN ausente',
  expired: 'Produto expirado',
};

@Injectable()
export class SkusService {
  constructor(private prisma: PrismaService) {}

  async listProblematic(params: { clientId?: string; issueType?: string }) {
    const products = await this.prisma.merchantProduct.findMany({
      where: {
        approvalStatus: { in: ['DISAPPROVED', 'EXPIRING'] },
        ...(params.clientId ? { clientId: params.clientId } : {}),
      },
      include: { client: true },
      take: 500,
      orderBy: { collectedAt: 'desc' },
    });

    const vtexByOfferId = await this.indexVtexSkus(products.map((p) => p.offerId));

    return products
      .map((p) => {
        const vtexSku = vtexByOfferId[p.offerId];
        const issues = Array.isArray(p.issues) ? (p.issues as any[]) : [];
        const issueLabel = issueTypeLabels[issues[0]?.code] ?? issues[0]?.description ?? 'Reprovado';
        if (params.issueType && issues[0]?.code !== params.issueType) return null;

        return {
          id: p.id,
          clientId: p.clientId,
          clientName: p.client?.name,
          clientTone: p.client?.status === 'ERROR' ? 'red' : 'orange',
          skuId: p.offerId,
          productName: p.title ?? vtexSku?.name ?? '—',
          brand: vtexSku?.brand ?? '—',
          issue: issueLabel,
          statusLabel: p.approvalStatus === 'DISAPPROVED' ? 'Reprovado' : 'Expirado',
          severity: p.approvalStatus === 'DISAPPROVED' ? 'Crítico' : 'Alto',
          isActiveVtex: vtexSku?.isActive ?? true,
          platform: 'vtex',
        };
      })
      .filter(Boolean);
  }

async listMissing(clientId: string) {
    // SKUs ativos na VTEX cujo offer_id não existe em merchant_products.
    // Sem `take` aqui — precisamos varrer o catálogo inteiro para detectar
    // corretamente todos os SKUs ausentes, não só uma amostra.
    const [vtexSkus, merchantOfferIds] = await Promise.all([
      this.prisma.vtexSku.findMany({ where: { clientId, isActive: true } }),
      this.prisma.merchantProduct.findMany({ where: { clientId }, select: { offerId: true } }),
    ]);

    const offerIdSet = new Set(merchantOfferIds.map((m) => m.offerId));
    return vtexSkus
      .filter((s) => !offerIdSet.has(s.skuId))
      .map((s) => ({
        id: s.id,
        skuId: s.skuId,
        productName: s.name,
        category: s.category ?? '—',
      }));
  }

  async reprocess(skuId: string) {
    const product = await this.prisma.merchantProduct.findUnique({ where: { id: skuId } });
    if (!product) throw new NotFoundException('SKU não encontrado.');
    // Em produção: enfileira job específico de reprocessamento (BullMQ) que
    // força uma nova leitura desse SKU na próxima janela de sync.
    return { queued: true, skuId };
  }

  async setPriority(clientId: string, skuId: string, priorityReason: string, notes?: string) {
    return this.prisma.clientSkuPriority.create({
      data: { clientId, skuId, priorityReason: priorityReason as any, notes },
    });
  }

  async exportCsvRows(params: { clientId?: string }) {
    const rows = await this.listProblematic(params);
    const header = 'cliente,sku_id,produto,marca,problema,status,severidade\n';
    const body = rows
      .map((r: any) => [r.clientName, r.skuId, r.productName, r.brand, r.issue, r.statusLabel, r.severity].join(','))
      .join('\n');
    return header + body;
  }

  private async indexVtexSkus(offerIds: string[]) {
    const skus = await this.prisma.vtexSku.findMany({ where: { skuId: { in: offerIds } } });
    return skus.reduce((acc: Record<string, any>, s) => {
      acc[s.skuId] = s;
      return acc;
    }, {});
  }
}
