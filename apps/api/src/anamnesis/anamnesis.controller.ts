import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  HttpException,
  HttpStatus,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AnamnesisService } from './anamnesis.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuditInterceptor } from '../common/interceptors/audit.interceptor';
import { SaveAnamnesisDto } from './dto/save-anamnesis.dto';

@UseGuards(JwtAuthGuard)
@UseInterceptors(AuditInterceptor)
@Controller('anamnesis')
export class AnamnesisController {
  constructor(private readonly anamnesisService: AnamnesisService) {}

  @Post()
  async create(
    @CurrentUser() user: any,
    @Body() createAnamnesisDto: SaveAnamnesisDto,
  ) {
    try {
      console.log('📥 Recibiendo Anamnesis:', {
        tenantId: user.tenantId,
        patientId: createAnamnesisDto.patientId,
        encounterId: createAnamnesisDto.encounterId || null,
        motivo: createAnamnesisDto.motivoConsulta,
      });

      return await this.anamnesisService.create(user.tenantId, {
        ...createAnamnesisDto,
        issuedBy: user.email || user.userId,
      });
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
    @CurrentUser() user: any,
    @Param('encounterId') encounterId: string,
  ) {
    try {
      if (!encounterId) {
        throw new HttpException(
          'El encounterId es obligatorio',
          HttpStatus.BAD_REQUEST,
        );
      }

      console.log('🔎 Buscando anamnesis por encounterId:', {
        tenantId: user.tenantId,
        encounterId,
      });

      return await this.anamnesisService.findByEncounter(
        user.tenantId,
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
