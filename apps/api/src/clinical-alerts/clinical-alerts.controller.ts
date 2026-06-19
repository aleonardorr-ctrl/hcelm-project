import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ClinicalAlertsService } from './clinical-alerts.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

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
  getReferences() {
    return this.clinicalAlertsService.getReferences();
  }

  @Get('references/:key')
  getReferenceByKey(@Param('key') key: string) {
    return this.clinicalAlertsService.getReferenceByKey(key);
  }
}