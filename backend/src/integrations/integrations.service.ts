import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CryptoService } from './crypto.service';
import { VtexConnectionService } from '../vtex/vtex-connection.service';
import { GoogleOAuthService } from '../merchant/google-oauth.service';

@Injectable()
export class IntegrationsService {
  constructor(
    private prisma: PrismaService,
    private crypto: CryptoService,
    private vtexConnection: VtexConnectionService,
    private googleOAuth: GoogleOAuthService,
  ) {}

  async listAll() {
    const clients = await this.prisma.client.findMany({
      where: { deletedAt: null },
      include: { integrations: true },
    });

    return clients.map((c) => {
      const vtex = c.integrations.find((i) => i.type === 'VTEX');
      const google = c.integrations.find((i) => i.type === 'GOOGLE_MERCHANT');
      return {
        clientId: c.id,
        clientName: c.name,
        initials: c.name.split(' ').slice(0, 2).map((w) => w[0]).join(''),
        tone: c.status === 'ACTIVE' ? 'green' : c.status === 'ERROR' ? 'red' : 'orange',
        vtexStatus: vtex?.status ?? 'PENDING',
        googleStatus: google?.status ?? 'PENDING',
        lastSyncLabel: c.lastSyncAt ? c.lastSyncAt.toLocaleString('pt-BR') : 'Nunca',
      };
    });
  }

  async getByClient(clientId: string) {
    const client = await this.prisma.client.findUnique({ where: { id: clientId }, include: { integrations: true } });
    if (!client) throw new NotFoundException('Cliente não encontrado.');

    const vtex = client.integrations.find((i) => i.type === 'VTEX');
    const google = client.integrations.find((i) => i.type === 'GOOGLE_MERCHANT');

    let googleAccount: string | undefined;
    if (google) {
      try {
        const creds = this.crypto.decrypt<any>(google.credentialsEncrypted);
        googleAccount = creds.account_email;
      } catch {
        // credenciais corrompidas/ilegíveis — ignora silenciosamente no detalhe
      }
    }

    let vtexAppKey: string | undefined;
    if (vtex) {
      try {
        const creds = this.crypto.decrypt<any>(vtex.credentialsEncrypted);
        vtexAppKey = creds.appKey;
      } catch {
        // idem
      }
    }

    return {
      clientId: client.id,
      clientName: client.name,
      initials: client.name.split(' ').slice(0, 2).map((w) => w[0]).join(''),
      tone: client.status === 'ACTIVE' ? 'green' : 'red',
      vtex: vtex
        ? { status: vtex.status, appKey: vtexAppKey, lastSyncLabel: vtex.lastSyncAt?.toLocaleString('pt-BR') ?? 'Nunca' }
        : { status: 'PENDING' },
      google: google
        ? {
            status: google.status,
            account: googleAccount,
            merchantId: client.merchantId,
            tokenExpiresAtLabel: google.expiresAt?.toLocaleTimeString('pt-BR'),
            lastSyncLabel: google.lastSyncAt?.toLocaleString('pt-BR') ?? 'Nunca',
          }
        : { status: 'PENDING' },
    };
  }

  // ── VTEX ──────────────────────────────────────────────

  /** POST /integrations/vtex/test/:clientId — testa sem salvar */
  async testVtex(clientId: string, appKey: string, appToken: string) {
    const client = await this.prisma.client.findUnique({ where: { id: clientId } });
    if (!client) throw new NotFoundException('Cliente não encontrado.');
    return this.vtexConnection.testConnection(client.vtexAccount, appKey, appToken);
  }

  /** POST /integrations/vtex/connect — testa, criptografa e salva */
  async connectVtex(clientId: string, appKey: string, appToken: string) {
    const client = await this.prisma.client.findUnique({ where: { id: clientId } });
    if (!client) throw new NotFoundException('Cliente não encontrado.');

    const result = await this.vtexConnection.testConnection(client.vtexAccount, appKey, appToken);

    const encrypted = this.crypto.encrypt({ appKey, appToken });

    const existing = await this.prisma.integration.findFirst({
      where: { clientId, type: 'VTEX' },
    });

    if (existing) {
      await this.prisma.integration.update({
        where: { id: existing.id },
        data: { credentialsEncrypted: encrypted, status: 'CONNECTED', errorMessage: null },
      });
    } else {
      await this.prisma.integration.create({
        data: { clientId, type: 'VTEX', credentialsEncrypted: encrypted, status: 'CONNECTED' },
      });
    }

    return result;
  }

  async updateVtexCredentials(clientId: string, appKey: string, appToken: string) {
    return this.connectVtex(clientId, appKey, appToken);
  }

  // ── Google OAuth ──────────────────────────────────────

  /** POST /integrations/google/auth-url */
  async getGoogleAuthUrl(clientId: string) {
    const client = await this.prisma.client.findUnique({ where: { id: clientId } });
    if (!client) throw new NotFoundException('Cliente não encontrado.');

    const url = this.googleOAuth.generateAuthUrl(clientId);
    return { url };
  }

  /** GET /integrations/google/callback?code=XXX&state=clientId */
  async handleGoogleCallback(code: string, clientId: string) {
    const tokens = await this.googleOAuth.exchangeCode(code);
    if (!tokens.refresh_token) {
      throw new BadRequestException(
        'Google não retornou refresh_token. Revogue o acesso anterior em myaccount.google.com/permissions e tente novamente.',
      );
    }

    const encrypted = this.crypto.encrypt({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
    });

    const existing = await this.prisma.integration.findFirst({
      where: { clientId, type: 'GOOGLE_MERCHANT' },
    });

    if (existing) {
      await this.prisma.integration.update({
        where: { id: existing.id },
        data: {
          credentialsEncrypted: encrypted,
          status: 'CONNECTED',
          expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
          errorMessage: null,
        },
      });
    } else {
      await this.prisma.integration.create({
        data: {
          clientId,
          type: 'GOOGLE_MERCHANT',
          credentialsEncrypted: encrypted,
          status: 'CONNECTED',
          expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        },
      });
    }

    return { status: 'CONNECTED' };
  }

  async revokeGoogle(clientId: string) {
    const integration = await this.prisma.integration.findFirst({
      where: { clientId, type: 'GOOGLE_MERCHANT' },
    });
    if (!integration) throw new NotFoundException('Integração Google não encontrada.');
    await this.prisma.integration.delete({ where: { id: integration.id } });
    return { revoked: true };
  }

  async remove(integrationId: string) {
    await this.prisma.integration.delete({ where: { id: integrationId } });
    return { removed: true };
  }
}