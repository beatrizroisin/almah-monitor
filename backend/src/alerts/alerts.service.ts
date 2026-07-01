import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

function timeAgo(date: Date) {
  const diffMs = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `Há ${mins} minutos`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Há ${hours} horas`;
  return `Há ${Math.floor(hours / 24)} dias`;
}

/** Formata "01/07/2026 às 18:30" (padrão BR), no fuso America/Sao_Paulo. */
function formatBrDateTime(date: Date) {
  const d = new Date(date);
  const datePart = d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  const timePart = d.toLocaleTimeString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${datePart} às ${timePart}`;
}

@Injectable()
export class AlertsService {
  constructor(private prisma: PrismaService) {}

  async list(params: { status?: string; severity?: string; clientId?: string }) {
    const alerts = await this.prisma.alert.findMany({
      where: {
        ...(params.status ? { status: params.status as any } : {}),
        ...(params.severity ? { severity: params.severity as any } : {}),
        ...(params.clientId ? { clientId: params.clientId } : {}),
      },
      include: { client: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return alerts.map((a) => ({
      id: a.id,
      title: a.title,
      message: a.message,
      severity: a.severity,
      status: a.status,
      affectedSkusCount: a.affectedSkusCount,
      clientId: a.clientId,
      clientName: a.client?.name,
      timeAgo: timeAgo(a.createdAt),
      resolvedAt: a.resolvedAt,
      resolvedAtLabel: a.resolvedAt ? formatBrDateTime(a.resolvedAt) : null,
    }));
  }

  async resolve(id: string, userId?: string) {
    const alert = await this.prisma.alert.findUnique({ where: { id } });
    if (!alert) throw new NotFoundException('Alerta não encontrado.');
    return this.prisma.alert.update({
      where: { id },
      data: { status: 'RESOLVED', resolvedAt: new Date(), resolvedById: userId },
    });
  }

  async ignore(id: string) {
    return this.prisma.alert.update({ where: { id }, data: { status: 'IGNORED' } });
  }

  async addComment(alertId: string, content: string, userId?: string) {
    return this.prisma.alertComment.create({ data: { alertId, content, userId } });
  }

  async listComments(alertId: string) {
    return this.prisma.alertComment.findMany({ where: { alertId }, orderBy: { createdAt: 'asc' } });
  }
}
