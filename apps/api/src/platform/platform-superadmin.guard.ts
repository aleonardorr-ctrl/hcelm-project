import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

@Injectable()
export class PlatformSuperadminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request?.user;

    if (user?.platformRole !== 'PLATFORM_SUPERADMIN') {
      throw new ForbiddenException(
        'Acceso reservado al superadministrador de la plataforma HCELM.',
      );
    }

    return true;
  }
}
