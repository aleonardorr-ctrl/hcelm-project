import { Controller, Post, Body, Request, HttpException, HttpStatus } from '@nestjs/common';
import { AnamnesisService } from './anamnesis.service';

@Controller('anamnesis')
export class AnamnesisController {
  constructor(private readonly anamnesisService: AnamnesisService) {}

  @Post()
  async create(@Request() req: any, @Body() createAnamnesisDto: any) {
    try {
      // ✅ Extraer tenantId del token JWT o usar fallback para desarrollo
      const tenantId = req.user?.tenantId || '00000000-0000-0000-0000-000000000001';
      
      console.log('📥 Recibiendo Anamnesis:', {
        tenantId,
        patientId: createAnamnesisDto.patientId,
        motivo: createAnamnesisDto.motivoConsulta
      });

      if (!createAnamnesisDto.patientId || !createAnamnesisDto.motivoConsulta) {
        throw new HttpException('Faltan campos obligatorios (Paciente y Motivo)', HttpStatus.BAD_REQUEST);
      }

      return await this.anamnesisService.create(tenantId, createAnamnesisDto);
    } catch (error) {
      console.error('❌ Error en POST /anamnesis:', error);
      throw new HttpException(
        error.response?.message || error.message || 'Error interno al guardar la anamnesis',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}