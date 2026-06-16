import { Body, Controller, Get, Param, Post, Request, UseGuards } from '@nestjs/common';
import { EncountersService } from './encounters.service';
import { CreateEncounterDto } from './dto/create-encounter.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('encounters')
@UseGuards(JwtAuthGuard)
export class EncountersController {
  constructor(private readonly encountersService: EncountersService) {}

  @Post()
  create(@Request() req: any, @Body() dto: CreateEncounterDto) {
    return this.encountersService.create(req.user.tenantId, dto);
  }

  @Get('patient/:patientId')
  findByPatient(@Request() req: any, @Param('patientId') patientId: string) {
    return this.encountersService.findByPatient(req.user.tenantId, patientId);
  }

  // Ruta compatible con el nombre anterior que ya tenías.
  @Get('by-patient/:patientId')
  findByPatientLegacy(@Request() req: any, @Param('patientId') patientId: string) {
    return this.encountersService.findByPatient(req.user.tenantId, patientId);
  }
}