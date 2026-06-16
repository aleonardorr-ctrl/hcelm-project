import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEncounterDto } from './dto/create-encounter.dto';

@Injectable()
export class EncountersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateEncounterDto) {
    const patient = await this.prisma.patient.findFirst({
      where: {
        id: dto.patientId,
        tenantId,
      },
    });

    if (!patient) {
      throw new NotFoundException('Paciente no encontrado.');
    }

    const bmi =
      dto.bmi ??
      (dto.weightKg && dto.heightCm
        ? Number((dto.weightKg / Math.pow(dto.heightCm / 100, 2)).toFixed(2))
        : null);

    const glasgowTotal =
      dto.glasgowTotal ??
      (dto.glasgowEye && dto.glasgowVerbal && dto.glasgowMotor
        ? dto.glasgowEye + dto.glasgowVerbal + dto.glasgowMotor
        : null);

    return this.prisma.encounter.create({
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
            bmi,
            capillaryGlucose: dto.capillaryGlucose ?? null,
            painScale: dto.painScale ?? null,
            consciousness: dto.consciousness || null,
            glasgowEye: dto.glasgowEye ?? null,
            glasgowVerbal: dto.glasgowVerbal ?? null,
            glasgowMotor: dto.glasgowMotor ?? null,
            glasgowTotal,
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
  }

  async findByPatient(tenantId: string, patientId: string) {
    return this.prisma.encounter.findMany({
      where: {
        tenantId,
        patientId,
      },
      include: {
        patient: true,
        vitalSigns: true,
        anamnesis: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}