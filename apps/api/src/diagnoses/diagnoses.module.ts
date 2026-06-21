/**
 * Archivo: diagnoses.module.ts
 * Ruta: apps/api/src/diagnoses/diagnoses.module.ts
 * Función: Registra el controlador y servicio de catálogos diagnósticos.
 */
import { Module } from '@nestjs/common';
import { DiagnosesController } from './diagnoses.controller';
import { DiagnosesService } from './diagnoses.service';

@Module({
  controllers: [DiagnosesController],
  providers: [DiagnosesService],
  exports: [DiagnosesService],
})
export class DiagnosesModule {}
