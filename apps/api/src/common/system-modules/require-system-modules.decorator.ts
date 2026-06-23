// Archivo: require-system-modules.decorator.ts
// Ruta: apps/api/src/common/system-modules/require-system-modules.decorator.ts
// Funcion: Declara los modulos habilitados que permiten acceder a un endpoint.
import { SetMetadata } from '@nestjs/common';

export const REQUIRED_SYSTEM_MODULES_KEY = 'requiredSystemModules';

export const RequireSystemModules = (...moduleKeys: string[]) =>
  SetMetadata(REQUIRED_SYSTEM_MODULES_KEY, moduleKeys);
