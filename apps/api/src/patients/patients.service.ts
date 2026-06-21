import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { generateHceNumber } from '../common/utils/hce-number.util';

@Injectable()
export class PatientsService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, data: CreatePatientDto) {
    try {
      const initialHceNumber = generateHceNumber({
        documentType: data.documentType,
        documentNumber: data.documentNumber,
      });

      const patient = await this.prisma.patient.create({
        data: {
          tenantId,
          documentType: data.documentType,
          documentNumber: data.documentNumber,
          hceNumber: initialHceNumber,
          fullName: data.fullName,
          birthDate: data.birthDate ? new Date(data.birthDate) : null,

          gender: data.gender || null,
          phone: data.phone || null,
          email: (data as any).email || null,
          address: data.address || null,
          allergies: data.allergies || null,
          chronicDiseases: data.chronicDiseases || null,
          usualMedication: data.usualMedication || null,
          observations: data.observations || null,
        },
      });

      if (!patient.hceNumber) {
        const fallbackHceNumber = generateHceNumber({
          documentType: patient.documentType,
          documentNumber: patient.documentNumber,
          patientId: patient.id,
          createdAt: patient.createdAt,
        });

        if (fallbackHceNumber) {
          return await this.prisma.patient.update({
            where: { id: patient.id },
            data: { hceNumber: fallbackHceNumber },
          });
        }
      }

      return patient;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Ya existe un paciente con ese documento o número de HCE en esta clínica.',
        );
      }

      console.error('Error de Prisma:', error);
      throw new InternalServerErrorException('Error al crear el paciente');
    }
  }

  async findAll(tenantId: string) {
    const patients = await this.prisma.patient.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            encounters: true,
          },
        },
        encounters: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
          include: {
            anamnesis: true,
          },
        },
      },
    });

    return patients.map((patient) => {
      const lastEncounter = patient.encounters[0] || null;
      const lastAnamnesis = this.getLatestAnamnesis(
        (lastEncounter as any)?.anamnesis,
      );

      return {
        id: patient.id,
        tenantId: patient.tenantId,
        documentType: patient.documentType,
        documentNumber: patient.documentNumber,
        hceNumber: (patient as any).hceNumber || null,
        fullName: patient.fullName,
        birthDate: patient.birthDate,
        gender: patient.gender,
        phone: patient.phone,
        email: (patient as any).email || null,
        address: patient.address,
        allergies: patient.allergies,
        chronicDiseases: patient.chronicDiseases,
        usualMedication: patient.usualMedication,
        observations: patient.observations,
        createdAt: patient.createdAt,
        updatedAt: patient.updatedAt,

        encountersCount: patient._count.encounters,
        lastEncounterDate: lastEncounter?.createdAt || null,
        lastEncounterStatus: lastEncounter?.status || null,
        lastDiagnosis: this.formatDiagnosis(
          lastAnamnesis?.diagnosticoPrincipal,
        ),
      };
    });
  }

  async findPatientEncounters(tenantId: string, patientId: string) {
    const patient = await this.prisma.patient.findFirst({
      where: {
        id: patientId,
        tenantId,
      },
    });

    if (!patient) {
      throw new NotFoundException('Paciente no encontrado en esta clínica.');
    }

    const encounters = await this.prisma.encounter.findMany({
      where: {
        tenantId,
        patientId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        vitalSigns: true,
        anamnesis: true,
      },
    });

    return encounters.map((encounter) => {
      const anamnesis = this.getLatestAnamnesis((encounter as any).anamnesis);

      return {
        id: encounter.id,
        patientId: encounter.patientId,
        type: encounter.type,
        reason: encounter.reason,
        status: encounter.status,
        createdAt: encounter.createdAt,
        updatedAt: encounter.updatedAt,
        vitalSigns: encounter.vitalSigns || null,

        anamnesisId: anamnesis?.id || null,

        diagnosticoPrincipal: anamnesis?.diagnosticoPrincipal || null,
        diagnosticoPrincipalTexto: this.formatDiagnosis(
          anamnesis?.diagnosticoPrincipal,
        ),

        diagnosticosSecundarios: Array.isArray(
          anamnesis?.diagnosticosSecundarios,
        )
          ? anamnesis.diagnosticosSecundarios
          : [],

        motivoConsulta:
          anamnesis?.motivoConsulta || encounter.reason || null,
      };
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

      const nextDocumentType = data.documentType ?? existingPatient.documentType;
      const nextDocumentNumber =
        data.documentNumber ?? existingPatient.documentNumber;

      const documentChanged =
        data.documentType !== undefined || data.documentNumber !== undefined;

      const nextHceNumber = documentChanged
        ? generateHceNumber({
            documentType: nextDocumentType,
            documentNumber: nextDocumentNumber,
            patientId: existingPatient.id,
            createdAt: existingPatient.createdAt,
          })
        : (existingPatient as any).hceNumber ||
          generateHceNumber({
            documentType: nextDocumentType,
            documentNumber: nextDocumentNumber,
            patientId: existingPatient.id,
            createdAt: existingPatient.createdAt,
          });

      return await this.prisma.patient.update({
        where: {
          id: patientId,
        },
        data: {
          documentType: nextDocumentType,
          documentNumber: nextDocumentNumber,
          hceNumber: nextHceNumber,
          fullName: data.fullName ?? existingPatient.fullName,
          birthDate: data.birthDate
            ? new Date(data.birthDate)
            : existingPatient.birthDate,

          gender: data.gender ?? existingPatient.gender,
          phone: data.phone ?? existingPatient.phone,
          email: (data as any).email ?? (existingPatient as any).email,
          address: data.address ?? existingPatient.address,
          allergies: data.allergies ?? existingPatient.allergies,
          chronicDiseases:
            data.chronicDiseases ?? existingPatient.chronicDiseases,
          usualMedication:
            data.usualMedication ?? existingPatient.usualMedication,
          observations: data.observations ?? existingPatient.observations,
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
          'Ya existe otro paciente con ese documento o número de HCE en esta clínica.',
        );
      }

      console.error('Error de Prisma al actualizar paciente:', error);
      throw new InternalServerErrorException('Error al actualizar el paciente');
    }
  }

  private getLatestAnamnesis(anamnesisRelation: any): any | null {
    if (!anamnesisRelation) return null;

    if (Array.isArray(anamnesisRelation)) {
      if (anamnesisRelation.length === 0) return null;

      const sorted = [...anamnesisRelation].sort((a, b) => {
        const dateA = new Date(
          a.updatedAt || a.createdAt || a.fechaAtencion || 0,
        ).getTime();

        const dateB = new Date(
          b.updatedAt || b.createdAt || b.fechaAtencion || 0,
        ).getTime();

        return dateB - dateA;
      });

      return sorted[0] || null;
    }

    return anamnesisRelation;
  }

  private formatDiagnosis(diagnosis: any): string | null {
    if (!diagnosis) return null;

    if (typeof diagnosis === 'string') {
      return diagnosis.trim() || null;
    }

    if (typeof diagnosis === 'object') {
      const codigo = diagnosis.codigo || diagnosis.code || '';
      const descripcion =
        diagnosis.descripcion || diagnosis.description || diagnosis.desc || '';
      const tipo = diagnosis.tipo || diagnosis.type || '';

      const base = [codigo, descripcion].filter(Boolean).join(' - ');
      const formatted = [base, tipo ? `(${tipo})` : '']
        .filter(Boolean)
        .join(' ');

      return formatted || null;
    }

    return null;
  }
}
