// Archivo: clinical-alert.types.ts
// Ruta: apps/web/src/components/clinical-alerts/clinical-alert.types.ts
// Funcion: Contratos de alertas y contexto clinico recibidos por el frontend.
export type ClinicalAlertSeverity = 'critical' | 'high' | 'warning' | 'normal';

export type ClinicalAlertCategory =
  | 'vital_signs'
  | 'laboratory'
  | 'allergy'
  | 'diagnosis'
  | 'medication'
  | 'context';

export type ClinicalAlertBlinkSpeed = 'fast' | 'medium' | 'slow' | 'none';

export interface ClinicalAlert {
  id: string;
  severity: ClinicalAlertSeverity;
  blinkSpeed: ClinicalAlertBlinkSpeed;
  category: ClinicalAlertCategory;
  title: string;
  message: string;
  value?: string | number | null;
  unit?: string | null;
  referenceKey: string;
  source: string;
  sourceDate?: string | null;
  suggestedAction?: string | null;
}

export interface ClinicalAlertsClinicalContext {
  altitudeMeters: number;
  altitudeAdjustmentEnabled: boolean;
  referenceProfile: string;
  expectedMin: number;
  expectedMax: number;
}

export interface ClinicalAlertsResponse {
  patientId?: string;
  encounterId?: string;
  globalRisk: ClinicalAlertSeverity;
  alerts: ClinicalAlert[];
  clinicalContext?: ClinicalAlertsClinicalContext;
  generatedAt: string;
}

export interface ClinicalReferenceRangeItem {
  color: 'green' | 'yellow' | 'orange' | 'red';
  severity: ClinicalAlertSeverity;
  label: string;
  criteria: string;
}

export interface ClinicalReferenceBibliography {
  title: string;
  institution?: string;
  year?: string | number;
  url?: string;
  note?: string;
}

export interface ClinicalReferenceRange {
  key: string;
  title: string;
  unit?: string;
  description: string;
  ranges: ClinicalReferenceRangeItem[];
  bibliography: ClinicalReferenceBibliography[];
}
