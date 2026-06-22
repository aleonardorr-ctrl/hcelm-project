// Archivo: clinical-alerts.controller.ts
// Ruta: apps/api/src/clinical-alerts/clinical-alerts.controller.ts
// Funcion: Expone alertas y referencias clinicas por tenant autenticado.
import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ClinicalAlertsService } from './clinical-alerts.service';

@UseGuards(JwtAuthGuard)
@Controller('clinical-alerts')
export class ClinicalAlertsController {
  constructor(private readonly clinicalAlertsService: ClinicalAlertsService) {}

  @Get('patient/:patientId')
  getByPatient(@CurrentUser() user: any, @Param('patientId') patientId: string) {
    return this.clinicalAlertsService.getByPatient(user.tenantId, patientId);
  }

  @Get('encounter/:encounterId')
  getByEncounter(
    @CurrentUser() user: any,
    @Param('encounterId') encounterId: string,
  ) {
    return this.clinicalAlertsService.getByEncounter(
      user.tenantId,
      encounterId,
    );
  }

  @Get('references')
  getReferences(@CurrentUser() user: any) {
    return this.clinicalAlertsService.getReferences(user.tenantId);
  }

  @Get('references/:key')
  getReferenceByKey(@CurrentUser() user: any, @Param('key') key: string) {
    return this.clinicalAlertsService.getReferenceByKey(user.tenantId, key);
  }
}
