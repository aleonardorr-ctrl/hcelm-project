import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getAuthToken } from "../lib/auth";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

type AuthorizationStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "EXPIRED"
  | "CONSUMED"
  | "CANCELLED"
  | string;

type AuthorizationUser = {
  id: string;
  fullName?: string | null;
  email?: string | null;
  role?: string | null;
  active?: boolean;
};

type FefoAuthorization = {
  id: string;
  companyId: string;
  businessUnitId: string;
  warehouseId: string;
  medicationId: string;
  companyMedicationId: string;
  lotId: string;
  requestedById: string;
  requestedQuantity: string | number;
  requestReason: string;
  status: AuthorizationStatus;
  ruleKey: string;
  daysToExpireAtRequest: number;
  lotNumber: string;
  expirationDate: string;
  stockAtRequest: string | number;
  approvedById?: string | null;
  approvalReason?: string | null;
  approvedAt?: string | null;
  rejectedById?: string | null;
  rejectionReason?: string | null;
  rejectedAt?: string | null;
  validUntil: string;
  consumedAt?: string | null;
  consumedBySaleId?: string | null;
  cancelledAt?: string | null;
  cancellationReason?: string | null;
  createdAt: string;
  updatedAt: string;
  requester?: AuthorizationUser | null;
  approver?: AuthorizationUser | null;
  rejecter?: AuthorizationUser | null;
  canceller?: AuthorizationUser | null;
  canCurrentUserDecide?: boolean;
};

type ListResponse = {
  items: FefoAuthorization[];
  total: number;
  canAuthorize: boolean;
  appliedStatus?: AuthorizationStatus | null;
  limit: number;
};

type DecisionState = {
  action: "APPROVE" | "REJECT";
  authorizationId: string;
  reason: string;
};

type TokenResult = {
  authorizationId: string;
  token: string;
  validUntil?: string | null;
};

const STATUS_OPTIONS = [
  { value: "PENDING", label: "Pendientes" },
  { value: "APPROVED", label: "Aprobadas" },
  { value: "REJECTED", label: "Rechazadas" },
  { value: "EXPIRED", label: "Vencidas" },
  { value: "CONSUMED", label: "Utilizadas" },
  { value: "", label: "Todas" },
];

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendiente",
  APPROVED: "Aprobada",
  REJECTED: "Rechazada",
  EXPIRED: "Vencida",
  CONSUMED: "Utilizada",
  CANCELLED: "Cancelada",
};

const STATUS_CLASSES: Record<string, string> = {
  PENDING: "border-amber-300 bg-amber-50 text-amber-900",
  APPROVED: "border-emerald-300 bg-emerald-50 text-emerald-900",
  REJECTED: "border-red-300 bg-red-50 text-red-900",
  EXPIRED: "border-slate-300 bg-slate-100 text-slate-700",
  CONSUMED: "border-blue-300 bg-blue-50 text-blue-900",
  CANCELLED: "border-slate-300 bg-slate-100 text-slate-700",
};

function formatDate(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatExpirationDate(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "medium",
  }).format(date);
}

function displayUser(user?: AuthorizationUser | null) {
  if (!user) return "Usuario no disponible";

  return user.fullName?.trim() || user.email?.trim() || "Usuario sin nombre";
}

function getErrorMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === "object" && "message" in payload) {
    const message = (payload as { message?: unknown }).message;

    if (Array.isArray(message)) {
      return message.join(" ");
    }

    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }

  return fallback;
}

export default function PharmacyFefoAuthorizations() {
  const [status, setStatus] = useState("PENDING");
  const [items, setItems] = useState<FefoAuthorization[]>([]);
  const [canAuthorize, setCanAuthorize] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [decision, setDecision] = useState<DecisionState | null>(null);
  const [deciding, setDeciding] = useState(false);
  const [tokenResult, setTokenResult] = useState<TokenResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const pendingCount = useMemo(
    () => items.filter((item) => item.status === "PENDING").length,
    [items],
  );

  const loadAuthorizations = useCallback(
    async (background = false) => {
      const token = getAuthToken();

      if (!token) {
        setError("La sesión no contiene un token de autenticación.");
        setLoading(false);
        return;
      }

      if (background) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      try {
        const query = status ? `?status=${encodeURIComponent(status)}` : "";

        const response = await fetch(
          `${API_BASE}/pharmacy-fefo/authorizations${query}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(
            getErrorMessage(
              payload,
              "No se pudo cargar la bandeja de autorizaciones FEFO.",
            ),
          );
        }

        const data = payload as ListResponse;

        setItems(Array.isArray(data.items) ? data.items : []);
        setCanAuthorize(data.canAuthorize === true);
      } catch (reason) {
        setError(
          reason instanceof Error
            ? reason.message
            : "No se pudo cargar la bandeja FEFO.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [status],
  );

  useEffect(() => {
    void loadAuthorizations();
  }, [loadAuthorizations]);

  function openDecision(authorizationId: string, action: "APPROVE" | "REJECT") {
    setTokenResult(null);
    setCopied(false);
    setError("");
    setDecision({
      authorizationId,
      action,
      reason:
        action === "APPROVE"
          ? "Autorización revisada y aprobada por necesidad operativa."
          : "Solicitud rechazada luego de la revisión farmacéutica.",
    });
  }

  async function submitDecision() {
    if (!decision || deciding) return;

    const reason = decision.reason.trim();

    if (reason.length < 10) {
      setError("El motivo debe tener por lo menos 10 caracteres.");
      return;
    }

    const token = getAuthToken();

    if (!token) {
      setError("La sesión no contiene un token de autenticación.");
      return;
    }

    setDeciding(true);
    setError("");

    try {
      const endpoint = decision.action === "APPROVE" ? "approve" : "reject";

      const response = await fetch(
        `${API_BASE}/pharmacy-fefo/authorizations/${decision.authorizationId}/${endpoint}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ reason }),
        },
      );

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          getErrorMessage(
            payload,
            decision.action === "APPROVE"
              ? "No se pudo aprobar la autorización."
              : "No se pudo rechazar la autorización.",
          ),
        );
      }

      if (decision.action === "APPROVE") {
        const plainToken =
          typeof payload?.authorizationToken === "string"
            ? payload.authorizationToken
            : "";

        if (!plainToken) {
          throw new Error(
            "La aprobación se registró, pero la API no devolvió el token.",
          );
        }

        setTokenResult({
          authorizationId: decision.authorizationId,
          token: plainToken,
          validUntil: payload?.authorization?.validUntil || null,
        });
      }

      setDecision(null);
      await loadAuthorizations(true);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "No se pudo completar la decisión.",
      );
    } finally {
      setDeciding(false);
    }
  }

  async function copyToken() {
    if (!tokenResult?.token) return;

    try {
      await navigator.clipboard.writeText(tokenResult.token);
      setCopied(true);
    } catch {
      setError(
        "No se pudo copiar automáticamente. Seleccione y copie el token manualmente.",
      );
    }
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-orange-700">
              Botica Premium
            </p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
              Autorizaciones FEFO
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              Revisión por un segundo usuario de las solicitudes para vender
              lotes clasificados como críticos.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex">
            <Link
              to="/pharmacy"
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              Farmacia
            </Link>

            <Link
              to="/pharmacy/sales/new"
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-emerald-700 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-800"
            >
              Nueva venta
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6 lg:px-8">
        <section className="rounded-xl border border-orange-200 bg-orange-50 p-4">
          <h2 className="font-bold text-orange-950">
            Control de doble usuario
          </h2>
          <p className="mt-1 text-sm text-orange-900">
            La persona que solicita no puede aprobar ni rechazar su propia
            solicitud. El token de aprobación se muestra una sola vez y debe
            entregarse al responsable de la venta.
          </p>
        </section>

        {tokenResult ? (
          <section className="rounded-xl border-2 border-emerald-400 bg-emerald-50 p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-bold uppercase tracking-wide text-emerald-800">
                  Autorización aprobada
                </p>
                <h2 className="mt-1 text-xl font-bold text-emerald-950">
                  Copie el token ahora
                </h2>
                <p className="mt-2 text-sm text-emerald-900">
                  HCELM no podrá volver a mostrar este token después de cerrar
                  este recuadro o actualizar la página.
                </p>

                <p className="mt-4 text-xs font-bold uppercase text-emerald-800">
                  Identificador de autorización
                </p>
                <code className="mt-1 block break-all rounded-lg border border-emerald-300 bg-white p-3 text-sm text-slate-900">
                  {tokenResult.authorizationId}
                </code>

                <p className="mt-4 text-xs font-bold uppercase text-emerald-800">
                  Token de un solo uso
                </p>
                <code className="mt-1 block break-all rounded-lg border-2 border-emerald-400 bg-white p-4 font-mono text-base font-bold text-slate-950">
                  {tokenResult.token}
                </code>

                <p className="mt-2 text-xs text-emerald-800">
                  Vigente hasta: {formatDate(tokenResult.validUntil)}
                </p>
              </div>

              <div className="flex shrink-0 flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void copyToken()}
                  className="rounded-lg bg-emerald-700 px-4 py-2.5 font-bold text-white hover:bg-emerald-800"
                >
                  {copied ? "Token copiado" : "Copiar token"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setTokenResult(null);
                    setCopied(false);
                  }}
                  className="rounded-lg border border-emerald-400 bg-white px-4 py-2.5 font-bold text-emerald-900 hover:bg-emerald-100"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </section>
        ) : null}

        <section className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <label
                htmlFor="fefo-status"
                className="text-xs font-bold uppercase text-slate-600"
              >
                Estado
              </label>
              <select
                id="fefo-status"
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value);
                  setDecision(null);
                  setTokenResult(null);
                }}
                className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 sm:w-56"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value || "ALL"} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-lg bg-slate-100 px-4 py-2 text-sm text-slate-700">
                Resultados: <strong>{items.length}</strong>
                {status === "PENDING" ? (
                  <>
                    {" "}
                    · Pendientes: <strong>{pendingCount}</strong>
                  </>
                ) : null}
              </div>

              <button
                type="button"
                onClick={() => void loadAuthorizations(true)}
                disabled={refreshing}
                className="min-h-11 rounded-lg border border-slate-300 bg-white px-4 py-2 font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                {refreshing ? "Actualizando..." : "Actualizar"}
              </button>
            </div>
          </div>
        </section>

        {!canAuthorize ? (
          <section className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
            Puede consultar sus propias solicitudes, pero su usuario no tiene un
            rol habilitado para aprobarlas o rechazarlas.
          </section>
        ) : null}

        {error ? (
          <section className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm font-semibold text-red-900">
            {error}
          </section>
        ) : null}

        {loading ? (
          <section className="rounded-xl border bg-white p-8 text-center text-slate-600 shadow-sm">
            Cargando autorizaciones FEFO...
          </section>
        ) : items.length === 0 ? (
          <section className="rounded-xl border bg-white p-8 text-center shadow-sm">
            <p className="text-lg font-bold text-slate-800">
              No hay solicitudes en este estado
            </p>
            <p className="mt-2 text-sm text-slate-600">
              Actualice la bandeja después de que otro usuario genere una
              solicitud desde el punto de venta.
            </p>
          </section>
        ) : (
          <div className="space-y-4">
            {items.map((item) => {
              const statusClass =
                STATUS_CLASSES[item.status] ||
                "border-slate-300 bg-slate-100 text-slate-700";

              return (
                <article
                  key={item.id}
                  className="overflow-hidden rounded-xl border bg-white shadow-sm"
                >
                  <div className="flex flex-col gap-3 border-b bg-slate-50 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-bold ${statusClass}`}
                        >
                          {STATUS_LABELS[item.status] || item.status}
                        </span>

                        <span className="text-sm text-slate-500">
                          Solicitada: {formatDate(item.createdAt)}
                        </span>
                      </div>

                      <h2 className="mt-3 text-lg font-bold text-slate-900">
                        Lote {item.lotNumber}
                      </h2>

                      <p className="mt-1 break-all text-xs text-slate-500">
                        Autorización: {item.id}
                      </p>
                    </div>

                    <div className="rounded-lg border bg-white px-4 py-3 text-right">
                      <p className="text-xs font-bold uppercase text-slate-500">
                        Cantidad solicitada
                      </p>
                      <p className="mt-1 text-xl font-bold text-slate-900">
                        {String(item.requestedQuantity)}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_300px]">
                    <div className="space-y-4">
                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        <div className="rounded-lg border p-3">
                          <p className="text-xs font-bold uppercase text-slate-500">
                            Vencimiento del lote
                          </p>
                          <p className="mt-1 font-semibold text-slate-900">
                            {formatExpirationDate(item.expirationDate)}
                          </p>
                          <p className="mt-1 text-xs text-red-700">
                            {item.daysToExpireAtRequest} día(s) al solicitar
                          </p>
                        </div>

                        <div className="rounded-lg border p-3">
                          <p className="text-xs font-bold uppercase text-slate-500">
                            Stock al solicitar
                          </p>
                          <p className="mt-1 font-semibold text-slate-900">
                            {String(item.stockAtRequest)}
                          </p>
                        </div>

                        <div className="rounded-lg border p-3">
                          <p className="text-xs font-bold uppercase text-slate-500">
                            Solicitud vigente hasta
                          </p>
                          <p className="mt-1 font-semibold text-slate-900">
                            {formatDate(item.validUntil)}
                          </p>
                        </div>
                      </div>

                      <div>
                        <p className="text-xs font-bold uppercase text-slate-500">
                          Motivo de la solicitud
                        </p>
                        <p className="mt-1 whitespace-pre-wrap rounded-lg border bg-slate-50 p-3 text-sm text-slate-800">
                          {item.requestReason}
                        </p>
                      </div>

                      {item.approvalReason ? (
                        <div>
                          <p className="text-xs font-bold uppercase text-emerald-700">
                            Motivo de aprobación
                          </p>
                          <p className="mt-1 whitespace-pre-wrap rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-950">
                            {item.approvalReason}
                          </p>
                        </div>
                      ) : null}

                      {item.rejectionReason ? (
                        <div>
                          <p className="text-xs font-bold uppercase text-red-700">
                            Motivo del rechazo
                          </p>
                          <p className="mt-1 whitespace-pre-wrap rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-950">
                            {item.rejectionReason}
                          </p>
                        </div>
                      ) : null}
                    </div>

                    <aside className="space-y-4">
                      <div className="rounded-lg border p-4">
                        <p className="text-xs font-bold uppercase text-slate-500">
                          Solicitante
                        </p>
                        <p className="mt-1 font-bold text-slate-900">
                          {displayUser(item.requester)}
                        </p>
                        {item.requester?.email ? (
                          <p className="mt-1 break-all text-xs text-slate-500">
                            {item.requester.email}
                          </p>
                        ) : null}
                      </div>

                      {item.approver ? (
                        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                          <p className="text-xs font-bold uppercase text-emerald-700">
                            Aprobado por
                          </p>
                          <p className="mt-1 font-bold text-emerald-950">
                            {displayUser(item.approver)}
                          </p>
                          <p className="mt-1 text-xs text-emerald-800">
                            {formatDate(item.approvedAt)}
                          </p>
                        </div>
                      ) : null}

                      {item.rejecter ? (
                        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                          <p className="text-xs font-bold uppercase text-red-700">
                            Rechazado por
                          </p>
                          <p className="mt-1 font-bold text-red-950">
                            {displayUser(item.rejecter)}
                          </p>
                          <p className="mt-1 text-xs text-red-800">
                            {formatDate(item.rejectedAt)}
                          </p>
                        </div>
                      ) : null}

                      {item.canCurrentUserDecide ? (
                        <div className="grid gap-2">
                          <button
                            type="button"
                            onClick={() => openDecision(item.id, "APPROVE")}
                            className="min-h-11 rounded-lg bg-emerald-700 px-4 py-2 font-bold text-white hover:bg-emerald-800"
                          >
                            Aprobar
                          </button>

                          <button
                            type="button"
                            onClick={() => openDecision(item.id, "REJECT")}
                            className="min-h-11 rounded-lg border border-red-300 bg-red-50 px-4 py-2 font-bold text-red-800 hover:bg-red-100"
                          >
                            Rechazar
                          </button>
                        </div>
                      ) : item.status === "PENDING" ? (
                        <p className="rounded-lg border bg-slate-50 p-3 text-center text-xs text-slate-600">
                          Este usuario no puede decidir esta solicitud.
                        </p>
                      ) : null}
                    </aside>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      {decision ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-xl rounded-xl bg-white shadow-2xl">
            <div className="border-b px-5 py-4">
              <p className="text-sm font-bold uppercase tracking-wide text-slate-500">
                Decisión de segundo usuario
              </p>
              <h2 className="mt-1 text-xl font-bold text-slate-900">
                {decision.action === "APPROVE"
                  ? "Aprobar autorización FEFO"
                  : "Rechazar autorización FEFO"}
              </h2>
            </div>

            <div className="space-y-4 p-5">
              <div>
                <label
                  htmlFor="decision-reason"
                  className="text-xs font-bold uppercase text-slate-600"
                >
                  Motivo de la decisión
                </label>
                <textarea
                  id="decision-reason"
                  value={decision.reason}
                  onChange={(event) =>
                    setDecision((current) =>
                      current
                        ? {
                            ...current,
                            reason: event.target.value,
                          }
                        : current,
                    )
                  }
                  rows={5}
                  maxLength={1000}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Mínimo 10 caracteres. Registrados:{" "}
                  {decision.reason.trim().length}
                </p>
              </div>

              {decision.action === "APPROVE" ? (
                <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                  Al aprobar, el token se mostrará una sola vez y tendrá una
                  vigencia limitada.
                </div>
              ) : null}
            </div>

            <div className="flex flex-col-reverse gap-2 border-t px-5 py-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setDecision(null)}
                disabled={deciding}
                className="rounded-lg border border-slate-300 px-4 py-2.5 font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={() => void submitDecision()}
                disabled={deciding || decision.reason.trim().length < 10}
                className={
                  decision.action === "APPROVE"
                    ? "rounded-lg bg-emerald-700 px-4 py-2.5 font-bold text-white hover:bg-emerald-800 disabled:opacity-60"
                    : "rounded-lg bg-red-700 px-4 py-2.5 font-bold text-white hover:bg-red-800 disabled:opacity-60"
                }
              >
                {deciding
                  ? "Procesando..."
                  : decision.action === "APPROVE"
                    ? "Confirmar aprobación"
                    : "Confirmar rechazo"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
