import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

type FiscalProfile = {
  fiscalAddress?: string | null;
  ubigeo?: string | null;
  department?: string | null;
  province?: string | null;
  district?: string | null;
  provider?: string | null;
  environment?: string | null;
  certificateExpiresAt?: string | null;
  active?: boolean;
  credentialConfigured?: boolean;
  certificateConfigured?: boolean;
};

type Sequence = {
  documentType: "BOLETA" | "FACTURA" | string;
  series: string;
  currentNumber: number;
  active: boolean;
};

type ReadinessResponse = {
  company?: {
    code?: string;
    legalName?: string;
    tradeName?: string | null;
    ruc?: string;
  };
  businessUnit?: { code?: string; name?: string };
  warehouse?: { code?: string; name?: string };
  fiscalProfile?: FiscalProfile | null;
  sequences?: Sequence[];
  catalog?: {
    activeProducts?: number;
    missingFiscalConfiguration?: number;
    ready?: boolean;
  };
  readiness?: {
    profileReady?: boolean;
    boletaSeriesReady?: boolean;
    facturaSeriesReady?: boolean;
    providerReady?: boolean;
    certificateReady?: boolean;
    draftBaseReady?: boolean;
    submissionReady?: boolean;
  };
  rules?: Record<string, unknown>;
};

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
const BUSINESS_UNIT = "BOTICA";
const WAREHOUSE = "PRINCIPAL";

function getToken() {
  return sessionStorage.getItem("ame_token") || "";
}

async function readError(response: Response, fallback: string) {
  try {
    const data = await response.json();
    if (Array.isArray(data?.message)) return data.message.join(" ");
    return data?.message || fallback;
  } catch {
    return fallback;
  }
}

function statusText(value?: boolean) {
  return value ? "Listo" : "Pendiente";
}

function formatDate(value?: string | null) {
  if (!value) return "No registrado";
  return new Date(value).toLocaleDateString("es-PE");
}

export default function Billing() {
  const [data, setData] = useState<ReadinessResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadReadiness() {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        businessUnit: BUSINESS_UNIT,
        warehouse: WAREHOUSE,
      });
      const response = await fetch(
        API_BASE + "/electronic-billing/readiness?" + params.toString(),
        { headers: { Authorization: "Bearer " + getToken() } },
      );
      if (!response.ok) {
        throw new Error(
          await readError(response, "No se pudo cargar la preparación fiscal."),
        );
      }
      setData((await response.json()) as ReadinessResponse);
    } catch (reason: any) {
      setError(reason?.message || "Error al cargar facturación.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadReadiness();
  }, []);

  const boletaSequence = useMemo(
    () => data?.sequences?.find((item) => item.documentType === "BOLETA"),
    [data?.sequences],
  );
  const facturaSequence = useMemo(
    () => data?.sequences?.find((item) => item.documentType === "FACTURA"),
    [data?.sequences],
  );

  const context = data?.company
    ? [
        data.company.legalName || data.company.tradeName || data.company.code,
        "RUC " + (data.company.ruc || "-"),
        data.businessUnit?.name || data.businessUnit?.code || BUSINESS_UNIT,
        data.warehouse?.name || data.warehouse?.code || WAREHOUSE,
      ].join(" / ")
    : "Suministros Críticos EIRL / Botica Premium / Almacén principal";

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-6 md:px-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="rounded-2xl bg-white p-5 shadow-sm">
          <nav className="mb-3 flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-500">
            <Link to="/home" className="hover:text-cyan-700">
              Plataforma
            </Link>
            <span>/</span>
            <span className="text-slate-900">Facturación SUNAT</span>
          </nav>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase text-cyan-700">
                Preparación fiscal
              </p>
              <h1 className="text-3xl font-bold text-slate-900">
                Facturación SUNAT
              </h1>
              <p className="mt-2 text-sm text-slate-600">
                Contexto operativo: {context}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={loadReadiness}
                className="rounded-lg border px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                Actualizar estado
              </button>
              <Link
                to="/pharmacy/sales/new"
                className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-bold text-white hover:bg-slate-900"
              >
                Ir a ventas
              </Link>
            </div>
          </div>
        </header>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">
            {error}
          </div>
        )}

        {loading ? (
          <section className="rounded-2xl bg-white p-6 text-slate-600 shadow-sm">
            Cargando preparación fiscal...
          </section>
        ) : (
          <>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatusCard
                title="Perfil fiscal"
                value={statusText(data?.readiness?.profileReady)}
                detail={
                  data?.fiscalProfile?.fiscalAddress ||
                  "Dirección fiscal pendiente"
                }
                ready={data?.readiness?.profileReady}
              />
              <StatusCard
                title="Serie boleta"
                value={boletaSequence ? boletaSequence.series : "Pendiente"}
                detail={
                  boletaSequence
                    ? "Correlativo actual: " + boletaSequence.currentNumber
                    : "Crear serie B001"
                }
                ready={Boolean(boletaSequence)}
              />
              <StatusCard
                title="Serie factura"
                value={facturaSequence ? facturaSequence.series : "Pendiente"}
                detail={
                  facturaSequence
                    ? "Correlativo actual: " + facturaSequence.currentNumber
                    : "Crear serie F001"
                }
                ready={Boolean(facturaSequence)}
              />
              <StatusCard
                title="Catálogo fiscal"
                value={statusText(data?.catalog?.ready)}
                detail={
                  (data?.catalog?.missingFiscalConfiguration || 0) +
                  " producto(s) sin configuración fiscal"
                }
                ready={data?.catalog?.ready}
              />
            </section>

            <section className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <h2 className="text-xl font-bold text-slate-900">
                  Datos fiscales de la empresa emisora
                </h2>
                <dl className="mt-4 grid gap-3 text-sm md:grid-cols-2">
                  <Info
                    label="Empresa"
                    value={data?.company?.legalName || "-"}
                  />
                  <Info label="RUC" value={data?.company?.ruc || "-"} />
                  <Info
                    label="Unidad"
                    value={data?.businessUnit?.name || BUSINESS_UNIT}
                  />
                  <Info
                    label="Almacén"
                    value={data?.warehouse?.name || WAREHOUSE}
                  />
                  <Info
                    label="Proveedor"
                    value={data?.fiscalProfile?.provider || "NONE"}
                  />
                  <Info
                    label="Ambiente"
                    value={data?.fiscalProfile?.environment || "BETA"}
                  />
                  <Info
                    label="Certificado"
                    value={
                      data?.fiscalProfile?.certificateConfigured
                        ? "Configurado"
                        : "Pendiente"
                    }
                  />
                  <Info
                    label="Vence certificado"
                    value={formatDate(
                      data?.fiscalProfile?.certificateExpiresAt,
                    )}
                  />
                </dl>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                <h2 className="text-xl font-bold text-amber-950">
                  Reglas para evitar errores
                </h2>
                <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-amber-950">
                  <li>No emitir factura si el cliente no tiene RUC válido.</li>
                  <li>Crear serie B001 para boletas y F001 para facturas.</li>
                  <li>No activar producción sin validar primero en beta.</li>
                  <li>Usar usuario SOL secundario, no la clave principal.</li>
                  <li>
                    Completar unidad SUNAT, afectación IGV y tasa en productos.
                  </li>
                </ul>
              </div>
            </section>

            <section className="rounded-2xl bg-white p-5 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900">
                Flujo de capacitación
              </h2>
              <div className="mt-4 grid gap-3 md:grid-cols-5">
                <Step number="1" text="Verificar empresa/RUC" />
                <Step number="2" text="Completar perfil fiscal" />
                <Step number="3" text="Crear series" />
                <Step number="4" text="Revisar catálogo" />
                <Step number="5" text="Emitir desde venta" />
              </div>
              <p className="mt-4 rounded-lg bg-cyan-50 p-3 text-sm font-semibold text-cyan-900">
                En esta etapa HCELM solo prepara la base fiscal. El envío real,
                XML, firma y CDR se implementarán después.
              </p>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

function StatusCard({
  title,
  value,
  detail,
  ready,
}: {
  title: string;
  value: string;
  detail: string;
  ready?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold text-slate-500">{title}</p>
      <p
        className={
          "mt-2 text-2xl font-bold " +
          (ready ? "text-emerald-700" : "text-amber-700")
        }
      >
        {value}
      </p>
      <p className="mt-2 text-sm text-slate-600">{detail}</p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-slate-50 p-3">
      <dt className="text-xs font-bold uppercase text-slate-500">{label}</dt>
      <dd className="mt-1 font-semibold text-slate-900">{value}</dd>
    </div>
  );
}

function Step({ number, text }: { number: string; text: string }) {
  return (
    <div className="rounded-xl border bg-slate-50 p-4 text-sm">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 font-bold text-white">
        {number}
      </div>
      <p className="mt-3 font-bold text-slate-800">{text}</p>
    </div>
  );
}
