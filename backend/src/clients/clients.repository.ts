import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class ClientsRepository {
  constructor(private prisma: PrismaService) {}

  findAll(params: { search?: string; status?: string; page?: number; pageSize?: number }) {
    const { search, status, page = 1, pageSize = 50 } = params;
    const where: Prisma.ClientWhereInput = {
      deletedAt: null,
      ...(status ? { status: status as any } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { vtexAccount: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    return this.prisma.client.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { name: 'asc' },
      include: { integrations: true, mediaOwner: true, devOwner: true },
    });
  }

  findById(id: string) {
    return this.prisma.client.findUnique({
      where: { id },
      include: {
        integrations: true,
        mediaOwner: true,
        devOwner: true,
      },
    });
  }

  findByVtexAccountOrMerchantId(vtexAccount: string, merchantId: string) {
    return this.prisma.client.findFirst({
      where: { OR: [{ vtexAccount }, { merchantId }] },
    });
  }

  create(data: Prisma.ClientCreateInput) {
    return this.prisma.client.create({ data });
  }

  update(id: string, data: Prisma.ClientUpdateInput) {
    return this.prisma.client.update({ where: { id }, data });
  }

  softDelete(id: string) {
    return this.prisma.client.update({ where: { id }, data: { deletedAt: new Date(), status: 'INACTIVE' } });
  }
}
