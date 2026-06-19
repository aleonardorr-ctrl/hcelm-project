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
  sourceDate?: Date | string | null;
  suggestedAction?: string | null;
}

export interface ClinicalAlertsResponse {
  patientId?: string;
  encounterId?: string;
  globalRisk: ClinicalAlertSeverity;
  alerts: ClinicalAlert[];
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