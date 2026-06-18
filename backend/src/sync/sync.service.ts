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

      // ── Coleta Merchant ──
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

      const productStatuses = await this.merchantClient.getProductStatuses(access_token, client.merchantId);
      const merchantProductsForDb = productStatuses.map((p: any) => this.mapMerchantStatus(clientId, p));
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
      this.logger.error(`Sync falhou para cliente ${clientId}: ${err.message}`);
      await this.prisma.client.update({ where: { id: clientId }, data: { status: 'ERROR', syncError: err.message } });
      await this.prisma.syncLog.update({
        where: { id: syncLog.id },
        data: { status: 'FAILED', finishedAt: new Date(), errorMessage: err.message },
      });
      throw err;
    }
  }

  async syncAllActiveClients() {
    const clients = await this.prisma.client.findMany({ where: { status: 'ACTIVE', deletedAt: null } });
    for (const c of clients) {
      try {
        await this.syncClient(c.id, 'SCHEDULER');
      } catch {
        // erro já logado e persistido dentro de syncClient — segue para o próximo cliente
      }
    }
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

  private mapMerchantStatus(clientId: string, p: any) {
    // Mapeamento conforme doc 03, seção 1.4
    const offerId = (p.productId ?? '').split(':').pop();
    return {
      clientId,
      offerId,
      googleProductId: p.name,
      title: p.title,
      approvalStatus: this.mapApprovalStatus(p),
      shoppingAdsStatus: this.mapDestinationStatus(p, 'Shopping'),
      freeListingsStatus: this.mapDestinationStatus(p, 'FreeListing'),
      issues: p.itemLevelIssues ?? [],
      destinationStatuses: p.destinationStatuses ?? [],
      googleCreatedAt: p.creationDate ? new Date(p.creationDate) : null,
      googleUpdatedAt: null,
      expirationDate: p.googleExpirationDate ? new Date(p.googleExpirationDate) : null,
      collectedAt: new Date(),
    };
  }

  private mapApprovalStatus(p: any): 'APPROVED' | 'DISAPPROVED' | 'PENDING' | 'EXPIRING' {
    const issues = p.itemLevelIssues ?? [];
    if (issues.some((i: any) => i.severity === 'critical')) return 'DISAPPROVED';
    if (p.googleExpirationDate && new Date(p.googleExpirationDate) < new Date()) return 'EXPIRING';
    if (issues.length > 0) return 'PENDING';
    return 'APPROVED';
  }

  private mapDestinationStatus(p: any, destination: string): 'APPROVED' | 'DISAPPROVED' | 'PENDING' | 'UNSPECIFIED' {
    const dest = (p.destinationStatuses ?? []).find((d: any) => d.destination === destination);
    if (!dest) return 'UNSPECIFIED';
    return dest.status?.toUpperCase() ?? 'UNSPECIFIED';
  }

  private extractTopCauses(products: any[]) {
    const counter: Record<string, number> = {};
    for (const p of products) {
      const issues = Array.isArray(p.issues) ? p.issues : [];
      for (const issue of issues) {
        const label = issue.description ?? 'Outro problema';
        counter[label] = (counter[label] ?? 0) + 1;
      }
    }
    return Object.entries(counter)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([label, count]) => ({ label, count }));
  }
}
