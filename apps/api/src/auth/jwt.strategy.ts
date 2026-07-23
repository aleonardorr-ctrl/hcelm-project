import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const jwtSecret = configService.get<string>('JWT_SECRET') || '';

    if (jwtSecret.length < 32) {
      throw new Error(
        'JWT_SECRET debe estar configurado con al menos 32 caracteres.',
      );
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  async validate(payload: any) {
    const payloadUserId = String(payload?.sub || '').trim();
    const payloadTenantId = String(payload?.tenantId || '').trim();
    const payloadCompanyId = String(payload?.companyId || '').trim();
    const payloadBusinessUnitId = String(payload?.businessUnitId || '').trim();
    const payloadWarehouseId = String(payload?.warehouseId || '').trim();

    if (!payloadUserId || !payloadTenantId) {
      throw new UnauthorizedException(
        'El token no contiene una identidad válida.',
      );
    }

    const currentUser = await this.prisma.user.findFirst({
      where: {
        id: payloadUserId,
        tenantId: payloadTenantId,
      },
      select: {
        active: true,
        status: true,
        tenant: {
          select: {
            active: true,
            status: true,
          },
        },
      },
    });

    if (
      !currentUser ||
      !currentUser.active ||
      currentUser.status !== 'ACTIVE'
    ) {
      throw new UnauthorizedException(
        'La cuenta autenticada está suspendida o inactiva.',
      );
    }

    if (!currentUser.tenant.active || currentUser.tenant.status !== 'ACTIVE') {
      throw new UnauthorizedException('El tenant está suspendido o inactivo.');
    }

    if (payloadCompanyId) {
      const company = await this.prisma.company.findFirst({
        where: {
          id: payloadCompanyId,
          tenantId: payloadTenantId,
        },
        select: {
          active: true,
          status: true,
        },
      });

      if (!company || !company.active || company.status !== 'ACTIVE') {
        throw new UnauthorizedException(
          'La empresa está suspendida o inactiva.',
        );
      }
    }

    if (payloadBusinessUnitId) {
      const businessUnit = await this.prisma.businessUnit.findFirst({
        where: {
          id: payloadBusinessUnitId,
          tenantId: payloadTenantId,
          companyId: payloadCompanyId,
          active: true,
        },
        select: { id: true },
      });

      if (!businessUnit) {
        throw new UnauthorizedException(
          'La unidad de negocio está inactiva o no pertenece al contexto autenticado.',
        );
      }
    }

    if (payloadWarehouseId) {
      const warehouse = await this.prisma.warehouse.findFirst({
        where: {
          id: payloadWarehouseId,
          tenantId: payloadTenantId,
          companyId: payloadCompanyId,
          businessUnitId: payloadBusinessUnitId,
          active: true,
        },
        select: { id: true },
      });

      if (!warehouse) {
        throw new UnauthorizedException(
          'El almacén está inactivo o no pertenece al contexto autenticado.',
        );
      }
    }

    const platformAccessAuditId = String(
      payload?.platformAccessAuditId || '',
    ).trim();

    if (platformAccessAuditId) {
      const audit = await this.prisma.platformCompanyAccessAudit.findUnique({
        where: {
          id: platformAccessAuditId,
        },
        select: {
          id: true,
          platformUserId: true,
          tenantId: true,
          companyId: true,
          businessUnitId: true,
          warehouseId: true,
          accessMode: true,
          status: true,
          exitedAt: true,
        },
      });

      if (!audit) {
        throw new UnauthorizedException(
          'El acceso temporal de plataforma ya no existe.',
        );
      }

      if (audit.status !== 'ACTIVE' || audit.exitedAt) {
        throw new UnauthorizedException(
          'El acceso temporal de plataforma fue cerrado. Regrese al panel global.',
        );
      }

      const auditWarehouseId = String(audit.warehouseId || '').trim();

      const contextMatches =
        audit.platformUserId === payloadUserId &&
        audit.tenantId === payloadTenantId &&
        audit.companyId === payloadCompanyId &&
        audit.businessUnitId === payloadBusinessUnitId &&
        auditWarehouseId === payloadWarehouseId &&
        audit.accessMode === payload?.accessMode;

      if (!contextMatches) {
        throw new UnauthorizedException(
          'El contexto del acceso temporal no coincide con la auditoría registrada.',
        );
      }
    }

    return {
      userId: payload.sub,
      email: payload.email,
      fullName: payload.fullName,
      role: payload.role,
      platformRole: payload.platformRole,
      tenantId: payload.tenantId,
      tenantName: payload.tenantName,
      companyId: payload.companyId,
      companyCode: payload.companyCode,
      companyName: payload.companyName,
      companyLegalName: payload.companyLegalName,
      companyRuc: payload.companyRuc,
      membershipRole: payload.membershipRole,
      businessUnitId: payload.businessUnitId,
      businessUnitCode: payload.businessUnitCode,
      businessUnitName: payload.businessUnitName,
      warehouseId: payload.warehouseId,
      warehouseCode: payload.warehouseCode,
      warehouseName: payload.warehouseName,
      accessMode: payload.accessMode,
      contextSource: payload.contextSource,
      contextIssuedAt: payload.contextIssuedAt,
      platformAccessAuditId: payload.platformAccessAuditId,
      platformAccessReason: payload.platformAccessReason,
    };
  }
}
