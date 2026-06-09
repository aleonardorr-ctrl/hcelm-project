import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MedicationsService {
  constructor(private prisma: PrismaService) {}

  async search(tenantId: string, query: string) {
    const q = query.trim();

    if (!q) return [];

    return this.prisma.medication.findMany({
      where: {
        tenantId,
        active: true,
        OR: [
          { genericName: { contains: q, mode: 'insensitive' } },
          { commercialName: { contains: q, mode: 'insensitive' } },
          { concentration: { contains: q, mode: 'insensitive' } },
          { presentation: { contains: q, mode: 'insensitive' } },
        ],
      },
      orderBy: [{ genericName: 'asc' }, { commercialName: 'asc' }],
      take: 20,
    });
  }

  async findAll(tenantId: string) {
    return this.prisma.medication.findMany({
      where: { tenantId },
      orderBy: { genericName: 'asc' },
    });
  }

  async create(tenantId: string, data: any) {
    return this.prisma.medication.create({
      data: {
        tenantId,
        genericName: data.genericName,
        commercialName: data.commercialName || null,
        concentration: data.concentration || null,
        presentation: data.presentation,
        route: data.route || null,
        active: data.active ?? true,
      },
    });
  }
}