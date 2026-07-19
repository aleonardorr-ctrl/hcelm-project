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

  async getDashboardSummary() {
    const [
      registeredTenants,
      activeCompanies,
      inactiveCompanies,
      activeUsers,
      inactiveUsers,
      platformSuperadmins,
      activeModuleInstallations,
      inactiveModuleInstallations,
    ] = await this.prisma.$transaction([
      this.prisma.tenant.count(),
      this.prisma.company.count({
        where: {
          active: true,
        },
      }),
      this.prisma.company.count({
        where: {
          active: false,
        },
      }),
      this.prisma.user.count({
        where: {
          active: true,
        },
      }),
      this.prisma.user.count({
        where: {
          active: false,
        },
      }),
      this.prisma.user.count({
        where: {
          active: true,
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

    const overview = {
      tenants: tenants.map((tenant) => ({
        id: tenant.id,
        name: tenant.name,
        ruc: tenant.ruc,
        active: tenant.active,
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
        activeUsers,
        inactiveUsers,
        platformSuperadmins,
        activeModuleInstallations,
        inactiveModuleInstallations,
      },
      overview,
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
