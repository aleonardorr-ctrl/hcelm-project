import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { UpdatePatientDto } from './dto/update-patient.dto';

@Injectable()
export class PatientsService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, data: any) {
    try {
      return await this.prisma.patient.create({
        data: {
          tenantId,
          documentType: data.documentType,
          documentNumber: data.documentNumber,
          fullName: data.fullName,
          birthDate: new Date(data.birthDate),
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Ya existe un paciente con ese documento en esta clínica.',
        );
      }

      console.error('Error de Prisma:', error);
      throw new InternalServerErrorException('Error al crear el paciente');
    }
  }

  async findAll(tenantId: string) {
    return this.prisma.patient.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(tenantId: string, patientId: string, data: UpdatePatientDto) {
    try {
      const existingPatient = await this.prisma.patient.findFirst({
        where: {
          id: patientId,
          tenantId,
        },
      });

      if (!existingPatient) {
        throw new NotFoundException('Paciente no encontrado en esta clínica.');
      }

      return await this.prisma.patient.update({
        where: {
          id: patientId,
        },
        data: {
          documentType: data.documentType ?? existingPatient.documentType,
          documentNumber: data.documentNumber ?? existingPatient.documentNumber,
          fullName: data.fullName ?? existingPatient.fullName,
          birthDate: data.birthDate
            ? new Date(data.birthDate)
            : existingPatient.birthDate,
        },
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Ya existe otro paciente con ese documento en esta clínica.',
        );
      }

      console.error('Error de Prisma al actualizar paciente:', error);
      throw new InternalServerErrorException('Error al actualizar el paciente');
    }
  }
}