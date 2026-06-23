// Archivo: system-module-access.module.ts
// Ruta: apps/api/src/common/system-modules/system-module-access.module.ts
// Funcion: Proporciona el guard reutilizable de acceso por modulo.
import { Module } from '@nestjs/common';
import { SystemModuleGuard } from './system-module.guard';

@Module({
  providers: [SystemModuleGuard],
  exports: [SystemModuleGuard],
})
export class SystemModuleAccessModule {}
