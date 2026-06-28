import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  MedicationInventoryMovementDirection,
  MedicationInventoryMovementType,
  Prisma,
} from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

type TransactionClient = Prisma.TransactionClient;

type InventoryScope = {
  companyId: string;
  businessUnitId: string;
  warehouseId: string;
  companyMedicationId: string;
};

type UpsertLotParams = {
  tenantId: string;
  userId: string | null;
  medicationId: string;
  businessUnit: string;
  warehouse: string;
  lotNumber: string;
  lotData: Record<string, any>;
  idempotencyKey: string;
  operationId?: string;
  sourceType: string;
  sourceId?: string | null;
  sourceLineId?: string | null;
  reason: string;
  scopeCache?: Map<string, InventoryScope>;
};

@Injectable()
export class MedicationInventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async upsertManualLot(params: {
    tenantId: string;
    userId: string | null;
    medicationId: string;
    businessUnit: string;
    warehouse: string;
    lotNumber: string;
    lotData: Record<string, any>;
    idempotencyKey?: string | null;
    reason?: string | null;
  }) {
    const idempotencyKey =
      params.idempotencyKey?.trim() || `MANUAL_LOT:${randomUUID()}`;
    const operationId = randomUUID();

    return this.runSerializable((tx) =>
      this.upsertLotInTransaction(tx, {
        ...params,
        idempotencyKey,
        operationId,
        sourceType: 'MANUAL_LOT',
        reason: params.reason?.trim() || '',
      }),
    );
  }

  async upsertImportedLot(
    tx: TransactionClient,
    params: {
      tenantId: string;
      userId: string | null;
      medicationId: string;
      businessUnit: string;
      warehouse: string;
      lotNumber: string;
      lotData: Record<string, any>;
      importId: string;
      rowNumber: number;
      scopeCache?: Map<string, InventoryScope>;
    },
  ) {
    return this.upsertLotInTransaction(tx, {
      ...params,
      idempotencyKey: `IMPORT:${params.importId}:LOT:${params.rowNumber}`,
      operationId: randomUUID(),
      sourceType: 'CATALOG_IMPORT',
      sourceId: params.importId,
      sourceLineId: String(params.rowNumber),
      reason: 'Inventario registrado mediante importacion Excel',
    });
  }

  async previewFefo(params: {
    tenantId: string;
    userId: string | null;
    medicationId: string;
    businessUnit: string;
    warehouse: string;
    quantity: number | string;
  }) {
    const quantity = this.positiveQuantity(params.quantity);
    const companyId = await this.findActiveCompanyId(
      this.prisma,
      params.tenantId,
      params.userId,
    );
    const medication = await this.prisma.medication.findFirst({
      where: {
        id: params.medicationId,
        tenantId: params.tenantId,
        active: true,
      },
      select: {
        id: true,
        genericName: true,
        commercialName: true,
        concentration: true,
        presentation: true,
        requiresPrescription: true,
      },
    });
    if (!medication)
      throw new NotFoundException('Producto no encontrado o inactivo.');

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lots = await this.prisma.medicationInventoryLot.findMany({
      where: {
        tenantId: params.tenantId,
        companyId,
        medicationId: params.medicationId,
        businessUnit: params.businessUnit,
        warehouse: params.warehouse,
        active: true,
        stock: { gt: 0 },
        OR: [{ expirationDate: null }, { expirationDate: { gte: today } }],
      },
      orderBy: [
        { expirationDate: { sort: 'asc', nulls: 'last' } },
        { createdAt: 'asc' },
        { id: 'asc' },
      ],
    });

    let remaining = quantity;
    const allocations = lots
      .map((lot) => {
        const available = new Prisma.Decimal(lot.stock);
        const allocated = Prisma.Decimal.min(available, remaining);
        remaining = Prisma.Decimal.max(remaining.minus(allocated), 0);
        return {
          lotId: lot.id,
          lotNumber: lot.lotNumber,
          expirationDate: lot.expirationDate,
          availableStock: available,
          allocatedQuantity: allocated,
          salePrice: lot.salePrice,
          currency: lot.currency,
        };
      })
      .filter((item) => item.allocatedQuantity.gt(0));

    const availableQuantity = lots.reduce(
      (total, lot) => total.plus(lot.stock),
      new Prisma.Decimal(0),
    );

    return {
      medication,
      requestedQuantity: quantity,
      availableQuantity,
      sufficientStock: remaining.isZero(),
      missingQuantity: remaining,
      strategy: 'FEFO',
      allocations,
    };
  }

  async decreaseStockFefo(params: {
    tenantId: string;
    userId: string | null;
    medicationId: string;
    businessUnit: string;
    warehouse: string;
    companyId?: string;
    businessUnitId?: string;
    warehouseId?: string;
    quantity: number | string;
    movementType: MedicationInventoryMovementType;
    idempotencyKey: string;
    sourceType: string;
    sourceId: string;
    sourceLineId?: string | null;
    reason: string;
    prescriptionId?: string | null;
  }) {
    return this.runSerializable((tx) =>
      this.decreaseStockFefoInTransaction(tx, params),
    );
  }

  async decreaseStockFefoInTransaction(
    tx: TransactionClient,
    params: {
      tenantId: string;
      userId: string | null;
      medicationId: string;
      businessUnit: string;
      warehouse: string;
      companyId?: string;
      businessUnitId?: string;
      warehouseId?: string;
      quantity: number | string;
      movementType: MedicationInventoryMovementType;
      idempotencyKey: string;
      sourceType: string;
      sourceId: string;
      sourceLineId?: string | null;
      reason: string;
      prescriptionId?: string | null;
    },
  ) {
    const quantity = this.positiveQuantity(params.quantity);
    if (!params.idempotencyKey.trim()) {
      throw new BadRequestException(
        'La operacion requiere una clave de idempotencia.',
      );
    }
    if (!params.reason.trim()) {
      throw new BadRequestException(
        'La salida de inventario requiere un motivo.',
      );
    }
    if (
      params.movementType !== MedicationInventoryMovementType.SALE &&
      params.movementType !==
        MedicationInventoryMovementType.PRESCRIPTION_DISPENSING
    ) {
      throw new BadRequestException(
        'FEFO solo admite ventas o dispensaciones de receta.',
      );
    }

    const duplicate = await tx.medicationInventoryMovement.findMany({
      where: {
        tenantId: params.tenantId,
        idempotencyKey: { startsWith: params.idempotencyKey + ':LOT:' },
      },
      orderBy: { createdAt: 'asc' },
    });
    if (duplicate.length) {
      return {
        operationId: duplicate[0].operationId,
        movements: duplicate,
        idempotent: true,
      };
    }

    const medication = await tx.medication.findFirst({
      where: {
        id: params.medicationId,
        tenantId: params.tenantId,
        active: true,
      },
      select: { id: true, requiresPrescription: true },
    });
    if (!medication)
      throw new NotFoundException('Producto no encontrado o inactivo.');
    if (medication.requiresPrescription && !params.prescriptionId) {
      throw new BadRequestException(
        'Este medicamento requiere una receta valida para descontar stock.',
      );
    }

    const companyId =
      params.companyId ||
      (await this.findActiveCompanyId(tx, params.tenantId, params.userId));
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lots = await tx.medicationInventoryLot.findMany({
      where: {
        tenantId: params.tenantId,
        companyId,
        ...(params.businessUnitId
          ? { businessUnitId: params.businessUnitId }
          : {}),
        ...(params.warehouseId ? { warehouseId: params.warehouseId } : {}),
        medicationId: params.medicationId,
        businessUnit: params.businessUnit,
        warehouse: params.warehouse,
        active: true,
        stock: { gt: 0 },
        OR: [{ expirationDate: null }, { expirationDate: { gte: today } }],
      },
      orderBy: [
        { expirationDate: { sort: 'asc', nulls: 'last' } },
        { createdAt: 'asc' },
        { id: 'asc' },
      ],
    });

    const available = lots.reduce(
      (total, lot) => total.plus(lot.stock),
      new Prisma.Decimal(0),
    );
    if (available.lt(quantity)) {
      throw new ConflictException(
        'Stock insuficiente. Disponible: ' +
          available.toString() +
          '; solicitado: ' +
          quantity.toString() +
          '.',
      );
    }

    const operationId = randomUUID();
    let remaining = quantity;
    const movements = [];
    for (const lot of lots) {
      if (remaining.isZero()) break;
      if (
        !lot.companyId ||
        !lot.businessUnitId ||
        !lot.warehouseId ||
        !lot.companyMedicationId
      ) {
        throw new ConflictException(
          'El lote no tiene asignacion organizacional completa.',
        );
      }
      if (
        (params.businessUnitId &&
          lot.businessUnitId !== params.businessUnitId) ||
        (params.warehouseId && lot.warehouseId !== params.warehouseId)
      ) {
        throw new ConflictException(
          'El lote no pertenece a la unidad y almacen solicitados.',
        );
      }

      const stockBefore = new Prisma.Decimal(lot.stock);
      const allocated = Prisma.Decimal.min(stockBefore, remaining);
      const stockAfter = stockBefore.minus(allocated);
      const updated = await tx.medicationInventoryLot.updateMany({
        where: {
          id: lot.id,
          tenantId: params.tenantId,
          companyId,
          ...(params.businessUnitId
            ? { businessUnitId: params.businessUnitId }
            : {}),
          ...(params.warehouseId ? { warehouseId: params.warehouseId } : {}),
          active: true,
          stock: { gte: allocated },
        },
        data: { stock: { decrement: allocated } },
      });
      if (updated.count !== 1) {
        const retryError = new Error('Conflicto concurrente de inventario.');
        retryError.name = 'HCELM_INVENTORY_RETRY';
        throw retryError;
      }

      const movement = await tx.medicationInventoryMovement.create({
        data: {
          tenantId: params.tenantId,
          companyId: lot.companyId,
          businessUnitId: lot.businessUnitId,
          warehouseId: lot.warehouseId,
          medicationId: params.medicationId,
          companyMedicationId: lot.companyMedicationId,
          lotId: lot.id,
          movementType: params.movementType,
          direction: MedicationInventoryMovementDirection.OUT,
          quantity: allocated,
          stockBefore,
          stockAfter,
          unitCost: lot.purchasePrice,
          unitPrice: lot.salePrice,
          currency: lot.currency,
          operationId,
          idempotencyKey: params.idempotencyKey + ':LOT:' + lot.id,
          sourceType: params.sourceType,
          sourceId: params.sourceId,
          sourceLineId: params.sourceLineId || null,
          reason: params.reason,
          createdById: params.userId,
          metadata: {
            strategy: 'FEFO',
            prescriptionId: params.prescriptionId || null,
            lotNumber: lot.lotNumber,
          },
        },
      });
      movements.push(movement);
      remaining = remaining.minus(allocated);
    }

    return { operationId, movements, idempotent: false };
  }

  async listKardex(params: {
    tenantId: string;
    medicationId?: string;
    lotId?: string;
    page?: number;
    pageSize?: number;
  }) {
    const page = Math.max(1, Math.trunc(params.page || 1));
    const pageSize = Math.min(
      100,
      Math.max(10, Math.trunc(params.pageSize || 50)),
    );
    const where: Prisma.MedicationInventoryMovementWhereInput = {
      tenantId: params.tenantId,
      ...(params.medicationId ? { medicationId: params.medicationId } : {}),
      ...(params.lotId ? { lotId: params.lotId } : {}),
    };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.medicationInventoryMovement.count({ where }),
      this.prisma.medicationInventoryMovement.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          medication: {
            select: {
              id: true,
              internalCode: true,
              genericName: true,
              commercialName: true,
              concentration: true,
              presentation: true,
            },
          },
          lot: {
            select: {
              id: true,
              lotNumber: true,
              expirationDate: true,
            },
          },
          company: { select: { id: true, code: true, legalName: true } },
          businessUnit: { select: { id: true, code: true, name: true } },
          warehouse: { select: { id: true, code: true, name: true } },
          createdBy: { select: { id: true, fullName: true, email: true } },
        },
      }),
    ]);

    return {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      items,
    };
  }

  private positiveQuantity(value: number | string) {
    let quantity: Prisma.Decimal;
    try {
      quantity = new Prisma.Decimal(value);
    } catch {
      throw new BadRequestException('La cantidad solicitada no es valida.');
    }
    if (!quantity.isFinite() || quantity.lte(0)) {
      throw new BadRequestException('La cantidad debe ser mayor que cero.');
    }
    return quantity;
  }

  private async findActiveCompanyId(
    client: any,
    tenantId: string,
    userId: string | null,
  ): Promise<string> {
    const membership = userId
      ? await client.userCompanyMembership.findFirst({
          where: {
            tenantId,
            userId,
            active: true,
            company: { active: true },
          },
          orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
          select: { companyId: true },
        })
      : null;
    if (membership) return membership.companyId;

    const company = await client.company.findFirst({
      where: { tenantId, active: true },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
      select: { id: true },
    });
    if (!company) {
      throw new ConflictException(
        'No existe una empresa activa para inventario.',
      );
    }
    return company.id;
  }

  private async upsertLotInTransaction(
    tx: TransactionClient,
    params: UpsertLotParams,
  ) {
    const priorMovement = await tx.medicationInventoryMovement.findUnique({
      where: {
        tenantId_idempotencyKey: {
          tenantId: params.tenantId,
          idempotencyKey: params.idempotencyKey,
        },
      },
      include: { lot: true },
    });

    if (priorMovement) {
      return {
        lot: priorMovement.lot,
        movement: priorMovement,
        idempotent: true,
      };
    }

    const medication = await tx.medication.findFirst({
      where: { id: params.medicationId, tenantId: params.tenantId },
      select: {
        id: true,
        internalCode: true,
        barcode: true,
        active: true,
      },
    });
    if (!medication) throw new NotFoundException('Producto no encontrado.');
    if (!medication.active)
      throw new BadRequestException('El producto esta inactivo.');

    const scope = await this.resolveScope(tx, params, medication);
    const existing = await tx.medicationInventoryLot.findUnique({
      where: {
        tenantId_medicationId_businessUnit_warehouse_lotNumber: {
          tenantId: params.tenantId,
          medicationId: params.medicationId,
          businessUnit: params.businessUnit,
          warehouse: params.warehouse,
          lotNumber: params.lotNumber,
        },
      },
    });

    const stockBefore = new Prisma.Decimal(existing?.stock || 0);
    const stockAfter = new Prisma.Decimal(params.lotData.stock || 0);
    if (stockAfter.isNegative()) {
      throw new BadRequestException('El stock no puede ser negativo.');
    }

    const { stock: _discardedStock, ...lotMetadata } = params.lotData;
    const scopedData = {
      ...lotMetadata,
      businessUnit: params.businessUnit,
      warehouse: params.warehouse,
      lotNumber: params.lotNumber,
      stock: stockAfter,
      companyId: scope.companyId,
      businessUnitId: scope.businessUnitId,
      warehouseId: scope.warehouseId,
      companyMedicationId: scope.companyMedicationId,
    };

    const lot = existing
      ? await tx.medicationInventoryLot.update({
          where: { id: existing.id },
          data: scopedData,
        })
      : await tx.medicationInventoryLot.create({
          data: {
            tenantId: params.tenantId,
            medicationId: params.medicationId,
            createdById: params.userId,
            ...scopedData,
          },
        });

    const delta = stockAfter.minus(stockBefore);
    if (
      existing &&
      !delta.isZero() &&
      params.sourceType === 'MANUAL_LOT' &&
      !params.reason.trim()
    ) {
      throw new BadRequestException(
        'Debe indicar el motivo del ajuste de stock para un lote existente.',
      );
    }
    if (delta.isZero()) return { lot, movement: null, idempotent: false };

    const direction = delta.isPositive()
      ? MedicationInventoryMovementDirection.IN
      : MedicationInventoryMovementDirection.OUT;
    const movementType = !existing
      ? MedicationInventoryMovementType.INITIAL_STOCK
      : delta.isPositive()
        ? MedicationInventoryMovementType.POSITIVE_ADJUSTMENT
        : MedicationInventoryMovementType.NEGATIVE_ADJUSTMENT;

    const movement = await tx.medicationInventoryMovement.create({
      data: {
        tenantId: params.tenantId,
        companyId: scope.companyId,
        businessUnitId: scope.businessUnitId,
        warehouseId: scope.warehouseId,
        medicationId: params.medicationId,
        companyMedicationId: scope.companyMedicationId,
        lotId: lot.id,
        movementType,
        direction,
        quantity: delta.abs(),
        stockBefore,
        stockAfter,
        unitCost: lot.purchasePrice,
        unitPrice: lot.salePrice,
        currency: lot.currency,
        operationId: params.operationId || randomUUID(),
        idempotencyKey: params.idempotencyKey,
        sourceType: params.sourceType,
        sourceId: params.sourceId || null,
        sourceLineId: params.sourceLineId || null,
        reason:
          params.reason ||
          (!existing
            ? 'Registro manual de stock inicial'
            : 'Ajuste manual de inventario'),
        createdById: params.userId,
        metadata: {
          businessUnitCode: params.businessUnit,
          warehouseCode: params.warehouse,
          lotNumber: params.lotNumber,
        },
      },
    });

    return { lot, movement, idempotent: false };
  }

  private async resolveScope(
    tx: TransactionClient,
    params: Pick<
      UpsertLotParams,
      | 'tenantId'
      | 'userId'
      | 'medicationId'
      | 'businessUnit'
      | 'warehouse'
      | 'scopeCache'
    >,
    medication: {
      id: string;
      internalCode: string | null;
      barcode: string | null;
    },
  ): Promise<InventoryScope> {
    const cacheKey = [
      params.tenantId,
      params.userId || '',
      params.medicationId,
      params.businessUnit,
      params.warehouse,
    ].join('|');
    const cached = params.scopeCache?.get(cacheKey);
    if (cached) return cached;

    const membership = params.userId
      ? await tx.userCompanyMembership.findFirst({
          where: {
            tenantId: params.tenantId,
            userId: params.userId,
            active: true,
            company: { active: true },
          },
          orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
          select: { companyId: true },
        })
      : null;

    const company = membership
      ? await tx.company.findFirst({
          where: {
            id: membership.companyId,
            tenantId: params.tenantId,
            active: true,
          },
          select: { id: true },
        })
      : await tx.company.findFirst({
          where: { tenantId: params.tenantId, active: true },
          orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
          select: { id: true },
        });

    if (!company) {
      throw new ConflictException(
        'No existe una empresa activa para registrar inventario.',
      );
    }

    const businessUnit = await tx.businessUnit.upsert({
      where: {
        companyId_code: {
          companyId: company.id,
          code: params.businessUnit,
        },
      },
      update: { active: true },
      create: {
        tenantId: params.tenantId,
        companyId: company.id,
        code: params.businessUnit,
        name: params.businessUnit,
        type: params.businessUnit,
        active: true,
      },
      select: { id: true },
    });

    const warehouse = await tx.warehouse.upsert({
      where: {
        businessUnitId_code: {
          businessUnitId: businessUnit.id,
          code: params.warehouse,
        },
      },
      update: { active: true },
      create: {
        tenantId: params.tenantId,
        companyId: company.id,
        businessUnitId: businessUnit.id,
        code: params.warehouse,
        name: params.warehouse,
        active: true,
      },
      select: { id: true },
    });

    const companyMedication = await tx.companyMedication.upsert({
      where: {
        companyId_medicationId: {
          companyId: company.id,
          medicationId: medication.id,
        },
      },
      update: { active: true },
      create: {
        tenantId: params.tenantId,
        companyId: company.id,
        medicationId: medication.id,
        companySku: medication.internalCode,
        barcode: medication.barcode,
        active: true,
      },
      select: { id: true },
    });

    const scope = {
      companyId: company.id,
      businessUnitId: businessUnit.id,
      warehouseId: warehouse.id,
      companyMedicationId: companyMedication.id,
    };
    params.scopeCache?.set(cacheKey, scope);
    return scope;
  }

  private async runSerializable<T>(
    operation: (tx: TransactionClient) => Promise<T>,
  ): Promise<T> {
    const maxRetries = 4;

    for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
      try {
        return await this.prisma.$transaction(operation, {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          maxWait: 5_000,
          timeout: 20_000,
        });
      } catch (error) {
        const retryable =
          (error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === 'P2034') ||
          (error instanceof Error && error.name === 'HCELM_INVENTORY_RETRY');
        if (!retryable || attempt === maxRetries) throw error;
      }
    }

    throw new ConflictException(
      'No se pudo completar la operacion de inventario.',
    );
  }
}
