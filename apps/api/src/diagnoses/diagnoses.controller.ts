import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { DiagnosesService } from './diagnoses.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('🩺 Diagnósticos CIE-10')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('diagnoses')
export class DiagnosesController {
  constructor(private readonly diagnosesService: DiagnosesService) {}

  @Get('search')
  @ApiOperation({ summary: 'Buscar diagnósticos CIE-10 por código o nombre' })
  search(@Query('q') query: string) {
    return this.diagnosesService.search(query || '');
  }
}
