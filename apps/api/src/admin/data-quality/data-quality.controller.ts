import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Request,
  UnauthorizedException,
} from '@nestjs/common';
import { DataQualityService } from './data-quality.service';

@Controller('admin/data-quality')
export class DataQualityController {
  constructor(private readonly dataQualityService: DataQualityService) {}

  @Get('patients')
  async getProblemPatients(@Request() req: any) {
    const tenantId = this.getTenantId(req);
    return this.dataQualityService.getProblemPatients(tenantId);
  }

  @Get('patients/:id')
  async getPatientQualityDetail(@Request() req: any, @Param('id') id: string) {
    const tenantId = this.getTenantId(req);
    return this.dataQualityService.getPatientQualityDetail(tenantId, id);
  }

  @Patch('patients/:id/repair-id')
  async repairPatientId(@Request() req: any, @Param('id') id: string) {
    const tenantId = this.getTenantId(req);
    return this.dataQualityService.repairPatientId(tenantId, id);
  }

  @Delete('patients/:id/safe-delete')
  async safeDeletePatient(@Request() req: any, @Param('id') id: string) {
    const tenantId = this.getTenantId(req);
    return this.dataQualityService.safeDeletePatient(tenantId, id);
  }

  private getTenantId(req: any): string {
    const tenantId =
      req?.user?.tenantId ||
      req?.user?.tenant?.id ||
      req?.body?.tenantId ||
      req?.headers?.['x-tenant-id'];

    if (!tenantId) {
      throw new UnauthorizedException(
        'No se pudo identificar el tenant del usuario autenticado.',
      );
    }

    return String(tenantId);
  }
}
