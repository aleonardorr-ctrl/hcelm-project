// Archivo: clinical-alerts.service.ts
// Ruta: apps/api/src/clinical-alerts/clinical-alerts.service.ts
// Funcion: Evalua alertas clinicas considerando el contexto institucional.
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  ClinicalAlert,
  ClinicalAlertSeverity,
  ClinicalAlertsResponse,
  ClinicalReferenceRange,
} from './clinical-alert.types';
import { CLINICAL_REFERENCE_RANGES } from './clinical-reference-ranges';

type Spo2ClinicalContext = {
  altitudeMeters: number;
  altitudeAdjustmentEnabled: boolean;
  referenceProfile: string;
  expectedMin: number;
  expectedMax: number;
};

@Injectable()
export class ClinicalAlertsService {
  constructor(private prisma: PrismaService) {}

  async getByPatient(
    tenantId: string,
    patientId: string,
  ): Promise<ClinicalAlertsResponse> {
    const [patient, clinicalContext] = await Promise.all([
      this.prisma.patient.findFirst({
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
      }),
      this.getSpo2ClinicalContext(tenantId),
    ]);

    if (!patient) {
      throw new NotFoundException('Paciente no encontrado.');
    }

    const lastEncounter = patient.encounters[0] || null;

    const alerts: ClinicalAlert[] = [
      ...this.evaluatePatientAlerts(patient),
      ...this.evaluateEncounterAlerts(lastEncounter, clinicalContext),
    ];

    return {
      patientId,
      encounterId: lastEncounter?.id,
      globalRisk: this.calculateGlobalRisk(alerts),
      alerts,
      clinicalContext,
      generatedAt: new Date().toISOString(),
    };
  }

  async getByEncounter(
    tenantId: string,
    encounterId: string,
  ): Promise<ClinicalAlertsResponse> {
    const [encounter, clinicalContext] = await Promise.all([
      this.prisma.encounter.findFirst({
        where: {
          id: encounterId,
          tenantId,
        },
        include: {
          patient: true,
          vitalSigns: true,
          anamnesis: true,
        },
      }),
      this.getSpo2ClinicalContext(tenantId),
    ]);

    if (!encounter) {
      throw new NotFoundException('Atención no encontrada.');
    }

    const alerts: ClinicalAlert[] = [
      ...this.evaluatePatientAlerts(encounter.patient),
      ...this.evaluateEncounterAlerts(encounter, clinicalContext),
    ];

    return {
      patientId: encounter.patientId,
      encounterId,
      globalRisk: this.calculateGlobalRisk(alerts),
      alerts,
      clinicalContext,
      generatedAt: new Date().toISOString(),
    };
  }

  async getReferences(tenantId: string): Promise<ClinicalReferenceRange[]> {
    const clinicalContext = await this.getSpo2ClinicalContext(tenantId);

    return CLINICAL_REFERENCE_RANGES.map((reference) =>
      this.applySpo2ContextToReference(reference, clinicalContext),
    );
  }

  async getReferenceByKey(
    tenantId: string,
    key: string,
  ): Promise<ClinicalReferenceRange> {
    const reference = CLINICAL_REFERENCE_RANGES.find((item) => item.key === key);

    if (!reference) {
      throw new NotFoundException('Referencia clínica no encontrada.');
    }

    const clinicalContext = await this.getSpo2ClinicalContext(tenantId);

    return this.applySpo2ContextToReference(reference, clinicalContext);
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
        value: 'REG',
        unit: null,
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
        value: 'REG',
        unit: null,
        referenceKey: 'chronic_disease',
        source: 'Ficha del paciente',
        sourceDate: patient.updatedAt,
        suggestedAction:
          'Considerar comorbilidades en diagnóstico, prescripción y destino final.',
      });
    }

    return alerts;
  }

  private evaluateEncounterAlerts(
    encounter: any,
    clinicalContext: Spo2ClinicalContext,
  ): ClinicalAlert[] {
    if (!encounter) return [];

    const vitalSigns = encounter.vitalSigns;
    if (!vitalSigns) return [];

    const alerts: ClinicalAlert[] = [];

    alerts.push(...this.evaluateSpo2(vitalSigns, encounter, clinicalContext));
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

  private evaluateSpo2(
    vs: any,
    encounter: any,
    clinicalContext: Spo2ClinicalContext,
  ): ClinicalAlert[] {
    const value = this.toNumber(vs.oxygenSat);
    if (value === null) return [];

    const hasOxygenSupport = this.hasOxygenSupport(vs.oxygenSupport);
    const useAltitudeReference =
      clinicalContext.altitudeAdjustmentEnabled &&
      clinicalContext.altitudeMeters > 0 &&
      !hasOxygenSupport;

    if (useAltitudeReference && value >= clinicalContext.expectedMin) {
      return [];
    }

    const altitudeDetail = useAltitudeReference
      ? ` Referencia institucional a ${clinicalContext.altitudeMeters} msnm: ${clinicalContext.expectedMin}-${clinicalContext.expectedMax}%.`
      : hasOxygenSupport
        ? ' La referencia por altitud no se aplica porque existe soporte de oxígeno registrado.'
        : '';

    if (value < 90) {
      return [
        this.buildAlert(
          encounter,
          'critical',
          'vital_signs',
          'SpO₂ crítica',
          `SpO₂ ${value}% por debajo del umbral crítico.${altitudeDetail}`,
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
          `SpO₂ ${value}% en rango de alto riesgo.${altitudeDetail}`,
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
          `SpO₂ ${value}% ligeramente disminuida.${altitudeDetail}`,
          value,
          '%',
          'spo2',
          'Vigilar tendencia y correlacionar con clínica.',
        ),
      ];
    }

    if (useAltitudeReference && value < clinicalContext.expectedMin) {
      return [
        this.buildAlert(
          encounter,
          'warning',
          'vital_signs',
          'SpO₂ menor a la esperada para la altitud',
          `SpO₂ ${value}% por debajo del mínimo institucional.${altitudeDetail}`,
          value,
          '%',
          'spo2',
          'Confirmar la medición y correlacionar con síntomas, FR, trabajo respiratorio y tendencia.',
        ),
      ];
    }

    return [];
  }

  private async getSpo2ClinicalContext(
    tenantId: string,
  ): Promise<Spo2ClinicalContext> {
    const institution = await this.prisma.institution.findUnique({
      where: { tenantId },
      select: {
        altitudeMeters: true,
        spo2AltitudeAdjustmentEnabled: true,
        spo2ReferenceProfile: true,
        spo2ExpectedMin: true,
        spo2ExpectedMax: true,
      },
    });

    return {
      altitudeMeters: institution?.altitudeMeters ?? 0,
      altitudeAdjustmentEnabled:
        institution?.spo2AltitudeAdjustmentEnabled ?? false,
      referenceProfile:
        institution?.spo2ReferenceProfile || 'ADULT_ACCLIMATIZED',
      expectedMin: institution?.spo2ExpectedMin ?? 95,
      expectedMax: institution?.spo2ExpectedMax ?? 100,
    };
  }

  private hasOxygenSupport(value: unknown): boolean {
    const normalized = String(value || '')
      .trim()
      .toLowerCase();

    return ![
      '',
      'no',
      'ninguno',
      'ninguna',
      'sin oxigeno',
      'sin oxígeno',
      'aire ambiente',
    ].includes(normalized);
  }

  private applySpo2ContextToReference(
    reference: ClinicalReferenceRange,
    clinicalContext: Spo2ClinicalContext,
  ): ClinicalReferenceRange {
    if (
      reference.key !== 'spo2' ||
      !clinicalContext.altitudeAdjustmentEnabled ||
      clinicalContext.altitudeMeters <= 0
    ) {
      return reference;
    }

    const minimum = clinicalContext.expectedMin;
    const maximum = clinicalContext.expectedMax;
    const ranges: ClinicalReferenceRange['ranges'] = [];
    const criticalUpper = Math.min(89, minimum - 1);

    if (criticalUpper >= 0) {
      ranges.push({
        color: 'red',
        severity: 'critical',
        label: 'Critico',
        criteria: `< ${criticalUpper + 1}% y por debajo del rango esperado para la altitud`,
      });
    }

    const highUpper = Math.min(92, minimum - 1);
    if (minimum > 90 && highUpper >= 90) {
      ranges.push({
        color: 'orange',
        severity: 'high',
        label: 'Alto riesgo',
        criteria: `90-${highUpper}% y por debajo del rango esperado para la altitud`,
      });
    }

    const warningUpper = minimum - 1;
    if (minimum > 93 && warningUpper >= 93) {
      ranges.push({
        color: 'yellow',
        severity: 'warning',
        label: 'Precaucion',
        criteria: `93-${warningUpper}% y por debajo del rango esperado para la altitud`,
      });
    }

    ranges.push({
      color: 'green',
      severity: 'normal',
      label: 'Esperado para la altitud',
      criteria: `${minimum}-${maximum}% en adulto aclimatado, en reposo y sin oxigeno suplementario`,
    });

    return {
      ...reference,
      description: `${reference.description} Referencia institucional activa a ${clinicalContext.altitudeMeters} msnm: ${minimum}-${maximum}%.`,
      ranges,
      bibliography: [
        ...reference.bibliography,
        {
          title: 'Medical Conditions and High-Altitude Travel',
          institution: 'New England Journal of Medicine',
          year: 2022,
          url: 'https://doi.org/10.1056/NEJMra2104829',
          note: 'Rango esperado de SpO2 segun altitud y aclimatizacion.',
        },
        {
          title: 'High-Altitude Travel and Altitude Illness',
          institution: 'CDC Yellow Book 2026',
          year: 2025,
          url: 'https://www.cdc.gov/yellow-book/hcp/environmental-hazards-risks/high-altitude-travel-and-altitude-illness.html',
        },
      ],
    };
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

    const pressureValue = `${systolic ?? '-'}/${diastolic ?? '-'}`;

    if (systolic !== null && systolic < 90) {
      return [
        this.buildAlert(
          encounter,
          'critical',
          'vital_signs',
          'Hipotensión crítica',
          `PA ${pressureValue} mmHg; PAS menor de 90 mmHg.`,
          pressureValue,
          'mmHg',
          'systolic_bp',
          'Reevaluar perfusión, shock, sangrado, sepsis, deshidratación o fármacos.',
        ),
      ];
    }

    if (
      (systolic !== null && systolic >= 180) ||
      (diastolic !== null && diastolic >= 110)
    ) {
      return [
        this.buildAlert(
          encounter,
          'high',
          'vital_signs',
          'PA severamente elevada',
          `PA ${pressureValue} mmHg; PAS ≥180 o PAD ≥110 mmHg.`,
          pressureValue,
          'mmHg',
          'systolic_bp',
          'Evaluar síntomas y descartar daño de órgano blanco.',
        ),
      ];
    }

    if (
      (systolic !== null && systolic >= 160) ||
      (diastolic !== null && diastolic >= 100)
    ) {
      return [
        this.buildAlert(
          encounter,
          'high',
          'vital_signs',
          'Hipertensión de alto riesgo',
          `PA ${pressureValue} mmHg; PAS 160-179 o PAD 100-109 mmHg.`,
          pressureValue,
          'mmHg',
          'systolic_bp',
          'Repetir la medición, evaluar síntomas, adherencia y posible daño de órgano blanco.',
        ),
      ];
    }

    if (
      (systolic !== null && systolic >= 140) ||
      (diastolic !== null && diastolic >= 90)
    ) {
      return [
        this.buildAlert(
          encounter,
          'warning',
          'vital_signs',
          'Presión arterial elevada',
          `PA ${pressureValue} mmHg; PAS 140-159 o PAD 90-99 mmHg.`,
          pressureValue,
          'mmHg',
          'systolic_bp',
          'Confirmar con una nueva medición en reposo y correlacionar con antecedentes y síntomas.',
        ),
      ];
    }

    if (systolic !== null && systolic >= 90 && systolic <= 99) {
      return [
        this.buildAlert(
          encounter,
          'warning',
          'vital_signs',
          'Presión sistólica baja',
          `PA ${pressureValue} mmHg; PAS entre 90 y 99 mmHg.`,
          pressureValue,
          'mmHg',
          'systolic_bp',
          'Vigilar tendencia y correlacionar con perfusión clínica.',
        ),
      ];
    }

    return [];
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
