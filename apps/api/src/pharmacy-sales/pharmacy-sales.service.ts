import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  MedicationInventoryMovementType,
  PharmacyDocumentType,
  PharmacyPaymentMethod,
  PharmacyPaymentStatus,
  PharmacySaleStatus,
  PharmacySaleType,
  Prisma,
} from '@prisma/client';
import { randomUUID } from 'crypto';
import { MedicationInventoryService } from '../medication-catalog/medication-inventory.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePharmacySaleDto } from './dto/create-pharmacy-sale.dto';

type TransactionClient = Prisma.TransactionClient;

@Injectable()
export class PharmacySalesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryService: MedicationInventoryService,
  ) {}

  async createOtcSale(params: {
    tenantId: string;
    userId: string;
    data: CreatePharmacySaleDto;
  }) {
    return this.runSerializable(async (tx) => {
      const duplicate = await tx.pharmacySale.findUnique({
        where: {
          tenantId_idempotencyKey: {
            tenantId: params.tenantId,
            idempotencyKey: params.data.idempotencyKey.trim(),
          },
        },
        include: this.saleInclude,
      });
      if (duplicate) {
        if (duplicate.createdById !== params.userId) {
          throw new ConflictException(
            'La clave de idempotencia ya pertenece a otra operacion.',
          );
        }
        return { sale: duplicate, idempotent: true };
      }

      const user = await tx.user.findFirst({
        where: {
          id: params.userId,
          tenantId: params.tenantId,
          active: true,
        },
        select: { id: true },
      });
      if (!user) throw new UnauthorizedException('Usuario no autorizado.');

      const scope = await this.resolveScope(
        tx,
        params.tenantId,
        params.userId,
        params.data.businessUnit,
        params.data.warehouse,
      );
      const patient = params.data.patientId
        ? await tx.patient.findFirst({
            where: {
              id: params.data.patientId,
              tenantId: params.tenantId,
            },
            select: {
              id: true,
              fullName: true,
              documentType: true,
              documentNumber: true,
            },
          })
        : null;
      if (params.data.patientId && !patient) {
        throw new NotFoundException('Paciente no encontrado en esta empresa.');
      }

      const uniqueMedicationIds = new Set(
        params.data.items.map((item) => item.medicationId),
      );
      if (uniqueMedicationIds.size !== params.data.items.length) {
        throw new BadRequestException(
          'Cada producto debe aparecer una sola vez en el carrito.',
        );
      }

      const sequence = await tx.pharmacyDocumentSequence.upsert({
        where: {
          companyId_businessUnitId_warehouseId_documentType_series: {
            companyId: scope.companyId,
            businessUnitId: scope.businessUnitId,
            warehouseId: scope.warehouseId,
            documentType: PharmacyDocumentType.INTERNAL_SALE,
            series: 'V001',
          },
        },
        update: { currentNumber: { increment: 1 }, active: true },
        create: {
          tenantId: params.tenantId,
          companyId: scope.companyId,
          businessUnitId: scope.businessUnitId,
          warehouseId: scope.warehouseId,
          documentType: PharmacyDocumentType.INTERNAL_SALE,
          series: 'V001',
          currentNumber: 1,
          active: true,
        },
      });
      const saleId = randomUUID();
      const saleNumber =
        sequence.series + '-' + String(sequence.currentNumber).padStart(8, '0');

      await tx.pharmacySale.create({
        data: {
          id: saleId,
          tenantId: params.tenantId,
          companyId: scope.companyId,
          businessUnitId: scope.businessUnitId,
          warehouseId: scope.warehouseId,
          saleNumber,
          series: sequence.series,
          sequenceNumber: sequence.currentNumber,
          saleType: PharmacySaleType.OTC,
          status: PharmacySaleStatus.COMPLETED,
          patientId: patient?.id || null,
          customerName:
            params.data.customerName?.trim() || patient?.fullName || null,
          customerDocumentType:
            params.data.customerDocumentType?.trim() ||
            patient?.documentType ||
            null,
          customerDocumentNumber:
            params.data.customerDocumentNumber?.trim() ||
            patient?.documentNumber ||
            null,
          currency: 'PEN',
          subtotal: 0,
          discountTotal: 0,
          taxTotal: 0,
          total: 0,
          paymentStatus: PharmacyPaymentStatus.PAID,
          idempotencyKey: params.data.idempotencyKey.trim(),
          notes: params.data.notes?.trim() || null,
          createdById: params.userId,
        },
      });

      let saleSubtotal = new Prisma.Decimal(0);
      for (let index = 0; index < params.data.items.length; index += 1) {
        const input = params.data.items[index];
        const medication = await tx.medication.findFirst({
          where: {
            id: input.medicationId,
            tenantId: params.tenantId,
            active: true,
          },
          include: {
            companyProfiles: {
              where: { companyId: scope.companyId, active: true },
              take: 1,
            },
          },
        });
        if (!medication || !medication.companyProfiles[0]) {
          throw new NotFoundException(
            'Producto no encontrado o no habilitado para la empresa activa.',
          );
        }
        if (medication.requiresPrescription) {
          throw new BadRequestException(
            'El producto ' +
              medication.genericName +
              ' requiere receta. La venta OTC fue bloqueada.',
          );
        }

        const saleItemId = randomUUID();
        const inventoryResult =
          await this.inventoryService.decreaseStockFefoInTransaction(tx, {
            tenantId: params.tenantId,
            userId: params.userId,
            medicationId: medication.id,
            businessUnit: scope.businessUnitCode,
            warehouse: scope.warehouseCode,
            companyId: scope.companyId,
            businessUnitId: scope.businessUnitId,
            warehouseId: scope.warehouseId,
            quantity: input.quantity,
            movementType: MedicationInventoryMovementType.SALE,
            idempotencyKey: 'SALE:' + saleId + ':ITEM:' + String(index + 1),
            sourceType: 'PHARMACY_SALE',
            sourceId: saleId,
            sourceLineId: saleItemId,
            reason: 'Venta OTC ' + saleNumber,
          });

        const lotIds = inventoryResult.movements.map(
          (movement) => movement.lotId,
        );
        const lots = await tx.medicationInventoryLot.findMany({
          where: { id: { in: lotIds }, tenantId: params.tenantId },
          select: { id: true, lotNumber: true, expirationDate: true },
        });
        const lotsById = new Map(lots.map((lot) => [lot.id, lot]));

        let lineSubtotal = new Prisma.Decimal(0);
        for (const movement of inventoryResult.movements) {
          if (
            movement.companyId !== scope.companyId ||
            movement.businessUnitId !== scope.businessUnitId ||
            movement.warehouseId !== scope.warehouseId
          ) {
            throw new ConflictException(
              'La asignacion FEFO no pertenece al contexto de la venta.',
            );
          }
          if (
            !movement.unitPrice ||
            new Prisma.Decimal(movement.unitPrice).lte(0)
          ) {
            throw new ConflictException(
              'Todos los lotes vendidos deben tener un precio de venta mayor que cero.',
            );
          }
          lineSubtotal = lineSubtotal.plus(
            new Prisma.Decimal(movement.quantity).mul(movement.unitPrice),
          );
        }
        lineSubtotal = lineSubtotal.toDecimalPlaces(4);
        const quantity = new Prisma.Decimal(input.quantity);
        const weightedUnitPrice = lineSubtotal.div(quantity).toDecimalPlaces(4);

        await tx.pharmacySaleItem.create({
          data: {
            id: saleItemId,
            tenantId: params.tenantId,
            saleId,
            medicationId: medication.id,
            companyMedicationId: medication.companyProfiles[0].id,
            companySku: medication.companyProfiles[0].companySku,
            genericName: medication.genericName,
            commercialName: medication.commercialName,
            concentration: medication.concentration,
            presentation: medication.presentation,
            quantity,
            unitPrice: weightedUnitPrice,
            discountPercent: 0,
            discountAmount: 0,
            taxAmount: 0,
            subtotal: lineSubtotal,
            total: lineSubtotal,
            requiresPrescription: false,
            priceOverride: false,
          },
        });

        for (const movement of inventoryResult.movements) {
          const lot = lotsById.get(movement.lotId);
          if (!lot)
            throw new ConflictException('No se pudo auditar el lote FEFO.');
          await tx.pharmacySaleItemAllocation.create({
            data: {
              tenantId: params.tenantId,
              saleItemId,
              lotId: movement.lotId,
              inventoryMovementId: movement.id,
              lotNumber: lot.lotNumber,
              expirationDate: lot.expirationDate,
              quantity: movement.quantity,
              unitCost: movement.unitCost,
              unitPrice: movement.unitPrice!,
            },
          });
        }
        saleSubtotal = saleSubtotal.plus(lineSubtotal);
      }

      saleSubtotal = saleSubtotal.toDecimalPlaces(
        4,
        Prisma.Decimal.ROUND_HALF_UP,
      );
      if (saleSubtotal.lte(0)) {
        throw new ConflictException(
          'El total de la venta debe ser mayor que cero.',
        );
      }
      const paymentData = this.preparePayment(
        params.data.payment,
        saleSubtotal,
      );

      await tx.pharmacySale.update({
        where: { id: saleId },
        data: { subtotal: saleSubtotal, total: saleSubtotal },
      });
      await tx.pharmacySalePayment.create({
        data: {
          tenantId: params.tenantId,
          saleId,
          method: params.data.payment.method,
          amount: saleSubtotal,
          reference: paymentData.reference,
          receivedAmount: paymentData.receivedAmount,
          changeAmount: paymentData.changeAmount,
          idempotencyKey: 'SALE:' + saleId + ':PAYMENT:1',
          recordedById: params.userId,
        },
      });

      const sale = await tx.pharmacySale.findUniqueOrThrow({
        where: { id: saleId },
        include: this.saleInclude,
      });
      return { sale, idempotent: false };
    });
  }

  async list(params: {
    tenantId: string;
    userId: string;
    page?: number;
    pageSize?: number;
  }) {
    const companyId = await this.findActiveCompanyId(
      this.prisma,
      params.tenantId,
      params.userId,
    );
    const page = Math.max(1, Math.trunc(params.page || 1));
    const pageSize = Math.min(
      100,
      Math.max(10, Math.trunc(params.pageSize || 20)),
    );
    const where: Prisma.PharmacySaleWhereInput = {
      tenantId: params.tenantId,
      companyId,
    };
    const [total, items] = await this.prisma.$transaction([
      this.prisma.pharmacySale.count({ where }),
      this.prisma.pharmacySale.findMany({
        where,
        orderBy: [{ completedAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: this.saleInclude,
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

  async findOne(params: { tenantId: string; userId: string; id: string }) {
    const companyId = await this.findActiveCompanyId(
      this.prisma,
      params.tenantId,
      params.userId,
    );
    const sale = await this.prisma.pharmacySale.findFirst({
      where: { id: params.id, tenantId: params.tenantId, companyId },
      include: this.saleInclude,
    });
    if (!sale) throw new NotFoundException('Venta no encontrada.');
    return sale;
  }

  private preparePayment(
    payment: CreatePharmacySaleDto['payment'],
    total: Prisma.Decimal,
  ) {
    const reference = payment.reference?.trim() || null;
    const requiresReference =
      payment.method === PharmacyPaymentMethod.CARD ||
      payment.method === PharmacyPaymentMethod.YAPE ||
      payment.method === PharmacyPaymentMethod.PLIN ||
      payment.method === PharmacyPaymentMethod.BANK_TRANSFER;
    if (requiresReference && !reference) {
      throw new BadRequestException(
        'El medio de pago seleccionado requiere un numero de operacion.',
      );
    }
    if (payment.method !== PharmacyPaymentMethod.CASH) {
      if (payment.receivedAmount !== undefined) {
        throw new BadRequestException(
          'El monto recibido solo corresponde a pagos en efectivo.',
        );
      }
      return { reference, receivedAmount: null, changeAmount: null };
    }

    const received = new Prisma.Decimal(payment.receivedAmount ?? total);
    if (received.lt(total)) {
      throw new BadRequestException(
        'El efectivo recibido es menor que el total.',
      );
    }
    return {
      reference,
      receivedAmount: received,
      changeAmount: received.minus(total).toDecimalPlaces(4),
    };
  }

  private async resolveScope(
    tx: TransactionClient,
    tenantId: string,
    userId: string,
    businessUnitValue: string,
    warehouseValue: string,
  ) {
    const companyId = await this.findActiveCompanyId(tx, tenantId, userId);
    const businessUnitCode = businessUnitValue.trim().toUpperCase();
    const warehouseCode = warehouseValue.trim().toUpperCase();
    const businessUnit = await tx.businessUnit.findFirst({
      where: { tenantId, companyId, code: businessUnitCode, active: true },
      select: { id: true, code: true },
    });
    if (!businessUnit) {
      throw new NotFoundException(
        'Unidad de negocio no encontrada o inactiva.',
      );
    }
    const warehouse = await tx.warehouse.findFirst({
      where: {
        tenantId,
        companyId,
        businessUnitId: businessUnit.id,
        code: warehouseCode,
        active: true,
      },
      select: { id: true, code: true },
    });
    if (!warehouse) {
      throw new NotFoundException('Almacen no encontrado o inactivo.');
    }
    return {
      companyId,
      businessUnitId: businessUnit.id,
      warehouseId: warehouse.id,
      businessUnitCode: businessUnit.code,
      warehouseCode: warehouse.code,
    };
  }

  private async findActiveCompanyId(
    client: any,
    tenantId: string,
    userId: string,
  ) {
    const membership = await client.userCompanyMembership.findFirst({
      where: {
        tenantId,
        userId,
        active: true,
        company: { active: true },
      },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
      select: { companyId: true },
    });
    if (!membership) {
      throw new UnauthorizedException(
        'El usuario no tiene una empresa activa asignada.',
      );
    }
    return membership.companyId;
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
          timeout: 30_000,
        });
      } catch (error) {
        const retryable =
          (error instanceof Prisma.PrismaClientKnownRequestError &&
            (error.code === 'P2034' || error.code === 'P2002')) ||
          (error instanceof Error && error.name === 'HCELM_INVENTORY_RETRY');
        if (!retryable || attempt === maxRetries) throw error;
      }
    }
    throw new ConflictException('No se pudo completar la venta.');
  }

  private readonly saleInclude = {
    company: { select: { id: true, code: true, legalName: true, ruc: true } },
    businessUnit: { select: { id: true, code: true, name: true } },
    warehouse: { select: { id: true, code: true, name: true } },
    patient: {
      select: {
        id: true,
        fullName: true,
        documentType: true,
        documentNumber: true,
      },
    },
    createdBy: { select: { id: true, fullName: true, email: true } },
    items: {
      orderBy: { createdAt: 'asc' as const },
      include: {
        allocations: {
          orderBy: { createdAt: 'asc' as const },
          include: {
            inventoryMovement: {
              select: {
                id: true,
                operationId: true,
                stockBefore: true,
                stockAfter: true,
              },
            },
          },
        },
      },
    },
    payments: { orderBy: { paidAt: 'asc' as const } },
  };
}
