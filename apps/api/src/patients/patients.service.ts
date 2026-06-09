import { Injectable, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class PatientsService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, data: any) {
    try {
      return await this.prisma.patient.create({
        data: {
          tenantId, // 👈 El Multi-tenant inyectado mágicamente desde el Token
          documentType: data.documentType,
          documentNumber: data.documentNumber,
          fullName: data.fullName,
          birthDate: new Date(data.birthDate), // 👈 Convertimos el string a Objeto Date
        },
      });
    } catch (error) {
      // Si Prisma detecta que el DNI ya existe en esta clínica (Código P2002)
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Ya existe un paciente con ese documento en esta clínica.');
      }
      console.error('Error de Prisma:', error);
      throw new InternalServerErrorException('Error al crear el paciente');
    }
  }

  async findAll(tenantId: string) {
    return this.prisma.patient.findMany({
      where: { tenantId }, // 👈 LA MAGIA: Solo devuelve pacientes de SU clínica
      orderBy: { createdAt: 'desc' },
    });
  }
}