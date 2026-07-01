import { Injectable } from '@nestjs/common';

interface VtexSkuLite {
  skuId: string;
  productId: string;
  isActive: boolean;
}
interface MerchantProductLite {
  offerId: string;
  approvalStatus: 'APPROVED' | 'LIMITED' | 'DISAPPROVED' | 'PENDING' | 'EXPIRING';
}

// Espelha doc 03, seção 3 — Cruzamento VTEX × Merchant
//
// IMPORTANTE: o cruzamento é feito pelo productId da VTEX (não pelo skuId),
// porque os feeds de Google Shopping geralmente usam o ID do produto como
// offer_id — não a variante (SKU). Múltiplos SKUs do mesmo produto herdam
// o status do produto no Merchant Center.
@Injectable()
export class DiffService {
  classify(vtexSkus: VtexSkuLite[], merchantProducts: MerchantProductLite[]) {
    // Pode haver múltiplos registros de merchant_products para o mesmo offerId
    // (ex: múltiplas fontes de dados/idiomas cadastrados no Merchant Center).
    // Nesses casos, priorizamos sempre o status mais severo, para nunca
    // esconder um problema real de aprovação.
    const severityOrder: Record<string, number> = {
      DISAPPROVED: 4,
      EXPIRING: 3,
      LIMITED: 2,
      PENDING: 1,
      APPROVED: 0,
    };

    const merchantByOfferId = new Map<string, MerchantProductLite>();
    for (const m of merchantProducts) {
      const existing = merchantByOfferId.get(m.offerId);
      if (!existing || severityOrder[m.approvalStatus] > severityOrder[existing.approvalStatus]) {
        merchantByOfferId.set(m.offerId, m);
      }
    }

    let approved = 0;
    let limited = 0;
    let disapproved = 0;
    let pending = 0;
    let expired = 0;
    let missing = 0;

    for (const sku of vtexSkus) {
      if (!sku.isActive) continue;
      // Cruza pelo productId da VTEX — os feeds do Google Shopping usam o ID
      // do produto como offer_id, não o ID da variante (SKU).
      const product = merchantByOfferId.get(sku.productId);

      if (!product) {
        missing += 1;
        continue;
      }
      switch (product.approvalStatus) {
        case 'APPROVED':
          approved += 1;
          break;
        case 'LIMITED':
          limited += 1;
          break;
        case 'DISAPPROVED':
          disapproved += 1;
          break;
        case 'PENDING':
          pending += 1;
          break;
        case 'EXPIRING':
          expired += 1;
          break;
      }
    }

    return {
      totalVtexSkus: vtexSkus.filter((s) => s.isActive).length,
      totalMerchantSkus: merchantByOfferId.size,
      approvedSkus: approved,
      limitedSkus: limited,
      disapprovedSkus: disapproved,
      pendingSkus: pending,
      expiredSkus: expired,
      missingSkus: missing,
    };
  }

  calculateDelta(today: number, yesterday: number) {
    const deltaAbsolute = today - yesterday;
    const deltaPct = yesterday > 0 ? Number(((deltaAbsolute / yesterday) * 100).toFixed(2)) : 0;
    return { deltaAbsolute, deltaPct };
  }
}