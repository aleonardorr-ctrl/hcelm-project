/**
 * Archivo: data-quality.controller.ts
 * Ruta: apps/api/src/admin/data-quality/data-quality.controller.ts
 * Función: Endpoints administrativos para revisar y corregir la calidad de datos.
 */
import {
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { DataQualityService } from './data-quality.service';

@UseGuards(JwtAuthGuard)
@Controller('admin/data-quality')
export class DataQualityController {
  constructor(private readonly dataQualityService: DataQualityService) {}

  @Get('patients')
  async getProblemPatients(@Request() req: any) {
    const tenantId = this.getTenantId(req);
    return this.dataQualityService.getProblemPatients(tenantId);
  }

  @Post('patients/generate-missing-hce')
  async generateMissingHceNumbers(@Request() req: any) {
    const tenantId = this.getTenantId(req);
    return this.dataQualityService.generateMissingHceNumbers(tenantId);
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
    const user = req?.user || {};

    const tenantId =
      user?.tenantId ||
      user?.tenant_id ||
      user?.tenant?.id ||
      user?.payload?.tenantId ||
      user?.payload?.tenant_id ||
      req?.headers?.['x-tenant-id'];

    if (!tenantId) {
      throw new UnauthorizedException(
        'No se pudo identificar el tenant del usuario autenticado.',
      );
    }

    return String(tenantId);
  }
}
