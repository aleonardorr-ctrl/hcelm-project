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

      const payloadUserId = String(payload?.sub || '').trim();
      const payloadTenantId = String(payload?.tenantId || '').trim();
      const payloadCompanyId = String(payload?.companyId || '').trim();
      const payloadBusinessUnitId = String(
        payload?.businessUnitId || '',
      ).trim();
      const payloadWarehouseId = String(payload?.warehouseId || '').trim();
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
