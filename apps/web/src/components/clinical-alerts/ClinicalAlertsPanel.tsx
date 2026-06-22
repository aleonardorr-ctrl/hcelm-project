// HCELM - components/clinical-alerts/ClinicalAlertsPanel.tsx
// Barra lateral compacta de alertas clínicas con abreviatura y valor alterado.
import { useEffect, useMemo, useState } from 'react';
import ClinicalReferenceModal from './ClinicalReferenceModal';
import type {
  ClinicalAlert,
  ClinicalAlertsResponse,
  ClinicalAlertSeverity,
  ClinicalReferenceRange,
} from './clinical-alert.types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

type ClinicalAlertsPanelProps = {
  patientId?: string | null;
  encounterId?: string | null;
};

const severityOrder: Record<ClinicalAlertSeverity, number> = {
  critical: 1,
  high: 2,
  warning: 3,
  normal: 4,
};

const severityLabels: Record<ClinicalAlertSeverity, string> = {
  critical: 'Crítico',
  high: 'Alto riesgo',
  warning: 'Precaución',
  normal: 'Sin alerta',
};

const railButtonClasses: Record<ClinicalAlertSeverity, string> = {
  critical:
    'bg-[#9f1239] text-white border-[#701a35] animate-alert-fast hover:bg-[#881337]',
  high:
    'bg-orange-600 text-white border-orange-800 animate-alert-medium hover:bg-orange-700',
  warning:
    'bg-yellow-300 text-yellow-950 border-yellow-600 animate-alert-slow hover:bg-yellow-400',
  normal:
    'bg-green-600 text-white border-green-700 hover:bg-green-700',
};

const detailBorderClasses: Record<ClinicalAlertSeverity, string> = {
  critical: 'border-[#9f1239] bg-rose-50',
  high: 'border-orange-600 bg-orange-50',
  warning: 'border-yellow-400 bg-yellow-50',
  normal: 'border-green-400 bg-green-50',
};

function formatDateTime(value?: string | null) {
  if (!value) return 'Sin fecha';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return 'Sin fecha';

  return date.toLocaleString('es-PE', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

function getAlertShortLabel(alert: ClinicalAlert) {
  const key = alert.referenceKey;
  const numericValue = Number(alert.value);

  if (key === 'spo2') return 'SpO₂↓';
  if (key === 'systolic_bp') {
    return Number.isFinite(numericValue) && numericValue < 100 ? 'PA↓' : 'PA↑';
  }
  if (key === 'heart_rate') {
    return Number.isFinite(numericValue) && numericValue < 60 ? 'FC↓' : 'FC↑';
  }
  if (key === 'respiratory_rate') {
    return Number.isFinite(numericValue) && numericValue < 8 ? 'FR↓' : 'FR↑';
  }
  if (key === 'temperature') {
    return Number.isFinite(numericValue) && numericValue < 35 ? 'T°↓' : 'T°↑';
  }
  if (key === 'capillary_glucose') {
    return Number.isFinite(numericValue) && numericValue < 70 ? 'Glu↓' : 'Glu↑';
  }
  if (key === 'glasgow') return 'GCS↓';
  if (key === 'pain_scale') return 'EVA↑';
  if (key === 'allergy') return 'ALG';
  if (key === 'chronic_disease') return 'ANT';

  if (alert.category === 'allergy') return 'Alg';
  if (alert.category === 'laboratory') return 'Lab';
  if (alert.category === 'diagnosis') return 'Dx';

  return 'ALT';
}

function hasClinicalReference(alert: ClinicalAlert) {
  return !['allergy', 'chronic_disease'].includes(alert.referenceKey);
}

function getAlertValue(alert: ClinicalAlert) {
  if (alert.value === null || alert.value === undefined || alert.value === '') {
    return '!';
  }

  const value = String(alert.value);
  const compactUnit: Record<string, string> = {
    '%': '%',
    lpm: '',
    rpm: '',
    '°C': '°',
    'mg/dL': '',
    mmHg: '',
    '/10': '/10',
  };

  return `${value}${compactUnit[alert.unit || ''] ?? ''}`;
}

export default function ClinicalAlertsPanel({
  patientId,
  encounterId,
}: ClinicalAlertsPanelProps) {
  const [data, setData] = useState<ClinicalAlertsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<ClinicalAlert | null>(
    null,
  );
  const [selectedReference, setSelectedReference] =
    useState<ClinicalReferenceRange | null>(null);
  const [referenceLoadingKey, setReferenceLoadingKey] = useState<string | null>(
    null,
  );

  const alerts = useMemo(() => {
    const items = data?.alerts || [];

    return [...items].sort(
      (a, b) => severityOrder[a.severity] - severityOrder[b.severity],
    );
  }, [data]);

  const visibleAlerts = alerts.filter((alert) => alert.severity !== 'normal');
  const clinicalContext = data?.clinicalContext;

  useEffect(() => {
    const token = localStorage.getItem('ame_token');

    if (!token) return;

    const targetUrl = encounterId
      ? `${API_URL}/clinical-alerts/encounter/${encounterId}`
      : patientId
        ? `${API_URL}/clinical-alerts/patient/${patientId}`
        : null;

    if (!targetUrl) {
      setData(null);
      setSelectedAlert(null);
      return;
    }

    setLoading(true);

    fetch(targetUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error('No se pudieron cargar las alertas clínicas.');
        }

        return res.json();
      })
      .then((json: ClinicalAlertsResponse) => {
        setData(json);
      })
      .catch((error) => {
        console.warn(error);
        setData(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [patientId, encounterId]);

  const openReference = async (referenceKey: string) => {
    const token = localStorage.getItem('ame_token');

    if (!token) return;

    try {
      setReferenceLoadingKey(referenceKey);

      const response = await fetch(
        `${API_URL}/clinical-alerts/references/${referenceKey}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error('No se pudo cargar la referencia clínica.');
      }

      const reference = (await response.json()) as ClinicalReferenceRange;
      setSelectedReference(reference);
    } catch (error) {
      console.warn(error);
    } finally {
      setReferenceLoadingKey(null);
    }
  };

  if (!patientId && !encounterId) {
    return null;
  }

  return (
    <>
      <div className="fixed right-0 top-24 z-50 flex items-start">
        {selectedAlert && (
          <div
            className={`mr-1 w-[19rem] rounded-l-xl border-2 p-3 shadow-2xl ${
              detailBorderClasses[selectedAlert.severity]
            }`}
          >
            <div className="mb-2 flex items-start justify-between gap-2">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  <span
                    className={`mr-2 inline-block h-2.5 w-2.5 rounded-full ${
                      selectedAlert.severity === 'critical'
                        ? 'bg-[#9f1239]'
                        : selectedAlert.severity === 'high'
                          ? 'bg-orange-600'
                          : selectedAlert.severity === 'warning'
                            ? 'bg-yellow-400'
                            : 'bg-green-600'
                    }`}
                  />
                  {selectedAlert.title}
                </h3>
                <p className="text-xs font-bold text-slate-600">
                  {severityLabels[selectedAlert.severity]}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedAlert(null)}
                className="rounded bg-white px-2 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <p className="text-sm text-slate-800">{selectedAlert.message}</p>

            {selectedAlert.value !== null &&
              selectedAlert.value !== undefined && (
                <p className="mt-2 rounded bg-white/80 p-2 text-sm font-bold text-slate-900">
                  Valor: {selectedAlert.value} {selectedAlert.unit || ''}
                </p>
              )}

            <div className="mt-2 rounded bg-white/80 p-2 text-xs text-slate-700">
              <p>
                <strong>Fuente:</strong> {selectedAlert.source}
              </p>
              <p>
                <strong>Fecha:</strong>{' '}
                {formatDateTime(selectedAlert.sourceDate || null)}
              </p>
            </div>

            {selectedAlert.suggestedAction && (
              <div className="mt-2 rounded bg-white/90 p-2 text-xs text-slate-800">
                <strong>Acción sugerida:</strong>{' '}
                {selectedAlert.suggestedAction}
              </div>
            )}

            {hasClinicalReference(selectedAlert) && (
              <button
                type="button"
                onClick={() => openReference(selectedAlert.referenceKey)}
                className="mt-3 text-xs font-extrabold text-blue-700 hover:underline"
              >
                {referenceLoadingKey === selectedAlert.referenceKey
                  ? 'Cargando referencia...'
                  : 'Ver valores de referencia'}
              </button>
            )}
          </div>
        )}

        <div className="flex w-[2.05cm] flex-col items-center gap-[0.3cm] rounded-l-lg border-l border-y border-slate-300 bg-white p-[0.12cm] shadow-xl">
          {!loading &&
            clinicalContext?.altitudeAdjustmentEnabled &&
            clinicalContext.altitudeMeters > 0 && (
              <div
                className="w-[1.75cm] rounded border border-sky-700 px-1 py-1.5 text-center font-bold leading-none text-sky-950 bg-sky-50"
                title={`Referencia institucional: ${clinicalContext.expectedMin}-${clinicalContext.expectedMax}% para adulto aclimatado a ${clinicalContext.altitudeMeters} msnm`}
              >
                <span className="block text-[9px]">ALT</span>
                <span className="mt-[3px] block text-[10px]">
                  {clinicalContext.altitudeMeters} m
                </span>
                <span className="mt-[3px] block text-[8px]">
                  {clinicalContext.expectedMin}-{clinicalContext.expectedMax}%
                </span>
              </div>
            )}

          {loading && (
            <div className="px-1 py-3 text-center text-[10px] font-bold text-slate-500">
              ...
            </div>
          )}

          {!loading && visibleAlerts.length === 0 && (
            <button
              type="button"
              className={`
                mx-auto flex h-[1.8cm] w-[1.8cm] items-center justify-center
                rounded-full border text-center text-[12px] font-black shadow-md
                ${railButtonClasses.normal}
              `}
              title="Sin alertas clínicas relevantes"
            >
              OK
            </button>
          )}

          {!loading &&
            visibleAlerts.map((alert) => (
              <button
                key={alert.id}
                type="button"
                onClick={() =>
                  setSelectedAlert((prev) =>
                    prev?.id === alert.id ? null : alert,
                  )
                }
                className={`
                  mx-auto flex h-[1.8cm] w-[1.8cm] flex-col items-center justify-center
                  rounded-full border text-center font-black leading-none shadow-md
                  ${railButtonClasses[alert.severity]}
                `}
                title={`${alert.title}: ${alert.message}`}
              >
                <span className="block text-[10px]">{getAlertShortLabel(alert)}</span>
                <span className="mt-[3px] block max-w-[58px] truncate text-[12px]">
                  {getAlertValue(alert)}
                </span>
              </button>
            ))}
        </div>
      </div>

      <ClinicalReferenceModal
        reference={selectedReference}
        onClose={() => setSelectedReference(null)}
      />
    </>
  );
}
