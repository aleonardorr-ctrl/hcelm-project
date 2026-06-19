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

const severityDot: Record<ClinicalAlertSeverity, string> = {
  critical: '🔴',
  high: '🟠',
  warning: '🟡',
  normal: '🟢',
};

const railButtonClasses: Record<ClinicalAlertSeverity, string> = {
  critical:
    'bg-red-600 text-white border-red-800 animate-alert-fast hover:bg-red-700',
  high:
    'bg-orange-500 text-white border-orange-700 animate-alert-medium hover:bg-orange-600',
  warning:
    'bg-yellow-300 text-yellow-950 border-yellow-500 animate-alert-slow hover:bg-yellow-400',
  normal:
    'bg-green-600 text-white border-green-700 hover:bg-green-700',
};

const detailBorderClasses: Record<ClinicalAlertSeverity, string> = {
  critical: 'border-red-500 bg-red-50',
  high: 'border-orange-500 bg-orange-50',
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

  if (key === 'spo2') return 'SpO₂';
  if (key === 'systolic_bp') return 'PA';
  if (key === 'heart_rate') return 'FC';
  if (key === 'respiratory_rate') return 'FR';
  if (key === 'temperature') return 'T°';
  if (key === 'capillary_glucose') return 'Glu';
  if (key === 'glasgow') return 'GCS';
  if (key === 'pain_scale') return 'EVA';
  if (key === 'allergy') return 'Alg';

  if (alert.category === 'allergy') return 'Alg';
  if (alert.category === 'laboratory') return 'Lab';
  if (alert.category === 'diagnosis') return 'Dx';

  return '⚠';
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

  const globalRisk = data?.globalRisk || 'normal';

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
                  {severityDot[selectedAlert.severity]} {selectedAlert.title}
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

            <button
              type="button"
              onClick={() => openReference(selectedAlert.referenceKey)}
              className="mt-3 text-xs font-extrabold text-blue-700 hover:underline"
            >
              {referenceLoadingKey === selectedAlert.referenceKey
                ? 'Cargando referencia...'
                : 'Ver valores de referencia'}
            </button>
          </div>
        )}

        <div className="flex w-[2cm] flex-col items-center gap-[0.5cm] rounded-l-xl border-l border-y border-slate-300 bg-white p-[0.12cm] shadow-2xl">
          <div
            className={`mx-auto flex h-[1.65cm] w-[1.65cm] items-center justify-center rounded-full border-2 text-center text-[18px] font-black shadow-xl ${
              railButtonClasses[globalRisk]
            }`}
            title={`Riesgo global: ${severityLabels[globalRisk]}`}
          >
            ⚠
          </div>

          {loading && (
            <div className="px-1 py-3 text-center text-[10px] font-bold text-slate-500">
              ...
            </div>
          )}

          {!loading && visibleAlerts.length === 0 && (
            <button
              type="button"
              className={`
                mx-auto flex h-[1.65cm] w-[1.65cm] items-center justify-center
                rounded-full border-2 text-center text-[10px] font-black shadow-xl
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
                  mx-auto flex h-[1.65cm] w-[1.65cm] flex-col items-center justify-center
                  rounded-full border-2 text-center text-[9px] font-black leading-tight shadow-xl
                  ${railButtonClasses[alert.severity]}
                `}
                title={`${alert.title}: ${alert.message}`}
              >
                <span className="block text-[13px]">
                  {severityDot[alert.severity]}
                </span>
                <span className="block">{getAlertShortLabel(alert)}</span>
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
