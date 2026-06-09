import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Obtenemos los roles requeridos por el decorador @Roles()
    const requiredRoles = this.reflector.get<string[]>('roles', context.getHandler());
    
    // Si no se especifican roles, permitimos el acceso
    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Verificamos si el usuario tiene uno de los roles requeridos
    return requiredRoles.includes(user?.role);
  }
}