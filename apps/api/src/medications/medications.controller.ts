/**
 * Archivo: medications.controller.ts
 * Ruta: apps/api/src/medications/medications.controller.ts
 * Funcion: Busqueda clinica de productos activos para receta.
 */
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { MedicationsService } from './medications.service';

@Controller('medications')
@UseGuards(JwtAuthGuard)
export class MedicationsController {
  constructor(private readonly medicationsService: MedicationsService) {}

  @Get('search')
  search(@CurrentUser() user: any, @Query('q') query: string) {
    return this.medicationsService.search(user.tenantId, query || '');
  }
}
