import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Request,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { AnamnesisService } from './anamnesis.service';

@Controller('anamnesis')
export class AnamnesisController {
  constructor(private readonly anamnesisService: AnamnesisService) {}

  @Post()
  async create(@Request() req: any, @Body() createAnamnesisDto: any) {
    try {
      const tenantId =
        req.user?.tenantId || '00000000-0000-0000-0000-000000000001';

      console.log('📥 Recibiendo Anamnesis:', {
        tenantId,
        patientId: createAnamnesisDto.patientId,
        encounterId: createAnamnesisDto.encounterId || null,
        motivo: createAnamnesisDto.motivoConsulta,
      });

      if (!createAnamnesisDto.patientId || !createAnamnesisDto.motivoConsulta) {
        throw new HttpException(
          'Faltan campos obligatorios (Paciente y Motivo)',
          HttpStatus.BAD_REQUEST,
        );
      }

      return await this.anamnesisService.create(tenantId, createAnamnesisDto);
    } catch (error: any) {
      console.error('❌ Error en POST /anamnesis:', error);

      throw new HttpException(
        error.response?.message ||
          error.message ||
          'Error interno al guardar la anamnesis',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('by-encounter/:encounterId')
  async findByEncounter(
    @Request() req: any,
    @Param('encounterId') encounterId: string,
  ) {
    try {
      const tenantId =
        req.user?.tenantId || '00000000-0000-0000-0000-000000000001';

      if (!encounterId) {
        throw new HttpException(
          'El encounterId es obligatorio',
          HttpStatus.BAD_REQUEST,
        );
      }

      console.log('🔎 Buscando anamnesis por encounterId:', {
        tenantId,
        encounterId,
      });

      return await this.anamnesisService.findByEncounter(
        tenantId,
        encounterId,
      );
    } catch (error: any) {
      console.error('❌ Error en GET /anamnesis/by-encounter:', error);

      throw new HttpException(
        error.response?.message ||
          error.message ||
          'Error interno al buscar la anamnesis',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}