/**
 * Archivo: diagnoses.controller.ts
 * Ruta: apps/api/src/diagnoses/diagnoses.controller.ts
 * Función: Consulta segura de catálogos diagnósticos por tenant.
 */
import {
  Controller,
  Get,
  Query,
  Request,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DiagnosesService } from './diagnoses.service';

@ApiTags('Diagnósticos CIE')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('diagnoses')
export class DiagnosesController {
  constructor(private readonly diagnosesService: DiagnosesService) {}

  @Get('search')
  @ApiOperation({ summary: 'Buscar diagnósticos por código, nombre o sinónimo' })
  search(
    @Request() req: any,
    @Query('q') query = '',
    @Query('system') system = 'CIE10',
  ) {
    return this.diagnosesService.search(
      this.getTenantId(req),
      query,
      system,
    );
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
