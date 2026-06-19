import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ClinicalAlertsService } from '../clinical-alerts/clinical-alerts.service';

const ACTIVE_STATUSES = ['triado', 'en_atencion', 'observacion'];
const FINISHED_STATUSES = ['atendido', 'alta', 'referido', 'cancelado'];

@Injectable()
export class WaitingRoomService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clinicalAlertsService: ClinicalAlertsService,
  ) {}

  async getTodayWaitingRoom(tenantId: string) {
    const now = new Date();

    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    const encounters = await this.prisma.encounter.findMany({
      where: {
        tenantId,
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
      include: {
        patient: true,
        vitalSigns: true,
        anamnesis: true,
      },
    });

    const rows = await Promise.all(
      encounters.map(async (encounter: any, index: number) => {
        let alertsResponse: any = null;

        try {
          alertsResponse = await this.clinicalAlertsService.getByEncounter(
            tenantId,
            encounter.id,
          );
        } catch {
          alertsResponse = null;
        }

        const latestAnamnesis = this.getLatestAnamnesis(encounter.anamnesis);
        const status = this.normalizeStatus(encounter.status);

        return {
          position: index + 1,
          encounterId: encounter.id,
          patientId: encounter.patientId,
          patient: {
            id: encounter.patient?.id,
            fullName: encounter.patient?.fullName,
            documentType: encounter.patient?.documentType,
            documentNumber: encounter.patient?.documentNumber,
            gender: encounter.patient?.gender || encounter.patient?.sex,
            birthDate: encounter.patient?.birthDate,
            phone: encounter.patient?.phone,
          },
          reason: encounter.reason || latestAnamnesis?.motivoConsulta || '',
          createdAt: encounter.createdAt,
          triageTime: encounter.createdAt,
          status,
          statusLabel: this.getStatusLabel(status),
          statusGroup: ACTIVE_STATUSES.includes(status)
            ? 'active'
            : FINISHED_STATUSES.includes(status)
              ? 'finished'
              : 'other',
          globalRisk: alertsResponse?.globalRisk || 'normal',
          alerts: alertsResponse?.alerts || [],
          vitalSigns: this.formatVitalSigns(encounter.vitalSigns),
          rawVitalSigns: encounter.vitalSigns || null,
          diagnosis: this.formatDiagnosis(
            latestAnamnesis?.diagnosticoPrincipal,
          ),
        };
      }),
    );

    const activePatients = this.sortActiveRows(
      rows.filter((row) => row.statusGroup === 'active'),
    ).map((row, index) => ({
      ...row,
      priorityPosition: index + 1,
    }));

    const finishedPatients = this.sortFinishedRows(
      rows.filter((row) => row.statusGroup === 'finished'),
    ).map((row, index) => ({
      ...row,
      finishedPosition: index + 1,
    }));

    const otherPatients = rows.filter((row) => row.statusGroup === 'other');

    return {
      date: now.toISOString().split('T')[0],
      total: rows.length,
      activeTotal: activePatients.length,
      finishedTotal: finishedPatients.length,
      otherTotal: otherPatients.length,

      // Compatibilidad con versiones previas del frontend.
      patients: activePatients,

      activePatients,
      finishedPatients,
      otherPatients,
    };
  }

  private sortActiveRows(rows: any[]) {
    return [...rows].sort((a, b) => {
      const statusOrder: Record<string, number> = {
        en_atencion: 1,
        triado: 2,
        observacion: 3,
      };

      const riskOrder: Record<string, number> = {
        critical: 1,
        high: 2,
        warning: 3,
        normal: 4,
      };

      const statusA = statusOrder[a.status] || 9;
      const statusB = statusOrder[b.status] || 9;

      if (statusA !== statusB) return statusA - statusB;

      const riskA = riskOrder[a.globalRisk] || 4;
      const riskB = riskOrder[b.globalRisk] || 4;

      if (riskA !== riskB) return riskA - riskB;

      return (
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    });
  }

  private sortFinishedRows(rows: any[]) {
    return [...rows].sort((a, b) => {
      return (
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    });
  }

  private normalizeStatus(status: any): string {
    const normalized = String(status || '').trim().toLowerCase();

    if (!normalized || normalized === 'open') return 'triado';

    return normalized;
  }

  private getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      triado: 'TRIADO',
      en_atencion: 'EN ATENCIÓN',
      atendido: 'ATENDIDO',
      observacion: 'OBSERVACIÓN',
      referido: 'REFERIDO',
      alta: 'ALTA',
      cancelado: 'CANCELADO',
    };

    return labels[status] || status.toUpperCase();
  }

  private formatVitalSigns(vitalSigns: any) {
    if (!vitalSigns) {
      return {
        bloodPressure: '—',
        heartRate: '—',
        respiratoryRate: '—',
        temperature: '—',
        oxygenSat: '—',
        glucose: '—',
        painScale: '—',
        glasgow: '—',
      };
    }

    return {
      bloodPressure:
        vitalSigns.systolicBP && vitalSigns.diastolicBP
          ? `${vitalSigns.systolicBP}/${vitalSigns.diastolicBP}`
          : '—',
      heartRate: vitalSigns.heartRate ?? '—',
      respiratoryRate: vitalSigns.respiratoryRate ?? '—',
      temperature: vitalSigns.temperature ?? '—',
      oxygenSat: vitalSigns.oxygenSat ?? '—',
      glucose: vitalSigns.capillaryGlucose ?? '—',
      painScale: vitalSigns.painScale ?? '—',
      glasgow: vitalSigns.glasgowTotal ?? '—',
    };
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

  private formatDiagnosis(diagnosis: any): string {
    if (!diagnosis) return '';

    if (typeof diagnosis === 'string') return diagnosis;

    const code = diagnosis.codigo || diagnosis.code || '';
    const description =
      diagnosis.descripcion || diagnosis.description || diagnosis.desc || '';

    return [code, description].filter(Boolean).join(' - ');
  }
}
