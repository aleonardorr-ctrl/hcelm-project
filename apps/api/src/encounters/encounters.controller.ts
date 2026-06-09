import { Controller, Post, Get, Body, Param, UseGuards, Request, HttpCode, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('encounters')
@UseGuards(JwtAuthGuard)
export class EncountersController {
  constructor(private prisma: PrismaService) {}

  // ✅ NUEVO: Endpoint para obtener consultas por paciente (soluciona "Consulta Asociada" vacía)
  @Get('by-patient/:patientId')
  async getEncountersByPatient(@Param('patientId') patientId: string, @Request() req: any) {
    try {
      const { tenantId } = req.user;
      const encounters = await (this.prisma as any).clinicalEncounter.findMany({
        where: {
          tenantId,
          patientId,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
      return encounters;
    } catch (error: any) {
      console.error('Error obteniendo consultas por paciente:', error);
      return [];
    }
  }

  // ✅ EXISTENTE: Crear nueva consulta (con doctorId corregido)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() data: any, @Request() req: any) {
    try {
      const { tenantId } = req.user;
      const doctorId = req.user.userId; // ✅ AME HEALTH usa 'userId'

      if (!doctorId) {
        const campos = Object.keys(req.user || {}).join(', ');
        throw new Error(`No se encontró ID médico. Campos disponibles en sesión: [${campos}]`);
      }

      const anamnesisParsed = typeof data.anamnesis === 'string' ? JSON.parse(data.anamnesis) : (data.anamnesis || {});
      const physicalExamParsed = typeof data.physicalExam === 'string' ? JSON.parse(data.physicalExam) : (data.physicalExam || {});
      const diagnosesParsed = typeof data.diagnoses === 'string' ? JSON.parse(data.diagnoses) : [data.diagnoses].filter(Boolean);

      const encounter = await (this.prisma as any).clinicalEncounter.create({
        data: {
          tenantId,
          doctorId,
          patientId: data.patientId,
          reasonForConsultation: data.reasonForConsultation || '',
          anamnesis: anamnesisParsed,
          physicalExam: physicalExamParsed,
          diagnoses: diagnosesParsed,
          treatmentPlan: data.treatmentPlan || '',
          status: 'COMPLETED',
        },
      });

      return { message: 'Historia clínica guardada exitosamente', encounterId: encounter.id };
    } catch (error: any) {
      const msg = error.message?.split('\n').slice(0, 3).join(' ') || error.message;
      throw new HttpException(msg, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}