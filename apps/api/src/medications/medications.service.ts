/**
 * Archivo: medications.service.ts
 * Ruta: apps/api/src/medications/medications.service.ts
 * Funcion: Mantiene la busqueda usada por Farmacia/Receta.
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MedicationsService {
  constructor(private readonly prisma: PrismaService) {}

  async search(tenantId: string, query: string) {
    const q = query.trim();
    if (q.length < 2) return [];

    return this.prisma.medication.findMany({
      where: {
        tenantId,
        active: true,
        OR: [
          { internalCode: { contains: q, mode: 'insensitive' } },
          { barcode: { contains: q, mode: 'insensitive' } },
          { genericName: { contains: q, mode: 'insensitive' } },
          { commercialName: { contains: q, mode: 'insensitive' } },
          { concentration: { contains: q, mode: 'insensitive' } },
          { pharmaceuticalForm: { contains: q, mode: 'insensitive' } },
          { presentation: { contains: q, mode: 'insensitive' } },
          { laboratory: { contains: q, mode: 'insensitive' } },
          { sanitaryRegistration: { contains: q, mode: 'insensitive' } },
          { searchText: { contains: q, mode: 'insensitive' } },
        ],
      },
      orderBy: [{ genericName: 'asc' }, { commercialName: 'asc' }],
      take: 40,
      include: {
        inventoryLots: {
          where: { active: true, stock: { gt: 0 } },
          orderBy: { expirationDate: 'asc' },
        },
      },
    });
  }

  findAll(tenantId: string) {
    return this.prisma.medication.findMany({
      where: { tenantId },
      orderBy: [{ genericName: 'asc' }, { commercialName: 'asc' }],
    });
  }

  create(tenantId: string, data: any) {
    return this.prisma.medication.create({
      data: {
        tenantId,
        internalCode: data.internalCode || null,
        barcode: data.barcode || null,
        productType: data.productType || 'MEDICAMENTO',
        genericName: data.genericName,
        commercialName: data.commercialName || null,
        concentration: data.concentration || null,
        pharmaceuticalForm: data.pharmaceuticalForm || null,
        presentation: data.presentation,
        route: data.route || null,
        unitMeasure: data.unitMeasure || null,
        laboratory: data.laboratory || null,
        active: data.active ?? true,
        searchText: [
          data.internalCode, data.barcode, data.genericName, data.commercialName,
          data.concentration, data.presentation, data.laboratory,
        ].filter(Boolean).join(' '),
      },
    });
  }
}
