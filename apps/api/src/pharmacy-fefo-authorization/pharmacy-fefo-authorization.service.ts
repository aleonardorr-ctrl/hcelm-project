import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PharmacyFefoAuthorizationStatus, Prisma } from '@prisma/client';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFefoAuthorizationRequestDto } from './dto/create-fefo-authorization-request.dto';
import { DecideFefoAuthorizationDto } from './dto/decide-fefo-authorization.dto';
import { ValidateFefoAuthorizationDto } from './dto/validate-fefo-authorization.dto';

const AUTHORIZATION_MINUTES = 10;

const AUTHORIZER_ROLES = new Set([
  'ADMIN',
  'DIRECTOR',
  'SUPERADMIN',
  'PLATFORM_ADMIN',
  'TENANT_ADMIN',
  'COMPANY_ADMIN',
  'PHARMACY_MANAGER',
  'PHARMACIST',
  'QUIMICO_FARMACEUTICO',
  'QF',
]);

@Injectable()
export class PharmacyFefoAuthorizationService {
  constructor(private readonly prisma: PrismaService) {}

  async list(params: {
    tenantId: string;
    userId: string;
    role: string;
    status?: string;
  }) {
    await this.expirePendingAuthorizations(this.prisma, params.tenantId);

    const user = await this.prisma.user.findFirst({
      where: {
        id: params.userId,
        tenantId: params.tenantId,
        active: true,
      },
      select: {
        id: true,
        role: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException(
        'El usuario autenticado no está activo en este tenant.',
      );
    }

    const memberships = await this.prisma.userCompanyMembership.findMany({
      where: {
        tenantId: params.tenantId,
        userId: params.userId,
        active: true,
        company: {
          active: true,
        },
      },
      select: {
        companyId: true,
        role: true,
      },
    });

    if (!memberships.length) {
      throw new ForbiddenException(
        'El usuario no tiene empresas activas asignadas.',
      );
    }

    const normalizedUserRole = String(params.role || user.role || '')
      .trim()
      .toUpperCase();

    const canAuthorize =
      AUTHORIZER_ROLES.has(normalizedUserRole) ||
      memberships.some((membership) =>
        AUTHORIZER_ROLES.has(
          String(membership.role || '')
            .trim()
            .toUpperCase(),
        ),
      );

    const requestedStatus = String(params.status || '')
      .trim()
      .toUpperCase();

    let status: PharmacyFefoAuthorizationStatus | undefined;

    if (requestedStatus) {
      const allowedStatuses = Object.values(
        PharmacyFefoAuthorizationStatus,
      ) as string[];

      if (!allowedStatuses.includes(requestedStatus)) {
        throw new BadRequestException(
          'El estado de autorización FEFO no es válido.',
        );
      }

      status = requestedStatus as PharmacyFefoAuthorizationStatus;
    }

    const companyIds = memberships.map((membership) => membership.companyId);

    const where: Prisma.PharmacyFefoAuthorizationWhereInput = {
      tenantId: params.tenantId,
      companyId: {
        in: companyIds,
      },
      ...(status ? { status } : {}),
      ...(!canAuthorize
        ? {
            requestedById: params.userId,
          }
        : {}),
    };

    const authorizations = await this.prisma.pharmacyFefoAuthorization.findMany(
      {
        where,
        orderBy: [
          {
            createdAt: 'desc',
          },
          {
            id: 'desc',
          },
        ],
        take: 100,
      },
    );

    const userIds = Array.from(
      new Set(
        authorizations.flatMap((authorization) =>
          [
            authorization.requestedById,
            authorization.approvedById,
            authorization.rejectedById,
            authorization.cancelledById,
          ].filter((value): value is string => Boolean(value)),
        ),
      ),
    );

    const users = userIds.length
      ? await this.prisma.user.findMany({
          where: {
            tenantId: params.tenantId,
            id: {
              in: userIds,
            },
          },
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
            active: true,
          },
        })
      : [];

    const usersById = new Map(users.map((item) => [item.id, item]));

    return {
      items: authorizations.map((authorization) => ({
        ...this.safeAuthorization(authorization),
        requester: usersById.get(authorization.requestedById) || null,
        approver: authorization.approvedById
          ? usersById.get(authorization.approvedById) || null
          : null,
        rejecter: authorization.rejectedById
          ? usersById.get(authorization.rejectedById) || null
          : null,
        canceller: authorization.cancelledById
          ? usersById.get(authorization.cancelledById) || null
          : null,
        canCurrentUserDecide:
          canAuthorize &&
          authorization.requestedById !== params.userId &&
          authorization.status === PharmacyFefoAuthorizationStatus.PENDING &&
          authorization.validUntil > new Date(),
      })),
      total: authorizations.length,
      canAuthorize,
      appliedStatus: status || null,
      limit: 100,
    };
  }

  async requestAuthorization(params: {
    tenantId: string;
    userId: string;
    data: CreateFefoAuthorizationRequestDto;
  }) {
    const quantity = new Prisma.Decimal(params.data.quantity);

    return this.prisma.$transaction(
      async (tx) => {
        await this.expirePendingAuthorizations(tx, params.tenantId);

        const context = await this.resolveLotContext(
          tx,
          params.tenantId,
          params.userId,
          params.data.lotId,
          params.data.medicationId,
        );

        this.assertCriticalLot(
          context.lot.expirationDate,
          context.criticalRule,
        );

        if (new Prisma.Decimal(context.lot.stock).lt(quantity)) {
          throw new ConflictException(
            'El lote ya no tiene stock suficiente para la cantidad solicitada.',
          );
        }

        const existing = await tx.pharmacyFefoAuthorization.findFirst({
          where: {
            tenantId: params.tenantId,
            requestedById: params.userId,
            medicationId: params.data.medicationId,
            lotId: params.data.lotId,
            status: PharmacyFefoAuthorizationStatus.PENDING,
            validUntil: { gt: new Date() },
          },
          orderBy: { createdAt: 'desc' },
        });

        if (existing) {
          return {
            authorization: this.safeAuthorization(existing),
            reused: true,
          };
        }

        const now = new Date();
        const validUntil = new Date(
          now.getTime() + AUTHORIZATION_MINUTES * 60_000,
        );
        const daysToExpire = this.daysToExpiration(
          context.lot.expirationDate!,
          now,
        );

        const authorization = await tx.pharmacyFefoAuthorization.create({
          data: {
            tenantId: params.tenantId,
            companyId: context.lot.companyId!,
            businessUnitId: context.lot.businessUnitId!,
            warehouseId: context.lot.warehouseId!,
            medicationId: params.data.medicationId,
            companyMedicationId: context.lot.companyMedicationId!,
            lotId: params.data.lotId,
            requestedById: params.userId,
            requestedQuantity: quantity,
            requestReason: params.data.reason.trim(),
            status: PharmacyFefoAuthorizationStatus.PENDING,
            ruleKey: 'CRITICAL',
            daysToExpireAtRequest: daysToExpire,
            lotNumber: context.lot.lotNumber,
            expirationDate: context.lot.expirationDate!,
            stockAtRequest: context.lot.stock,
            validUntil,
            metadata: {
              source: 'HCELM_PHARMACY_POS',
              requesterRole: context.user.role,
              membershipRole: context.membership.role,
            },
          },
        });

        return {
          authorization: this.safeAuthorization(authorization),
          reused: false,
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );
  }

  async approve(params: {
    tenantId: string;
    userId: string;
    role?: string;
    authorizationId: string;
    data: DecideFefoAuthorizationDto;
  }) {
    return this.prisma.$transaction(
      async (tx) => {
        await this.expirePendingAuthorizations(tx, params.tenantId);

        const authorization = await tx.pharmacyFefoAuthorization.findFirst({
          where: {
            id: params.authorizationId,
            tenantId: params.tenantId,
          },
        });

        if (!authorization) {
          throw new NotFoundException(
            'Solicitud de autorización FEFO no encontrada.',
          );
        }

        if (authorization.status !== PharmacyFefoAuthorizationStatus.PENDING) {
          throw new ConflictException(
            `La solicitud ya se encuentra en estado ${authorization.status}.`,
          );
        }

        if (authorization.validUntil <= new Date()) {
          await tx.pharmacyFefoAuthorization.update({
            where: { id: authorization.id },
            data: { status: PharmacyFefoAuthorizationStatus.EXPIRED },
          });
          throw new ConflictException('La solicitud de autorización expiró.');
        }

        if (authorization.requestedById === params.userId) {
          throw new ForbiddenException(
            'La misma persona que solicita no puede autorizar la venta.',
          );
        }

        const approverContext = await this.resolveApproverContext(
          tx,
          params.tenantId,
          params.userId,
          authorization.companyId,
          params.role,
        );

        this.assertAuthorizer(
          approverContext.userRole,
          approverContext.membershipRole,
        );

        const lot = await tx.medicationInventoryLot.findFirst({
          where: {
            id: authorization.lotId,
            tenantId: params.tenantId,
            medicationId: authorization.medicationId,
            companyId: authorization.companyId,
            businessUnitId: authorization.businessUnitId,
            warehouseId: authorization.warehouseId,
            active: true,
          },
        });

        if (!lot || !lot.expirationDate) {
          throw new ConflictException(
            'El lote ya no está disponible para autorización.',
          );
        }

        const criticalRule = await tx.pharmacyFefoRule.findFirst({
          where: {
            tenantId: params.tenantId,
            companyId: authorization.companyId,
            businessUnitId: authorization.businessUnitId,
            ruleKey: 'CRITICAL',
            active: true,
          },
        });

        this.assertCriticalLot(lot.expirationDate, criticalRule);

        if (
          new Prisma.Decimal(lot.stock).lt(
            new Prisma.Decimal(authorization.requestedQuantity),
          )
        ) {
          throw new ConflictException(
            'El stock cambió y ya no alcanza para la cantidad solicitada.',
          );
        }

        const plainToken = randomBytes(32).toString('hex');
        const tokenHash = this.hashToken(plainToken);
        const now = new Date();
        const validUntil = new Date(
          now.getTime() + AUTHORIZATION_MINUTES * 60_000,
        );

        const approved = await tx.pharmacyFefoAuthorization.update({
          where: { id: authorization.id },
          data: {
            status: PharmacyFefoAuthorizationStatus.APPROVED,
            approvedById: params.userId,
            approvalReason: params.data.reason.trim(),
            approvedAt: now,
            authorizationTokenHash: tokenHash,
            validUntil,
            metadata: {
              ...(authorization.metadata as Record<string, unknown> | null),
              approverRole: approverContext.userRole,
              approverMembershipRole: approverContext.membershipRole,
            },
          },
        });

        return {
          authorization: this.safeAuthorization(approved),
          authorizationToken: plainToken,
          warning:
            'El token se muestra una sola vez y debe enviarse al confirmar la venta.',
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );
  }

  async reject(params: {
    tenantId: string;
    userId: string;
    role?: string;
    authorizationId: string;
    data: DecideFefoAuthorizationDto;
  }) {
    return this.prisma.$transaction(
      async (tx) => {
        await this.expirePendingAuthorizations(tx, params.tenantId);

        const authorization = await tx.pharmacyFefoAuthorization.findFirst({
          where: {
            id: params.authorizationId,
            tenantId: params.tenantId,
          },
        });

        if (!authorization) {
          throw new NotFoundException(
            'Solicitud de autorización FEFO no encontrada.',
          );
        }

        if (authorization.status !== PharmacyFefoAuthorizationStatus.PENDING) {
          throw new ConflictException(
            `La solicitud ya se encuentra en estado ${authorization.status}.`,
          );
        }

        if (authorization.requestedById === params.userId) {
          throw new ForbiddenException(
            'La misma persona que solicita no puede decidir su propia solicitud.',
          );
        }

        const approverContext = await this.resolveApproverContext(
          tx,
          params.tenantId,
          params.userId,
          authorization.companyId,
          params.role,
        );

        this.assertAuthorizer(
          approverContext.userRole,
          approverContext.membershipRole,
        );

        const rejected = await tx.pharmacyFefoAuthorization.update({
          where: { id: authorization.id },
          data: {
            status: PharmacyFefoAuthorizationStatus.REJECTED,
            rejectedById: params.userId,
            rejectionReason: params.data.reason.trim(),
            rejectedAt: new Date(),
            authorizationTokenHash: null,
          },
        });

        return {
          authorization: this.safeAuthorization(rejected),
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );
  }

  async findOne(params: {
    tenantId: string;
    userId: string;
    authorizationId: string;
  }) {
    await this.expirePendingAuthorizations(this.prisma, params.tenantId);

    const authorization = await this.prisma.pharmacyFefoAuthorization.findFirst(
      {
        where: {
          id: params.authorizationId,
          tenantId: params.tenantId,
        },
      },
    );

    if (!authorization) {
      throw new NotFoundException(
        'Solicitud de autorización FEFO no encontrada.',
      );
    }

    const membership = await this.prisma.userCompanyMembership.findFirst({
      where: {
        tenantId: params.tenantId,
        userId: params.userId,
        companyId: authorization.companyId,
        active: true,
      },
      select: { id: true },
    });

    if (!membership && authorization.requestedById !== params.userId) {
      throw new ForbiddenException(
        'No tiene acceso a esta solicitud de autorización.',
      );
    }

    return {
      authorization: this.safeAuthorization(authorization),
    };
  }

  async validate(params: {
    tenantId: string;
    userId: string;
    data: ValidateFefoAuthorizationDto;
  }) {
    const result = await this.validateApprovedAuthorization(this.prisma, {
      tenantId: params.tenantId,
      authorizationId: params.data.authorizationId,
      token: params.data.token,
      medicationId: params.data.medicationId,
      lotId: params.data.lotId,
      quantity: new Prisma.Decimal(params.data.quantity),
    });

    return {
      valid: true,
      authorization: this.safeAuthorization(result),
    };
  }

  async validateApprovedAuthorization(
    tx: Prisma.TransactionClient | PrismaService,
    params: {
      tenantId: string;
      authorizationId: string;
      token: string;
      medicationId: string;
      lotId: string;
      quantity: Prisma.Decimal;
    },
  ) {
    const authorization = await tx.pharmacyFefoAuthorization.findFirst({
      where: {
        id: params.authorizationId,
        tenantId: params.tenantId,
      },
    });

    if (!authorization) {
      throw new NotFoundException('La autorización FEFO no existe.');
    }

    if (authorization.status !== PharmacyFefoAuthorizationStatus.APPROVED) {
      throw new ConflictException(
        `La autorización no está aprobada. Estado actual: ${authorization.status}.`,
      );
    }

    if (authorization.validUntil <= new Date()) {
      await tx.pharmacyFefoAuthorization.update({
        where: { id: authorization.id },
        data: {
          status: PharmacyFefoAuthorizationStatus.EXPIRED,
          authorizationTokenHash: null,
        },
      });
      throw new ConflictException('La autorización FEFO expiró.');
    }

    if (
      authorization.medicationId !== params.medicationId ||
      authorization.lotId !== params.lotId
    ) {
      throw new ConflictException(
        'La autorización no corresponde al producto y lote enviados.',
      );
    }

    if (
      new Prisma.Decimal(authorization.requestedQuantity).lt(params.quantity)
    ) {
      throw new ConflictException('La cantidad supera la cantidad autorizada.');
    }

    if (
      !authorization.authorizationTokenHash ||
      authorization.authorizationTokenHash !== this.hashToken(params.token)
    ) {
      throw new UnauthorizedException(
        'El token de autorización FEFO no es válido.',
      );
    }

    return authorization;
  }

  async consumeApprovedAuthorization(
    tx: Prisma.TransactionClient,
    params: {
      tenantId: string;
      authorizationId: string;
      token: string;
      medicationId: string;
      lotId: string;
      quantity: Prisma.Decimal;
      saleId: string;
    },
  ) {
    const authorization = await this.validateApprovedAuthorization(tx, params);

    return tx.pharmacyFefoAuthorization.update({
      where: { id: authorization.id },
      data: {
        status: PharmacyFefoAuthorizationStatus.CONSUMED,
        consumedAt: new Date(),
        consumedBySaleId: params.saleId,
        authorizationTokenHash: null,
      },
    });
  }

  private async resolveLotContext(
    tx: Prisma.TransactionClient,
    tenantId: string,
    userId: string,
    lotId: string,
    medicationId: string,
  ) {
    const user = await tx.user.findFirst({
      where: { id: userId, tenantId, active: true },
      select: { id: true, role: true },
    });

    if (!user) {
      throw new UnauthorizedException('Usuario no autorizado.');
    }

    const lot = await tx.medicationInventoryLot.findFirst({
      where: {
        id: lotId,
        tenantId,
        medicationId,
        active: true,
      },
    });

    if (
      !lot ||
      !lot.companyId ||
      !lot.businessUnitId ||
      !lot.warehouseId ||
      !lot.companyMedicationId ||
      !lot.expirationDate
    ) {
      throw new NotFoundException(
        'El lote no tiene un alcance empresarial completo o no existe.',
      );
    }

    const membership = await tx.userCompanyMembership.findFirst({
      where: {
        tenantId,
        userId,
        companyId: lot.companyId,
        active: true,
        company: { active: true },
      },
      select: {
        id: true,
        role: true,
      },
    });

    if (!membership) {
      throw new ForbiddenException(
        'El usuario no pertenece a la empresa propietaria del lote.',
      );
    }

    const warehouse = await tx.warehouse.findFirst({
      where: {
        id: lot.warehouseId,
        tenantId,
        companyId: lot.companyId,
        businessUnitId: lot.businessUnitId,
        active: true,
      },
      select: { id: true },
    });

    if (!warehouse) {
      throw new ForbiddenException(
        'El almacÃ©n del lote no estÃ¡ activo o no pertenece a la empresa y unidad de negocio.',
      );
    }

    const installation = await tx.companyModuleInstallation.findFirst({
      where: {
        tenantId,
        companyId: lot.companyId,
        businessUnitId: lot.businessUnitId,
        active: true,
        moduleKey: { in: ['PHARMACY', 'DRUGSTORE'] },
      },
      select: { id: true },
    });

    if (!installation) {
      throw new ForbiddenException(
        'La unidad de negocio no tiene una instalaciÃ³n farmacÃ©utica activa.',
      );
    }

    const criticalRule = await tx.pharmacyFefoRule.findFirst({
      where: {
        tenantId,
        companyId: lot.companyId,
        businessUnitId: lot.businessUnitId,
        ruleKey: 'CRITICAL',
        active: true,
      },
    });

    if (!criticalRule) {
      throw new ConflictException(
        'No existe una regla FEFO crítica activa para esta unidad.',
      );
    }

    return {
      user,
      membership,
      lot,
      criticalRule,
    };
  }

  private async resolveApproverContext(
    tx: Prisma.TransactionClient,
    tenantId: string,
    userId: string,
    companyId: string,
    tokenRole?: string,
  ) {
    const user = await tx.user.findFirst({
      where: {
        id: userId,
        tenantId,
        active: true,
      },
      select: {
        id: true,
        role: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Usuario autorizador no válido.');
    }

    const membership = await tx.userCompanyMembership.findFirst({
      where: {
        tenantId,
        userId,
        companyId,
        active: true,
        company: { active: true },
      },
      select: {
        id: true,
        role: true,
      },
    });

    if (!membership) {
      throw new ForbiddenException(
        'El autorizador no pertenece a la empresa de la solicitud.',
      );
    }

    return {
      userRole: String(user.role || tokenRole || '').toUpperCase(),
      membershipRole: String(membership.role || '').toUpperCase(),
    };
  }

  private assertAuthorizer(userRole: string, membershipRole: string) {
    if (
      !AUTHORIZER_ROLES.has(userRole) &&
      !AUTHORIZER_ROLES.has(membershipRole)
    ) {
      throw new ForbiddenException(
        'El usuario no tiene un rol autorizado para aprobar ventas FEFO críticas.',
      );
    }
  }

  private assertCriticalLot(
    expirationDate: Date | null,
    criticalRule: {
      minDays: number;
      maxDays: number | null;
    } | null,
  ) {
    if (!expirationDate || !criticalRule) {
      throw new ConflictException(
        'No se puede determinar el estado FEFO crítico del lote.',
      );
    }

    const days = this.daysToExpiration(expirationDate, new Date());

    if (days < 0) {
      throw new ConflictException(
        'Los lotes vencidos no pueden autorizarse para venta.',
      );
    }

    const maximum =
      criticalRule.maxDays === null
        ? Number.POSITIVE_INFINITY
        : criticalRule.maxDays;

    if (days < criticalRule.minDays || days > maximum) {
      throw new ConflictException(
        'El lote ya no se encuentra en el rango FEFO crítico.',
      );
    }
  }

  private daysToExpiration(expirationDate: Date, now: Date) {
    const currentUtc = Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
    );
    const expirationUtc = Date.UTC(
      expirationDate.getUTCFullYear(),
      expirationDate.getUTCMonth(),
      expirationDate.getUTCDate(),
    );

    return Math.floor((expirationUtc - currentUtc) / 86_400_000);
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private async expirePendingAuthorizations(
    tx: Prisma.TransactionClient | PrismaService,
    tenantId: string,
  ) {
    await tx.pharmacyFefoAuthorization.updateMany({
      where: {
        tenantId,
        status: {
          in: [
            PharmacyFefoAuthorizationStatus.PENDING,
            PharmacyFefoAuthorizationStatus.APPROVED,
          ],
        },
        validUntil: { lte: new Date() },
      },
      data: {
        status: PharmacyFefoAuthorizationStatus.EXPIRED,
        authorizationTokenHash: null,
      },
    });
  }

  private safeAuthorization(authorization: any) {
    const { authorizationTokenHash: _tokenHash, ...safe } = authorization;

    return {
      ...safe,
      requestedQuantity: Number(safe.requestedQuantity),
      stockAtRequest: Number(safe.stockAtRequest),
    };
  }
}
