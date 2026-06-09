import { Controller, Post, Body, UseGuards, UseInterceptors } from '@nestjs/common';
import { PrescriptionsService } from './prescriptions.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuditInterceptor } from '../common/interceptors/audit.interceptor';

@Controller('prescriptions')
@UseGuards(JwtAuthGuard)
@UseInterceptors(AuditInterceptor)
export class PrescriptionsController {
  constructor(private readonly prescriptionsService: PrescriptionsService) {}

  @Post()
  create(
    @CurrentUser() user: any,
    @Body() body: { patientId: string; medicationIds: string[] },
  ) {
    return this.prescriptionsService.issuePrescription(
      user.tenantId,
      user.userId,
      body.patientId,
      body.medicationIds,
    );
  }
}