import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  private transporter;

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {
    this.transporter = nodemailer.createTransport({
      host: this.config.get('SMTP_HOST'),
      port: Number(this.config.get('SMTP_PORT')) || 587,
      auth: {
        user: this.config.get('SMTP_USER'),
        pass: this.config.get('SMTP_PASS'),
      },
    });
  }

  async getGlobalConfig() {
    // Em produção isso ficaria numa tabela settings — simplificado aqui via env/defaults.
    return {
      discordEnabled: true,
      discordWebhook: this.config.get('DISCORD_WEBHOOK_URL') ?? '',
      emailEnabled: true,
      emailAddress: 'time@almah.com.br',
    };
  }

  async updateGlobalConfig(payload: any) {
    // Persistir em uma tabela de settings dedicada (fora do MVP documentado).
    return payload;
  }

  async getClientConfig(clientId: string) {
    const client = await this.prisma.client.findUnique({ where: { id: clientId } });
    return client?.notificationConfig ?? null;
  }

  async updateClientConfig(clientId: string, payload: any) {
    return this.prisma.client.update({ where: { id: clientId }, data: { notificationConfig: payload } });
  }

  async sendEmail(to: string, subject: string, html: string) {
    return this.transporter.sendMail({
      from: `"ALMAH Monitor" <${this.config.get('SMTP_USER')}>`,
      to,
      subject,
      html,
    });
  }

  async sendDiscord(webhookUrl: string, content: string) {
    // Discord espera { content: "..." } no corpo do webhook (Slack usa { text: "..." }).
    return axios.post(webhookUrl, { content });
  }

  async sendWhatsapp(phone: string, message: string) {
    const apiUrl = this.config.get('WHATSAPP_API_URL');
    const apiKey = this.config.get('WHATSAPP_API_KEY');
    return axios.post(
      `${apiUrl}/message/sendText`,
      { number: phone, text: message },
      { headers: { apikey: apiKey } },
    );
  }

  /** Modelo de alerta conforme doc 1, seção 9 */
  buildAlertMessage(clientName: string, affectedSkus: number, dropPct: number, mainCauses: string[]) {
    return `ALERTA CRÍTICO — Cliente ${clientName} perdeu ${affectedSkus} SKUs aprovados no Google Merchant nas últimas 24h. Queda de ${dropPct}%. Principais causas: ${mainCauses.join(', ')}. Ação urgente recomendada.`;
  }

  async dispatchCriticalAlert(clientName: string, affectedSkus: number, dropPct: number, mainCauses: string[]) {
    const config = await this.getGlobalConfig();
    const message = this.buildAlertMessage(clientName, affectedSkus, dropPct, mainCauses);

    const tasks: Promise<any>[] = [];

    if (config.emailEnabled && config.emailAddress) {
      tasks.push(
        this.sendEmail(
          config.emailAddress,
          `[ALMAH Monitor] Alerta crítico — ${clientName}`,
          `<p>${message}</p>`,
        ),
      );
    }

    if (config.discordEnabled && config.discordWebhook) {
      tasks.push(this.sendDiscord(config.discordWebhook, message));
    }

    return Promise.allSettled(tasks);
  }
}
