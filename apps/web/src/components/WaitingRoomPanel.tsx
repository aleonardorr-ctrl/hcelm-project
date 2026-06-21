// HCELM - components/WaitingRoomPanel.tsx
// Panel de lista de espera y triaje con variantes completa y compacta.
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_URL = "http://localhost:3000/api";

type WaitingRoomPatient = {
  position?: number;
  priorityPosition?: number;
  finishedPosition?: number;
  encounterId: string;
  patientId: string;
  patient?: {
    id?: string;
    fullName?: string;
    documentType?: string;
    documentNumber?: string;
    gender?: string;
    birthDate?: string;
    phone?: string;
  };
  reason?: string;
  createdAt?: string;
  triageTime?: string;
  status?: string;
  statusLabel?: string;
  statusGroup?: "active" | "finished" | "other";
  globalRisk?: "critical" | "high" | "warning" | "normal" | string;
  alerts?: any[];
  vitalSigns?: {
    bloodPressure?: string | number;
    heartRate?: string | number;
    respiratoryRate?: string | number;
    temperature?: string | number;
    oxygenSat?: string | number;
    glucose?: string | number;
    painScale?: string | number;
    glasgow?: string | number;
  };
  rawVitalSigns?: any;
  diagnosis?: string;
};

type WaitingRoomResponse = {
  date?: string;
  total?: number;
  activeTotal?: number;
  finishedTotal?: number;
  activePatients?: WaitingRoomPatient[];
  finishedPatients?: WaitingRoomPatient[];
  patients?: WaitingRoomPatient[];
};

type Props = {
  currentEncounterId?: string | null;
  variant?: "compact" | "full";
  title?: string;
};

const riskLabels: Record<string, string> = {
  critical: "CRÍTICO",
  high: "ALTO RIESGO",
  warning: "PRECAUCIÓN",
  normal: "NORMAL",
};

const riskClasses: Record<string, string> = {
  critical: "bg-[#ff0033] text-white border-[#ff0033]",
  high: "bg-[#ff6a00] text-white border-[#ff6a00]",
  warning: "bg-[#fff200] text-black border-[#fff200]",
  normal: "bg-[#00e676] text-black border-[#00e676]",
};

const statusClasses: Record<string, string> = {
  triado: "bg-blue-100 text-blue-800 border-blue-300",
  en_atencion: "bg-emerald-100 text-emerald-800 border-emerald-300",
  atendido: "bg-slate-100 text-slate-700 border-slate-300",
  observacion: "bg-purple-100 text-purple-800 border-purple-300",
  referido: "bg-orange-100 text-orange-800 border-orange-300",
  alta: "bg-green-100 text-green-800 border-green-300",
  cancelado: "bg-red-100 text-red-800 border-red-300",
};

function formatTime(value?: string) {
  if (!value) return "—";

  try {
    return new Date(value).toLocaleTimeString("es-PE", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function parseBloodPressure(bp: any) {
  if (!bp || bp === "—") {
    return {
      systolicBP: "",
      diastolicBP: "",
    };
  }

  const [systolicBP, diastolicBP] = String(bp).split("/");

  return {
    systolicBP: systolicBP || "",
    diastolicBP: diastolicBP || "",
  };
}

function normalizeVitalSigns(row: WaitingRoomPatient) {
  const raw = row.rawVitalSigns || {};
  const formatted = row.vitalSigns || {};
  const parsedBp = parseBloodPressure(formatted.bloodPressure);

  return {
    systolicBP: raw.systolicBP ?? parsedBp.systolicBP,
    diastolicBP: raw.diastolicBP ?? parsedBp.diastolicBP,
    heartRate: raw.heartRate ?? formatted.heartRate ?? "",
    respiratoryRate: raw.respiratoryRate ?? formatted.respiratoryRate ?? "",
    temperature: raw.temperature ?? formatted.temperature ?? "",
    oxygenSat: raw.oxygenSat ?? formatted.oxygenSat ?? "",
    weightKg: raw.weightKg ?? "",
    heightCm: raw.heightCm ?? "",
    bmi: raw.bmi ?? "",
    capillaryGlucose: raw.capillaryGlucose ?? formatted.glucose ?? "",
    painScale: raw.painScale ?? formatted.painScale ?? "",
    consciousness: raw.consciousness ?? "",
    glasgowEye: raw.glasgowEye ?? "",
    glasgowVerbal: raw.glasgowVerbal ?? "",
    glasgowMotor: raw.glasgowMotor ?? "",
    glasgowTotal: raw.glasgowTotal ?? formatted.glasgow ?? "",
    oxygenSupport: raw.oxygenSupport ?? "",
    fio2: raw.fio2 ?? "",
    nursingNotes: raw.nursingNotes ?? "",
  };
}

export default function WaitingRoomPanel({
  currentEncounterId,
  variant = "full",
  title = "Lista de espera / Triaje de hoy",
}: Props) {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [waitingRoom, setWaitingRoom] = useState<WaitingRoomResponse | null>(
    null,
  );
  const [showFinished, setShowFinished] = useState(false);
  const [error, setError] = useState("");

  const token = localStorage.getItem("ame_token");

  const loadWaitingRoom = async () => {
    if (!token) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/waiting-room/today`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("No se pudo cargar la lista de espera.");
      }

      const data = await response.json();
      setWaitingRoom(data);
    } catch (err) {
      console.error("Error cargando lista de espera:", err);
      setError("No se pudo cargar la lista de espera.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWaitingRoom();

    const handler = () => loadWaitingRoom();
    window.addEventListener("waiting-room-refresh", handler);

    return () => {
      window.removeEventListener("waiting-room-refresh", handler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const activePatients = useMemo(() => {
    if (Array.isArray(waitingRoom?.activePatients)) {
      return waitingRoom?.activePatients || [];
    }

    return waitingRoom?.patients || [];
  }, [waitingRoom]);

  const finishedPatients = useMemo(() => {
    return waitingRoom?.finishedPatients || [];
  }, [waitingRoom]);

  const currentIndex = activePatients.findIndex(
    (row) => String(row.encounterId) === String(currentEncounterId || ""),
  );

  const openEncounter = async (row: WaitingRoomPatient) => {
    if (!row.encounterId || !row.patientId) return;

    if (row.patient) {
      localStorage.setItem(
        "selectedPatient",
        JSON.stringify({
          ...row.patient,
          id: row.patient.id || row.patientId,
        }),
      );
    }

    localStorage.setItem(
      "selectedEncounter",
      JSON.stringify({
        id: row.encounterId,
        patientId: row.patientId,
        reason: row.reason || "",
        vitalSigns: normalizeVitalSigns(row),
      }),
    );

    if (row.status === "triado") {
      try {
        await fetch(`${API_URL}/encounters/${row.encounterId}/start`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        window.dispatchEvent(new Event("waiting-room-refresh"));
      } catch (err) {
        console.warn("No se pudo marcar la atención como en atención:", err);
      }
    }

    navigate(`/anamnesis?encounterId=${row.encounterId}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const markAsAttended = async (row: WaitingRoomPatient) => {
    if (!row.encounterId) return;

    const confirm = window.confirm(
      `¿Marcar como atendido a ${row.patient?.fullName || "este paciente"}?`,
    );

    if (!confirm) return;

    try {
      const response = await fetch(
        `${API_URL}/encounters/${row.encounterId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            status: "atendido",
          }),
        },
      );

      if (!response.ok) {
        throw new Error("No se pudo actualizar el estado.");
      }

      await loadWaitingRoom();
      window.dispatchEvent(new Event("waiting-room-refresh"));
    } catch (err) {
      console.error("Error actualizando estado:", err);
      alert("No se pudo marcar la atención como atendida.");
    }
  };

  const goToRelativePatient = (direction: "previous" | "next") => {
    if (currentIndex < 0) return;

    const targetIndex =
      direction === "previous" ? currentIndex - 1 : currentIndex + 1;

    const target = activePatients[targetIndex];

    if (target) {
      openEncounter(target);
    }
  };

  const renderPatientCard = (
    row: WaitingRoomPatient,
    options?: { finished?: boolean },
  ) => {
    const risk = row.globalRisk || "normal";
    const status = row.status || "triado";
    const isCurrent =
      String(row.encounterId) === String(currentEncounterId || "");

    return (
      <div
        key={row.encounterId}
        className={`rounded-lg border p-3 ${
          isCurrent ? "border-blue-500 bg-blue-50" : "bg-white"
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-slate-800 px-2 py-1 text-xs font-bold text-white">
                {options?.finished
                  ? `#${row.finishedPosition || row.position || "—"}`
                  : `#${row.priorityPosition || row.position || "—"}`}
              </span>

              <span
                className={`rounded-full border px-2 py-1 text-xs font-bold ${
                  riskClasses[risk] || riskClasses.normal
                }`}
              >
                {riskLabels[risk] || risk.toUpperCase()}
              </span>

              <span
                className={`rounded-full border px-2 py-1 text-xs font-bold ${
                  statusClasses[status] || "bg-slate-100 text-slate-700"
                }`}
              >
                {row.statusLabel || status.toUpperCase()}
              </span>

              {isCurrent && (
                <span className="rounded-full bg-blue-600 px-2 py-1 text-xs font-bold text-white">
                  PACIENTE ACTUAL
                </span>
              )}
            </div>

            <h3 className="mt-2 text-base font-bold text-slate-800">
              {row.patient?.fullName || "Paciente sin nombre"}
            </h3>

            <p className="text-sm text-slate-600">
              DNI: {row.patient?.documentNumber || "—"} | Triaje:{" "}
              {formatTime(row.triageTime || row.createdAt)}
            </p>

            <p className="mt-1 text-sm text-slate-700">
              Motivo: {row.reason || "—"}
            </p>

            {row.diagnosis && (
              <p className="mt-1 text-sm text-slate-700">
                Diagnóstico: {row.diagnosis}
              </p>
            )}

            <p className="mt-2 text-sm font-semibold text-slate-800">
              PA {row.vitalSigns?.bloodPressure || "—"} | FC{" "}
              {row.vitalSigns?.heartRate || "—"} | FR{" "}
              {row.vitalSigns?.respiratoryRate || "—"} | T°{" "}
              {row.vitalSigns?.temperature || "—"} | SpO₂{" "}
              {row.vitalSigns?.oxygenSat || "—"}%
            </p>
          </div>

          <div className="flex flex-wrap gap-2 md:justify-end">
            <button
              type="button"
              onClick={() => openEncounter(row)}
              className="rounded bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Abrir HCE
            </button>

            {!options?.finished && status !== "atendido" && (
              <button
                type="button"
                onClick={() => markAsAttended(row)}
                className="rounded bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Marcar atendido
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <section
      className={`rounded-xl border border-slate-200 bg-white shadow-sm ${
        variant === "compact" ? "p-3" : "p-4"
      }`}
    >
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-800">
            {title}
          </h2>
          <p className="text-sm text-slate-600">
            Pendientes o activos: {activePatients.length} | Finalizadas hoy:{" "}
            {finishedPatients.length}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {currentIndex > 0 && (
            <button
              type="button"
              onClick={() => goToRelativePatient("previous")}
              className="rounded bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
            >
              ← Anterior
            </button>
          )}

          {currentIndex >= 0 && currentIndex < activePatients.length - 1 && (
            <button
              type="button"
              onClick={() => goToRelativePatient("next")}
              className="rounded bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
            >
              Siguiente →
            </button>
          )}

          <button
            type="button"
            onClick={loadWaitingRoom}
            className="rounded bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            {loading ? "Actualizando..." : "Actualizar"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-3 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mt-4 space-y-3">
        {activePatients.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            No hay pacientes pendientes o activos en la lista de espera.
          </div>
        ) : (
          activePatients.map((row) => renderPatientCard(row))
        )}
      </div>

      <div className="mt-4 border-t pt-3">
        <button
          type="button"
          onClick={() => setShowFinished((prev) => !prev)}
          className="flex w-full items-center justify-between rounded bg-slate-100 px-3 py-2 text-left text-sm font-bold text-slate-700 hover:bg-slate-200"
        >
          <span>Atenciones finalizadas hoy ({finishedPatients.length})</span>
          <span>{showFinished ? "−" : "+"}</span>
        </button>

        {showFinished && (
          <div className="mt-3 space-y-3">
            {finishedPatients.length === 0 ? (
              <p className="rounded border bg-white p-3 text-sm text-slate-500">
                Aún no hay atenciones finalizadas hoy.
              </p>
            ) : (
              finishedPatients.map((row) =>
                renderPatientCard(row, { finished: true }),
              )
            )}
          </div>
        )}
      </div>
    </section>
  );
}
