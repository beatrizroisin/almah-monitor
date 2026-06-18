import { BadRequestException, forwardRef, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ClientsRepository } from './clients.repository';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { PrismaService } from '../prisma/prisma.service';
import { SyncService } from '../sync/sync.service';

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');
}

function statusLabel(status: string) {
  if (status === 'ACTIVE') return 'Saudável';
  if (status === 'ERROR') return 'Crítico';
  return status;
}

// Tier conforme fórmula do documento 03 (Health Score)
function healthTier(score: number) {
  if (score >= 90) return 'Saudável';
  if (score >= 70) return 'Atenção';
  if (score >= 40) return 'Risco';
  return 'Crítico';
}

@Injectable()
export class ClientsService {
  constructor(
    private repo: ClientsRepository,
    private prisma: PrismaService,
    @Inject(forwardRef(() => SyncService)) private syncService: SyncService,
  ) {}

  async findAll(params: { search?: string; status?: string; page?: number }) {
    const clients = await this.repo.findAll(params);
    return clients.map((c) => this.toListItem(c));
  }

  async findById(id: string) {
    const client = await this.repo.findById(id);
    if (!client) throw new NotFoundException('Cliente não encontrado.');
    return this.toDetail(client);
  }

  /** Etapa 1 do wizard — cria com status PENDING (ver doc 02, observação sobre o wizard) */
  async create(dto: CreateClientDto) {
    const existing = await this.repo.findByVtexAccountOrMerchantId(dto.vtex_account, dto.merchant_id);
    if (existing) {
      throw new BadRequestException('Já existe um cliente com este VTEX account ou Merchant ID.');
    }

    const client = await this.repo.create({
      name: dto.name,
      platform: dto.platform ?? 'VTEX',
      vtexAccount: dto.vtex_account,
      merchantId: dto.merchant_id,
      storeUrl: dto.store_url,
      notes: dto.notes,
      status: 'PENDING',
      ...(dto.media_owner_id ? { mediaOwner: { connect: { id: dto.media_owner_id } } } : {}),
      ...(dto.dev_owner_id ? { devOwner: { connect: { id: dto.dev_owner_id } } } : {}),
    });

    return client;
  }

  async update(id: string, dto: UpdateClientDto) {
    await this.findById(id); // 404 se não existir

    const data: any = { ...dto };
    delete data.media_owner_id;
    delete data.dev_owner_id;
    delete data.notifications;

    if (dto.notifications) {
      data.notificationConfig = dto.notifications;
    }
    if ((dto as any).media_owner_id) {
      data.mediaOwner = { connect: { id: (dto as any).media_owner_id } };
    }
    if ((dto as any).dev_owner_id) {
      data.devOwner = { connect: { id: (dto as any).dev_owner_id } };
    }

    return this.repo.update(id, data);
  }

  async remove(id: string) {
    await this.findById(id);
    return this.repo.softDelete(id);
  }

  async getIntegrations(id: string) {
    const client = await this.repo.findById(id);
    if (!client) throw new NotFoundException('Cliente não encontrado.');
    return client.integrations;
  }

  /** Dashboard detalhado por cliente — usado em GET /clients/:id/dashboard */
  async getDashboard(id: string) {
    const client = await this.repo.findById(id);
    if (!client) throw new NotFoundException('Cliente não encontrado.');

    const [latestSnapshot, previousSnapshot, problemSkus, activeAlert] = await Promise.all([
      this.prisma.skuHealthSnapshot.findFirst({ where: { clientId: id }, orderBy: { snapshotDate: 'desc' } }),
      this.prisma.skuHealthSnapshot.findMany({ where: { clientId: id }, orderBy: { snapshotDate: 'desc' }, take: 2 }),
      this.prisma.merchantProduct.findMany({
        where: { clientId: id, approvalStatus: { in: ['DISAPPROVED', 'EXPIRING'] } },
        take: 50,
      }),
      this.prisma.alert.findFirst({ where: { clientId: id, status: 'OPEN' }, orderBy: { createdAt: 'desc' } }),
    ]);

    const yesterday = previousSnapshot[1];

    return {
      vtexSkus: latestSnapshot?.totalVtexSkus ?? 0,
      merchantSkus: latestSnapshot?.totalMerchantSkus ?? 0,
      missingSkus: latestSnapshot?.missingSkus ?? 0,
      approvedToday: latestSnapshot?.approvedSkus ?? 0,
      approvedYesterday: yesterday?.approvedSkus ?? 0,
      problemsCount: (latestSnapshot?.disapprovedSkus ?? 0) + (latestSnapshot?.expiredSkus ?? 0),
      dropPctLabel: latestSnapshot?.deltaApprovedPct ? `${latestSnapshot.deltaApprovedPct}%` : '—',
      dropAbsoluteLabel: latestSnapshot?.deltaApproved ? `${latestSnapshot.deltaApproved} SKUs` : '',
      problemSkus: problemSkus.map((p) => ({
        id: p.id,
        skuId: p.offerId,
        productName: p.title,
        issue: this.mainIssueFromProduct(p),
        severity: p.approvalStatus === 'DISAPPROVED' ? 'Crítico' : 'Alto',
        statusLabel: p.approvalStatus === 'DISAPPROVED' ? 'Reprovado' : 'Expirado',
      })),
      activeAlert: activeAlert
        ? {
            id: activeAlert.id,
            message: activeAlert.message,
            recommendedActions: this.recommendedActionsFor(activeAlert),
          }
        : null,
    };
  }

  async getSummary(id: string) {
    return this.getDashboard(id);
  }

  async triggerSync(id: string) {
    await this.findById(id);
    // Dispara a sincronização de forma assíncrona (fire-and-forget) e retorna
    // imediatamente — o front faz polling do status via GET /clients/:id.
    // Em produção isso deveria ir para uma fila BullMQ em vez de rodar inline;
    // mantido direto aqui para simplificar o MVP.
    this.syncService.syncClient(id, 'MANUAL').catch(() => {
      // Erros já são persistidos em sync_logs e no client.syncError pelo SyncService
    });
    return { queued: true, clientId: id };
  }

  private mainIssueFromProduct(p: any): string {
    const issues = Array.isArray(p.issues) ? p.issues : [];
    return issues[0]?.description ?? 'Reprovado';
  }

  private recommendedActionsFor(alert: any): string[] {
    return [
      'Verificar conector VTEX Google no painel VTEX',
      'Reprocessar SKUs com preço divergente',
      'Corrigir imagens inválidas via VTEX CMS',
      'Renovar produtos expirados no Merchant',
      'Priorizar SKUs com campanha ativa no Google Ads',
    ];
  }

  private toListItem(c: any) {
    const vtexInt = c.integrations?.find((i: any) => i.type === 'VTEX');
    const googleInt = c.integrations?.find((i: any) => i.type === 'GOOGLE_MERCHANT');
    return {
      id: c.id,
      name: c.name,
      initials: initials(c.name),
      vtexAccount: c.vtexAccount,
      merchantId: c.merchantId,
      status: statusLabel(c.status),
      vtexStatus: vtexInt?.status ?? 'PENDING',
      googleStatus: googleInt?.status ?? 'PENDING',
      mediaOwner: c.mediaOwner?.name ?? '—',
      lastSyncLabel: c.lastSyncAt ? this.timeAgo(c.lastSyncAt) : 'Nunca',
    };
  }

  private toDetail(c: any) {
    return {
      ...this.toListItem(c),
      storeUrl: c.storeUrl,
      notes: c.notes,
      devOwner: c.devOwner?.name ?? '—',
      statusLabel: statusLabel(c.status),
      healthScore: c.integrationStatus?.healthScore ?? 0,
      tone: statusLabel(c.status) === 'Saudável' ? 'green' : statusLabel(c.status) === 'Atenção' ? 'orange' : 'red',
    };
  }

  private timeAgo(date: Date) {
    const diffMs = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 60) return `Há ${mins}min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `Há ${hours}h`;
    return `Há ${Math.floor(hours / 24)}d`;
  }
}
