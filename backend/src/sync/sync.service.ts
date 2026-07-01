import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CryptoService } from '../integrations/crypto.service';
import { VtexClient } from '../vtex/vtex.client';
import { MerchantClient } from '../merchant/merchant.client';
import { GoogleOAuthService } from '../merchant/google-oauth.service';
import { SnapshotService } from './snapshot.service';
import { AlertRulesService } from './alert-rules.service';

// Mapeamento dos códigos de issue do Google Merchant Center (item_issues[].type.code)
// para descrições em PT-BR. A Reports API não devolve texto explicativo, só o código —
// por isso os não mapeados caem no fallback humanizado do próprio código (nunca num
// texto genérico), pra sempre expor o problema real do produto.
const MERCHANT_ISSUE_DESCRIPTIONS: Record<string, string> = {
  image_link: 'Imagem do produto ausente, inválida ou fora do ar',
  landing_page_crawling_not_allowed: 'Página de destino bloqueada para rastreamento do Google (robots.txt)',
  page_not_crawlable: 'Página de destino não pôde ser rastreada pelo Google',
  landing_page_error: 'Erro ao acessar a página de destino do produto',
  price_mismatch: 'Preço enviado ao Merchant diverge do preço exibido no site',
  availability_mismatch: 'Disponibilidade enviada ao Merchant diverge da disponibilidade real no site',
  shipping_could_not_be_calculated: 'Não foi possível calcular o frete do produto',
  missing_shipping: 'Informação de frete ausente',
  missing_tax: 'Informação de imposto ausente',
  gtin_invalid: 'GTIN inválido ou em formato incorreto',
  gtin_missing: 'GTIN ausente',
  mpn_invalid: 'MPN inválido ou em formato incorreto',
  identifier_exists_incorrect: 'Identificador do produto (GTIN/MPN/marca) incorreto',
  title_missing: 'Título do produto ausente',
  description_missing: 'Descrição do produto ausente',
  condition_mismatch: 'Condição do produto (novo/usado) divergente',
  brand_missing: 'Marca do produto ausente',
  misrepresentation: 'Informações do produto consideradas enganosas pelo Google',
  policy_violation: 'Produto violando políticas do Google Merchant Center',
  disapproved_by_merchant_center: 'Produto reprovado manualmente no Merchant Center',
  duplicate_image: 'Imagem duplicada de outro produto',
  promotional_overlay: 'Imagem com selo ou texto promocional não permitido',
  missing_required_attribute: 'Atributo obrigatório ausente no feed',
};

function describeMerchantIssue(code: string, attributeName: string | null): string {
  const known = MERCHANT_ISSUE_DESCRIPTIONS[code];
  if (known) return known;
  const humanized = code.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
  return attributeName ? `${humanized} (${attributeName})` : humanized;
}

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

      const productStatuses = await this.merchantClient.getProductStatuses(access_token, client.merchantId);
      const merchantProductsForDb = productStatuses.map((p: any) => this.mapProductView(clientId, p));
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

    // Qualquer SKU que já esteve no banco mas não veio nesta coleta
    // (excluído/desativado na VTEX) precisa parar de contar como ativo,
    // senão a contagem do sistema diverge da VTEX com o tempo.
    // Só roda se a coleta trouxe algo — uma lista vazia normalmente indica
    // falha/timeout da VTEX, não um catálogo zerado, e não deve apagar tudo.
    if (skus.length > 0) {
      const currentSkuIds = skus.map((s) => s.skuId);
      await this.prisma.vtexSku.updateMany({
        where: { clientId, isActive: true, skuId: { notIn: currentSkuIds } },
        data: { isActive: false },
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
   * Mapeia um produto da Products API v1 para o formato salvo em
   * merchant_products.
   *
   * A Products API retorna TODOS os produtos cadastrados (ao contrário da
   * Reports API / product_view, que só retorna produtos com atividade recente).
   *
   * O status agregado é derivado de status.destinationStatuses:
   * - tem approvedCountries → APPROVED
   * - tem approvedCountries + disapprovedCountries → LIMITED
   * - só disapprovedCountries → DISAPPROVED
   * - só pendingCountries ou vazio → PENDING
   *
   * offer_id pode vir como "SKUID_SKUID" — extraímos só a primeira parte.
   */
private mapProductView(clientId: string, p: any) {
    // 1. NÃO FAÇA split('_')[0]! Mantenha o offerId original para o DiffService achar.
    const offerId = p.offerId ?? ''; 
    
    // 2. Mapeamento direto e oficial de status da Reports API
    let approvalStatus: 'APPROVED' | 'LIMITED' | 'DISAPPROVED' | 'PENDING' = 'PENDING';
    const apiStatus = p.aggregatedReportingContextStatus;
    
    if (apiStatus === 'ELIGIBLE' || apiStatus === 'APPROVED') {
      approvalStatus = 'APPROVED';
    } else if (apiStatus === 'ELIGIBLE_LIMITED') {
      approvalStatus = 'LIMITED';
    } else if (apiStatus === 'NOT_ELIGIBLE_OR_DISAPPROVED' || apiStatus === 'DISAPPROVED') {
      approvalStatus = 'DISAPPROVED';
    }

    // 3. Preparando os erros para as suas validações de regras (imagem, preço, etc)
// 3. Preparando os erros para as suas validações de regras (imagem, preço, etc)
    // Na Reports API, a coluna 'item_issues' retorna no JSON como 'itemIssues'.
    const issues = (p.itemIssues ?? []).map((i: any) => {
      // O código do erro geralmente vem dentro de i.type.code na Reports API
      const code = i.type?.code ?? i.code ?? 'UNKNOWN';
      // O nome do atributo (ex: image_link) vem dentro de type.attribute
      const attributeName = i.type?.attribute ?? i.attribute ?? null;
      return {
        code,
        description: i.detail ?? i.description ?? describeMerchantIssue(code, attributeName),
        attributeName,
      };
    });

    // shoppingAdsStatus usa o enum DestinationStatus (APPROVED/DISAPPROVED/PENDING/UNSPECIFIED),
    // que não tem o valor LIMITED do ApprovalStatus — sem esse mapeamento o createMany
    // rejeita o lote inteiro quando qualquer produto vier LIMITED.
    const shoppingAdsStatus = approvalStatus === 'LIMITED' ? 'APPROVED' : approvalStatus;

    return {
      clientId,
      offerId,
      googleProductId: p.title ?? null,
      title: p.title ?? null,
      approvalStatus,
      shoppingAdsStatus,
      freeListingsStatus: 'UNSPECIFIED' as const,
      issues,
      destinationStatuses: [],
      googleCreatedAt: null,
      googleUpdatedAt: null,
      expirationDate: null,
      collectedAt: new Date(),
    };
  }

  /**
   * Deriva o status agregado a partir de destinationStatuses da Products API.
   * Considera apenas o canal SHOPPING_ADS (principal para monitoramento).
   * Se não houver entrada de SHOPPING_ADS, usa qualquer canal disponível.
   */
  private deriveApprovalStatus(
    destinationStatuses: any[],
  ): 'APPROVED' | 'LIMITED' | 'DISAPPROVED' | 'PENDING' | 'EXPIRING' {
    if (!destinationStatuses.length) return 'PENDING';

    // Prioriza SHOPPING_ADS; cai no primeiro canal disponível se não encontrar
    const ds =
      destinationStatuses.find((d) => d.reportingContext === 'SHOPPING_ADS') ??
      destinationStatuses[0];

    const approved = (ds.approvedCountries ?? []).length > 0;
    const disapproved = (ds.disapprovedCountries ?? []).length > 0;
    const pending = (ds.pendingCountries ?? []).length > 0;

    if (approved && disapproved) return 'LIMITED';   // alguns países aprovados, outros não
    if (approved) return 'APPROVED';
    if (disapproved) return 'DISAPPROVED';
    if (pending) return 'PENDING';
    return 'PENDING';
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
