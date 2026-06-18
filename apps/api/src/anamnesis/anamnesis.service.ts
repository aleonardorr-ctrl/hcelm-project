import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnamnesisService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, data: any) {
    try {
      const fechaAtencion = new Date(data.fechaAtencion);

      if (isNaN(fechaAtencion.getTime())) {
        throw new HttpException(
          'Fecha de atención inválida',
          HttpStatus.BAD_REQUEST,
        );
      }

      if (data.encounterId) {
        const encounter = await this.prisma.encounter.findFirst({
          where: {
            id: data.encounterId,
            tenantId,
            patientId: data.patientId,
          },
        });

        if (!encounter) {
          throw new HttpException(
            'La atención seleccionada no existe o no pertenece al paciente.',
            HttpStatus.BAD_REQUEST,
          );
        }
      }

      const created = await this.prisma.anamnesis.create({
        data: {
          tenantId,
          patientId: data.patientId,
          encounterId: data.encounterId || null,

          fechaAtencion,
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
      console.log('🔗 Encounter vinculado:', created.encounterId || 'Sin encounterId');

      return created;
    } catch (error: any) {
      console.error('❌ Error en Prisma (Anamnesis.create):', error);

      if (error instanceof HttpException) {
        throw error;
      }

      if (error.code === 'P2002') {
        throw new HttpException(
          'Ya existe una atención con estos datos únicos',
          HttpStatus.CONFLICT,
        );
      }

      if (error.code === 'P2003') {
        throw new HttpException(
          'El paciente o la atención seleccionada no existe en la base de datos',
          HttpStatus.BAD_REQUEST,
        );
      }

      throw new HttpException(
        `Error al guardar: ${error.message || 'Fallo inesperado'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}