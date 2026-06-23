// Archivo: medication-catalog.module.ts
// Ruta: apps/api/src/medication-catalog/medication-catalog.module.ts
// Funcion: Registra el maestro corporativo protegido de productos y lotes.
import { Module } from '@nestjs/common';
import { SystemModuleAccessModule } from '../common/system-modules/system-module-access.module';
import { MedicationCatalogController } from './medication-catalog.controller';
import { MedicationCatalogService } from './medication-catalog.service';

@Module({
  imports: [SystemModuleAccessModule],
  controllers: [MedicationCatalogController],
  providers: [MedicationCatalogService],
  exports: [MedicationCatalogService],
})
export class MedicationCatalogModule {}
