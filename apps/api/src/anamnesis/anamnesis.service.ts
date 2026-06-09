import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnamnesisService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, data: any) {
    try {
      // ✅ Validar fecha
      const fechaAtencion = new Date(data.fechaAtencion);
      if (isNaN(fechaAtencion.getTime())) {
        throw new HttpException('Fecha de atención inválida', HttpStatus.BAD_REQUEST);
      }

      // ✅ Guardar en BD (ahora `prisma.anamnesis` existe gracias al generate)
      const created = await this.prisma.anamnesis.create({
        data: {
          tenantId,
          patientId: data.patientId,
          fechaAtencion: fechaAtencion,
          motivoConsulta: data.motivoConsulta,
          tiempoEnfermedad: data.tiempoEnfermedad || null,
          anamnesisActual: data.anamnesisActual || null,
          funcionesBiologicas: data.funcionesBiologicas || null,
          antecedentesPersonales: data.antecedentesPersonales || null,
          antecedentesFamiliares: data.antecedentesFamiliares || null,
          signosVitales: data.signosVitales || {},
          examenFisico: data.examenFisico || null,
          diagnosticoPrincipal: data.diagnosticoPrincipal || {},
          diagnosticosSecundarios: data.diagnosticosSecundarios || [],
          examenesAuxiliares: data.examenesAuxiliares || null,
          prescripcionesFarmacia: data.prescripcionesFarmacia || null,
          destinoFinal: data.destinoFinal || 'alta_medica',
          issuedBy: data.issuedBy || 'admin@amehealth.pe',
        },
      });

      console.log('✅ Anamnesis guardada con ID:', created.id);
      return created;
    } catch (error: any) {
      console.error('❌ Error en Prisma (Anamnesis.create):', error);
      
      // Manejo específico de errores de Prisma
      if (error.code === 'P2002') {
        throw new HttpException('Ya existe una atención con estos datos únicos', HttpStatus.CONFLICT);
      }
      if (error.code === 'P2003') {
        throw new HttpException('El paciente seleccionado no existe en la base de datos', HttpStatus.BAD_REQUEST);
      }

      throw new HttpException(
        `Error al guardar: ${error.message || 'Fallo inesperado'}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}