import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  MedicationInventoryMovementDirection,
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
import { PharmacyFefoAuthorizationService } from '../pharmacy-fefo-authorization/pharmacy-fefo-authorization.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePharmacySaleDto } from './dto/create-pharmacy-sale.dto';
import { VoidPharmacySaleDto } from './dto/void-pharmacy-sale.dto';

type TransactionClient = Prisma.TransactionClient;

@Injectable()
export class PharmacySalesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryService: MedicationInventoryService,
    private readonly fefoAuthorizationService: PharmacyFefoAuthorizationService,
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

      const series = 'V001';

      await tx.$executeRaw`
        SELECT pg_advisory_xact_lock(
          hashtext(${scope.companyId + ':PHARMACY_SALE:' + series})
        )
      `;

      const [saleMaximum, sequenceMaximum] = await Promise.all([
        tx.pharmacySale.aggregate({
          where: {
            companyId: scope.companyId,
            series,
          },
          _max: { sequenceNumber: true },
        }),
        tx.pharmacyDocumentSequence.aggregate({
          where: {
            companyId: scope.companyId,
            documentType: PharmacyDocumentType.INTERNAL_SALE,
            series,
          },
          _max: { currentNumber: true },
        }),
      ]);

      const nextSequenceNumber =
        Math.max(
          saleMaximum._max.sequenceNumber ?? 0,
          sequenceMaximum._max.currentNumber ?? 0,
        ) + 1;

      const sequence = await tx.pharmacyDocumentSequence.upsert({
        where: {
          companyId_businessUnitId_warehouseId_documentType_series: {
            companyId: scope.companyId,
            businessUnitId: scope.businessUnitId,
            warehouseId: scope.warehouseId,
            documentType: PharmacyDocumentType.INTERNAL_SALE,
            series,
          },
        },
        update: {
          currentNumber: nextSequenceNumber,
          active: true,
        },
        create: {
          tenantId: params.tenantId,
          companyId: scope.companyId,
          businessUnitId: scope.businessUnitId,
          warehouseId: scope.warehouseId,
          documentType: PharmacyDocumentType.INTERNAL_SALE,
          series,
          currentNumber: nextSequenceNumber,
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
      });      let saleSubtotal = new Prisma.Decimal(0);
      let saleDiscountTotal = new Prisma.Decimal(0);
      let saleTotal = new Prisma.Decimal(0);

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
        }        const saleItemId = randomUUID();

        const pricingPreview =
          await this.inventoryService.buildFefoPricingPreviewInTransaction(tx, {
            tenantId: params.tenantId,
            userId: params.userId,
            medicationId: medication.id,
            businessUnit: scope.businessUnitCode,
            warehouse: scope.warehouseCode,
            companyId: scope.companyId,
            businessUnitId: scope.businessUnitId,
            warehouseId: scope.warehouseId,
            quantity: input.quantity,
          });

        if (!pricingPreview.sufficientStock) {
          throw new ConflictException(
            'Stock insuficiente para ' +
              medication.genericName +
              '. Disponible: ' +
              pricingPreview.availableQuantity.toString() +
              '.',
          );
        }
        const criticalAllocations = pricingPreview.allocations.filter(
          (allocation) => allocation.requiresAuthorization,
        );

        const nonAuthorizationBlockedReasons = Array.from(
          new Set(
            pricingPreview.allocations
              .filter(
                (allocation) =>
                  !allocation.requiresAuthorization &&
                  Boolean(allocation.blockedReason),
              )
              .map((allocation) => String(allocation.blockedReason)),
          ),
        );

        if (nonAuthorizationBlockedReasons.length > 0) {
          throw new ConflictException(
            nonAuthorizationBlockedReasons.join(' '),
          );
        }

        const suppliedAuthorizations = input.fefoAuthorizations || [];
        const validatedCriticalAuthorizations: Array<{
          authorizationId: string;
          token: string;
          lotId: string;
          quantity: Prisma.Decimal;
        }> = [];

        for (const allocation of criticalAllocations) {
          const supplied = suppliedAuthorizations.find(
            (authorization) => authorization.lotId === allocation.lotId,
          );

          if (!supplied) {
            throw new ConflictException(
              'The critical lot ' +
                allocation.lotNumber +
                ' requires an approved FEFO authorization.',
            );
          }

          const authorizedQuantity = new Prisma.Decimal(
            allocation.allocatedQuantity,
          );

          await this.fefoAuthorizationService.validateApprovedAuthorization(
            tx,
            {
              tenantId: params.tenantId,
              authorizationId: supplied.authorizationId,
              token: supplied.token,
              medicationId: medication.id,
              lotId: allocation.lotId,
              quantity: authorizedQuantity,
            },
          );

          validatedCriticalAuthorizations.push({
            authorizationId: supplied.authorizationId,
            token: supplied.token,
            lotId: allocation.lotId,
            quantity: authorizedQuantity,
          });
        }

        if (
          pricingPreview.blocked &&
          criticalAllocations.length === 0 &&
          nonAuthorizationBlockedReasons.length === 0
        ) {
          throw new ConflictException(
            pricingPreview.blockedReasons.join(' ') ||
              'The FEFO validation blocked this sale.',
          );
        }
        const previewByLotId = new Map(
          pricingPreview.allocations.map((allocation) => [
            allocation.lotId,
            allocation,
          ]),
        );

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
        let lineDiscountAmount = new Prisma.Decimal(0);
        let lineTotal = new Prisma.Decimal(0);

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

          const previewAllocation = previewByLotId.get(movement.lotId);

          if (!previewAllocation) {
            throw new ConflictException(
              'La asignación final de inventario no coincide con la revisión FEFO.',
            );
          }

          const movementQuantity = new Prisma.Decimal(movement.quantity);
          const previewQuantity = new Prisma.Decimal(
            previewAllocation.allocatedQuantity,
          );

          if (!movementQuantity.eq(previewQuantity)) {
            throw new ConflictException(
              'La cantidad final del lote no coincide con la revisión FEFO.',
            );
          }

          if (
            !previewAllocation.originalSalePrice ||
            !previewAllocation.finalSalePrice
          ) {
            throw new ConflictException(
              'El lote FEFO no tiene precios válidos para completar la venta.',
            );
          }

          const originalPrice = new Prisma.Decimal(
            previewAllocation.originalSalePrice,
          );
          const finalPrice = new Prisma.Decimal(
            previewAllocation.finalSalePrice,
          );

          if (originalPrice.lte(0) || finalPrice.lte(0)) {
            throw new ConflictException(
              'Todos los precios FEFO deben ser mayores que cero.',
            );
          }

          if (
            movement.unitCost &&
            new Prisma.Decimal(movement.unitCost).gt(0) &&
            finalPrice.lt(new Prisma.Decimal(movement.unitCost))
          ) {
            throw new ConflictException(
              'La política FEFO intentó vender un lote por debajo de su costo.',
            );
          }

          const originalAmount = movementQuantity
            .mul(originalPrice)
            .toDecimalPlaces(4, Prisma.Decimal.ROUND_HALF_UP);
          const finalAmount = movementQuantity
            .mul(finalPrice)
            .toDecimalPlaces(4, Prisma.Decimal.ROUND_HALF_UP);
          const discountAmount = originalAmount
            .minus(finalAmount)
            .toDecimalPlaces(4, Prisma.Decimal.ROUND_HALF_UP);

          lineSubtotal = lineSubtotal.plus(originalAmount);
          lineDiscountAmount = lineDiscountAmount.plus(discountAmount);
          lineTotal = lineTotal.plus(finalAmount);
        }

        lineSubtotal = lineSubtotal.toDecimalPlaces(
          4,
          Prisma.Decimal.ROUND_HALF_UP,
        );
        lineDiscountAmount = lineDiscountAmount.toDecimalPlaces(
          4,
          Prisma.Decimal.ROUND_HALF_UP,
        );
        lineTotal = lineTotal.toDecimalPlaces(
          4,
          Prisma.Decimal.ROUND_HALF_UP,
        );

        const quantity = new Prisma.Decimal(input.quantity);
        const weightedUnitPrice = lineSubtotal
          .div(quantity)
          .toDecimalPlaces(4, Prisma.Decimal.ROUND_HALF_UP);
        const effectiveDiscountPercent = lineSubtotal.isZero()
          ? new Prisma.Decimal(0)
          : lineDiscountAmount
              .div(lineSubtotal)
              .mul(100)
              .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);

        const actualMovementQuantityByLot = new Map<string, Prisma.Decimal>();

        for (const movement of inventoryResult.movements) {
          const current =
            actualMovementQuantityByLot.get(movement.lotId) ||
            new Prisma.Decimal(0);

          actualMovementQuantityByLot.set(
            movement.lotId,
            current.plus(movement.quantity),
          );
        }

        for (const authorization of validatedCriticalAuthorizations) {
          const actualQuantity =
            actualMovementQuantityByLot.get(authorization.lotId);

          if (!actualQuantity || !actualQuantity.eq(authorization.quantity)) {
            throw new ConflictException(
              'The final critical-lot allocation does not match the FEFO authorization.',
            );
          }

          await this.fefoAuthorizationService.consumeApprovedAuthorization(
            tx,
            {
              tenantId: params.tenantId,
              authorizationId: authorization.authorizationId,
              token: authorization.token,
              medicationId: medication.id,
              lotId: authorization.lotId,
              quantity: authorization.quantity,
              saleId,
            },
          );
        }
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
            discountPercent: effectiveDiscountPercent,
            discountAmount: lineDiscountAmount,
            taxAmount: 0,
            subtotal: lineSubtotal,
            total: lineTotal,
            requiresPrescription: false,
            priceOverride: false,
            priceOverrideReason:
              lineDiscountAmount.gt(0)
                ? 'Descuento automático por política FEFO'
                : null,
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
              unitPrice: previewByLotId.get(movement.lotId)!.finalSalePrice!,
            },
          });
        }
        saleSubtotal = saleSubtotal.plus(lineSubtotal);
        saleDiscountTotal = saleDiscountTotal.plus(lineDiscountAmount);
        saleTotal = saleTotal.plus(lineTotal);
      }

      saleSubtotal = saleSubtotal.toDecimalPlaces(
        4,
        Prisma.Decimal.ROUND_HALF_UP,
      );
      saleDiscountTotal = saleDiscountTotal.toDecimalPlaces(
        4,
        Prisma.Decimal.ROUND_HALF_UP,
      );
      saleTotal = saleTotal.toDecimalPlaces(
        4,
        Prisma.Decimal.ROUND_HALF_UP,
      );

      if (saleSubtotal.lte(0) || saleTotal.lte(0)) {
        throw new ConflictException(
          'El total de la venta debe ser mayor que cero.',
        );
      }

      if (!saleSubtotal.minus(saleDiscountTotal).eq(saleTotal)) {
        throw new ConflictException(
          'Los totales FEFO de la venta no son consistentes.',
        );
      }

      const paymentData = this.preparePayment(params.data.payment, saleTotal);

      await tx.pharmacySale.update({
        where: { id: saleId },
        data: {
          subtotal: saleSubtotal,
          discountTotal: saleDiscountTotal,
          total: saleTotal,
        },
      });
      await tx.pharmacySalePayment.create({
        data: {
          tenantId: params.tenantId,
          saleId,
                    method: params.data.payment.method,
          amount: saleTotal,
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

  async voidSale(params: {
    tenantId: string;
    userId: string;
    saleId: string;
    data: VoidPharmacySaleDto;
  }) {
    return this.runSerializable(async (tx) => {
      const user = await tx.user.findFirst({
        where: {
          id: params.userId,
          tenantId: params.tenantId,
          active: true,
        },
        select: { id: true, role: true },
      });
      if (!user) throw new UnauthorizedException('Usuario no autorizado.');
      const allowedRoles = [
        'admin',
        'administrator',
        'superadmin',
        'pharmacy_admin',
      ];
      if (!allowedRoles.includes(user.role.trim().toLowerCase())) {
        throw new ForbiddenException(
          'Solo un usuario administrador puede anular ventas.',
        );
      }

      const companyId = await this.findActiveCompanyId(
        tx,
        params.tenantId,
        params.userId,
      );
      const sale = await tx.pharmacySale.findFirst({
        where: {
          id: params.saleId,
          tenantId: params.tenantId,
          companyId,
        },
        include: {
          items: {
            include: {
              allocations: { include: { inventoryMovement: true } },
            },
          },
        },
      });
      if (!sale) throw new NotFoundException('Venta no encontrada.');

      const allocations = sale.items.flatMap((item) => item.allocations);
      if (!allocations.length) {
        throw new ConflictException(
          'La venta no tiene asignaciones de inventario para revertir.',
        );
      }
      const originalMovementIds = allocations.map(
        (allocation) => allocation.inventoryMovementId,
      );
      const existingReversals = await tx.medicationInventoryMovement.findMany({
        where: {
          tenantId: params.tenantId,
          reversalOfId: { in: originalMovementIds },
        },
      });

      if (sale.status === PharmacySaleStatus.VOIDED) {
        if (existingReversals.length !== allocations.length) {
          throw new ConflictException(
            'La venta anulada tiene una reversión de inventario incompleta.',
          );
        }
        const voidedSale = await tx.pharmacySale.findUniqueOrThrow({
          where: { id: sale.id },
          include: this.saleInclude,
        });
        return {
          sale: voidedSale,
          reversals: existingReversals,
          idempotent: true,
        };
      }
      if (sale.status !== PharmacySaleStatus.COMPLETED) {
        throw new ConflictException(
          'Solo se pueden anular ventas completadas.',
        );
      }
      if (existingReversals.length) {
        throw new ConflictException(
          'La venta tiene movimientos revertidos sin estar anulada.',
        );
      }

      const reason = params.data.reason.trim();
      const operationId = randomUUID();
      const reversals = [];
      for (const allocation of allocations) {
        const original = allocation.inventoryMovement;
        if (
          original.direction !== MedicationInventoryMovementDirection.OUT ||
          original.movementType !== MedicationInventoryMovementType.SALE ||
          original.sourceType !== 'PHARMACY_SALE' ||
          original.sourceId !== sale.id
        ) {
          throw new ConflictException(
            'La venta contiene un movimiento de inventario que no puede revertirse.',
          );
        }
        if (
          original.companyId !== sale.companyId ||
          original.businessUnitId !== sale.businessUnitId ||
          original.warehouseId !== sale.warehouseId
        ) {
          throw new ConflictException(
            'El movimiento original no pertenece al contexto de la venta.',
          );
        }

        const lot = await tx.medicationInventoryLot.findFirst({
          where: {
            id: allocation.lotId,
            tenantId: params.tenantId,
            companyId: sale.companyId,
            businessUnitId: sale.businessUnitId,
            warehouseId: sale.warehouseId,
            medicationId: original.medicationId,
          },
        });
        if (!lot) {
          throw new ConflictException(
            'No se encontró el lote original de la venta.',
          );
        }

        const stockBefore = new Prisma.Decimal(lot.stock);
        const quantity = new Prisma.Decimal(allocation.quantity);
        const stockAfter = stockBefore.plus(quantity);
        const updated = await tx.medicationInventoryLot.updateMany({
          where: {
            id: lot.id,
            tenantId: params.tenantId,
            companyId: sale.companyId,
            businessUnitId: sale.businessUnitId,
            warehouseId: sale.warehouseId,
            stock: stockBefore,
          },
          data: { stock: { increment: quantity } },
        });
        if (updated.count !== 1) {
          const retryError = new Error('Conflicto concurrente de inventario.');
          retryError.name = 'HCELM_INVENTORY_RETRY';
          throw retryError;
        }

        const reversal = await tx.medicationInventoryMovement.create({
          data: {
            tenantId: params.tenantId,
            companyId: original.companyId,
            businessUnitId: original.businessUnitId,
            warehouseId: original.warehouseId,
            medicationId: original.medicationId,
            companyMedicationId: original.companyMedicationId,
            lotId: original.lotId,
            movementType: MedicationInventoryMovementType.REVERSAL,
            direction: MedicationInventoryMovementDirection.IN,
            quantity,
            stockBefore,
            stockAfter,
            unitCost: original.unitCost,
            unitPrice: original.unitPrice,
            currency: original.currency,
            operationId,
            idempotencyKey:
              'SALE_VOID:' + sale.id + ':ALLOCATION:' + allocation.id,
            sourceType: 'PHARMACY_SALE_VOID',
            sourceId: sale.id,
            sourceLineId: allocation.id,
            documentType: 'INTERNAL_SALE',
            documentNumber: sale.saleNumber,
            reason: 'Anulación de venta ' + sale.saleNumber + ': ' + reason,
            reversalOfId: original.id,
            createdById: params.userId,
            metadata: {
              requestIdempotencyKey: params.data.idempotencyKey.trim(),
              originalMovementId: original.id,
              saleNumber: sale.saleNumber,
            },
          },
        });
        reversals.push(reversal);
      }

      const voidedAt = new Date();
      const updatedSale = await tx.pharmacySale.updateMany({
        where: {
          id: sale.id,
          tenantId: params.tenantId,
          companyId,
          status: PharmacySaleStatus.COMPLETED,
        },
        data: {
          status: PharmacySaleStatus.VOIDED,
          paymentStatus: PharmacyPaymentStatus.REFUNDED,
          voidedAt,
          voidedById: params.userId,
          voidReason: reason,
        },
      });
      if (updatedSale.count !== 1) {
        const retryError = new Error(
          'Conflicto concurrente al anular la venta.',
        );
        retryError.name = 'HCELM_INVENTORY_RETRY';
        throw retryError;
      }

      const result = await tx.pharmacySale.findUniqueOrThrow({
        where: { id: sale.id },
        include: this.saleInclude,
      });
      return { sale: result, reversals, idempotent: false };
    });
  }

  async searchProducts(params: {
    tenantId: string;
    userId: string;
    query?: string;
    businessUnit?: string;
    warehouse?: string;
    page?: number;
    pageSize?: number;
  }) {
    const page = Math.max(1, Math.trunc(params.page || 1));
    const pageSize = Math.min(
      50,
      Math.max(10, Math.trunc(params.pageSize || 20)),
    );
    const query = String(params.query || '')
      .trim()
      .slice(0, 120);
    const scope = await this.resolveScope(
      this.prisma as any,
      params.tenantId,
      params.userId,
      params.businessUnit,
      params.warehouse,
    );
    const where: Prisma.CompanyMedicationWhereInput = {
      tenantId: params.tenantId,
      companyId: scope.companyId,
      active: true,
      medication: { active: true },
      ...(query
        ? {
            OR: [
              { companySku: { contains: query, mode: 'insensitive' } },
              { barcode: { contains: query, mode: 'insensitive' } },
              {
                medication: {
                  masterCode: { contains: query, mode: 'insensitive' },
                },
              },
              {
                medication: {
                  internalCode: { contains: query, mode: 'insensitive' },
                },
              },
              {
                medication: {
                  barcode: { contains: query, mode: 'insensitive' },
                },
              },
              {
                medication: {
                  genericName: { contains: query, mode: 'insensitive' },
                },
              },
              {
                medication: {
                  commercialName: { contains: query, mode: 'insensitive' },
                },
              },
              {
                medication: {
                  concentration: { contains: query, mode: 'insensitive' },
                },
              },
              {
                medication: {
                  presentation: { contains: query, mode: 'insensitive' },
                },
              },
              {
                medication: {
                  laboratory: { contains: query, mode: 'insensitive' },
                },
              },
              {
                medication: {
                  manufacturer: { contains: query, mode: 'insensitive' },
                },
              },
              {
                medication: {
                  sanitaryRegistration: {
                    contains: query,
                    mode: 'insensitive',
                  },
                },
              },
              {
                medication: {
                  searchText: { contains: query, mode: 'insensitive' },
                },
              },
            ],
          }
        : {}),
    };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [total, profiles] = await this.prisma.$transaction([
      this.prisma.companyMedication.count({ where }),
      this.prisma.companyMedication.findMany({
        where,
        orderBy: [
          { medication: { genericName: 'asc' } },
          { medication: { commercialName: 'asc' } },
        ],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          medication: true,
          inventoryLots: {
            where: {
              tenantId: params.tenantId,
              companyId: scope.companyId,
              businessUnitId: scope.businessUnitId,
              warehouseId: scope.warehouseId,
              active: true,
              stock: { gt: 0 },
              OR: [
                { expirationDate: null },
                { expirationDate: { gte: today } },
              ],
            },
            orderBy: [
              { expirationDate: { sort: 'asc', nulls: 'last' } },
              { createdAt: 'asc' },
              { id: 'asc' },
            ],
          },
        },
      }),
    ]);

    const items = profiles.map((profile) => {
      const availableStock = profile.inventoryLots.reduce(
        (sum, lot) => sum.plus(lot.stock),
        new Prisma.Decimal(0),
      );
      const fefoLot = profile.inventoryLots[0] || null;
      const salePrice = fefoLot?.salePrice || null;
      const hasStock = availableStock.gt(0);
      const hasPrice = Boolean(
        salePrice && new Prisma.Decimal(salePrice).gt(0),
      );
      const saleAllowed =
        !profile.medication.requiresPrescription && hasStock && hasPrice;
      const blockReason = profile.medication.requiresPrescription
        ? 'REQUIRES_PRESCRIPTION'
        : !hasStock
          ? 'OUT_OF_STOCK'
          : !hasPrice
            ? 'MISSING_PRICE'
            : null;

      return {
        id: profile.medication.id,
        companyMedicationId: profile.id,
        companySku: profile.companySku,
        barcode: profile.barcode || profile.medication.barcode,
        masterCode: profile.medication.masterCode,
        productType: profile.medication.productType,
        genericName: profile.medication.genericName,
        commercialName: profile.medication.commercialName,
        concentration: profile.medication.concentration,
        pharmaceuticalForm: profile.medication.pharmaceuticalForm,
        presentation: profile.medication.presentation,
        laboratory: profile.medication.laboratory,
        manufacturer: profile.medication.manufacturer,
        sanitaryRegistration: profile.medication.sanitaryRegistration,
        requiresPrescription: profile.medication.requiresPrescription,
        controlled: profile.medication.controlled,
        availableStock,
        salePrice,
        currency: fefoLot?.currency || 'PEN',
        saleAllowed,
        blockReason,
        fefoLot: fefoLot
          ? {
              id: fefoLot.id,
              lotNumber: fefoLot.lotNumber,
              expirationDate: fefoLot.expirationDate,
              availableStock: fefoLot.stock,
              salePrice: fefoLot.salePrice,
              currency: fefoLot.currency,
            }
          : null,
      };
    });

    return {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      scope: {
        companyId: scope.companyId,
        businessUnitId: scope.businessUnitId,
        businessUnit: scope.businessUnitCode,
        warehouseId: scope.warehouseId,
        warehouse: scope.warehouseCode,
      },
      items,
    };
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
    businessUnitValue?: string | null,
    warehouseValue?: string | null,
  ) {
    const requestedBusinessUnit = businessUnitValue?.trim();
    const requestedWarehouse = warehouseValue?.trim();
    const isLegacyPharmacyContext =
      requestedBusinessUnit?.toUpperCase() === 'FARMACIA';

    if (
      !requestedBusinessUnit ||
      !requestedWarehouse ||
      isLegacyPharmacyContext
    ) {
      return this.resolveModuleScope(tx, tenantId, userId, 'PHARMACY');
    }

    const companyId = await this.findActiveCompanyId(tx, tenantId, userId);
    const businessUnitCode = requestedBusinessUnit.toUpperCase();
    const warehouseCode = requestedWarehouse.toUpperCase();
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

  private async resolveModuleScope(
    client: any,
    tenantId: string,
    userId: string,
    moduleKey: 'PHARMACY',
  ) {
    const memberships = await client.userCompanyMembership.findMany({
      where: { tenantId, userId, active: true, company: { active: true } },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
      select: { companyId: true },
    });
    const allowedCompanyIds = memberships.map(
      (item: { companyId: string }) => item.companyId,
    );

    const findInstallation = (companyIds?: string[]) =>
      client.companyModuleInstallation.findFirst({
        where: {
          tenantId,
          moduleKey,
          active: true,
          ...(companyIds?.length ? { companyId: { in: companyIds } } : {}),
          company: { active: true },
          businessUnit: { active: true },
          warehouse: { is: { active: true } },
        },
        include: {
          businessUnit: { select: { id: true, code: true } },
          warehouse: { select: { id: true, code: true } },
        },
      });

    const installation =
      (await findInstallation(allowedCompanyIds)) || (await findInstallation());

    if (!installation?.businessUnit || !installation?.warehouse) {
      throw new NotFoundException(
        'No existe una instalacion activa del modulo Farmacia/Botica con almacen activo.',
      );
    }

    return {
      companyId: installation.companyId,
      businessUnitId: installation.businessUnit.id,
      warehouseId: installation.warehouse.id,
      businessUnitCode: installation.businessUnit.code,
      warehouseCode: installation.warehouse.code,
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
