import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";

type FiscalProfile = {
  fiscalAddress?: string | null;
  ubigeo?: string | null;
  department?: string | null;
  province?: string | null;
  district?: string | null;
  countryCode?: string | null;
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

type FiscalProfileForm = {
  fiscalAddress: string;
  ubigeo: string;
  department: string;
  province: string;
  district: string;
  countryCode: string;
  provider: "NONE" | "SUNAT_DIRECT" | "PSE" | "OSE";
  environment: "BETA" | "PRODUCTION";
  credentialSecretRef: string;
  certificateSecretRef: string;
  certificateExpiresAt: string;
  active: boolean;
};

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
const BUSINESS_UNIT = "BOTICA";
const WAREHOUSE = "PRINCIPAL";

function emptyForm(): FiscalProfileForm {
  return {
    fiscalAddress: "",
    ubigeo: "",
    department: "",
    province: "",
    district: "",
    countryCode: "PE",
    provider: "NONE",
    environment: "BETA",
    credentialSecretRef: "",
    certificateSecretRef: "",
    certificateExpiresAt: "",
    active: false,
  };
}

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

function toDateInput(value?: string | null) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

function profileToForm(profile?: FiscalProfile | null): FiscalProfileForm {
  return {
    fiscalAddress: profile?.fiscalAddress || "",
    ubigeo: profile?.ubigeo || "",
    department: profile?.department || "",
    province: profile?.province || "",
    district: profile?.district || "",
    countryCode: profile?.countryCode || "PE",
    provider: (profile?.provider as FiscalProfileForm["provider"]) || "NONE",
    environment:
      (profile?.environment as FiscalProfileForm["environment"]) || "BETA",
    credentialSecretRef: profile?.credentialConfigured
      ? "__KEEP_EXISTING__"
      : "",
    certificateSecretRef: profile?.certificateConfigured
      ? "__KEEP_EXISTING__"
      : "",
    certificateExpiresAt: toDateInput(profile?.certificateExpiresAt),
    active: Boolean(profile?.active),
  };
}

export default function Billing() {
  const [data, setData] = useState<ReadinessResponse | null>(null);
  const [form, setForm] = useState<FiscalProfileForm>(emptyForm());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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
          await readError(response, "No se pudo cargar la preparacion fiscal."),
        );
      }
      const nextData = (await response.json()) as ReadinessResponse;
      setData(nextData);
      setForm(profileToForm(nextData.fiscalProfile));
    } catch (reason: any) {
      setError(reason?.message || "Error al cargar facturacion.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadReadiness();
  }, []);

  async function saveFiscalProfile(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        fiscalAddress: form.fiscalAddress.trim(),
        ubigeo: form.ubigeo.trim() || undefined,
        department: form.department.trim() || undefined,
        province: form.province.trim() || undefined,
        district: form.district.trim() || undefined,
        countryCode: form.countryCode.trim().toUpperCase() || "PE",
        provider: form.provider,
        environment: form.environment,
        credentialSecretRef:
          form.credentialSecretRef === "__KEEP_EXISTING__"
            ? undefined
            : form.credentialSecretRef.trim() || undefined,
        certificateSecretRef:
          form.certificateSecretRef === "__KEEP_EXISTING__"
            ? undefined
            : form.certificateSecretRef.trim() || undefined,
        certificateExpiresAt: form.certificateExpiresAt || undefined,
        active: form.active,
      };

      const params = new URLSearchParams({
        businessUnit: BUSINESS_UNIT,
        warehouse: WAREHOUSE,
      });
      const response = await fetch(
        API_BASE + "/electronic-billing/fiscal-profile?" + params.toString(),
        {
          method: "PUT",
          headers: {
            Authorization: "Bearer " + getToken(),
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        throw new Error(
          await readError(response, "No se pudo guardar el perfil fiscal."),
        );
      }

      setSuccess("Perfil fiscal guardado para la empresa emisora.");
      await loadReadiness();
    } catch (reason: any) {
      setError(reason?.message || "Error al guardar perfil fiscal.");
    } finally {
      setSaving(false);
    }
  }

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
    : "Suministros Criticos EIRL / Botica Premium / Almacen principal";

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-6 md:px-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="rounded-2xl bg-white p-5 shadow-sm">
          <nav className="mb-3 flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-500">
            <Link to="/home" className="hover:text-cyan-700">
              Plataforma
            </Link>
            <span>/</span>
            <span className="text-slate-900">Facturacion SUNAT</span>
          </nav>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase text-cyan-700">
                Preparacion fiscal
              </p>
              <h1 className="text-3xl font-bold text-slate-900">
                Facturacion SUNAT
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
        {success && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
            {success}
          </div>
        )}

        {loading ? (
          <section className="rounded-2xl bg-white p-6 text-slate-600 shadow-sm">
            Cargando preparacion fiscal...
          </section>
        ) : (
          <>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatusCard
                title="Perfil fiscal"
                value={statusText(data?.readiness?.profileReady)}
                detail={
                  data?.fiscalProfile?.fiscalAddress ||
                  "Direccion fiscal pendiente"
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
                title="Catalogo fiscal"
                value={statusText(data?.catalog?.ready)}
                detail={
                  (data?.catalog?.missingFiscalConfiguration || 0) +
                  " producto(s) sin configuracion fiscal"
                }
                ready={data?.catalog?.ready}
              />
            </section>

            <section className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
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
                    label="Almacen"
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
                    label="Credenciales"
                    value={
                      data?.fiscalProfile?.credentialConfigured
                        ? "Referencia registrada"
                        : "Pendiente"
                    }
                  />
                  <Info
                    label="Certificado"
                    value={
                      data?.fiscalProfile?.certificateConfigured
                        ? "Referencia registrada"
                        : "Pendiente"
                    }
                  />
                  <Info
                    label="Vence certificado"
                    value={formatDate(
                      data?.fiscalProfile?.certificateExpiresAt,
                    )}
                  />
                  <Info
                    label="Perfil activo"
                    value={data?.fiscalProfile?.active ? "Si" : "No"}
                  />
                </dl>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                <h2 className="text-xl font-bold text-amber-950">
                  Reglas para evitar errores
                </h2>
                <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-amber-950">
                  <li>No emitir factura si el cliente no tiene RUC valido.</li>
                  <li>Crear serie B001 para boletas y F001 para facturas.</li>
                  <li>No activar produccion sin validar primero en beta.</li>
                  <li>No escribir claves SOL reales en este formulario.</li>
                  <li>
                    Completar unidad SUNAT, afectacion IGV y tasa en productos.
                  </li>
                </ul>
              </div>
            </section>

            <form
              onSubmit={saveFiscalProfile}
              className="rounded-2xl bg-white p-5 shadow-sm"
            >
              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    Editar perfil fiscal
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Guarda los datos fiscales de la empresa emisora. Esta fase
                    no envia a SUNAT ni firma comprobantes.
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-cyan-700 px-4 py-2 text-sm font-bold text-white hover:bg-cyan-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Guardando..." : "Guardar perfil fiscal"}
                </button>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <Field label="Direccion fiscal" className="xl:col-span-2">
                  <input
                    required
                    minLength={3}
                    maxLength={255}
                    value={form.fiscalAddress}
                    onChange={(event) =>
                      setForm({ ...form, fiscalAddress: event.target.value })
                    }
                    className="h-10 w-full rounded-lg border px-3 text-sm"
                    placeholder="Direccion fiscal segun ficha RUC"
                  />
                </Field>

                <Field label="Ubigeo">
                  <input
                    value={form.ubigeo}
                    onChange={(event) =>
                      setForm({ ...form, ubigeo: event.target.value })
                    }
                    pattern="\d{6}"
                    maxLength={6}
                    className="h-10 w-full rounded-lg border px-3 text-sm"
                    placeholder="040101"
                  />
                </Field>

                <Field label="Departamento">
                  <input
                    value={form.department}
                    onChange={(event) =>
                      setForm({ ...form, department: event.target.value })
                    }
                    maxLength={100}
                    className="h-10 w-full rounded-lg border px-3 text-sm"
                    placeholder="AREQUIPA"
                  />
                </Field>

                <Field label="Provincia">
                  <input
                    value={form.province}
                    onChange={(event) =>
                      setForm({ ...form, province: event.target.value })
                    }
                    maxLength={100}
                    className="h-10 w-full rounded-lg border px-3 text-sm"
                    placeholder="AREQUIPA"
                  />
                </Field>

                <Field label="Distrito">
                  <input
                    value={form.district}
                    onChange={(event) =>
                      setForm({ ...form, district: event.target.value })
                    }
                    maxLength={100}
                    className="h-10 w-full rounded-lg border px-3 text-sm"
                    placeholder="JOSE LUIS BUSTAMANTE Y RIVERO"
                  />
                </Field>

                <Field label="Pais">
                  <input
                    value={form.countryCode}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        countryCode: event.target.value.toUpperCase(),
                      })
                    }
                    maxLength={2}
                    className="h-10 w-full rounded-lg border px-3 text-sm"
                    placeholder="PE"
                  />
                </Field>

                <Field label="Proveedor electronico">
                  <select
                    value={form.provider}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        provider: event.target
                          .value as FiscalProfileForm["provider"],
                      })
                    }
                    className="h-10 w-full rounded-lg border px-3 text-sm"
                  >
                    <option value="NONE">Ninguno por ahora</option>
                    <option value="SUNAT_DIRECT">SUNAT directo</option>
                    <option value="PSE">PSE</option>
                    <option value="OSE">OSE</option>
                  </select>
                </Field>

                <Field label="Ambiente">
                  <select
                    value={form.environment}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        environment: event.target
                          .value as FiscalProfileForm["environment"],
                      })
                    }
                    className="h-10 w-full rounded-lg border px-3 text-sm"
                  >
                    <option value="BETA">Beta / pruebas</option>
                    <option value="PRODUCTION">Produccion</option>
                  </select>
                </Field>

                <Field label="Referencia de credenciales">
                  <input
                    value={form.credentialSecretRef}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        credentialSecretRef: event.target.value,
                      })
                    }
                    maxLength={255}
                    className="h-10 w-full rounded-lg border px-3 text-sm"
                    placeholder="Ej. vault/sunat/botica/sol"
                  />
                </Field>

                <Field label="Referencia de certificado">
                  <input
                    value={form.certificateSecretRef}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        certificateSecretRef: event.target.value,
                      })
                    }
                    maxLength={255}
                    className="h-10 w-full rounded-lg border px-3 text-sm"
                    placeholder="Ej. vault/sunat/botica/certificado"
                  />
                </Field>

                <Field label="Vencimiento de certificado">
                  <input
                    type="date"
                    value={form.certificateExpiresAt}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        certificateExpiresAt: event.target.value,
                      })
                    }
                    className="h-10 w-full rounded-lg border px-3 text-sm"
                  />
                </Field>

                <label className="flex items-center gap-3 rounded-lg border bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-800">
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(event) =>
                      setForm({ ...form, active: event.target.checked })
                    }
                    className="h-4 w-4"
                  />
                  Perfil fiscal activo
                </label>
              </div>

              <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                Para manual/video: primero verificar RUC y direccion fiscal,
                luego guardar el perfil inactivo, despues configurar series y
                finalmente activar credenciales/certificado cuando exista el
                modulo de envio real.
              </p>
            </form>

            <section className="rounded-2xl bg-white p-5 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900">
                Flujo de capacitacion
              </h2>
              <div className="mt-4 grid gap-3 md:grid-cols-5">
                <Step number="1" text="Verificar empresa/RUC" />
                <Step number="2" text="Completar perfil fiscal" />
                <Step number="3" text="Crear series" />
                <Step number="4" text="Revisar catalogo" />
                <Step number="5" text="Emitir desde venta" />
              </div>
              <p className="mt-4 rounded-lg bg-cyan-50 p-3 text-sm font-semibold text-cyan-900">
                En esta etapa HCELM solo prepara la base fiscal. El envio real,
                XML, firma y CDR se implementaran despues.
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

function Field({
  label,
  className = "",
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={"block text-sm " + className}>
      <span className="mb-1 block font-bold text-slate-700">{label}</span>
      {children}
    </label>
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
