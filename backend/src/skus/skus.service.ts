import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Produtos e valores em BR usam vírgula (ex: "1,95X1,35"), então todo campo
// precisa ir entre aspas — senão a vírgula do próprio texto quebra as colunas do CSV.
function csvEscape(value: unknown): string {
  const str = value === null || value === undefined ? '' : String(value);
  return `"${str.replace(/"/g, '""')}"`;
}

const issueTypeLabels: Record<string, string> = {
  price_mismatch: 'Preço divergente',
  invalid_image: 'Imagem inválida',
  missing_gtin: 'GTIN ausente',
  expired: 'Produto expirado',
};

const statusLabels: Record<string, string> = {
  DISAPPROVED: 'Reprovado',
  EXPIRING: 'Expirado',
  LIMITED: 'Limitado',
};

const severityLabels: Record<string, string> = {
  DISAPPROVED: 'Crítico',
  EXPIRING: 'Alto',
  LIMITED: 'Médio',
};

@Injectable()
export class SkusService {
  constructor(private prisma: PrismaService) {}

  /**
   * status: filtra por approval_status — por padrão mostra DISAPPROVED +
   * EXPIRING (problemas que tiram o produto do Shopping Ads). Passar
   * status='LIMITED' para ver só os produtos com visibilidade restrita.
   */
  async listProblematic(params: { clientId?: string; issueType?: string; status?: string }) {
    const statusFilter = params.status ? [params.status] : ['DISAPPROVED', 'EXPIRING'];

    const products = await this.prisma.merchantProduct.findMany({
      where: {
        approvalStatus: { in: statusFilter as any },
        ...(params.clientId ? { clientId: params.clientId } : {}),
      },
      include: { client: true },
      take: 1000,
      orderBy: { collectedAt: 'desc' },
    });

    const vtexByOfferId = await this.indexVtexSkus(products.map((p) => p.offerId));

    return products
      .map((p) => {
        const vtexSku = vtexByOfferId[p.offerId];
        const issues = Array.isArray(p.issues) ? (p.issues as any[]) : [];
        const issueLabel = issues[0]?.description ?? issueTypeLabels[issues[0]?.code] ?? statusLabels[p.approvalStatus] ?? 'Reprovado';
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
          statusLabel: statusLabels[p.approvalStatus] ?? p.approvalStatus,
          severity: severityLabels[p.approvalStatus] ?? 'Médio',
          isActiveVtex: vtexSku?.isActive ?? true,
          platform: 'vtex',
        };
      })
      .filter(Boolean);
  }

  async listMissing(clientId: string) {
    // Todo o catálogo VTEX (ativo + inativo) cujo offer_id não existe em
    // merchant_products — inclui os inativos para explicar o motivo real da
    // ausência, e não só os que estão ativos e não foram enviados ao feed.
    // Sem `take` aqui — precisamos varrer o catálogo inteiro para detectar
    // corretamente todos os SKUs ausentes, não só uma amostra.
    const [vtexSkus, merchantOfferIds] = await Promise.all([
      this.prisma.vtexSku.findMany({ where: { clientId } }),
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
        reason: s.isActive ? 'Ativo na VTEX, mas não enviado ao Google Merchant' : 'Inativo na VTEX',
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

  async exportCsvRows(params: { clientId?: string; status?: string }) {
    const rows = await this.listProblematic(params);
    const header = 'cliente,sku_id,produto,marca,problema,status,severidade\n';
    const body = rows
      .map((r: any) =>
        [r.clientName, r.skuId, r.productName, r.brand, r.issue, r.statusLabel, r.severity]
          .map(csvEscape)
          .join(','),
      )
      .join('\n');
    const BOM = String.fromCharCode(0xfeff);
    // BOM para o Excel reconhecer UTF-8 (acentos) ao abrir o CSV direto.
    return BOM + header + body;
  }

  private async indexVtexSkus(offerIds: string[]) {
    const skus = await this.prisma.vtexSku.findMany({ where: { skuId: { in: offerIds } } });
    return skus.reduce((acc: Record<string, any>, s) => {
      acc[s.skuId] = s;
      return acc;
    }, {});
  }
}
