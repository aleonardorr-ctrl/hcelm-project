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
  businessUnitCode: string;
  warehouseCode: string;
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
    return this.buildFefoPricingPreviewInTransaction(
      this.prisma as unknown as TransactionClient,
      params,
    );
  }

  async buildFefoPricingPreviewInTransaction(
    tx: TransactionClient,
    params: {
      tenantId: string;
      userId: string | null;
      medicationId: string;
      businessUnit: string;
      warehouse: string;
      quantity: number | string;
      companyId?: string;
      businessUnitId?: string;
      warehouseId?: string;
    },
  ) {
    const quantity = this.positiveQuantity(params.quantity);

    const medication = await tx.medication.findFirst({
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
        internalCode: true,
        barcode: true,
      },
    });

    if (!medication) {
      throw new NotFoundException('Producto no encontrado o inactivo.');
    }

    const scope = await this.resolveScope(
      tx,
      {
        tenantId: params.tenantId,
        userId: params.userId,
        medicationId: params.medicationId,
        businessUnit: params.businessUnit,
        warehouse: params.warehouse,
      },
      medication,
    );

    if (
      (params.companyId && params.companyId !== scope.companyId) ||
      (params.businessUnitId &&
        params.businessUnitId !== scope.businessUnitId) ||
      (params.warehouseId && params.warehouseId !== scope.warehouseId)
    ) {
      throw new ConflictException(
        'El contexto solicitado no coincide con la instalación activa de Farmacia.',
      );
    }

    const rules = await this.loadFefoRules(
      tx,
      params.tenantId,
      scope.companyId,
      scope.businessUnitId,
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lots = await tx.medicationInventoryLot.findMany({
      where: {
        tenantId: params.tenantId,
        companyId: scope.companyId,
        businessUnitId: scope.businessUnitId,
        warehouseId: scope.warehouseId,
        medicationId: params.medicationId,
        businessUnit: scope.businessUnitCode,
        warehouse: scope.warehouseCode,
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

        const pricing = this.calculateFefoLotPricing({
          expirationDate: lot.expirationDate,
          salePrice: lot.salePrice,
          purchasePrice: lot.purchasePrice,
          rules,
          today,
        });

        return {
          lotId: lot.id,
          lotNumber: lot.lotNumber,
          expirationDate: lot.expirationDate,
          availableStock: available,
          allocatedQuantity: allocated,
          currency: lot.currency,
          purchasePrice: lot.purchasePrice,
          originalSalePrice: pricing.originalSalePrice,
          configuredDiscountPercent: pricing.configuredDiscountPercent,
          appliedDiscountPercent: pricing.appliedDiscountPercent,
          discountLimitedByCost: pricing.discountLimitedByCost,
          finalSalePrice: pricing.finalSalePrice,
          salePrice: pricing.finalSalePrice,
          fefoRuleKey: pricing.ruleKey,
          fefoRuleLabel: pricing.ruleLabel,
          fefoAction: pricing.action,
          requiresAuthorization: pricing.requiresAuthorization,
          blockedReason: pricing.blockedReason,
          originalSubtotal: pricing.originalSalePrice
            ? allocated.mul(pricing.originalSalePrice).toDecimalPlaces(4)
            : null,
          discountAmount:
            pricing.originalSalePrice && pricing.finalSalePrice
              ? allocated
                  .mul(pricing.originalSalePrice.minus(pricing.finalSalePrice))
                  .toDecimalPlaces(4)
              : null,
          finalSubtotal: pricing.finalSalePrice
            ? allocated.mul(pricing.finalSalePrice).toDecimalPlaces(4)
            : null,
        };
      })
      .filter((item) => item.allocatedQuantity.gt(0));

    const availableQuantity = lots.reduce(
      (total, lot) => total.plus(lot.stock),
      new Prisma.Decimal(0),
    );

    const requiresAuthorization = allocations.some(
      (allocation) => allocation.requiresAuthorization,
    );

    const blockedReasons = Array.from(
      new Set(
        allocations
          .map((allocation) => allocation.blockedReason)
          .filter((value): value is string => Boolean(value)),
      ),
    );

    const originalTotal = allocations.reduce(
      (total, allocation) =>
        allocation.originalSubtotal
          ? total.plus(allocation.originalSubtotal)
          : total,
      new Prisma.Decimal(0),
    );

    const discountTotal = allocations.reduce(
      (total, allocation) =>
        allocation.discountAmount
          ? total.plus(allocation.discountAmount)
          : total,
      new Prisma.Decimal(0),
    );

    const finalTotal = allocations.reduce(
      (total, allocation) =>
        allocation.finalSubtotal ? total.plus(allocation.finalSubtotal) : total,
      new Prisma.Decimal(0),
    );

    const hasMissingPrice = allocations.some(
      (allocation) => !allocation.originalSalePrice,
    );

    return {
      medication,
      scope: {
        companyId: scope.companyId,
        businessUnitId: scope.businessUnitId,
        warehouseId: scope.warehouseId,
        businessUnit: scope.businessUnitCode,
        warehouse: scope.warehouseCode,
      },
      requestedQuantity: quantity,
      availableQuantity,
      sufficientStock: remaining.isZero(),
      missingQuantity: remaining,
      strategy: 'FEFO',
      pricingAuthority: 'SERVER',
      requiresAuthorization,
      blocked: requiresAuthorization || hasMissingPrice,
      blockedReasons,
      originalTotal: originalTotal.toDecimalPlaces(4),
      discountTotal: discountTotal.toDecimalPlaces(4),
      finalTotal: finalTotal.toDecimalPlaces(4),
      allocations,
    };
  }

  private async loadFefoRules(
    tx: TransactionClient,
    tenantId: string,
    companyId: string,
    businessUnitId: string,
  ) {
    const storedRules = await tx.pharmacyFefoRule.findMany({
      where: {
        tenantId,
        companyId,
        businessUnitId,
        active: true,
      },
      orderBy: [{ displayOrder: 'asc' }, { minDays: 'asc' }],
      select: {
        ruleKey: true,
        label: true,
        minDays: true,
        maxDays: true,
        discountPercent: true,
        action: true,
      },
    });

    if (storedRules.length) {
      return storedRules.map((rule) => ({
        ruleKey: rule.ruleKey,
        label: rule.label,
        minDays: rule.minDays,
        maxDays: rule.maxDays,
        discountPercent: new Prisma.Decimal(rule.discountPercent),
        action: rule.action,
      }));
    }

    return [
      {
        ruleKey: 'CRITICAL',
        label: 'Vencimiento crítico',
        minDays: 0,
        maxDays: 30,
        discountPercent: new Prisma.Decimal(20),
        action: 'REQUIRE_AUTHORIZATION',
      },
      {
        ruleKey: 'PROMOTION',
        label: 'Promoción FEFO',
        minDays: 31,
        maxDays: 90,
        discountPercent: new Prisma.Decimal(15),
        action: 'SUGGEST_DISCOUNT',
      },
      {
        ruleKey: 'WATCH',
        label: 'Vigilar rotación',
        minDays: 91,
        maxDays: 180,
        discountPercent: new Prisma.Decimal(0),
        action: 'ALERT',
      },
      {
        ruleKey: 'NORMAL',
        label: 'Vencimiento normal',
        minDays: 181,
        maxDays: null,
        discountPercent: new Prisma.Decimal(0),
        action: 'NORMAL',
      },
    ];
  }

  private calculateFefoLotPricing(params: {
    expirationDate: Date | null;
    salePrice: Prisma.Decimal | null;
    purchasePrice: Prisma.Decimal | null;
    rules: Array<{
      ruleKey: string;
      label: string;
      minDays: number;
      maxDays: number | null;
      discountPercent: Prisma.Decimal;
      action: string;
    }>;
    today: Date;
  }) {
    const originalSalePrice = params.salePrice
      ? new Prisma.Decimal(params.salePrice)
      : null;

    if (!originalSalePrice || originalSalePrice.lte(0)) {
      return {
        ruleKey: 'UNKNOWN',
        ruleLabel: 'Precio no configurado',
        action: 'BLOCK',
        configuredDiscountPercent: new Prisma.Decimal(0),
        appliedDiscountPercent: new Prisma.Decimal(0),
        discountLimitedByCost: false,
        originalSalePrice: null,
        finalSalePrice: null,
        requiresAuthorization: false,
        blockedReason: 'El lote FEFO no tiene precio de venta válido.',
      };
    }

    const daysUntilExpiration = params.expirationDate
      ? Math.ceil(
          (params.expirationDate.getTime() - params.today.getTime()) /
            (1000 * 60 * 60 * 24),
        )
      : null;

    const matchedRule =
      daysUntilExpiration === null
        ? null
        : params.rules.find((rule) => {
            const meetsMinimum = daysUntilExpiration >= rule.minDays;
            const meetsMaximum =
              rule.maxDays === null || daysUntilExpiration <= rule.maxDays;
            return meetsMinimum && meetsMaximum;
          });

    if (!matchedRule) {
      return {
        ruleKey: 'UNKNOWN',
        ruleLabel: 'Sin regla aplicable',
        action: 'NORMAL',
        configuredDiscountPercent: new Prisma.Decimal(0),
        appliedDiscountPercent: new Prisma.Decimal(0),
        discountLimitedByCost: false,
        originalSalePrice,
        finalSalePrice: originalSalePrice,
        requiresAuthorization: false,
        blockedReason: null,
      };
    }

    const requiresAuthorization =
      matchedRule.action === 'REQUIRE_AUTHORIZATION';

    if (requiresAuthorization) {
      return {
        ruleKey: matchedRule.ruleKey,
        ruleLabel: matchedRule.label,
        action: matchedRule.action,
        configuredDiscountPercent: matchedRule.discountPercent,
        appliedDiscountPercent: new Prisma.Decimal(0),
        discountLimitedByCost: false,
        originalSalePrice,
        finalSalePrice: originalSalePrice,
        requiresAuthorization: true,
        blockedReason:
          'Este lote está en rango crítico y requiere autorización administrativa.',
      };
    }

    const configuredDiscount = Prisma.Decimal.max(
      new Prisma.Decimal(0),
      Prisma.Decimal.min(matchedRule.discountPercent, new Prisma.Decimal(100)),
    );

    let finalSalePrice = originalSalePrice
      .mul(new Prisma.Decimal(100).minus(configuredDiscount))
      .div(100)
      .toDecimalPlaces(4, Prisma.Decimal.ROUND_HALF_UP);

    let discountLimitedByCost = false;

    if (params.purchasePrice) {
      const purchasePrice = new Prisma.Decimal(params.purchasePrice);

      if (purchasePrice.gt(0) && finalSalePrice.lt(purchasePrice)) {
        finalSalePrice = purchasePrice.toDecimalPlaces(
          4,
          Prisma.Decimal.ROUND_HALF_UP,
        );
        discountLimitedByCost = true;
      }
    }

    const appliedDiscountPercent = originalSalePrice.isZero()
      ? new Prisma.Decimal(0)
      : originalSalePrice
          .minus(finalSalePrice)
          .div(originalSalePrice)
          .mul(100)
          .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);

    return {
      ruleKey: matchedRule.ruleKey,
      ruleLabel: matchedRule.label,
      action: matchedRule.action,
      configuredDiscountPercent: configuredDiscount,
      appliedDiscountPercent,
      discountLimitedByCost,
      originalSalePrice,
      finalSalePrice,
      requiresAuthorization: false,
      blockedReason: null,
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
    const scopedBusinessUnit = scope.businessUnitCode;
    const scopedWarehouse = scope.warehouseCode;
    const existing = await tx.medicationInventoryLot.findUnique({
      where: {
        tenantId_medicationId_businessUnit_warehouse_lotNumber: {
          tenantId: params.tenantId,
          medicationId: params.medicationId,
          businessUnit: scopedBusinessUnit,
          warehouse: scopedWarehouse,
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
      businessUnit: scopedBusinessUnit,
      warehouse: scopedWarehouse,
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
          businessUnitCode: scopedBusinessUnit,
          warehouseCode: scopedWarehouse,
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
    const requestedBusinessUnit = String(params.businessUnit || 'BOTICA')
      .trim()
      .toUpperCase();
    const requestedWarehouse = String(params.warehouse || 'PRINCIPAL')
      .trim()
      .toUpperCase();
    const isPharmacyAlias = ['BOTICA', 'FARMACIA', 'PHARMACY'].includes(
      requestedBusinessUnit,
    );
    const normalizedBusinessUnit = isPharmacyAlias
      ? 'BOTICA'
      : requestedBusinessUnit;
    const normalizedWarehouse = requestedWarehouse || 'PRINCIPAL';
    const cacheKey = [
      params.tenantId,
      params.userId || '',
      params.medicationId,
      normalizedBusinessUnit,
      normalizedWarehouse,
    ].join('|');
    const cached = params.scopeCache?.get(cacheKey);
    if (cached) return cached;

    let organizationalScope: {
      companyId: string;
      businessUnitId: string;
      warehouseId: string;
      businessUnitCode: string;
      warehouseCode: string;
    } | null = null;

    if (isPharmacyAlias) {
      const memberships = params.userId
        ? await tx.userCompanyMembership.findMany({
            where: {
              tenantId: params.tenantId,
              userId: params.userId,
              active: true,
              company: { active: true },
            },
            select: { companyId: true },
          })
        : [];
      const allowedCompanyIds = memberships.map(
        (item: { companyId: string }) => item.companyId,
      );
      const findInstallation = (companyIds?: string[]) =>
        tx.companyModuleInstallation.findFirst({
          where: {
            tenantId: params.tenantId,
            moduleKey: 'PHARMACY',
            active: true,
            businessUnit: { active: true },
            warehouse: { is: { active: true } },
            ...(companyIds?.length ? { companyId: { in: companyIds } } : {}),
          },
          orderBy: [{ createdAt: 'asc' }],
          select: {
            companyId: true,
            businessUnit: { select: { id: true, code: true } },
            warehouse: { select: { id: true, code: true } },
          },
        });

      const installation =
        (await findInstallation(allowedCompanyIds)) ||
        (await findInstallation());

      if (!installation?.businessUnit || !installation?.warehouse) {
        throw new ConflictException(
          'No existe una instalacion activa del modulo Farmacia/Botica con almacen activo.',
        );
      }

      organizationalScope = {
        companyId: installation.companyId,
        businessUnitId: installation.businessUnit.id,
        warehouseId: installation.warehouse.id,
        businessUnitCode: installation.businessUnit.code,
        warehouseCode: installation.warehouse.code,
      };
    } else {
      const companyId = await this.findActiveCompanyId(
        tx,
        params.tenantId,
        params.userId,
      );
      const businessUnit = await tx.businessUnit.findFirst({
        where: {
          tenantId: params.tenantId,
          companyId,
          code: normalizedBusinessUnit,
          active: true,
        },
        select: { id: true, code: true },
      });
      if (!businessUnit) {
        throw new NotFoundException(
          'Unidad de negocio no encontrada o inactiva para inventario.',
        );
      }
      const warehouse = await tx.warehouse.findFirst({
        where: {
          tenantId: params.tenantId,
          companyId,
          businessUnitId: businessUnit.id,
          code: normalizedWarehouse,
          active: true,
        },
        select: { id: true, code: true },
      });
      if (!warehouse) {
        throw new NotFoundException(
          'Almacen no encontrado o inactivo para inventario.',
        );
      }
      organizationalScope = {
        companyId,
        businessUnitId: businessUnit.id,
        warehouseId: warehouse.id,
        businessUnitCode: businessUnit.code,
        warehouseCode: warehouse.code,
      };
    }

    const companyMedication = await tx.companyMedication.upsert({
      where: {
        companyId_medicationId: {
          companyId: organizationalScope.companyId,
          medicationId: medication.id,
        },
      },
      update: { active: true },
      create: {
        tenantId: params.tenantId,
        companyId: organizationalScope.companyId,
        medicationId: medication.id,
        companySku: medication.internalCode,
        barcode: medication.barcode,
        active: true,
      },
      select: { id: true },
    });

    const inventoryScope: InventoryScope = {
      ...organizationalScope,
      companyMedicationId: companyMedication.id,
    };
    params.scopeCache?.set(cacheKey, inventoryScope);
    return inventoryScope;
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
