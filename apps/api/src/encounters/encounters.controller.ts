import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { EncountersService } from './encounters.service';
import { CreateEncounterDto } from './dto/create-encounter.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('🩺 Atenciones')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('encounters')
export class EncountersController {
  constructor(private readonly encountersService: EncountersService) {}

  @Post()
  @ApiOperation({
    summary: 'Crear nueva atención con funciones vitales',
  })
  @ApiResponse({
    status: 201,
    description: 'Atención creada correctamente',
  })
  create(
    @CurrentUser() user: any,
    @Body() createEncounterDto: CreateEncounterDto,
  ) {
    return this.encountersService.create(user.tenantId, createEncounterDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar atenciones por paciente',
  })
  @ApiQuery({
    name: 'patientId',
    required: true,
    description: 'ID del paciente',
  })
  findByPatient(@CurrentUser() user: any, @Query('patientId') patientId: string) {
    return this.encountersService.findByPatient(user.tenantId, patientId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obtener detalle de una atención',
  })
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.encountersService.findOne(user.tenantId, id);
  }

  @Patch(':id/status')
  @ApiOperation({
    summary: 'Actualizar estado de una atención',
    description:
      'Permite cambiar el estado clínico de la atención: triado, en_atencion, atendido, observacion, referido, alta o cancelado.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          example: 'en_atencion',
          enum: [
            'triado',
            'en_atencion',
            'atendido',
            'observacion',
            'referido',
            'alta',
            'cancelado',
          ],
        },
      },
      required: ['status'],
    },
  })
  updateStatus(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    return this.encountersService.updateStatus(user.tenantId, id, status);
  }

  @Patch(':id/start')
  @ApiOperation({
    summary: 'Marcar atención como EN ATENCIÓN',
  })
  markAsInProgress(@CurrentUser() user: any, @Param('id') id: string) {
    return this.encountersService.markAsInProgress(user.tenantId, id);
  }

  @Patch(':id/attended')
  @ApiOperation({
    summary: 'Marcar atención como ATENDIDO',
  })
  markAsAttended(@CurrentUser() user: any, @Param('id') id: string) {
    return this.encountersService.markAsAttended(user.tenantId, id);
  }
}