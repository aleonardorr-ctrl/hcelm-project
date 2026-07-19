import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
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

  validate(payload: any) {
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
    };
  }
}
