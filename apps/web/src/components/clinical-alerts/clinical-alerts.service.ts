import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  ClinicalAlert,
  ClinicalAlertSeverity,
  ClinicalAlertsResponse,
  ClinicalReferenceRange,
} from './clinical-alert.types';
import { CLINICAL_REFERENCE_RANGES } from './clinical-reference-ranges';

@Injectable()
export class ClinicalAlertsService {
  constructor(private prisma: PrismaService) {}

  async getByPatient(
    tenantId: string,
    patientId: string,
  ): Promise<ClinicalAlertsResponse> {
    const patient = await this.prisma.patient.findFirst({
      where: {
        id: patientId,
        tenantId,
      },
      include: {
        encounters: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
          include: {
            vitalSigns: true,
            anamnesis: true,
          },
        },
      },
    });

    if (!patient) {
      throw new NotFoundException('Paciente no encontrado.');
    }

    const lastEncounter = patient.encounters[0] || null;

    const alerts: ClinicalAlert[] = [
      ...this.evaluatePatientAlerts(patient),
      ...this.evaluateEncounterAlerts(lastEncounter),
    ];

    return {
      patientId,
      encounterId: lastEncounter?.id,
      globalRisk: this.calculateGlobalRisk(alerts),
      alerts,
      generatedAt: new Date().toISOString(),
    };
  }

  async getByEncounter(
    tenantId: string,
    encounterId: string,
  ): Promise<ClinicalAlertsResponse> {
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

    const alerts: ClinicalAlert[] = [
      ...this.evaluatePatientAlerts(encounter.patient),
      ...this.evaluateEncounterAlerts(encounter),
    ];

    return {
      patientId: encounter.patientId,
      encounterId,
      globalRisk: this.calculateGlobalRisk(alerts),
      alerts,
      generatedAt: new Date().toISOString(),
    };
  }

  getReferences(): ClinicalReferenceRange[] {
    return CLINICAL_REFERENCE_RANGES;
  }

  getReferenceByKey(key: string): ClinicalReferenceRange {
    const reference = CLINICAL_REFERENCE_RANGES.find((item) => item.key === key);

    if (!reference) {
      throw new NotFoundException('Referencia clínica no encontrada.');
    }

    return reference;
  }

  private evaluatePatientAlerts(patient: any): ClinicalAlert[] {
    const alerts: ClinicalAlert[] = [];

    if (patient?.allergies && String(patient.allergies).trim().length > 0) {
      alerts.push({
        id: `allergy-${patient.id}`,
        severity: 'warning',
        blinkSpeed: 'slow',
        category: 'allergy',
        title: 'Alergia registrada',
        message: String(patient.allergies),
        referenceKey: 'allergy',
        source: 'Ficha del paciente',
        sourceDate: patient.updatedAt,
        suggestedAction:
          'Verificar alergias antes de prescribir o administrar medicamentos.',
      });
    }

    if (
      patient?.chronicDiseases &&
      String(patient.chronicDiseases).trim().length > 0
    ) {
      alerts.push({
        id: `chronic-${patient.id}`,
        severity: 'warning',
        blinkSpeed: 'slow',
        category: 'context',
        title: 'Antecedente crónico registrado',
        message: String(patient.chronicDiseases),
        referenceKey: 'allergy',
        source: 'Ficha del paciente',
        sourceDate: patient.updatedAt,
        suggestedAction:
          'Considerar comorbilidades en diagnóstico, prescripción y destino final.',
      });
    }

    return alerts;
  }

  private evaluateEncounterAlerts(encounter: any): ClinicalAlert[] {
    if (!encounter) return [];

    const vitalSigns = encounter.vitalSigns;
    if (!vitalSigns) return [];

    const alerts: ClinicalAlert[] = [];

    alerts.push(...this.evaluateSpo2(vitalSigns, encounter));
    alerts.push(...this.evaluateRespiratoryRate(vitalSigns, encounter));
    alerts.push(...this.evaluateBloodPressure(vitalSigns, encounter));
    alerts.push(...this.evaluateHeartRate(vitalSigns, encounter));
    alerts.push(...this.evaluateTemperature(vitalSigns, encounter));
    alerts.push(...this.evaluateGlucose(vitalSigns, encounter));
    alerts.push(...this.evaluateGlasgow(vitalSigns, encounter));
    alerts.push(...this.evaluatePain(vitalSigns, encounter));

    if (alerts.length === 0) {
      alerts.push({
        id: `normal-${encounter.id}`,
        severity: 'normal',
        blinkSpeed: 'none',
        category: 'vital_signs',
        title: 'Sin alertas críticas',
        message:
          'No se detectaron alteraciones críticas en las últimas funciones vitales registradas.',
        referenceKey: 'spo2',
        source: 'Últimas funciones vitales',
        sourceDate: encounter.createdAt,
        suggestedAction: 'Continuar evaluación clínica habitual.',
      });
    }

    return alerts;
  }

  private evaluateSpo2(vs: any, encounter: any): ClinicalAlert[] {
    const value = this.toNumber(vs.oxygenSat);
    if (value === null) return [];

    if (value < 90) {
      return [
        this.buildAlert(
          encounter,
          'critical',
          'vital_signs',
          'SpO₂ crítica',
          `SpO₂ ${value}% por debajo del umbral crítico.`,
          value,
          '%',
          'spo2',
          'Reevaluar oxigenación, vía aérea, FR, trabajo respiratorio y soporte de oxígeno.',
        ),
      ];
    }

    if (value >= 90 && value <= 92) {
      return [
        this.buildAlert(
          encounter,
          'high',
          'vital_signs',
          'SpO₂ en alto riesgo',
          `SpO₂ ${value}% en rango de alto riesgo.`,
          value,
          '%',
          'spo2',
          'Reevaluar clínica respiratoria, oxígeno suplementario y evolución.',
        ),
      ];
    }

    if (value >= 93 && value <= 94) {
      return [
        this.buildAlert(
          encounter,
          'warning',
          'vital_signs',
          'SpO₂ en precaución',
          `SpO₂ ${value}% ligeramente disminuida.`,
          value,
          '%',
          'spo2',
          'Vigilar tendencia y correlacionar con clínica.',
        ),
      ];
    }

    return [];
  }

  private evaluateRespiratoryRate(vs: any, encounter: any): ClinicalAlert[] {
    const value = this.toNumber(vs.respiratoryRate);
    if (value === null) return [];

    if (value < 8 || value > 30) {
      return [
        this.buildAlert(
          encounter,
          'critical',
          'vital_signs',
          'Frecuencia respiratoria crítica',
          `FR ${value}/min en rango crítico.`,
          value,
          'rpm',
          'respiratory_rate',
          'Reevaluar ventilación, trabajo respiratorio, oxigenación y estado neurológico.',
        ),
      ];
    }

    if (value >= 25 && value <= 30) {
      return [
        this.buildAlert(
          encounter,
          'high',
          'vital_signs',
          'Taquipnea de alto riesgo',
          `FR ${value}/min.`,
          value,
          'rpm',
          'respiratory_rate',
          'Buscar causa respiratoria, metabólica, dolor, fiebre o sepsis.',
        ),
      ];
    }

    if (value >= 21 && value <= 24) {
      return [
        this.buildAlert(
          encounter,
          'warning',
          'vital_signs',
          'Frecuencia respiratoria elevada',
          `FR ${value}/min.`,
          value,
          'rpm',
          'respiratory_rate',
          'Vigilar tendencia y correlacionar con SpO₂.',
        ),
      ];
    }

    return [];
  }

  private evaluateBloodPressure(vs: any, encounter: any): ClinicalAlert[] {
    const systolic = this.toNumber(vs.systolicBP);
    const diastolic = this.toNumber(vs.diastolicBP);

    if (systolic === null && diastolic === null) return [];

    const alerts: ClinicalAlert[] = [];

    if (systolic !== null && systolic < 90) {
      alerts.push(
        this.buildAlert(
          encounter,
          'critical',
          'vital_signs',
          'Hipotensión crítica',
          `PAS ${systolic} mmHg.`,
          systolic,
          'mmHg',
          'systolic_bp',
          'Reevaluar perfusión, shock, sangrado, sepsis, deshidratación o fármacos.',
        ),
      );
    }

    if (
      (systolic !== null && systolic >= 180) ||
      (diastolic !== null && diastolic >= 110)
    ) {
      alerts.push(
        this.buildAlert(
          encounter,
          'high',
          'vital_signs',
          'PA severamente elevada',
          `PA ${systolic ?? '-'}/${diastolic ?? '-'} mmHg.`,
          `${systolic ?? '-'}/${diastolic ?? '-'}`,
          'mmHg',
          'systolic_bp',
          'Evaluar síntomas y descartar daño de órgano blanco.',
        ),
      );
    }

    if (systolic !== null && systolic >= 90 && systolic <= 99) {
      alerts.push(
        this.buildAlert(
          encounter,
          'warning',
          'vital_signs',
          'Presión sistólica baja',
          `PAS ${systolic} mmHg.`,
          systolic,
          'mmHg',
          'systolic_bp',
          'Vigilar tendencia y correlacionar con perfusión clínica.',
        ),
      );
    }

    return alerts;
  }

  private evaluateHeartRate(vs: any, encounter: any): ClinicalAlert[] {
    const value = this.toNumber(vs.heartRate);
    if (value === null) return [];

    if (value < 40 || value > 130) {
      return [
        this.buildAlert(
          encounter,
          'critical',
          'vital_signs',
          'Frecuencia cardíaca crítica',
          `FC ${value}/min.`,
          value,
          'lpm',
          'heart_rate',
          'Reevaluar estabilidad hemodinámica, ECG, hipoxia, fiebre, dolor o fármacos.',
        ),
      ];
    }

    if ((value >= 40 && value <= 50) || (value >= 110 && value <= 130)) {
      return [
        this.buildAlert(
          encounter,
          'high',
          'vital_signs',
          'Frecuencia cardíaca de alto riesgo',
          `FC ${value}/min.`,
          value,
          'lpm',
          'heart_rate',
          'Correlacionar con PA, síntomas, ECG y contexto clínico.',
        ),
      ];
    }

    if (value >= 51 && value <= 59) {
      return [
        this.buildAlert(
          encounter,
          'warning',
          'vital_signs',
          'Bradicardia leve',
          `FC ${value}/min.`,
          value,
          'lpm',
          'heart_rate',
          'Vigilar tendencia y correlacionar con síntomas, PA, ECG, medicamentos y condición basal del paciente.',
        ),
      ];
    }

    if (value >= 101 && value <= 109) {
      return [
        this.buildAlert(
          encounter,
          'warning',
          'vital_signs',
          'Taquicardia leve',
          `FC ${value}/min.`,
          value,
          'lpm',
          'heart_rate',
          'Vigilar tendencia; considerar fiebre, dolor, ansiedad, hipovolemia o infección.',
        ),
      ];
    }

    return [];
  }

  private evaluateTemperature(vs: any, encounter: any): ClinicalAlert[] {
    const value = this.toNumber(vs.temperature);
    if (value === null) return [];

    if (value < 35 || value >= 40) {
      return [
        this.buildAlert(
          encounter,
          'critical',
          'vital_signs',
          'Temperatura crítica',
          `Temperatura ${value} °C.`,
          value,
          '°C',
          'temperature',
          'Reevaluar infección grave, golpe de calor, hipotermia u otra causa sistémica.',
        ),
      ];
    }

    if (value >= 39 && value < 40) {
      return [
        this.buildAlert(
          encounter,
          'high',
          'vital_signs',
          'Fiebre alta',
          `Temperatura ${value} °C.`,
          value,
          '°C',
          'temperature',
          'Evaluar foco infeccioso, hidratación, signos de sepsis y evolución.',
        ),
      ];
    }

    if (value >= 38 && value < 39) {
      return [
        this.buildAlert(
          encounter,
          'warning',
          'vital_signs',
          'Fiebre',
          `Temperatura ${value} °C.`,
          value,
          '°C',
          'temperature',
          'Correlacionar con síntomas y evolución clínica.',
        ),
      ];
    }

    return [];
  }

  private evaluateGlucose(vs: any, encounter: any): ClinicalAlert[] {
    const value = this.toNumber(vs.capillaryGlucose);
    if (value === null) return [];

    if (value < 54 || value > 300) {
      return [
        this.buildAlert(
          encounter,
          'critical',
          'vital_signs',
          'Glicemia crítica',
          `Glicemia capilar ${value} mg/dL.`,
          value,
          'mg/dL',
          'capillary_glucose',
          'Actuar según contexto: hipoglicemia, hiperglicemia sintomática, cetonas o deshidratación.',
        ),
      ];
    }

    if (value >= 250 && value <= 300) {
      return [
        this.buildAlert(
          encounter,
          'high',
          'vital_signs',
          'Hiperglicemia de alto riesgo',
          `Glicemia capilar ${value} mg/dL.`,
          value,
          'mg/dL',
          'capillary_glucose',
          'Evaluar síntomas, cetonas, hidratación y antecedente de diabetes.',
        ),
      ];
    }

    if (value >= 180 && value <= 249) {
      return [
        this.buildAlert(
          encounter,
          'warning',
          'vital_signs',
          'Hiperglicemia',
          `Glicemia capilar ${value} mg/dL.`,
          value,
          'mg/dL',
          'capillary_glucose',
          'Correlacionar con ayuno, tratamiento y antecedentes.',
        ),
      ];
    }

    return [];
  }

  private evaluateGlasgow(vs: any, encounter: any): ClinicalAlert[] {
    const value = this.toNumber(vs.glasgowTotal);
    if (value === null) return [];

    if (value <= 12) {
      return [
        this.buildAlert(
          encounter,
          'critical',
          'vital_signs',
          'Glasgow crítico',
          `Glasgow ${value}/15.`,
          value,
          'puntos',
          'glasgow',
          'Reevaluar estado neurológico, vía aérea, glucosa, intoxicación, trauma o causa metabólica.',
        ),
      ];
    }

    if (value === 13) {
      return [
        this.buildAlert(
          encounter,
          'high',
          'vital_signs',
          'Glasgow de alto riesgo',
          `Glasgow ${value}/15.`,
          value,
          'puntos',
          'glasgow',
          'Reevaluar estado neurológico y tendencia.',
        ),
      ];
    }

    if (value === 14) {
      return [
        this.buildAlert(
          encounter,
          'warning',
          'vital_signs',
          'Glasgow en precaución',
          `Glasgow ${value}/15.`,
          value,
          'puntos',
          'glasgow',
          'Vigilar evolución neurológica.',
        ),
      ];
    }

    return [];
  }

  private evaluatePain(vs: any, encounter: any): ClinicalAlert[] {
    const value = this.toNumber(vs.painScale);
    if (value === null) return [];

    if (value >= 9) {
      return [
        this.buildAlert(
          encounter,
          'critical',
          'vital_signs',
          'Dolor muy severo',
          `EVA ${value}/10.`,
          value,
          'EVA',
          'pain_scale',
          'Reevaluar causa del dolor, signos de alarma y analgesia.',
        ),
      ];
    }

    if (value === 8) {
      return [
        this.buildAlert(
          encounter,
          'high',
          'vital_signs',
          'Dolor severo',
          `EVA ${value}/10.`,
          value,
          'EVA',
          'pain_scale',
          'Reevaluar diagnóstico, analgesia y respuesta.',
        ),
      ];
    }

    if (value >= 5 && value <= 7) {
      return [
        this.buildAlert(
          encounter,
          'warning',
          'vital_signs',
          'Dolor moderado',
          `EVA ${value}/10.`,
          value,
          'EVA',
          'pain_scale',
          'Vigilar evolución y respuesta al tratamiento.',
        ),
      ];
    }

    return [];
  }

  private buildAlert(
  encounter: any,
  severity: ClinicalAlertSeverity,
  category: ClinicalAlert['category'],
  title: string,
  message: string,
  value: string | number,
  unit: string,
  referenceKey: string,
  suggestedAction: string = 'Reevaluar el dato alterado y correlacionar con el contexto clínico del paciente.',
): ClinicalAlert {
    return {
      id: `${referenceKey}-${encounter.id}-${String(value).replace(/\W/g, '')}`,
      severity,
      blinkSpeed: this.getBlinkSpeed(severity),
      category,
      title,
      message,
      value,
      unit,
      referenceKey,
      source: 'Últimas funciones vitales',
      sourceDate: encounter.createdAt,
      suggestedAction,
    };
  }

  private calculateGlobalRisk(alerts: ClinicalAlert[]): ClinicalAlertSeverity {
    if (alerts.some((alert) => alert.severity === 'critical')) {
      return 'critical';
    }

    if (alerts.some((alert) => alert.severity === 'high')) {
      return 'high';
    }

    if (alerts.some((alert) => alert.severity === 'warning')) {
      return 'warning';
    }

    return 'normal';
  }

  private getBlinkSpeed(severity: ClinicalAlertSeverity) {
    if (severity === 'critical') return 'fast';
    if (severity === 'high') return 'medium';
    if (severity === 'warning') return 'slow';
    return 'none';
  }

  private toNumber(value: any): number | null {
    if (value === null || value === undefined || value === '') return null;

    const numberValue = Number(value);

    if (Number.isNaN(numberValue)) return null;

    return numberValue;
  }
}