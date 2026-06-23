// Archivo: system-module.guard.ts
// Ruta: apps/api/src/common/system-modules/system-module.guard.ts
// Funcion: Bloquea endpoints cuyos modulos no estan habilitados para el tenant.
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { REQUIRED_SYSTEM_MODULES_KEY } from './require-system-modules.decorator';

@Injectable()
export class SystemModuleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const requiredModules = this.reflector.getAllAndOverride<string[]>(
      REQUIRED_SYSTEM_MODULES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredModules?.length) return true;

    const request = context.switchToHttp().getRequest();
    const user = request?.user || {};
    const tenantId =
      user.tenantId ||
      user.tenant_id ||
      user.tenant?.id ||
      user.payload?.tenantId ||
      user.payload?.tenant_id ||
      request?.headers?.['x-tenant-id'];

    if (!tenantId) {
      throw new UnauthorizedException('No se pudo identificar el tenant.');
    }

    const enabledModule = await this.prisma.tenantSystemModule.findFirst({
      where: {
        tenantId: String(tenantId),
        key: { in: requiredModules },
        enabled: true,
      },
      select: { key: true },
    });

    if (!enabledModule) {
      throw new ForbiddenException(
        'El modulo requerido no esta habilitado para esta institucion.',
      );
    }

    return true;
  }
}
