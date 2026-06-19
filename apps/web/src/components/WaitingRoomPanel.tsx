// HCELM - components/WaitingRoomPanel.tsx
// Lista de espera / triaje del día para Pacientes y Anamnesis.
// Versión con estados clínicos: triado, en_atencion, atendido, observacion, referido, alta.

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

type RiskLevel = 'critical' | 'high' | 'warning' | 'normal' | string;

type WaitingRoomVitalSigns = {
  bloodPressure?: string | number | null;
  heartRate?: string | number | null;
  respiratoryRate?: string | number | null;
  temperature?: string | number | null;
  oxygenSat?: string | number | null;
  glucose?: string | number | null;
  painScale?: string | number | null;
  glasgow?: string | number | null;
};

type WaitingRoomPatient = {
  id?: string | null;
  fullName?: string | null;
  documentType?: string | null;
  documentNumber?: string | null;
  gender?: string | null;
  birthDate?: string | null;
  phone?: string | null;
};

type WaitingRoomRow = {
  position: number;
  priorityPosition: number;
  encounterId: string;
  patientId: string;
  patient?: WaitingRoomPatient | null;
  reason?: string | null;
  createdAt?: string | null;
  triageTime?: string | null;
  status?: string | null;
  globalRisk?: RiskLevel;
  alerts?: any[];
  vitalSigns?: WaitingRoomVitalSigns | null;
  diagnosis?: string | null;
};

type WaitingRoomResponse = {
  date?: string;
  total?: number;
  patients?: WaitingRoomRow[];
};

type WaitingRoomPanelProps = {
  currentEncounterId?: string | null;
  variant?: 'compact' | 'full';
  title?: string;
};

function getRiskLabel(risk?: RiskLevel) {
  if (risk === 'critical') return 'Crítico';
  if (risk === 'high') return 'Alto riesgo';
  if (risk === 'warning') return 'Precaución';
  return 'Normal';
}

function getRiskIcon(risk?: RiskLevel) {
  if (risk === 'critical') return '🔴';
  if (risk === 'high') return '🟠';
  if (risk === 'warning') return '🟡';
  return '🟢';
}

function getRiskClasses(risk?: RiskLevel) {
  if (risk === 'critical') {
    return 'border-[#ff0033] bg-red-50 text-red-950 shadow-[0_0_18px_rgba(255,0,51,0.55)]';
  }

  if (risk === 'high') {
    return 'border-[#ff6a00] bg-orange-50 text-orange-950 shadow-[0_0_16px_rgba(255,106,0,0.45)]';
  }

  if (risk === 'warning') {
    return 'border-[#fff200] bg-yellow-50 text-yellow-950 shadow-[0_0_14px_rgba(255,242,0,0.45)]';
  }

  return 'border-emerald-300 bg-emerald-50 text-emerald-950';
}

function normalizeStatus(status?: string | null) {
  return String(status || 'triado').trim().toLowerCase();
}

function getStatusLabel(status?: string | null) {
  const normalized = normalizeStatus(status);

  if (normalized === 'open') return 'TRIADO';
  if (normalized === 'triado') return 'TRIADO';
  if (normalized === 'en_atencion') return 'EN ATENCIÓN';
  if (normalized === 'atendido') return 'ATENDIDO';
  if (normalized === 'observacion') return 'OBSERVACIÓN';
  if (normalized === 'referido') return 'REFERIDO';
  if (normalized === 'alta') return 'ALTA';
  if (normalized === 'cancelado') return 'CANCELADO';

  return String(status || 'TRIADO').toUpperCase();
}

function getStatusClasses(status?: string | null) {
  const normalized = normalizeStatus(status);

  if (normalized === 'en_atencion') {
    return 'bg-blue-700 text-white border-blue-800 shadow-[0_0_14px_rgba(29,78,216,0.55)]';
  }

  if (normalized === 'triado' || normalized === 'open') {
    return 'bg-amber-300 text-amber-950 border-amber-500';
  }

  if (normalized === 'atendido') {
    return 'bg-emerald-700 text-white border-emerald-800';
  }

  if (normalized === 'observacion') {
    return 'bg-purple-700 text-white border-purple-800';
  }

  if (normalized === 'referido') {
    return 'bg-rose-700 text-white border-rose-800';
  }

  if (normalized === 'alta') {
    return 'bg-slate-700 text-white border-slate-800';
  }

  if (normalized === 'cancelado') {
    return 'bg-zinc-200 text-zinc-700 border-zinc-300';
  }

  return 'bg-slate-100 text-slate-700 border-slate-200';
}

function formatTime(value?: string | null) {
  if (!value) return '—';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleTimeString('es-PE', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function calculateAge(birthDate?: string | null) {
  if (!birthDate) return '';

  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return '';

  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age -= 1;
  }

  return age >= 0 ? `${age} años` : '';
}

function normalizeVitalSignsForLocalStorage(vitalSigns?: WaitingRoomVitalSigns | null) {
  if (!vitalSigns) return null;

  const bloodPressure = String(vitalSigns.bloodPressure || '');
  const [systolicRaw, diastolicRaw] = bloodPressure.includes('/')
    ? bloodPressure.split('/')
    : ['', ''];

  const systolicBP = systolicRaw ? Number(String(systolicRaw).trim()) : null;
  const diastolicBP = diastolicRaw ? Number(String(diastolicRaw).trim()) : null;

  return {
    systolicBP: Number.isFinite(systolicBP) ? systolicBP : null,
    diastolicBP: Number.isFinite(diastolicBP) ? diastolicBP : null,
    heartRate: vitalSigns.heartRate ?? null,
    respiratoryRate: vitalSigns.respiratoryRate ?? null,
    temperature: vitalSigns.temperature ?? null,
    oxygenSat: vitalSigns.oxygenSat ?? null,
    capillaryGlucose: vitalSigns.glucose ?? null,
    painScale: vitalSigns.painScale ?? null,
    glasgowTotal: vitalSigns.glasgow ?? null,
    bloodPressure: vitalSigns.bloodPressure ?? null,
  };
}

function formatVitals(vitalSigns?: WaitingRoomVitalSigns | null) {
  if (!vitalSigns) return 'Funciones vitales no registradas';

  const parts = [
    `PA ${vitalSigns.bloodPressure || '—'}`,
    `FC ${vitalSigns.heartRate || '—'}`,
    `FR ${vitalSigns.respiratoryRate || '—'}`,
    `T° ${vitalSigns.temperature || '—'}`,
    `SpO₂ ${vitalSigns.oxygenSat || '—'}%`,
  ];

  if (vitalSigns.glucose && vitalSigns.glucose !== '—') {
    parts.push(`Glu ${vitalSigns.glucose}`);
  }

  if (vitalSigns.painScale && vitalSigns.painScale !== '—') {
    parts.push(`EVA ${vitalSigns.painScale}`);
  }

  if (vitalSigns.glasgow && vitalSigns.glasgow !== '—') {
    parts.push(`GCS ${vitalSigns.glasgow}`);
  }

  return parts.join(' | ');
}

export default function WaitingRoomPanel({
  currentEncounterId,
  variant = 'full',
  title = 'Lista de espera / Triaje de hoy',
}: WaitingRoomPanelProps) {
  const navigate = useNavigate();
  const [data, setData] = useState<WaitingRoomResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(variant === 'full');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const patients = data?.patients || [];

  const currentPatient = useMemo(() => {
    if (!currentEncounterId) return null;
    return patients.find((row) => String(row.encounterId) === String(currentEncounterId)) || null;
  }, [currentEncounterId, patients]);

  const loadWaitingRoom = async () => {
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('ame_token');

      const response = await fetch(`${API_URL}/waiting-room/today`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('No se pudo cargar la lista de espera.');
      }

      const result = await response.json();
      setData(result);
    } catch (err: any) {
      setError(err?.message || 'No se pudo cargar la lista de espera.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWaitingRoom();
  }, []);

  const updateEncounterStatus = async (encounterId: string, status: string) => {
    const token = localStorage.getItem('ame_token');

    const response = await fetch(`${API_URL}/encounters/${encounterId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      throw new Error('No se pudo actualizar el estado de la atención.');
    }

    return response.json();
  };

  const markStatus = async (row: WaitingRoomRow, status: string) => {
    setUpdatingId(row.encounterId);
    setError('');

    try {
      await updateEncounterStatus(row.encounterId, status);
      await loadWaitingRoom();
    } catch (err: any) {
      setError(err?.message || 'No se pudo actualizar el estado.');
    } finally {
      setUpdatingId(null);
    }
  };

  const openEncounter = async (row: WaitingRoomRow) => {
    setUpdatingId(row.encounterId);
    setError('');

    try {
      const currentStatus = normalizeStatus(row.status);

      if (currentStatus === 'triado' || currentStatus === 'open') {
        await updateEncounterStatus(row.encounterId, 'en_atencion');
      }

      if (row.patient) {
        localStorage.setItem(
          'selectedPatient',
          JSON.stringify({
            id: row.patientId,
            fullName: row.patient.fullName,
            documentType: row.patient.documentType,
            documentNumber: row.patient.documentNumber,
            gender: row.patient.gender,
            birthDate: row.patient.birthDate,
            phone: row.patient.phone,
          }),
        );
      }

      localStorage.setItem(
        'selectedEncounter',
        JSON.stringify({
          id: row.encounterId,
          patientId: row.patientId,
          reason: row.reason || '',
          vitalSigns: normalizeVitalSignsForLocalStorage(row.vitalSigns),
        }),
      );

      navigate(`/anamnesis?encounterId=${row.encounterId}`);
    } catch (err: any) {
      setError(err?.message || 'No se pudo abrir la HCE.');
    } finally {
      setUpdatingId(null);
    }
  };

  const goToPrevious = () => {
    if (!currentPatient) return;

    const currentIndex = patients.findIndex(
      (row) => String(row.encounterId) === String(currentPatient.encounterId),
    );

    if (currentIndex > 0) {
      openEncounter(patients[currentIndex - 1]);
    }
  };

  const goToNext = () => {
    if (!currentPatient) return;

    const currentIndex = patients.findIndex(
      (row) => String(row.encounterId) === String(currentPatient.encounterId),
    );

    if (currentIndex >= 0 && currentIndex < patients.length - 1) {
      openEncounter(patients[currentIndex + 1]);
    }
  };

  const currentIndex = currentPatient
    ? patients.findIndex((row) => String(row.encounterId) === String(currentPatient.encounterId))
    : -1;

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 rounded-t-xl border-b bg-slate-50 p-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800">🧑‍⚕️ {title}</h2>
          <p className="text-sm text-slate-500">
            Orden por estado clínico, prioridad y hora de triaje. Total: {data?.total ?? patients.length} pacientes.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {currentPatient && (
            <>
              <button
                type="button"
                onClick={goToPrevious}
                disabled={currentIndex <= 0 || updatingId !== null}
                className="rounded bg-slate-700 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-40"
              >
                ← Anterior
              </button>

              <button
                type="button"
                onClick={goToNext}
                disabled={currentIndex < 0 || currentIndex >= patients.length - 1 || updatingId !== null}
                className="rounded bg-slate-700 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-40"
              >
                Siguiente →
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="rounded bg-blue-700 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-800"
          >
            {open ? 'Ocultar lista' : 'Ver lista'}
          </button>

          <button
            type="button"
            onClick={loadWaitingRoom}
            disabled={loading}
            className="rounded bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
          >
            {loading ? 'Actualizando...' : 'Actualizar'}
          </button>
        </div>
      </div>

      {currentPatient && (
        <div className={`m-4 rounded-lg border-2 p-4 ${getRiskClasses(currentPatient.globalRisk)}`}>
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide">Paciente actual</p>
              <p className="text-xl font-bold">
                {getRiskIcon(currentPatient.globalRisk)} {currentPatient.patient?.fullName || 'Paciente sin nombre'}
              </p>
              <p className="text-sm">
                Posición por prioridad: {currentPatient.priorityPosition} de {patients.length} | Orden de llegada:{' '}
                {currentPatient.position} | Riesgo: {getRiskLabel(currentPatient.globalRisk)}
              </p>
              <p className="mt-1 text-sm font-medium">{formatVitals(currentPatient.vitalSigns)}</p>
            </div>

            <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${getStatusClasses(currentPatient.status)}`}>
              {getStatusLabel(currentPatient.status)}
            </span>
          </div>
        </div>
      )}

      {error && <div className="m-4 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {open && (
        <div className="p-4 pt-0">
          {loading && patients.length === 0 ? (
            <div className="rounded border bg-slate-50 p-4 text-sm text-slate-500">Cargando lista de espera...</div>
          ) : patients.length === 0 ? (
            <div className="rounded border bg-slate-50 p-4 text-sm text-slate-500">
              Todavía no hay pacientes triados el día de hoy.
            </div>
          ) : (
            <div className={variant === 'compact' ? 'space-y-2' : 'grid grid-cols-1 gap-3'}>
              {patients.map((row) => {
                const isCurrent = String(row.encounterId) === String(currentEncounterId || '');
                const status = normalizeStatus(row.status);
                const isBusy = updatingId === row.encounterId;

                return (
                  <div
                    key={row.encounterId}
                    className={`rounded-lg border-2 p-4 ${getRiskClasses(row.globalRisk)} ${
                      isCurrent ? 'ring-4 ring-blue-300' : ''
                    }`}
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0">
                        <p className="text-base font-bold">
                          {getRiskIcon(row.globalRisk)} Prioridad {row.priorityPosition} —{' '}
                          {row.patient?.fullName || 'Paciente sin nombre'}
                        </p>

                        <p className="text-xs font-semibold uppercase tracking-wide opacity-80">
                          Llegada #{row.position} | Triaje: {formatTime(row.triageTime || row.createdAt)} |{' '}
                          {getRiskLabel(row.globalRisk)}
                        </p>

                        <p className="mt-1 text-sm">
                          {row.patient?.documentNumber
                            ? `${row.patient.documentType || 'DNI'}: ${row.patient.documentNumber}`
                            : 'Documento: —'}
                          {row.patient?.birthDate ? ` | ${calculateAge(row.patient.birthDate)}` : ''}
                          {row.patient?.gender ? ` | ${row.patient.gender}` : ''}
                        </p>

                        <p className="mt-2 text-sm font-medium">{formatVitals(row.vitalSigns)}</p>

                        <p className="mt-1 text-sm">
                          <span className="font-semibold">Motivo:</span> {row.reason || '—'}
                        </p>

                        {row.diagnosis && (
                          <p className="mt-1 text-sm">
                            <span className="font-semibold">Diagnóstico:</span> {row.diagnosis}
                          </p>
                        )}

                        {row.alerts && row.alerts.length > 0 && (
                          <p className="mt-1 text-xs font-semibold">Alertas activas: {row.alerts.length}</p>
                        )}
                      </div>

                      <div className="flex shrink-0 flex-col gap-2 md:items-end">
                        <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${getStatusClasses(row.status)}`}>
                          {getStatusLabel(row.status)}
                        </span>

                        <button
                          type="button"
                          onClick={() => openEncounter(row)}
                          disabled={isBusy}
                          className="rounded bg-purple-700 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-800 disabled:opacity-60"
                        >
                          {isBusy ? 'Abriendo...' : 'Abrir HCE'}
                        </button>

                        {status !== 'atendido' && status !== 'alta' && status !== 'referido' && (
                          <button
                            type="button"
                            onClick={() => markStatus(row, 'atendido')}
                            disabled={isBusy}
                            className="rounded bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
                          >
                            Marcar atendido
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
