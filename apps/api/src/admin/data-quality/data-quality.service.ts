/**
 * Archivo: data-quality.service.ts
 * Ruta: apps/api/src/admin/data-quality/data-quality.service.ts
 * Función: Detección y reparación segura de problemas de datos de pacientes.
 */
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { generateHceNumber } from '../../common/utils/hce-number.util';

type PatientIssue =
  | 'SUSPICIOUS_ID'
  | 'MISSING_DOCUMENT'
  | 'INVALID_DNI'
  | 'DUPLICATED_DOCUMENT'
  | 'MISSING_NAME'
  | 'MISSING_HCE';

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
  issueDescriptions: string[];
  hasClinicalHistory: boolean;
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
      const hceNumber = patient.hceNumber;

      const hasClinicalHistory = Object.values(relatedCounts).some(
        (count) => count > 0,
      );

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
        issueDescriptions: issues.map((issue) => this.getIssueDescription(issue)),
        hasClinicalHistory,
        canSafeDelete: !hasClinicalHistory,
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
        hceNumber: patient.hceNumber,
        createdAt: patient.createdAt,
        updatedAt: patient.updatedAt,
      },
      hasClinicalHistory: Object.values(patient._count).some((count) => count > 0),
      canSafeDelete: Object.values(patient._count).every((count) => count === 0),
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

  async generateMissingHceNumbers(tenantId: string) {
    const patients = await this.prisma.patient.findMany({
      where: {
        tenantId,
        OR: [{ hceNumber: null }, { hceNumber: '' }],
      },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        fullName: true,
        documentType: true,
        documentNumber: true,
        createdAt: true,
      },
    });

    const assignedRows = await this.prisma.patient.findMany({
      where: {
        tenantId,
        hceNumber: { not: null },
      },
      select: { id: true, hceNumber: true },
    });

    const assignedHceNumbers = new Map<string, string>();
    for (const row of assignedRows) {
      const hceNumber = String(row.hceNumber || '').trim();
      if (hceNumber) assignedHceNumbers.set(hceNumber, row.id);
    }

    let updated = 0;
    let skipped = 0;
    const conflicts: Array<{
      patientId: string;
      patientName: string;
      proposedHceNumber: string | null;
      reason: string;
    }> = [];

    for (const patient of patients) {
      const proposedHceNumber = generateHceNumber({
        documentType: patient.documentType,
        documentNumber: patient.documentNumber,
        patientId: patient.id,
        createdAt: patient.createdAt,
      });

      if (!proposedHceNumber) {
        skipped += 1;
        conflicts.push({
          patientId: patient.id,
          patientName: patient.fullName || 'Paciente sin nombre',
          proposedHceNumber: null,
          reason:
            'No se pudo generar el N.° HCE con los datos actuales. Revise el tipo y número de documento.',
        });
        continue;
      }

      const ownerPatientId = assignedHceNumbers.get(proposedHceNumber);
      if (ownerPatientId && ownerPatientId !== patient.id) {
        skipped += 1;
        conflicts.push({
          patientId: patient.id,
          patientName: patient.fullName || 'Paciente sin nombre',
          proposedHceNumber,
          reason: `El N.° HCE propuesto ya pertenece al paciente ${ownerPatientId}.`,
        });
        continue;
      }

      try {
        const result = await this.prisma.patient.updateMany({
          where: {
            id: patient.id,
            tenantId,
            OR: [{ hceNumber: null }, { hceNumber: '' }],
          },
          data: { hceNumber: proposedHceNumber },
        });

        if (result.count === 1) {
          updated += 1;
          assignedHceNumbers.set(proposedHceNumber, patient.id);
        } else {
          skipped += 1;
        }
      } catch (error: any) {
        skipped += 1;
        conflicts.push({
          patientId: patient.id,
          patientName: patient.fullName || 'Paciente sin nombre',
          proposedHceNumber,
          reason:
            error?.code === 'P2002'
              ? 'El N.° HCE ya existe y la restricción de unicidad evitó el duplicado.'
              : 'No se pudo actualizar el paciente. Revise el registro y vuelva a intentarlo.',
        });
      }
    }

    return {
      message:
        updated > 0
          ? `Se generaron ${updated} N.° HCE Digital correctamente.`
          : 'No se encontraron N.° HCE Digital pendientes que pudieran generarse.',
      totalMissing: patients.length,
      updated,
      skipped,
      conflicts,
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

    if (!String(patient.hceNumber || '').trim()) {
      issues.push('MISSING_HCE');
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


  private getIssueDescription(issue: PatientIssue) {
    const descriptions: Record<PatientIssue, string> = {
      SUSPICIOUS_ID: 'ID técnico sospechoso o de prueba.',
      MISSING_DOCUMENT: 'Paciente sin documento registrado.',
      INVALID_DNI: 'DNI inválido. En Perú el DNI debe tener 8 dígitos.',
      DUPLICATED_DOCUMENT: 'Documento duplicado en más de un paciente.',
      MISSING_NAME: 'Paciente sin nombre completo registrado.',
      MISSING_HCE: 'Paciente sin N.° HCE Digital generado.',
    };

    return descriptions[issue] || issue;
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

}
