import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEncounterDto } from './dto/create-encounter.dto';

@Injectable()
export class EncountersService {
  constructor(private readonly prisma: PrismaService) {}

  private calculateBmi(weightKg?: number, heightCm?: number): number | null {
    if (!weightKg || !heightCm) return null;

    const heightM = heightCm / 100;

    if (heightM <= 0) return null;

    const bmi = weightKg / (heightM * heightM);

    return Number(bmi.toFixed(2));
  }

  private calculateGlasgowTotal(
    glasgowEye?: number,
    glasgowVerbal?: number,
    glasgowMotor?: number,
  ): number | null {
    if (!glasgowEye && !glasgowVerbal && !glasgowMotor) return null;

    return (glasgowEye || 0) + (glasgowVerbal || 0) + (glasgowMotor || 0);
  }

  async create(tenantId: string, dto: CreateEncounterDto) {
    try {
      const patient = await this.prisma.patient.findFirst({
        where: {
          id: dto.patientId,
          tenantId,
        },
      });

      if (!patient) {
        throw new NotFoundException('Paciente no encontrado en esta clínica.');
      }

      const calculatedBmi = this.calculateBmi(dto.weightKg, dto.heightCm);

      const calculatedGlasgowTotal = this.calculateGlasgowTotal(
        dto.glasgowEye,
        dto.glasgowVerbal,
        dto.glasgowMotor,
      );

      return await this.prisma.encounter.create({
        data: {
          tenantId,
          patientId: dto.patientId,
          type: dto.type || 'consulta',
          reason: dto.reason || null,
          status: 'open',

          vitalSigns: {
            create: {
              systolicBP: dto.systolicBP ?? null,
              diastolicBP: dto.diastolicBP ?? null,
              heartRate: dto.heartRate ?? null,
              respiratoryRate: dto.respiratoryRate ?? null,
              temperature: dto.temperature ?? null,
              oxygenSat: dto.oxygenSat ?? null,

              weightKg: dto.weightKg ?? null,
              heightCm: dto.heightCm ?? null,
              bmi: calculatedBmi ?? dto.bmi ?? null,

              capillaryGlucose: dto.capillaryGlucose ?? null,
              painScale: dto.painScale ?? null,

              consciousness: dto.consciousness || null,
              glasgowEye: dto.glasgowEye ?? null,
              glasgowVerbal: dto.glasgowVerbal ?? null,
              glasgowMotor: dto.glasgowMotor ?? null,
              glasgowTotal: calculatedGlasgowTotal ?? dto.glasgowTotal ?? null,

              oxygenSupport: dto.oxygenSupport || null,
              fio2: dto.fio2 ?? null,
              nursingNotes: dto.nursingNotes || null,
            },
          },
        },
        include: {
          patient: true,
          vitalSigns: true,
        },
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      console.error('Error al crear atención:', error);
      throw new InternalServerErrorException('Error al crear la atención.');
    }
  }

  async findByPatient(tenantId: string, patientId: string) {
    return this.prisma.encounter.findMany({
      where: {
        tenantId,
        patientId,
      },
      include: {
        vitalSigns: true,
        anamnesis: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(tenantId: string, encounterId: string) {
    const encounter = await this.prisma.encounter.findFirst({
      where: {
        id: encounterId,
        tenantId,
      },
      include: {
        patient: true,
        vitalSigns: true,
        anamnesis: true,
      },
    });

    if (!encounter) {
      throw new NotFoundException('Atención no encontrada.');
    }

    return encounter;
  }
}