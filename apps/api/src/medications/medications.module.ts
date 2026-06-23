/**
 * Archivo: medications.module.ts
 * Ruta: apps/api/src/medications/medications.module.ts
 * Funcion: Registra la busqueda clinica de medicamentos.
 */
import { Module } from '@nestjs/common';
import { MedicationsController } from './medications.controller';
import { MedicationsService } from './medications.service';

@Module({
  controllers: [MedicationsController],
  providers: [MedicationsService],
  exports: [MedicationsService],
})
export class MedicationsModule {}
