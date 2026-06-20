import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';

type PatientIssue =
  | 'SUSPICIOUS_ID'
  | 'MISSING_DOCUMENT'
  | 'INVALID_DNI'
  | 'DUPLICATED_DOCUMENT'
  | 'MISSING_NAME';

type PatientQualityRow = {
  id: string;
  tenantId: string;
  fullName: string | null;
  documentType: string | null;
  documentNumber: string | null;
  createdAt: Date;
  updatedAt: Date;
  hceNumber: string | null;
  issues: PatientIssue[];
  canSafeDelete: boolean;
  relatedCounts: {
    encounters: number;
    anamnesis: number;
    certificates: number;
    prescriptions: number;
  };
};

const SUSPICIOUS_PATIENT_IDS = new Set([
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000005',
]);

@Injectable()
export class DataQualityService {
  constructor(private prisma: PrismaService) {}

  async getProblemPatients(tenantId: string) {
    const patients = await this.prisma.patient.findMany({
      where: { tenantId },
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
      include: {
        _count: {
          select: {
            encounters: true,
            anamnesis: true,
            certificates: true,
            prescriptions: true,
          },
        },
      },
    });

    const documentFrequency = new Map<string, number>();

    for (const patient of patients) {
      const key = this.getDocumentKey(patient.documentType, patient.documentNumber);
      if (!key) continue;
      documentFrequency.set(key, (documentFrequency.get(key) || 0) + 1);
    }

    const rows: PatientQualityRow[] = patients.map((patient) => {
      const documentKey = this.getDocumentKey(
        patient.documentType,
        patient.documentNumber,
      );

      const relatedCounts = {
        encounters: patient._count.encounters,
        anamnesis: patient._count.anamnesis,
        certificates: patient._count.certificates,
        prescriptions: patient._count.prescriptions,
      };

      const issues = this.evaluatePatientIssues(patient, documentFrequency);
      const hceNumber = this.buildHceNumber(patient.documentNumber);

      return {
        id: patient.id,
        tenantId: patient.tenantId,
        fullName: patient.fullName,
        documentType: patient.documentType,
        documentNumber: patient.documentNumber,
        createdAt: patient.createdAt,
        updatedAt: patient.updatedAt,
        hceNumber,
        issues,
        canSafeDelete: Object.values(relatedCounts).every((count) => count === 0),
        relatedCounts,
      };
    });

    const problemPatients = rows.filter((row) => row.issues.length > 0);

    return {
      totalPatients: patients.length,
      problemPatients: problemPatients.length,
      generatedAt: new Date().toISOString(),
      patients: problemPatients,
    };
  }

  async getPatientQualityDetail(tenantId: string, patientId: string) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, tenantId },
      include: {
        encounters: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            status: true,
            type: true,
            reason: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        anamnesis: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            encounterId: true,
            motivoConsulta: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        certificates: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            certificateType: true,
            issueDate: true,
            createdAt: true,
          },
        },
        prescriptions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            encounters: true,
            anamnesis: true,
            certificates: true,
            prescriptions: true,
          },
        },
      },
    });

    if (!patient) {
      throw new NotFoundException('Paciente no encontrado.');
    }

    return {
      patient: {
        id: patient.id,
        fullName: patient.fullName,
        documentType: patient.documentType,
        documentNumber: patient.documentNumber,
        hceNumber: this.buildHceNumber(patient.documentNumber),
        createdAt: patient.createdAt,
        updatedAt: patient.updatedAt,
      },
      relatedCounts: patient._count,
      encounters: patient.encounters,
      anamnesis: patient.anamnesis,
      certificates: patient.certificates,
      prescriptions: patient.prescriptions,
    };
  }

  async repairPatientId(tenantId: string, patientId: string) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, tenantId },
    });

    if (!patient) {
      throw new NotFoundException('Paciente no encontrado.');
    }

    if (!this.isSuspiciousPatientId(patient.id)) {
      throw new BadRequestException(
        'El ID del paciente no parece defectuoso. No se realizará reparación automática.',
      );
    }

    const newId = randomUUID();

    const result = await this.prisma.$transaction(async (tx) => {
      const encounterResult = await tx.encounter.updateMany({
        where: { tenantId, patientId: patient.id },
        data: { patientId: newId },
      });

      const anamnesisResult = await tx.anamnesis.updateMany({
        where: { tenantId, patientId: patient.id },
        data: { patientId: newId },
      });

      const certificateResult = await tx.certificate.updateMany({
        where: { tenantId, patientId: patient.id },
        data: { patientId: newId },
      });

      const prescriptionResult = await tx.prescription.updateMany({
        where: { tenantId, patientId: patient.id },
        data: { patientId: newId },
      });

      const updatedPatient = await tx.patient.update({
        where: { id: patient.id },
        data: { id: newId },
      });

      return {
        previousId: patient.id,
        newId,
        patient: updatedPatient,
        updatedRelations: {
          encounters: encounterResult.count,
          anamnesis: anamnesisResult.count,
          certificates: certificateResult.count,
          prescriptions: prescriptionResult.count,
        },
      };
    });

    return {
      message: 'ID técnico del paciente reparado correctamente.',
      ...result,
    };
  }

  async safeDeletePatient(tenantId: string, patientId: string) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, tenantId },
      include: {
        _count: {
          select: {
            encounters: true,
            anamnesis: true,
            certificates: true,
            prescriptions: true,
          },
        },
      },
    });

    if (!patient) {
      throw new NotFoundException('Paciente no encontrado.');
    }

    const relatedCounts = patient._count;
    const hasClinicalHistory = Object.values(relatedCounts).some(
      (count) => count > 0,
    );

    if (hasClinicalHistory) {
      throw new BadRequestException({
        message:
          'No se puede eliminar definitivamente porque el paciente tiene historial clínico asociado. Use anulación o fusión en una fase posterior.',
        relatedCounts,
      });
    }

    await this.prisma.patient.delete({
      where: { id: patient.id },
    });

    return {
      message: 'Paciente eliminado correctamente porque no tenía historial asociado.',
      deletedPatient: {
        id: patient.id,
        fullName: patient.fullName,
        documentType: patient.documentType,
        documentNumber: patient.documentNumber,
      },
    };
  }

  private evaluatePatientIssues(
    patient: any,
    documentFrequency: Map<string, number>,
  ): PatientIssue[] {
    const issues: PatientIssue[] = [];

    if (this.isSuspiciousPatientId(patient.id)) {
      issues.push('SUSPICIOUS_ID');
    }

    if (!String(patient.fullName || '').trim()) {
      issues.push('MISSING_NAME');
    }

    const documentNumber = String(patient.documentNumber || '').trim();
    const documentType = String(patient.documentType || '').trim().toUpperCase();

    if (!documentNumber) {
      issues.push('MISSING_DOCUMENT');
    }

    if (documentType === 'DNI' && documentNumber && !/^\d{8}$/.test(documentNumber)) {
      issues.push('INVALID_DNI');
    }

    const documentKey = this.getDocumentKey(patient.documentType, patient.documentNumber);
    if (documentKey && (documentFrequency.get(documentKey) || 0) > 1) {
      issues.push('DUPLICATED_DOCUMENT');
    }

    return issues;
  }

  private isSuspiciousPatientId(id?: string | null) {
    if (!id) return true;
    return SUSPICIOUS_PATIENT_IDS.has(String(id).toLowerCase());
  }

  private getDocumentKey(documentType?: string | null, documentNumber?: string | null) {
    const type = String(documentType || '').trim().toUpperCase();
    const number = String(documentNumber || '').trim();

    if (!type || !number) return '';

    return `${type}:${number}`;
  }

  private buildHceNumber(documentNumber?: string | null) {
    const number = String(documentNumber || '').trim();
    if (!number) return null;
    return `HCELM-${number}`;
  }
}
