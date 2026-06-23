/**
 * Archivo: medications.service.ts
 * Ruta: apps/api/src/medications/medications.service.ts
 * Funcion: Busqueda clinica de productos activos para receta, con SKU, stock y ubicacion.
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MedicationsService {
  constructor(private readonly prisma: PrismaService) {}

  async search(tenantId: string, query: string) {
    const q = query.trim();
    if (q.length < 2) return [];

    const medications = await this.prisma.medication.findMany({
      where: {
        tenantId,
        active: true,
        OR: [
          { masterCode: { contains: q, mode: 'insensitive' } },
          { internalCode: { contains: q, mode: 'insensitive' } },
          { barcode: { contains: q, mode: 'insensitive' } },
          { genericName: { contains: q, mode: 'insensitive' } },
          { commercialName: { contains: q, mode: 'insensitive' } },
          { concentration: { contains: q, mode: 'insensitive' } },
          { pharmaceuticalForm: { contains: q, mode: 'insensitive' } },
          { presentation: { contains: q, mode: 'insensitive' } },
          { route: { contains: q, mode: 'insensitive' } },
          { laboratory: { contains: q, mode: 'insensitive' } },
          { sanitaryRegistration: { contains: q, mode: 'insensitive' } },
          { searchText: { contains: q, mode: 'insensitive' } },
        ],
      },
      orderBy: [{ genericName: 'asc' }, { commercialName: 'asc' }],
      take: 40,
      include: {
        inventoryLots: {
          where: {
            active: true,
            stock: { gt: 0 },
          },
          orderBy: [
            { expirationDate: 'asc' },
            { businessUnit: 'asc' },
            { warehouse: 'asc' },
          ],
        },
      },
    });

    return medications.map((medication: any) => {
      const lots = Array.isArray(medication.inventoryLots)
        ? medication.inventoryLots
        : [];

      const availableStock = lots.reduce(
        (total: number, lot: any) => total + Number(lot.stock || 0),
        0,
      );

      const firstLot = lots[0] || null;

      const locationParts = [
        firstLot?.businessUnit,
        firstLot?.warehouse,
        firstLot?.shelfCode ? `Andamio ${firstLot.shelfCode}` : null,
        firstLot?.shelfLevel ? `Nivel ${firstLot.shelfLevel}` : null,
        firstLot?.locationNotes,
      ].filter(Boolean);

      return {
        ...medication,
        sku: medication.internalCode,
        companySku: medication.internalCode,
        availableStock,
        stock: availableStock,
        locationText:
          locationParts.length > 0
            ? locationParts.join(' / ')
            : 'Ubicacion no registrada',
        nextExpirationDate: firstLot?.expirationDate || null,
        nextLotNumber: firstLot?.lotNumber || null,
        inventoryLots: lots,
      };
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
        masterCode: data.masterCode || null,
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
        sanitaryRegistration: data.sanitaryRegistration || null,
        active: data.active ?? true,
        searchText: [
          data.masterCode,
          data.internalCode,
          data.barcode,
          data.genericName,
          data.commercialName,
          data.concentration,
          data.pharmaceuticalForm,
          data.presentation,
          data.route,
          data.laboratory,
          data.sanitaryRegistration,
        ]
          .filter(Boolean)
          .join(' '),
      },
    });
  }
}