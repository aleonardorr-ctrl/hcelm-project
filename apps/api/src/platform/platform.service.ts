import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PlatformService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async createCompanyContext(
    userId: string,
    companyId: string,
    reason: string,
    requestMetadata: {
      ipAddress?: string;
      userAgent?: string;
    },
  ) {
    const normalizedUserId = String(userId || '').trim();
    const normalizedCompanyId = String(companyId || '').trim();
    const normalizedReason = String(reason || '').trim();

    if (!normalizedUserId) {
      throw new UnauthorizedException(
        'No se pudo identificar al superadministrador autenticado.',
      );
    }

    if (!normalizedCompanyId) {
      throw new BadRequestException(
        'Debe seleccionar una empresa para ingresar.',
      );
    }

    if (normalizedReason.length < 5) {
      throw new BadRequestException(
        'Debe registrar un motivo de acceso de al menos 5 caracteres.',
      );
    }

    if (normalizedReason.length > 500) {
      throw new BadRequestException(
        'El motivo de acceso no puede superar los 500 caracteres.',
      );
    }

    const user = await this.prisma.user.findFirst({
      where: {
        id: normalizedUserId,
        active: true,
        platformRole: 'PLATFORM_SUPERADMIN',
      },
      select: {
        id: true,
        tenantId: true,
        email: true,
        fullName: true,
        role: true,
        platformRole: true,
        active: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException(
        'La cuenta no tiene autorización global activa.',
      );
    }

    const company = await this.prisma.company.findFirst({
      where: {
        id: normalizedCompanyId,
        active: true,
        tenant: {
          active: true,
        },
      },
      select: {
        id: true,
        tenantId: true,
        code: true,
        legalName: true,
        tradeName: true,
        ruc: true,
        active: true,
        tenant: {
          select: {
            id: true,
            name: true,
            ruc: true,
            active: true,
          },
        },
        businessUnits: {
          where: {
            active: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
          select: {
            id: true,
            code: true,
            name: true,
            type: true,
            active: true,
            warehouses: {
              where: {
                active: true,
              },
              orderBy: {
                createdAt: 'asc',
              },
              select: {
                id: true,
                code: true,
                name: true,
                active: true,
              },
            },
          },
        },
        userMemberships: {
          where: {
            userId: normalizedUserId,
            active: true,
          },
          select: {
            id: true,
            role: true,
            isDefault: true,
            active: true,
          },
          take: 1,
        },
      },
    });

    if (!company) {
      throw new NotFoundException(
        'La empresa seleccionada no existe o está inactiva.',
      );
    }

    const preferredBusinessUnit =
      company.businessUnits.find((unit) => {
        const code = String(unit.code || '').toUpperCase();

        if (company.code === 'SUMCRIT') {
          return code === 'BOTICA';
        }

        return code === 'CONSULTORIO';
      }) || company.businessUnits[0];

    if (!preferredBusinessUnit) {
      throw new BadRequestException(
        'La empresa no tiene una unidad de negocio activa.',
      );
    }

    const preferredWarehouse = preferredBusinessUnit.warehouses[0] || null;
    const membership = company.userMemberships[0] || null;

    await this.prisma.platformCompanyAccessAudit.updateMany({
      where: {
        platformUserId: user.id,
        status: 'ACTIVE',
        exitedAt: null,
      },
      data: {
        status: 'ABANDONED',
        exitedAt: new Date(),
        closureSource: 'AUTO_ABANDONED',
        closureReason:
          'El acceso activo anterior fue reemplazado por un nuevo contexto empresarial.',
      },
    });

    const accessAudit = await this.prisma.platformCompanyAccessAudit.create({
      data: {
        platformUserId: user.id,
        tenantId: company.tenant.id,
        companyId: company.id,
        businessUnitId: preferredBusinessUnit.id,
        warehouseId: preferredWarehouse?.id || null,
        reason: normalizedReason,
        accessMode: 'COMPANY_OPERATION',
        status: 'ACTIVE',
        ipAddress: requestMetadata.ipAddress || null,
        userAgent: requestMetadata.userAgent || null,
      },
      select: {
        id: true,
        reason: true,
        status: true,
        enteredAt: true,
      },
    });

    const payload = {
      sub: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      platformRole: user.platformRole,
      tenantId: company.tenant.id,
      tenantName: company.tenant.name,
      companyId: company.id,
      companyCode: company.code,
      companyName: company.tradeName || company.legalName,
      companyLegalName: company.legalName,
      companyRuc: company.ruc,
      membershipRole:
        membership?.role || 'PLATFORM_SUPERADMIN_TEMPORARY_ACCESS',
      businessUnitId: preferredBusinessUnit.id,
      businessUnitCode: preferredBusinessUnit.code,
      businessUnitName: preferredBusinessUnit.name,
      warehouseId: preferredWarehouse?.id || null,
      warehouseCode: preferredWarehouse?.code || null,
      warehouseName: preferredWarehouse?.name || null,
      accessMode: 'COMPANY_OPERATION',
      contextSource: 'PLATFORM_SUPERADMIN',
      contextIssuedAt: new Date().toISOString(),
      platformAccessAuditId: accessAudit.id,
      platformAccessReason: accessAudit.reason,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    return {
      access_token: accessToken,
      token: accessToken,
      accessMode: 'COMPANY_OPERATION',
      contextSource: 'PLATFORM_SUPERADMIN',
      audit: {
        id: accessAudit.id,
        reason: accessAudit.reason,
        status: accessAudit.status,
        enteredAt: accessAudit.enteredAt.toISOString(),
      },
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        platformRole: user.platformRole,
      },
      tenant: company.tenant,
      company: {
        id: company.id,
        code: company.code,
        legalName: company.legalName,
        tradeName: company.tradeName,
        ruc: company.ruc,
      },
      businessUnit: {
        id: preferredBusinessUnit.id,
        code: preferredBusinessUnit.code,
        name: preferredBusinessUnit.name,
        type: preferredBusinessUnit.type,
      },
      warehouse: preferredWarehouse,
      membership: membership
        ? {
            id: membership.id,
            role: membership.role,
            isDefault: membership.isDefault,
          }
        : null,
    };
  }

  async closeCompanyContext(userId: string, auditId: string) {
    const normalizedUserId = String(userId || '').trim();
    const normalizedAuditId = String(auditId || '').trim();

    if (!normalizedUserId || !normalizedAuditId) {
      throw new BadRequestException(
        'No se encontró una sesión temporal activa para cerrar.',
      );
    }

    const audit = await this.prisma.platformCompanyAccessAudit.findFirst({
      where: {
        id: normalizedAuditId,
        platformUserId: normalizedUserId,
      },
      select: {
        id: true,
        status: true,
        exitedAt: true,
      },
    });

    if (!audit) {
      throw new NotFoundException(
        'El registro de auditoría del acceso no existe.',
      );
    }

    if (audit.status !== 'ACTIVE' || audit.exitedAt) {
      return {
        id: audit.id,
        status: audit.status,
        alreadyClosed: true,
        exitedAt: audit.exitedAt?.toISOString() || null,
      };
    }

    const closed = await this.prisma.platformCompanyAccessAudit.update({
      where: {
        id: audit.id,
      },
      data: {
        status: 'CLOSED',
        exitedAt: new Date(),
        closedByPlatformUserId: normalizedUserId,
        closureSource: 'USER_EXIT',
        closureReason:
          'El superusuario regresó voluntariamente al panel global.',
      },
      select: {
        id: true,
        status: true,
        enteredAt: true,
        exitedAt: true,
      },
    });

    return {
      id: closed.id,
      status: closed.status,
      alreadyClosed: false,
      enteredAt: closed.enteredAt.toISOString(),
      exitedAt: closed.exitedAt?.toISOString() || null,
    };
  }

  async closeAccessAuditManually(
    administratorUserId: string,
    auditId: string,
    reason: string,
  ) {
    const normalizedAdministratorUserId = String(
      administratorUserId || '',
    ).trim();

    const normalizedAuditId = String(auditId || '').trim();
    const normalizedReason = String(reason || '').trim();

    if (!normalizedAdministratorUserId) {
      throw new BadRequestException(
        'No se pudo identificar al superusuario que realiza el cierre.',
      );
    }

    if (!normalizedAuditId) {
      throw new BadRequestException('Debe indicar el acceso que desea cerrar.');
    }

    if (normalizedReason.length < 5 || normalizedReason.length > 500) {
      throw new BadRequestException(
        'El motivo del cierre debe tener entre 5 y 500 caracteres.',
      );
    }

    const administrator = await this.prisma.user.findFirst({
      where: {
        id: normalizedAdministratorUserId,
        active: true,
        platformRole: 'PLATFORM_SUPERADMIN',
      },
      select: {
        id: true,
        fullName: true,
        email: true,
      },
    });

    if (!administrator) {
      throw new NotFoundException(
        'El superusuario que realiza el cierre no existe o está inactivo.',
      );
    }

    const audit = await this.prisma.platformCompanyAccessAudit.findUnique({
      where: {
        id: normalizedAuditId,
      },
      select: {
        id: true,
        status: true,
        enteredAt: true,
        exitedAt: true,
      },
    });

    if (!audit) {
      throw new NotFoundException(
        'El registro de acceso solicitado no existe.',
      );
    }

    if (audit.status !== 'ACTIVE' || audit.exitedAt) {
      throw new BadRequestException(
        'Este acceso ya fue cerrado y no puede cerrarse nuevamente.',
      );
    }

    const closed = await this.prisma.platformCompanyAccessAudit.update({
      where: {
        id: audit.id,
      },
      data: {
        status: 'CLOSED',
        exitedAt: new Date(),
        closedByPlatformUserId: administrator.id,
        closureReason: normalizedReason,
        closureSource: 'PLATFORM_ADMIN',
      },
      select: {
        id: true,
        status: true,
        enteredAt: true,
        exitedAt: true,
        closedByPlatformUserId: true,
        closureReason: true,
        closureSource: true,
      },
    });

    return {
      ...closed,
      enteredAt: closed.enteredAt.toISOString(),
      exitedAt: closed.exitedAt?.toISOString() || null,
      closedBy: {
        id: administrator.id,
        fullName: administrator.fullName,
        email: administrator.email,
      },
    };
  }

  async getAccessAudits(query: {
    page?: string;
    pageSize?: string;
    status?: string;
    companyId?: string;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
  }) {
    const parsedPage = Number.parseInt(String(query.page || '1'), 10);
    const parsedPageSize = Number.parseInt(String(query.pageSize || '20'), 10);

    const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;

    const pageSize =
      Number.isFinite(parsedPageSize) &&
      parsedPageSize > 0 &&
      parsedPageSize <= 100
        ? parsedPageSize
        : 20;

    const normalizedStatus = String(query.status || '')
      .trim()
      .toUpperCase();

    const allowedStatuses = new Set(['', 'ACTIVE', 'CLOSED', 'ABANDONED']);

    if (!allowedStatuses.has(normalizedStatus)) {
      throw new BadRequestException(
        'El estado de auditoría solicitado no es válido.',
      );
    }

    const normalizedCompanyId = String(query.companyId || '').trim();
    const normalizedSearch = String(query.search || '')
      .trim()
      .toLocaleLowerCase('es-PE');

    const parseDate = (
      value: string | undefined,
      endOfDay: boolean,
    ): Date | null => {
      const normalized = String(value || '').trim();

      if (!normalized) {
        return null;
      }

      const date = new Date(
        endOfDay ? `${normalized}T23:59:59.999` : `${normalized}T00:00:00.000`,
      );

      if (Number.isNaN(date.getTime())) {
        throw new BadRequestException(
          'El rango de fechas de auditoría no es válido.',
        );
      }

      return date;
    };

    const dateFrom = parseDate(query.dateFrom, false);
    const dateTo = parseDate(query.dateTo, true);

    if (dateFrom && dateTo && dateFrom.getTime() > dateTo.getTime()) {
      throw new BadRequestException(
        'La fecha inicial no puede ser posterior a la fecha final.',
      );
    }

    const audits = await this.prisma.platformCompanyAccessAudit.findMany({
      where: {
        ...(normalizedStatus
          ? {
              status: normalizedStatus,
            }
          : {}),
        ...(normalizedCompanyId
          ? {
              companyId: normalizedCompanyId,
            }
          : {}),
        ...(dateFrom || dateTo
          ? {
              enteredAt: {
                ...(dateFrom
                  ? {
                      gte: dateFrom,
                    }
                  : {}),
                ...(dateTo
                  ? {
                      lte: dateTo,
                    }
                  : {}),
              },
            }
          : {}),
      },
      orderBy: [
        {
          enteredAt: 'desc',
        },
        {
          createdAt: 'desc',
        },
      ],
      select: {
        id: true,
        platformUserId: true,
        tenantId: true,
        companyId: true,
        businessUnitId: true,
        warehouseId: true,
        reason: true,
        accessMode: true,
        status: true,
        enteredAt: true,
        exitedAt: true,
        ipAddress: true,
        userAgent: true,
        closedByPlatformUserId: true,
        closureReason: true,
        closureSource: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const unique = (values: Array<string | null>) =>
      Array.from(
        new Set(
          values.filter(
            (value): value is string =>
              typeof value === 'string' && value.length > 0,
          ),
        ),
      );

    const userIds = unique([
      ...audits.map((audit) => audit.platformUserId),
      ...audits.map((audit) => audit.closedByPlatformUserId),
    ]);

    const tenantIds = unique(audits.map((audit) => audit.tenantId));
    const companyIds = unique(audits.map((audit) => audit.companyId));

    const businessUnitIds = unique(audits.map((audit) => audit.businessUnitId));

    const warehouseIds = unique(audits.map((audit) => audit.warehouseId));

    const [users, tenants, companies, businessUnits, warehouses] =
      await this.prisma.$transaction([
        this.prisma.user.findMany({
          where: {
            id: {
              in: userIds,
            },
          },
          select: {
            id: true,
            email: true,
            fullName: true,
            platformRole: true,
          },
        }),
        this.prisma.tenant.findMany({
          where: {
            id: {
              in: tenantIds,
            },
          },
          select: {
            id: true,
            name: true,
            ruc: true,
          },
        }),
        this.prisma.company.findMany({
          where: {
            id: {
              in: companyIds,
            },
          },
          select: {
            id: true,
            code: true,
            legalName: true,
            tradeName: true,
            ruc: true,
          },
        }),
        this.prisma.businessUnit.findMany({
          where: {
            id: {
              in: businessUnitIds,
            },
          },
          select: {
            id: true,
            code: true,
            name: true,
            type: true,
          },
        }),
        this.prisma.warehouse.findMany({
          where: {
            id: {
              in: warehouseIds,
            },
          },
          select: {
            id: true,
            code: true,
            name: true,
          },
        }),
      ]);

    const userMap = new Map(users.map((item) => [item.id, item]));
    const tenantMap = new Map(tenants.map((item) => [item.id, item]));

    const companyMap = new Map(companies.map((item) => [item.id, item]));

    const businessUnitMap = new Map(
      businessUnits.map((item) => [item.id, item]),
    );

    const warehouseMap = new Map(warehouses.map((item) => [item.id, item]));

    const detectBrowser = (userAgent: string | null) => {
      const value = String(userAgent || '');

      if (!value) {
        return 'No registrado';
      }

      if (/Edg\//i.test(value)) {
        return 'Microsoft Edge';
      }

      if (/Chrome\//i.test(value)) {
        return 'Google Chrome';
      }

      if (/Firefox\//i.test(value)) {
        return 'Mozilla Firefox';
      }

      if (/Safari\//i.test(value) && !/Chrome\//i.test(value)) {
        return 'Safari';
      }

      return 'Otro navegador';
    };

    const enriched = audits.map((audit) => {
      const user = userMap.get(audit.platformUserId) || null;
      const tenant = tenantMap.get(audit.tenantId) || null;
      const company = companyMap.get(audit.companyId) || null;

      const businessUnit = businessUnitMap.get(audit.businessUnitId) || null;

      const warehouse = audit.warehouseId
        ? warehouseMap.get(audit.warehouseId) || null
        : null;

      const durationEnd = audit.exitedAt?.getTime() || new Date().getTime();

      const durationSeconds = Math.max(
        0,
        Math.floor((durationEnd - audit.enteredAt.getTime()) / 1000),
      );

      return {
        id: audit.id,
        reason: audit.reason,
        accessMode: audit.accessMode,
        status: audit.status,
        enteredAt: audit.enteredAt.toISOString(),
        exitedAt: audit.exitedAt?.toISOString() || null,
        durationSeconds,
        ipAddress: audit.ipAddress,
        userAgent: audit.userAgent,
        browser: detectBrowser(audit.userAgent),
        closureReason: audit.closureReason,
        closureSource: audit.closureSource,
        closedBy: audit.closedByPlatformUserId
          ? (() => {
              const closingUser = userMap.get(audit.closedByPlatformUserId);

              return {
                id: audit.closedByPlatformUserId,
                fullName:
                  closingUser?.fullName || 'Usuario de cierre no disponible',
                email: closingUser?.email || null,
              };
            })()
          : null,
        createdAt: audit.createdAt.toISOString(),
        updatedAt: audit.updatedAt.toISOString(),
        user: {
          id: audit.platformUserId,
          fullName: user?.fullName || 'Usuario no disponible',
          email: user?.email || null,
          platformRole: user?.platformRole || null,
        },
        tenant: {
          id: audit.tenantId,
          name: tenant?.name || 'Grupo no disponible',
          ruc: tenant?.ruc || null,
        },
        company: {
          id: audit.companyId,
          code: company?.code || null,
          legalName: company?.legalName || 'Empresa no disponible',
          tradeName: company?.tradeName || null,
          ruc: company?.ruc || null,
        },
        businessUnit: {
          id: audit.businessUnitId,
          code: businessUnit?.code || null,
          name: businessUnit?.name || 'Unidad de negocio no disponible',
          type: businessUnit?.type || null,
        },
        warehouse: warehouse
          ? {
              id: warehouse.id,
              code: warehouse.code,
              name: warehouse.name,
            }
          : null,
      };
    });

    const filtered = normalizedSearch
      ? enriched.filter((item) => {
          const searchableValues = [
            item.reason,
            item.status,
            item.ipAddress,
            item.browser,
            item.user.fullName,
            item.user.email,
            item.tenant.name,
            item.tenant.ruc,
            item.company.code,
            item.company.legalName,
            item.company.tradeName,
            item.company.ruc,
            item.businessUnit.code,
            item.businessUnit.name,
            item.warehouse?.code,
            item.warehouse?.name,
          ];

          return searchableValues.some((value) =>
            String(value || '')
              .toLocaleLowerCase('es-PE')
              .includes(normalizedSearch),
          );
        })
      : enriched;

    const totalItems = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

    const safePage = Math.min(page, totalPages);
    const offset = (safePage - 1) * pageSize;

    const items = filtered.slice(offset, offset + pageSize);

    const statusSummary = enriched.reduce(
      (accumulator, item) => {
        if (item.status === 'ACTIVE') {
          accumulator.active += 1;
        } else if (item.status === 'CLOSED') {
          accumulator.closed += 1;
        } else if (item.status === 'ABANDONED') {
          accumulator.abandoned += 1;
        }

        return accumulator;
      },
      {
        active: 0,
        closed: 0,
        abandoned: 0,
      },
    );

    return {
      items,
      pagination: {
        page: safePage,
        pageSize,
        totalItems,
        totalPages,
        hasPreviousPage: safePage > 1,
        hasNextPage: safePage < totalPages,
      },
      summary: {
        total: enriched.length,
        ...statusSummary,
      },
      appliedFilters: {
        status: normalizedStatus || null,
        companyId: normalizedCompanyId || null,
        dateFrom: dateFrom?.toISOString() || null,
        dateTo: dateTo?.toISOString() || null,
        search: normalizedSearch || null,
      },
      generatedAt: new Date().toISOString(),
    };
  }

  private normalizeSuspensionInput(input: {
    category?: string;
    reason?: string;
    suspendedUntil?: string;
  }) {
    const category = String(input?.category || '')
      .trim()
      .toUpperCase();
    const reason = String(input?.reason || '').trim();

    const allowedCategories = new Set([
      'PAYMENT_DEFAULT',
      'CONTRACT_BREACH',
      'DOCUMENTATION_PENDING',
      'CLIENT_REQUEST',
      'SECURITY_INCIDENT',
      'ADMINISTRATIVE_MAINTENANCE',
      'OTHER',
    ]);

    if (!allowedCategories.has(category)) {
      throw new BadRequestException(
        'Debe seleccionar una categoría de suspensión válida.',
      );
    }

    if (reason.length < 10 || reason.length > 500) {
      throw new BadRequestException(
        'El motivo de suspensión debe tener entre 10 y 500 caracteres.',
      );
    }

    const suspendedUntilText = String(input?.suspendedUntil || '').trim();
    let suspendedUntil: Date | null = null;

    if (suspendedUntilText) {
      suspendedUntil = new Date(suspendedUntilText);

      if (Number.isNaN(suspendedUntil.getTime())) {
        throw new BadRequestException(
          'La fecha final de suspensión no es válida.',
        );
      }

      if (suspendedUntil.getTime() <= Date.now()) {
        throw new BadRequestException(
          'La fecha final debe ser posterior al momento actual.',
        );
      }
    }

    return { category, reason, suspendedUntil };
  }

  private normalizeReactivationReason(reason: string) {
    const normalized = String(reason || '').trim();

    if (normalized.length < 10 || normalized.length > 500) {
      throw new BadRequestException(
        'El motivo de reactivación debe tener entre 10 y 500 caracteres.',
      );
    }

    return normalized;
  }

  private async requireActivePlatformAdministrator(userId: string) {
    const administrator = await this.prisma.user.findFirst({
      where: {
        id: String(userId || '').trim(),
        active: true,
        status: 'ACTIVE',
        platformRole: 'PLATFORM_SUPERADMIN',
        tenant: {
          active: true,
          status: 'ACTIVE',
        },
      },
      select: {
        id: true,
        tenantId: true,
        email: true,
        fullName: true,
        platformRole: true,
      },
    });

    if (!administrator) {
      throw new UnauthorizedException(
        'La cuenta no tiene autorización global activa.',
      );
    }

    return administrator;
  }

  async suspendTenant(
    administratorUserId: string,
    tenantId: string,
    input: {
      category?: string;
      reason?: string;
      suspendedUntil?: string;
    },
  ) {
    const administrator =
      await this.requireActivePlatformAdministrator(administratorUserId);

    const normalizedTenantId = String(tenantId || '').trim();

    if (administrator.tenantId === normalizedTenantId) {
      throw new BadRequestException(
        'No puede suspender el tenant de su propia cuenta global.',
      );
    }

    const suspension = this.normalizeSuspensionInput(input);

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: normalizedTenantId },
    });

    if (!tenant) {
      throw new NotFoundException('El tenant solicitado no existe.');
    }

    if (tenant.status !== 'ACTIVE' || !tenant.active) {
      throw new BadRequestException('El tenant ya está suspendido o cerrado.');
    }

    const now = new Date();

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedTenant = await tx.tenant.update({
        where: { id: tenant.id },
        data: {
          active: false,
          status: 'SUSPENDED',
          suspendedAt: now,
          suspendedUntil: suspension.suspendedUntil,
          suspensionCategory: suspension.category,
          suspensionReason: suspension.reason,
          suspendedByPlatformUserId: administrator.id,
          reactivatedAt: null,
          reactivatedByPlatformUserId: null,
          reactivationReason: null,
        },
      });

      const closedAccesses = await tx.platformCompanyAccessAudit.updateMany({
        where: {
          tenantId: tenant.id,
          status: 'ACTIVE',
          exitedAt: null,
        },
        data: {
          status: 'CLOSED',
          exitedAt: now,
          closedByPlatformUserId: administrator.id,
          closureSource: 'TENANT_SUSPENSION',
          closureReason:
            'Acceso cerrado por suspensión administrativa del tenant.',
        },
      });

      const audit = await tx.platformAdministrativeActionAudit.create({
        data: {
          entityType: 'TENANT',
          action: 'SUSPEND',
          targetEntityId: tenant.id,
          targetTenantId: tenant.id,
          targetName: tenant.name,
          targetIdentifier: tenant.ruc,
          previousStatus: tenant.status,
          resultingStatus: 'SUSPENDED',
          category: suspension.category,
          reason: suspension.reason,
          suspendedUntil: suspension.suspendedUntil,
          performedByPlatformUserId: administrator.id,
          performedByEmail: administrator.email,
          performedByName: administrator.fullName,
          closedAccessCount: closedAccesses.count,
          metadata: {
            previousActive: tenant.active,
            resultingActive: false,
          },
        },
      });

      return {
        updatedTenant,
        audit,
        closedAccessCount: closedAccesses.count,
      };
    });

    return {
      entityType: 'TENANT',
      action: 'SUSPENDED',
      tenant: result.updatedTenant,
      audit: result.audit,
      closedAccessCount: result.closedAccessCount,
      performedBy: administrator,
    };
  }

  async reactivateTenant(
    administratorUserId: string,
    tenantId: string,
    reason: string,
  ) {
    const administrator =
      await this.requireActivePlatformAdministrator(administratorUserId);

    const normalizedReason = this.normalizeReactivationReason(reason);

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: String(tenantId || '').trim() },
    });

    if (!tenant) {
      throw new NotFoundException('El tenant solicitado no existe.');
    }

    if (tenant.status === 'CLOSED') {
      throw new BadRequestException('Un tenant cerrado no puede reactivarse.');
    }

    if (tenant.status === 'ACTIVE' && tenant.active) {
      throw new BadRequestException('El tenant ya se encuentra activo.');
    }

    const now = new Date();

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedTenant = await tx.tenant.update({
        where: { id: tenant.id },
        data: {
          active: true,
          status: 'ACTIVE',
          reactivatedAt: now,
          reactivatedByPlatformUserId: administrator.id,
          reactivationReason: normalizedReason,
          suspendedUntil: null,
        },
      });

      const audit = await tx.platformAdministrativeActionAudit.create({
        data: {
          entityType: 'TENANT',
          action: 'REACTIVATE',
          targetEntityId: tenant.id,
          targetTenantId: tenant.id,
          targetName: tenant.name,
          targetIdentifier: tenant.ruc,
          previousStatus: tenant.status,
          resultingStatus: 'ACTIVE',
          category: tenant.suspensionCategory,
          reason: normalizedReason,
          suspendedUntil: null,
          performedByPlatformUserId: administrator.id,
          performedByEmail: administrator.email,
          performedByName: administrator.fullName,
          metadata: {
            previousActive: tenant.active,
            resultingActive: true,
            previousSuspensionReason: tenant.suspensionReason,
          },
        },
      });

      return { updatedTenant, audit };
    });

    return {
      entityType: 'TENANT',
      action: 'REACTIVATED',
      tenant: result.updatedTenant,
      audit: result.audit,
      performedBy: administrator,
    };
  }

  async suspendCompany(
    administratorUserId: string,
    companyId: string,
    input: {
      category?: string;
      reason?: string;
      suspendedUntil?: string;
    },
  ) {
    const administrator =
      await this.requireActivePlatformAdministrator(administratorUserId);

    const suspension = this.normalizeSuspensionInput(input);

    const company = await this.prisma.company.findUnique({
      where: { id: String(companyId || '').trim() },
    });

    if (!company) {
      throw new NotFoundException('La empresa solicitada no existe.');
    }

    if (company.status !== 'ACTIVE' || !company.active) {
      throw new BadRequestException('La empresa ya está suspendida o cerrada.');
    }

    const now = new Date();

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedCompany = await tx.company.update({
        where: { id: company.id },
        data: {
          active: false,
          status: 'SUSPENDED',
          suspendedAt: now,
          suspendedUntil: suspension.suspendedUntil,
          suspensionCategory: suspension.category,
          suspensionReason: suspension.reason,
          suspendedByPlatformUserId: administrator.id,
          reactivatedAt: null,
          reactivatedByPlatformUserId: null,
          reactivationReason: null,
        },
      });

      const closedAccesses = await tx.platformCompanyAccessAudit.updateMany({
        where: {
          companyId: company.id,
          status: 'ACTIVE',
          exitedAt: null,
        },
        data: {
          status: 'CLOSED',
          exitedAt: now,
          closedByPlatformUserId: administrator.id,
          closureSource: 'COMPANY_SUSPENSION',
          closureReason:
            'Acceso cerrado por suspensión administrativa de la empresa.',
        },
      });

      const audit = await tx.platformAdministrativeActionAudit.create({
        data: {
          entityType: 'COMPANY',
          action: 'SUSPEND',
          targetEntityId: company.id,
          targetTenantId: company.tenantId,
          targetCompanyId: company.id,
          targetName: company.tradeName || company.legalName,
          targetIdentifier: company.ruc,
          previousStatus: company.status,
          resultingStatus: 'SUSPENDED',
          category: suspension.category,
          reason: suspension.reason,
          suspendedUntil: suspension.suspendedUntil,
          performedByPlatformUserId: administrator.id,
          performedByEmail: administrator.email,
          performedByName: administrator.fullName,
          closedAccessCount: closedAccesses.count,
          metadata: {
            legalName: company.legalName,
            tradeName: company.tradeName,
            companyCode: company.code,
            previousActive: company.active,
            resultingActive: false,
          },
        },
      });

      return {
        updatedCompany,
        audit,
        closedAccessCount: closedAccesses.count,
      };
    });

    return {
      entityType: 'COMPANY',
      action: 'SUSPENDED',
      company: result.updatedCompany,
      audit: result.audit,
      closedAccessCount: result.closedAccessCount,
      performedBy: administrator,
    };
  }

  async reactivateCompany(
    administratorUserId: string,
    companyId: string,
    reason: string,
  ) {
    const administrator =
      await this.requireActivePlatformAdministrator(administratorUserId);

    const normalizedReason = this.normalizeReactivationReason(reason);

    const company = await this.prisma.company.findUnique({
      where: { id: String(companyId || '').trim() },
      include: {
        tenant: true,
      },
    });

    if (!company) {
      throw new NotFoundException('La empresa solicitada no existe.');
    }

    if (!company.tenant.active || company.tenant.status !== 'ACTIVE') {
      throw new BadRequestException(
        'No puede reactivar la empresa mientras su tenant está suspendido.',
      );
    }

    if (company.status === 'CLOSED') {
      throw new BadRequestException(
        'Una empresa cerrada no puede reactivarse.',
      );
    }

    if (company.status === 'ACTIVE' && company.active) {
      throw new BadRequestException('La empresa ya se encuentra activa.');
    }

    const now = new Date();

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedCompany = await tx.company.update({
        where: { id: company.id },
        data: {
          active: true,
          status: 'ACTIVE',
          reactivatedAt: now,
          reactivatedByPlatformUserId: administrator.id,
          reactivationReason: normalizedReason,
          suspendedUntil: null,
        },
      });

      const audit = await tx.platformAdministrativeActionAudit.create({
        data: {
          entityType: 'COMPANY',
          action: 'REACTIVATE',
          targetEntityId: company.id,
          targetTenantId: company.tenantId,
          targetCompanyId: company.id,
          targetName: company.tradeName || company.legalName,
          targetIdentifier: company.ruc,
          previousStatus: company.status,
          resultingStatus: 'ACTIVE',
          category: company.suspensionCategory,
          reason: normalizedReason,
          suspendedUntil: null,
          performedByPlatformUserId: administrator.id,
          performedByEmail: administrator.email,
          performedByName: administrator.fullName,
          metadata: {
            legalName: company.legalName,
            tradeName: company.tradeName,
            companyCode: company.code,
            previousActive: company.active,
            resultingActive: true,
            previousSuspensionReason: company.suspensionReason,
          },
        },
      });

      return { updatedCompany, audit };
    });

    return {
      entityType: 'COMPANY',
      action: 'REACTIVATED',
      company: result.updatedCompany,
      audit: result.audit,
      performedBy: administrator,
    };
  }

  async suspendUser(
    administratorUserId: string,
    userId: string,
    input: {
      category?: string;
      reason?: string;
      suspendedUntil?: string;
    },
  ) {
    const administrator =
      await this.requireActivePlatformAdministrator(administratorUserId);

    const normalizedUserId = String(userId || '').trim();

    if (administrator.id === normalizedUserId) {
      throw new BadRequestException('No puede suspender su propia cuenta.');
    }

    const suspension = this.normalizeSuspensionInput(input);

    const user = await this.prisma.user.findUnique({
      where: { id: normalizedUserId },
    });

    if (!user) {
      throw new NotFoundException('El usuario solicitado no existe.');
    }

    if (user.status !== 'ACTIVE' || !user.active) {
      throw new BadRequestException('El usuario ya está suspendido o cerrado.');
    }

    if (user.platformRole === 'PLATFORM_SUPERADMIN') {
      const activeSuperadmins = await this.prisma.user.count({
        where: {
          active: true,
          status: 'ACTIVE',
          platformRole: 'PLATFORM_SUPERADMIN',
        },
      });

      if (activeSuperadmins <= 1) {
        throw new BadRequestException(
          'No puede suspender al último superadministrador activo.',
        );
      }
    }

    const now = new Date();

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id: user.id },
        data: {
          active: false,
          status: 'SUSPENDED',
          suspendedAt: now,
          suspendedUntil: suspension.suspendedUntil,
          suspensionCategory: suspension.category,
          suspensionReason: suspension.reason,
          suspendedByPlatformUserId: administrator.id,
          reactivatedAt: null,
          reactivatedByPlatformUserId: null,
          reactivationReason: null,
        },
      });

      const closedAccesses = await tx.platformCompanyAccessAudit.updateMany({
        where: {
          platformUserId: user.id,
          status: 'ACTIVE',
          exitedAt: null,
        },
        data: {
          status: 'CLOSED',
          exitedAt: now,
          closedByPlatformUserId: administrator.id,
          closureSource: 'USER_SUSPENSION',
          closureReason:
            'Acceso cerrado por suspensión administrativa del usuario.',
        },
      });

      const audit = await tx.platformAdministrativeActionAudit.create({
        data: {
          entityType: 'USER',
          action: 'SUSPEND',
          targetEntityId: user.id,
          targetTenantId: user.tenantId,
          targetUserId: user.id,
          targetName: user.fullName || user.email,
          targetIdentifier: user.email,
          previousStatus: user.status,
          resultingStatus: 'SUSPENDED',
          category: suspension.category,
          reason: suspension.reason,
          suspendedUntil: suspension.suspendedUntil,
          performedByPlatformUserId: administrator.id,
          performedByEmail: administrator.email,
          performedByName: administrator.fullName,
          closedAccessCount: closedAccesses.count,
          metadata: {
            targetEmail: user.email,
            targetDni: user.dni,
            targetRole: user.role,
            targetPlatformRole: user.platformRole,
            previousActive: user.active,
            resultingActive: false,
          },
        },
      });

      return {
        updatedUser,
        audit,
        closedAccessCount: closedAccesses.count,
      };
    });

    return {
      entityType: 'USER',
      action: 'SUSPENDED',
      user: result.updatedUser,
      audit: result.audit,
      closedAccessCount: result.closedAccessCount,
      performedBy: administrator,
    };
  }

  async reactivateUser(
    administratorUserId: string,
    userId: string,
    reason: string,
  ) {
    const administrator =
      await this.requireActivePlatformAdministrator(administratorUserId);

    const normalizedReason = this.normalizeReactivationReason(reason);

    const user = await this.prisma.user.findUnique({
      where: { id: String(userId || '').trim() },
      include: {
        tenant: true,
      },
    });

    if (!user) {
      throw new NotFoundException('El usuario solicitado no existe.');
    }

    if (!user.tenant.active || user.tenant.status !== 'ACTIVE') {
      throw new BadRequestException(
        'No puede reactivar el usuario mientras su tenant está suspendido.',
      );
    }

    if (user.status === 'CLOSED') {
      throw new BadRequestException('Un usuario cerrado no puede reactivarse.');
    }

    if (user.status === 'ACTIVE' && user.active) {
      throw new BadRequestException('El usuario ya se encuentra activo.');
    }

    const now = new Date();

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id: user.id },
        data: {
          active: true,
          status: 'ACTIVE',
          reactivatedAt: now,
          reactivatedByPlatformUserId: administrator.id,
          reactivationReason: normalizedReason,
          suspendedUntil: null,
        },
      });

      const audit = await tx.platformAdministrativeActionAudit.create({
        data: {
          entityType: 'USER',
          action: 'REACTIVATE',
          targetEntityId: user.id,
          targetTenantId: user.tenantId,
          targetUserId: user.id,
          targetName: user.fullName || user.email,
          targetIdentifier: user.email,
          previousStatus: user.status,
          resultingStatus: 'ACTIVE',
          category: user.suspensionCategory,
          reason: normalizedReason,
          suspendedUntil: null,
          performedByPlatformUserId: administrator.id,
          performedByEmail: administrator.email,
          performedByName: administrator.fullName,
          metadata: {
            targetEmail: user.email,
            targetDni: user.dni,
            targetRole: user.role,
            targetPlatformRole: user.platformRole,
            previousActive: user.active,
            resultingActive: true,
            previousSuspensionReason: user.suspensionReason,
          },
        },
      });

      return { updatedUser, audit };
    });

    return {
      entityType: 'USER',
      action: 'REACTIVATED',
      user: result.updatedUser,
      audit: result.audit,
      performedBy: administrator,
    };
  }

  async getAdministrativeActions(query: {
    page?: string;
    pageSize?: string;
    entityType?: string;
    action?: string;
    successful?: string;
    performedByPlatformUserId?: string;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
  }) {
    const parsedPage = Number.parseInt(String(query.page || '1'), 10);
    const parsedPageSize = Number.parseInt(String(query.pageSize || '20'), 10);

    const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;

    const pageSize =
      Number.isFinite(parsedPageSize) &&
      parsedPageSize > 0 &&
      parsedPageSize <= 100
        ? parsedPageSize
        : 20;

    const normalizedEntityType = String(query.entityType || '')
      .trim()
      .toUpperCase();

    const normalizedAction = String(query.action || '')
      .trim()
      .toUpperCase();

    const normalizedSuccessful = String(query.successful || '')
      .trim()
      .toLowerCase();

    const normalizedAdministratorId = String(
      query.performedByPlatformUserId || '',
    ).trim();

    const normalizedSearch = String(query.search || '').trim();

    const allowedEntityTypes = new Set(['', 'TENANT', 'COMPANY', 'USER']);
    const allowedActions = new Set(['', 'SUSPEND', 'REACTIVATE']);
    const allowedSuccessful = new Set(['', 'true', 'false']);

    if (!allowedEntityTypes.has(normalizedEntityType)) {
      throw new BadRequestException(
        'El tipo de entidad administrativa no es válido.',
      );
    }

    if (!allowedActions.has(normalizedAction)) {
      throw new BadRequestException(
        'La acción administrativa solicitada no es válida.',
      );
    }

    if (!allowedSuccessful.has(normalizedSuccessful)) {
      throw new BadRequestException(
        'El resultado administrativo solicitado no es válido.',
      );
    }

    const parseDate = (
      value: string | undefined,
      endOfDay: boolean,
    ): Date | null => {
      const normalized = String(value || '').trim();

      if (!normalized) {
        return null;
      }

      const date = new Date(
        endOfDay ? `${normalized}T23:59:59.999` : `${normalized}T00:00:00.000`,
      );

      if (Number.isNaN(date.getTime())) {
        throw new BadRequestException(
          'El rango de fechas administrativas no es válido.',
        );
      }

      return date;
    };

    const dateFrom = parseDate(query.dateFrom, false);
    const dateTo = parseDate(query.dateTo, true);

    if (dateFrom && dateTo && dateFrom.getTime() > dateTo.getTime()) {
      throw new BadRequestException(
        'La fecha inicial no puede ser posterior a la fecha final.',
      );
    }

    const where: any = {
      ...(normalizedEntityType
        ? {
            entityType: normalizedEntityType,
          }
        : {}),
      ...(normalizedAction
        ? {
            action: normalizedAction,
          }
        : {}),
      ...(normalizedSuccessful
        ? {
            successful: normalizedSuccessful === 'true',
          }
        : {}),
      ...(normalizedAdministratorId
        ? {
            performedByPlatformUserId: normalizedAdministratorId,
          }
        : {}),
      ...(dateFrom || dateTo
        ? {
            createdAt: {
              ...(dateFrom ? { gte: dateFrom } : {}),
              ...(dateTo ? { lte: dateTo } : {}),
            },
          }
        : {}),
      ...(normalizedSearch
        ? {
            OR: [
              {
                targetName: {
                  contains: normalizedSearch,
                  mode: 'insensitive',
                },
              },
              {
                targetIdentifier: {
                  contains: normalizedSearch,
                  mode: 'insensitive',
                },
              },
              {
                reason: {
                  contains: normalizedSearch,
                  mode: 'insensitive',
                },
              },
              {
                category: {
                  contains: normalizedSearch,
                  mode: 'insensitive',
                },
              },
              {
                performedByEmail: {
                  contains: normalizedSearch,
                  mode: 'insensitive',
                },
              },
              {
                performedByName: {
                  contains: normalizedSearch,
                  mode: 'insensitive',
                },
              },
            ],
          }
        : {}),
    };

    const skip = (page - 1) * pageSize;

    const [
      items,
      totalItems,
      suspendedCount,
      reactivatedCount,
      successfulCount,
      failedCount,
    ] = await this.prisma.$transaction([
      this.prisma.platformAdministrativeActionAudit.findMany({
        where,
        orderBy: [
          {
            createdAt: 'desc',
          },
          {
            id: 'desc',
          },
        ],
        skip,
        take: pageSize,
      }),
      this.prisma.platformAdministrativeActionAudit.count({
        where,
      }),
      this.prisma.platformAdministrativeActionAudit.count({
        where: {
          AND: [where, { action: 'SUSPEND' }],
        },
      }),
      this.prisma.platformAdministrativeActionAudit.count({
        where: {
          AND: [where, { action: 'REACTIVATE' }],
        },
      }),
      this.prisma.platformAdministrativeActionAudit.count({
        where: {
          AND: [where, { successful: true }],
        },
      }),
      this.prisma.platformAdministrativeActionAudit.count({
        where: {
          AND: [where, { successful: false }],
        },
      }),
    ]);

    const totalPages = totalItems > 0 ? Math.ceil(totalItems / pageSize) : 1;

    return {
      items,
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages,
        hasPreviousPage: page > 1,
        hasNextPage: page < totalPages,
      },
      summary: {
        total: totalItems,
        suspended: suspendedCount,
        reactivated: reactivatedCount,
        successful: successfulCount,
        failed: failedCount,
      },
      appliedFilters: {
        entityType: normalizedEntityType || null,
        action: normalizedAction || null,
        successful:
          normalizedSuccessful === '' ? null : normalizedSuccessful === 'true',
        performedByPlatformUserId: normalizedAdministratorId || null,
        dateFrom: dateFrom?.toISOString() || null,
        dateTo: dateTo?.toISOString() || null,
        search: normalizedSearch || null,
      },
      generatedAt: new Date().toISOString(),
    };
  }

  async getDashboardSummary() {
    const [
      registeredTenants,
      activeCompanies,
      inactiveCompanies,
      suspendedCompanies,
      activeUsers,
      inactiveUsers,
      suspendedUsers,
      platformSuperadmins,
      activeModuleInstallations,
      inactiveModuleInstallations,
    ] = await this.prisma.$transaction([
      this.prisma.tenant.count(),
      this.prisma.company.count({
        where: {
          active: true,
          status: 'ACTIVE',
        },
      }),
      this.prisma.company.count({
        where: {
          active: false,
        },
      }),
      this.prisma.company.count({
        where: {
          status: 'SUSPENDED',
        },
      }),
      this.prisma.user.count({
        where: {
          active: true,
          status: 'ACTIVE',
        },
      }),
      this.prisma.user.count({
        where: {
          active: false,
        },
      }),
      this.prisma.user.count({
        where: {
          status: 'SUSPENDED',
        },
      }),
      this.prisma.user.count({
        where: {
          active: true,
          status: 'ACTIVE',
          platformRole: 'PLATFORM_SUPERADMIN',
        },
      }),
      this.prisma.companyModuleInstallation.count({
        where: {
          active: true,
        },
      }),
      this.prisma.companyModuleInstallation.count({
        where: {
          active: false,
        },
      }),
    ]);

    const tenants = await this.prisma.tenant.findMany({
      orderBy: [{ active: 'desc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        ruc: true,
        active: true,
        status: true,
        suspendedAt: true,
        suspendedUntil: true,
        suspensionCategory: true,
        suspensionReason: true,
        suspendedByPlatformUserId: true,
        reactivatedAt: true,
        reactivatedByPlatformUserId: true,
        reactivationReason: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            companies: true,
            users: true,
          },
        },
        companies: {
          orderBy: [{ active: 'desc' }, { legalName: 'asc' }],
          select: {
            id: true,
            code: true,
            legalName: true,
            tradeName: true,
            ruc: true,
            active: true,
            status: true,
            suspendedAt: true,
            suspendedUntil: true,
            suspensionCategory: true,
            suspensionReason: true,
            suspendedByPlatformUserId: true,
            reactivatedAt: true,
            reactivatedByPlatformUserId: true,
            reactivationReason: true,
            isDefault: true,
            createdAt: true,
            updatedAt: true,
            _count: {
              select: {
                businessUnits: true,
                userMemberships: true,
              },
            },
          },
        },
      },
    });

    const administrativeUsers = await this.prisma.user.findMany({
      orderBy: [
        {
          active: 'desc',
        },
        {
          fullName: 'asc',
        },
        {
          email: 'asc',
        },
      ],
      select: {
        id: true,
        tenantId: true,
        email: true,
        fullName: true,
        dni: true,
        role: true,
        platformRole: true,
        active: true,
        status: true,
        suspendedAt: true,
        suspendedUntil: true,
        suspensionCategory: true,
        suspensionReason: true,
        suspendedByPlatformUserId: true,
        reactivatedAt: true,
        reactivatedByPlatformUserId: true,
        reactivationReason: true,
        createdAt: true,
        updatedAt: true,
        tenant: {
          select: {
            id: true,
            name: true,
            ruc: true,
            active: true,
            status: true,
          },
        },
        companyMemberships: {
          orderBy: [
            {
              isDefault: 'desc',
            },
            {
              createdAt: 'asc',
            },
          ],
          select: {
            id: true,
            companyId: true,
            role: true,
            isDefault: true,
            active: true,
            company: {
              select: {
                id: true,
                code: true,
                legalName: true,
                tradeName: true,
                ruc: true,
                active: true,
                status: true,
              },
            },
          },
        },
      },
    });

    const overview = {
      tenants: tenants.map((tenant) => ({
        id: tenant.id,
        name: tenant.name,
        ruc: tenant.ruc,
        active: tenant.active,
        status: tenant.status,
        suspendedAt: tenant.suspendedAt?.toISOString() || null,
        suspendedUntil: tenant.suspendedUntil?.toISOString() || null,
        suspensionCategory: tenant.suspensionCategory,
        suspensionReason: tenant.suspensionReason,
        suspendedByPlatformUserId: tenant.suspendedByPlatformUserId,
        reactivatedAt: tenant.reactivatedAt?.toISOString() || null,
        reactivatedByPlatformUserId: tenant.reactivatedByPlatformUserId,
        reactivationReason: tenant.reactivationReason,
        companyCount: tenant._count.companies,
        userCount: tenant._count.users,
        createdAt: tenant.createdAt.toISOString(),
        updatedAt: tenant.updatedAt.toISOString(),
        companies: tenant.companies.map((company) => ({
          id: company.id,
          code: company.code,
          legalName: company.legalName,
          tradeName: company.tradeName,
          ruc: company.ruc,
          active: company.active,
          status: company.status,
          suspendedAt: company.suspendedAt?.toISOString() || null,
          suspendedUntil: company.suspendedUntil?.toISOString() || null,
          suspensionCategory: company.suspensionCategory,
          suspensionReason: company.suspensionReason,
          suspendedByPlatformUserId: company.suspendedByPlatformUserId,
          reactivatedAt: company.reactivatedAt?.toISOString() || null,
          reactivatedByPlatformUserId: company.reactivatedByPlatformUserId,
          reactivationReason: company.reactivationReason,
          isDefault: company.isDefault,
          businessUnitCount: company._count.businessUnits,
          membershipCount: company._count.userMemberships,
          createdAt: company.createdAt.toISOString(),
          updatedAt: company.updatedAt.toISOString(),
        })),
      })),
    };

    const alerts: Array<{
      id: string;
      level: 'INFO' | 'WARNING' | 'CRITICAL';
      title: string;
      message: string;
    }> = [];

    if (platformSuperadmins === 0) {
      alerts.push({
        id: 'NO_PLATFORM_SUPERADMIN',
        level: 'CRITICAL',
        title: 'No existe un superadministrador activo',
        message:
          'La plataforma necesita al menos una cuenta activa con PLATFORM_SUPERADMIN.',
      });
    }

    if (platformSuperadmins === 1) {
      alerts.push({
        id: 'SINGLE_PLATFORM_SUPERADMIN',
        level: 'WARNING',
        title: 'Existe un único superadministrador',
        message:
          'En producción deberá configurarse un mecanismo seguro de recuperación administrativa.',
      });
    }

    if (inactiveCompanies > 0) {
      alerts.push({
        id: 'INACTIVE_COMPANIES',
        level: 'INFO',
        title: 'Existen empresas inactivas',
        message: `${inactiveCompanies} empresa(s) se encuentran desactivadas y deben conservarse fuera de la operación habitual.`,
      });
    }

    if (inactiveUsers > 0) {
      alerts.push({
        id: 'INACTIVE_USERS',
        level: 'INFO',
        title: 'Existen usuarios inactivos',
        message: `${inactiveUsers} usuario(s) se encuentran desactivados.`,
      });
    }

    return {
      metrics: {
        registeredTenants,
        activeCompanies,
        inactiveCompanies,
        suspendedCompanies,
        activeUsers,
        inactiveUsers,
        suspendedUsers,
        platformSuperadmins,
        activeModuleInstallations,
        inactiveModuleInstallations,
      },
      overview: {
        ...overview,
        users: administrativeUsers.map((user) => ({
          id: user.id,
          tenantId: user.tenantId,
          email: user.email,
          fullName: user.fullName,
          dni: user.dni,
          role: user.role,
          platformRole: user.platformRole,
          active: user.active,
          status: user.status,
          suspendedAt: user.suspendedAt?.toISOString() || null,
          suspendedUntil: user.suspendedUntil?.toISOString() || null,
          suspensionCategory: user.suspensionCategory,
          suspensionReason: user.suspensionReason,
          suspendedByPlatformUserId: user.suspendedByPlatformUserId,
          reactivatedAt: user.reactivatedAt?.toISOString() || null,
          reactivatedByPlatformUserId: user.reactivatedByPlatformUserId,
          reactivationReason: user.reactivationReason,
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString(),
          tenant: user.tenant,
          memberships: user.companyMemberships.map((membership) => ({
            id: membership.id,
            companyId: membership.companyId,
            role: membership.role,
            isDefault: membership.isDefault,
            active: membership.active,
            company: membership.company,
          })),
        })),
      },
      security: {
        platformAccessProtected: true,
        requiredPlatformRole: 'PLATFORM_SUPERADMIN',
        mfaEnabled: false,
        dniePrepared: false,
        digitalSignaturePrepared: false,
      },
      alerts,
      generatedAt: new Date().toISOString(),
    };
  }
}
