import { Controller, Get, Put, Body, UseGuards, Request } from '@nestjs/common';
import { EstablishmentService } from './establishment.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('establishment')
@UseGuards(JwtAuthGuard) // Solo autenticación, sin roles por ahora
export class EstablishmentController {
  constructor(private readonly service: EstablishmentService) {}

  @Get()
  async getConfig(@Request() req: any) {
    try {
      return await this.service.getConfig(req.user.tenantId);
    } catch (error) {
      console.error('Error en GET /establishment:', error);
      throw error;
    }
  }

  @Put()
  async updateConfig(@Body() data: any, @Request() req: any) {
    try {
      return await this.service.updateConfig(req.user.tenantId, data);
    } catch (error) {
      console.error('Error en PUT /establishment:', error);
      throw error;
    }
  }
}