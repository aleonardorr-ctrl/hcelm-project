import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // 👇 AQUÍ ESTÁ LA MAGIA: Agregamos un respaldo con ||
      secretOrKey: configService.get<string>('JWT_SECRET') || 'hcelm_jwt_secret_dev_2026_cambiar_en_produccion',
    });
  }

  async validate(payload: any) {
    // Esto es lo que estará disponible en req.user en las rutas protegidas
    return { 
      userId: payload.sub, 
      email: payload.email, 
      role: payload.role, 
      tenantId: payload.tenantId 
    };
  }
}