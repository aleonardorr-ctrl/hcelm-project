import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { PatientsService } from './patients.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuditInterceptor } from '../common/interceptors/audit.interceptor';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';

@ApiTags('👥 Pacientes')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@UseInterceptors(AuditInterceptor)
@Controller('patients')
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  @Post()
  @ApiOperation({ summary: 'Registrar nuevo paciente en la clínica' })
  @ApiResponse({ status: 201, description: 'Paciente registrado exitosamente' })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos (validación en español)',
  })
  @ApiResponse({
    status: 409,
    description: 'El paciente ya existe en esta clínica',
  })
  create(
    @CurrentUser() user: any,
    @Body() createPatientDto: CreatePatientDto,
  ) {
    return this.patientsService.create(user.tenantId, createPatientDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar pacientes de la clínica (Multi-tenant)' })
  findAll(@CurrentUser() user: any) {
    return this.patientsService.findAll(user.tenantId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar datos de un paciente' })
  @ApiResponse({ status: 200, description: 'Paciente actualizado exitosamente' })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos (validación en español)',
  })
  @ApiResponse({ status: 404, description: 'Paciente no encontrado' })
  @ApiResponse({
    status: 409,
    description: 'Ya existe otro paciente con ese documento',
  })
  update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() updatePatientDto: UpdatePatientDto,
  ) {
    return this.patientsService.update(user.tenantId, id, updatePatientDto);
  }
}