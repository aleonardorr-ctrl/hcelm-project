/**
 * Archivo: laboratory-catalog.module.ts
 * Ruta: apps/api/src/laboratory-catalog/laboratory-catalog.module.ts
 * Funcion: Registra el catalogo maestro de examenes de laboratorio.
 */
import { Module } from '@nestjs/common';
import { LaboratoryCatalogController } from './laboratory-catalog.controller';
import { LaboratoryCatalogService } from './laboratory-catalog.service';

@Module({
  controllers: [LaboratoryCatalogController],
  providers: [LaboratoryCatalogService],
  exports: [LaboratoryCatalogService],
})
export class LaboratoryCatalogModule {}
