import { Injectable } from '@nestjs/common';

interface VtexSkuLite {
  skuId: string;
  isActive: boolean;
}
interface MerchantProductLite {
  offerId: string;
  approvalStatus: 'APPROVED' | 'DISAPPROVED' | 'PENDING' | 'EXPIRING';
}

// Espelha doc 03, seção 3 — Cruzamento VTEX × Merchant
@Injectable()
export class DiffService {
  classify(vtexSkus: VtexSkuLite[], merchantProducts: MerchantProductLite[]) {
    const merchantByOfferId = new Map(merchantProducts.map((m) => [m.offerId, m]));

    let approved = 0;
    let disapproved = 0;
    let pending = 0;
    let expired = 0;
    let missing = 0;

    for (const sku of vtexSkus) {
      if (!sku.isActive) continue;
      const product = merchantByOfferId.get(sku.skuId);

      if (!product) {
        missing += 1;
        continue;
      }
      switch (product.approvalStatus) {
        case 'APPROVED':
          approved += 1;
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
      totalMerchantSkus: merchantProducts.length,
      approvedSkus: approved,
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
