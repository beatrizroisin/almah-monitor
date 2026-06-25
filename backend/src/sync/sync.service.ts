import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CryptoService } from '../integrations/crypto.service';
import { VtexClient } from '../vtex/vtex.client';
import { MerchantClient } from '../merchant/merchant.client';
import { GoogleOAuthService } from '../merchant/google-oauth.service';
import { SnapshotService } from './snapshot.service';
import { AlertRulesService } from './alert-rules.service';

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    private prisma: PrismaService,
    private crypto: CryptoService,
    private vtexClient: VtexClient,
    private merchantClient: MerchantClient,
    private googleOAuth: GoogleOAuthService,
    private snapshotService: SnapshotService,
    private alertRules: AlertRulesService,
  ) {}

  /** Fluxo completo: coleta → compare → snapshot → alertas → health → notificações (doc 1, seção 4) */
  async syncClient(clientId: string, triggeredBy: 'SCHEDULER' | 'MANUAL', triggeredByUserId?: string) {
    const startedAt = new Date();
    const syncLog = await this.prisma.syncLog.create({
      data: { clientId, triggeredBy, triggeredByUserId, status: 'RUNNING', startedAt },
    });

    try {
      const client = await this.prisma.client.findUniqueOrThrow({
        where: { id: clientId },
        include: { integrations: true },
      });

      const vtexIntegration = client.integrations.find((i) => i.type === 'VTEX');
      const googleIntegration = client.integrations.find((i) => i.type === 'GOOGLE_MERCHANT');

      if (!vtexIntegration || !googleIntegration) {
        throw new Error('Cliente sem as duas integrações (VTEX + Google) configuradas.');
      }

      // ── Coleta VTEX ──
      const { appKey, appToken } = this.crypto.decrypt<{ appKey: string; appToken: string }>(
        vtexIntegration.credentialsEncrypted,
      );
      const skuIds = await this.vtexClient.listActiveSkuIds(client.vtexAccount, appKey, appToken);
      const vtexDetails = await this.vtexClient.getSkuDetails(client.vtexAccount, appKey, appToken, skuIds);

      const vtexSkusForDb = vtexDetails.map((d: any) => ({
        clientId,
        skuId: String(d.Id),
        productId: String(d.ProductId),
        name: d.NameComplete,
        brand: d.BrandName,
        category: Array.isArray(d.ProductCategories) ? Object.values(d.ProductCategories).join(' > ') : null,
        isActive: Boolean(d.IsActive),
        isVisible: Boolean(d.IsActive),
        gtin: d.EAN?.[0] ?? null,
        imageUrl: d.Images?.[0]?.ImageUrl ?? null,
        productUrl: client.storeUrl ? `${client.storeUrl}${d.DetailUrl ?? ''}` : d.DetailUrl,
        collectedAt: new Date(),
      }));

      await this.persistVtexSkus(clientId, vtexSkusForDb);

      // ── Coleta Merchant (via Reports API — fonte oficial de status agregado) ──
      let { access_token, refresh_token } = this.crypto.decrypt<{ access_token: string; refresh_token: string }>(
        googleIntegration.credentialsEncrypted,
      );

      if (googleIntegration.expiresAt && googleIntegration.expiresAt < new Date()) {
        const refreshed = await this.googleOAuth.refreshAccessToken(refresh_token);
        access_token = refreshed.access_token;
        await this.prisma.integration.update({
          where: { id: googleIntegration.id },
          data: {
            credentialsEncrypted: this.crypto.encrypt({ access_token, refresh_token }),
            expiresAt: refreshed.expiry_date ? new Date(refreshed.expiry_date) : null,
          },
        });
      }

      const productViews = await this.merchantClient.getProductView(access_token, client.merchantId);
      const merchantProductsForDb = productViews.map((p: any) => this.mapProductView(clientId, p));
      await this.persistMerchantProducts(clientId, merchantProductsForDb);

      // ── Snapshot + diff ──
      const { deltaPct, approvedYesterday, counts } = await this.snapshotService.createSnapshot(
        clientId,
        vtexSkusForDb,
        merchantProductsForDb,
      );

      // ── Avaliação de alertas ──
      const topCauses = this.extractTopCauses(merchantProductsForDb);
      await this.alertRules.evaluate({
        clientId,
        clientName: client.name,
        approvedSkus: counts.approvedSkus,
        approvedYesterday,
        deltaApprovedPct: deltaPct,
        missingSkus: counts.missingSkus,
        totalVtexSkus: counts.totalVtexSkus,
        vtexConnectorStale: false,
        mainCauses: topCauses,
      });

      await this.prisma.client.update({
        where: { id: clientId },
        data: { lastSyncAt: new Date(), status: 'ACTIVE', syncError: null },
      });

      await this.prisma.syncLog.update({
        where: { id: syncLog.id },
        data: {
          status: 'SUCCESS',
          finishedAt: new Date(),
          durationMs: Date.now() - startedAt.getTime(),
          vtexSkusCollected: vtexSkusForDb.length,
          merchantProductsCollected: merchantProductsForDb.length,
        },
      });

      return { status: 'SUCCESS' };
    } catch (err: any) {
      const detail = err.response
        ? `${err.config?.method?.toUpperCase()} ${err.config?.url} → ${err.response?.status} ${JSON.stringify(err.response?.data)}`
        : err.message;
      this.logger.error(`Sync falhou para cliente ${clientId}: ${detail}`);
      await this.prisma.client.update({ where: { id: clientId }, data: { status: 'ERROR', syncError: detail } });
      await this.prisma.syncLog.update({
        where: { id: syncLog.id },
        data: { status: 'FAILED', finishedAt: new Date(), errorMessage: detail },
      });
      throw err;
    }
  }

  async syncAllActiveClients() {
    await this.cleanupStuckSyncs();
    const clients = await this.prisma.client.findMany({ where: { status: 'ACTIVE', deletedAt: null } });
    for (const c of clients) {
      try {
        await this.syncClient(c.id, 'SCHEDULER');
      } catch {
        // erro já logado e persistido dentro de syncClient — segue para o próximo cliente
      }
    }
  }

  /** Marca como FAILED qualquer sync preso em RUNNING há mais de 10 minutos (ex: servidor reiniciou). */
  async cleanupStuckSyncs() {
    const cutoff = new Date(Date.now() - 10 * 60 * 1000);
    await this.prisma.syncLog.updateMany({
      where: { status: 'RUNNING', startedAt: { lt: cutoff } },
      data: { status: 'FAILED', finishedAt: new Date(), errorMessage: 'Sync interrompido (servidor reiniciado ou timeout).' },
    });
  }

  async getLogs(clientId: string) {
    return this.prisma.syncLog.findMany({ where: { clientId }, orderBy: { startedAt: 'desc' }, take: 30 });
  }

  private async persistVtexSkus(clientId: string, skus: any[]) {
    for (const sku of skus) {
      await this.prisma.vtexSku.upsert({
        where: { clientId_skuId: { clientId, skuId: sku.skuId } },
        update: sku,
        create: sku,
      });
    }
  }

  private async persistMerchantProducts(clientId: string, products: any[]) {
    await this.prisma.merchantProduct.deleteMany({ where: { clientId } });
    if (products.length > 0) {
      await this.prisma.merchantProduct.createMany({ data: products });
    }
  }

  /**
   * Mapeia uma linha de product_view (Reports API) para o formato salvo em
   * merchant_products. offer_id pode vir como "SKUID_SKUID" — extraímos só
   * a primeira parte, que é o skuId real da VTEX.
   */
  private mapProductView(clientId: string, p: any) {
    const offerId = (p.offerId ?? '').split('_')[0];
    return {
      clientId,
      offerId,
      googleProductId: p.id,
      title: p.title ?? null,
      approvalStatus: this.mapApprovalStatus(p.aggregatedReportingContextStatus),
      shoppingAdsStatus: this.mapDestinationStatus(p.aggregatedReportingContextStatus),
      freeListingsStatus: 'UNSPECIFIED' as const,
      issues: (p.itemIssues ?? []).map((i: any) => ({
        code: i.type?.code,
        description: i.type?.canonicalAttribute ?? i.type?.code ?? 'Problema no produto',
      })),
      destinationStatuses: [],
      googleCreatedAt: null,
      googleUpdatedAt: null,
      expirationDate: null,
      collectedAt: new Date(),
    };
  }

  /**
   * aggregated_reporting_context_status (Reports API) mapeado para o nosso
   * enum interno. Valores possíveis do Google:
   * ELIGIBLE | ELIGIBLE_LIMITED | NOT_ELIGIBLE_OR_DISAPPROVED | PENDING
   *
   * ELIGIBLE_LIMITED ("Limitado" no painel do Google) é tratado como
   * categoria própria — não é nem aprovado nem reprovado, mas sim um produto
   * com visibilidade restrita em alguns países/contextos.
   */
  // DestinationStatus enum (Prisma) não tem LIMITED — produtos "limitados" ainda
  // aparecem no Shopping Ads, só com alcance restrito, por isso mapeamos para APPROVED.
  private mapDestinationStatus(status: string): 'APPROVED' | 'DISAPPROVED' | 'PENDING' | 'UNSPECIFIED' {
    switch (status) {
      case 'ELIGIBLE':
      case 'ELIGIBLE_LIMITED':
        return 'APPROVED';
      case 'NOT_ELIGIBLE_OR_DISAPPROVED':
        return 'DISAPPROVED';
      case 'PENDING':
        return 'PENDING';
      default:
        return 'UNSPECIFIED';
    }
  }

  private mapApprovalStatus(status: string): 'APPROVED' | 'LIMITED' | 'DISAPPROVED' | 'PENDING' | 'EXPIRING' {
    switch (status) {
      case 'ELIGIBLE':
        return 'APPROVED';
      case 'ELIGIBLE_LIMITED':
        return 'LIMITED';
      case 'NOT_ELIGIBLE_OR_DISAPPROVED':
        return 'DISAPPROVED';
      case 'PENDING':
        return 'PENDING';
      default:
        return 'PENDING';
    }
  }

  private extractTopCauses(products: any[]) {
    const counter: Record<string, number> = {};
    for (const p of products) {
      const issues = Array.isArray(p.issues) ? p.issues : [];
      for (const issue of issues) {
        const label = issue.description ?? issue.code ?? 'Outro problema';
        counter[label] = (counter[label] ?? 0) + 1;
      }
    }
    return Object.entries(counter)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([label, count]) => ({ label, count }));
  }
}
