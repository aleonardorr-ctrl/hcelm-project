import { useEffect, useMemo, useState } from "react";
import {
  clearAuthSession,
  consumeSessionNotice,
  setAuthToken,
  setSessionItem,
} from "../lib/auth";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

type LoginMode = "platform" | "operational";

type BusinessUnitOption = {
  id: string;
  code?: string | null;
  name?: string | null;
};

const COMPANIES = [
  {
    ruc: "20611138777",
    legalName: "AME HEALTH SAC",
    displayName: "AME HEALTH SAC",
    description:
      "Consultorio Médico y Tópico Las Mercedes · Droguería AME HEALTH SAC",
  },
  {
    ruc: "20613895354",
    legalName: "Suministros Criticos EIRL",
    displayName: "Botica Premium",
    description: "Botica Premium · Suministros Criticos EIRL",
  },
];

type LoginResponse = {
  access_token?: string;
  accessToken?: string;
  token?: string;
  user?: {
    fullName?: string | null;
    role?: string | null;
    platformRole?: string | null;
  };
  accessMode?: string | null;
  contextSource?: string | null;
  tenant?: {
    name?: string | null;
  };
  company?: {
    id?: string;
    code?: string | null;
    legalName?: string | null;
    tradeName?: string | null;
    ruc?: string | null;
  };
  businessUnit?: {
    id?: string;
    code?: string | null;
    name?: string | null;
  } | null;
  businessUnits?: BusinessUnitOption[];
};

function getErrorMessage(payload: unknown) {
  if (payload && typeof payload === "object" && "message" in payload) {
    const message = (payload as { message?: unknown }).message;

    if (Array.isArray(message)) {
      return message.join(" ");
    }

    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }

  return "Credenciales inválidas.";
}

export default function Login() {
  const [loginMode, setLoginMode] = useState<LoginMode>("operational");
  const [ruc, setRuc] = useState(COMPANIES[0].ruc);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [businessUnits, setBusinessUnits] = useState<BusinessUnitOption[]>([]);
  const [selectedBusinessUnitId, setSelectedBusinessUnitId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const sessionNotice = consumeSessionNotice();
    clearAuthSession();

    if (sessionNotice) {
      setError(sessionNotice);
    }
  }, []);

  const selectedCompany = useMemo(
    () => COMPANIES.find((company) => company.ruc === ruc) || null,
    [ruc],
  );

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();

    if (loading) return;

    setError("");
    const normalizedRuc = ruc.replace(/\D/g, "");

    if (loginMode === "operational" && !/^\d{11}$/.test(normalizedRuc)) {
      setError("Ingrese un RUC válido de 11 dígitos.");
      return;
    }

    if (
      loginMode === "operational" &&
      businessUnits.length > 1 &&
      !selectedBusinessUnitId
    ) {
      setError("Seleccione la unidad de negocio para continuar.");
      return;
    }

    setLoading(true);

    try {
      const isPlatformLogin = loginMode === "platform";
      const endpoint = isPlatformLogin
        ? `${API_URL}/auth/platform-login`
        : `${API_URL}/auth/login`;

      const requestBody = isPlatformLogin
        ? {
            email: email.trim().toLowerCase(),
            password,
          }
        : {
            ruc: normalizedRuc,
            email: email.trim().toLowerCase(),
            password,
            businessUnitId: selectedBusinessUnitId || undefined,
          };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const payload = (await response
        .json()
        .catch(() => null)) as LoginResponse | null;

      if (!response.ok || !payload) {
        setError(getErrorMessage(payload));
        return;
      }

      if (!isPlatformLogin) {
        const availableBusinessUnits = Array.isArray(payload.businessUnits)
          ? payload.businessUnits.filter(
              (unit) => typeof unit?.id === "string" && unit.id.trim(),
            )
          : [];

        setBusinessUnits(availableBusinessUnits);

        if (availableBusinessUnits.length > 1 && !selectedBusinessUnitId) {
          setError("");
          return;
        }
      }

      const token =
        payload.access_token || payload.accessToken || payload.token || "";

      if (!token) {
        setError("Login correcto, pero el servidor no envió el token.");
        return;
      }

      clearAuthSession();
      setAuthToken(token);

      const platformRole = String(
        payload.user?.platformRole || "",
      ).toUpperCase();

      if (loginMode === "platform") {
        if (platformRole !== "PLATFORM_SUPERADMIN") {
          clearAuthSession();
          setError(
            "La cuenta autenticada no tiene autorización de superadministrador de plataforma.",
          );
          return;
        }

        setSessionItem(
          "hcelm_tenant_name",
          payload.tenant?.name?.trim() || "HCELM",
        );
        setSessionItem(
          "hcelm_user_name",
          payload.user?.fullName?.trim() || email.trim(),
        );
        setSessionItem(
          "hcelm_user_role",
          payload.user?.role?.trim() || "PLATFORM_SUPERADMIN",
        );
        setSessionItem("hcelm_platform_role", platformRole);
        setSessionItem(
          "hcelm_access_mode",
          payload.accessMode?.trim() || "PLATFORM_ADMIN",
        );
        setSessionItem(
          "hcelm_context_source",
          payload.contextSource?.trim() || "PLATFORM_LOGIN",
        );

        window.location.href = "/platform";
        return;
      }

      setSessionItem("hcelm_professional_verified", "false");
      setSessionItem("hcelm_require_professional_verification", "true");

      setSessionItem(
        "hcelm_tenant_name",
        payload.tenant?.name?.trim() || "HCELM",
      );

      setSessionItem("hcelm_company_id", payload.company?.id?.trim() || "");

      setSessionItem("hcelm_company_code", payload.company?.code?.trim() || "");

      setSessionItem(
        "hcelm_company_name",
        payload.company?.tradeName?.trim() ||
          payload.company?.legalName?.trim() ||
          selectedCompany?.displayName ||
          `Empresa RUC ${normalizedRuc}`,
      );

      setSessionItem(
        "hcelm_company_legal_name",
        payload.company?.legalName?.trim() ||
          selectedCompany?.legalName ||
          `Empresa RUC ${normalizedRuc}`,
      );

      setSessionItem(
        "hcelm_company_ruc",
        payload.company?.ruc?.trim() || normalizedRuc,
      );

      setSessionItem(
        "hcelm_business_unit_id",
        payload.businessUnit?.id?.trim() || "",
      );

      setSessionItem(
        "hcelm_business_unit_code",
        payload.businessUnit?.code?.trim() || "",
      );

      setSessionItem(
        "hcelm_business_unit_name",
        payload.businessUnit?.name?.trim() || "",
      );

      setSessionItem(
        "hcelm_user_name",
        payload.user?.fullName?.trim() || email.trim(),
      );

      setSessionItem("hcelm_user_role", payload.user?.role?.trim() || "");

      window.location.href = "/professional-verification";
    } catch {
      setError("Error de conexión. Verifique que el backend esté activo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-900 via-emerald-700 to-cyan-700 p-6">
      <div className="grid w-full max-w-6xl grid-cols-1 overflow-hidden rounded-2xl bg-white shadow-2xl lg:grid-cols-2">
        <div className="hidden flex-col justify-between bg-gradient-to-br from-emerald-800 to-slate-900 p-10 text-white lg:flex">
          <div>
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 text-3xl">
              🏥
            </div>

            <h1 className="mb-4 text-4xl font-bold leading-tight">HCELM</h1>

            <h2 className="mb-6 text-xl font-semibold text-emerald-100">
              Plataforma Clínica, Farmacéutica y Gerencial
            </h2>

            <p className="max-w-md text-sm leading-6 text-emerald-50">
              Acceso separado y seguro para cada empresa, establecimiento y
              unidad de negocio.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <Feature text="Historia clínica" />
            <Feature text="Botica Premium" />
            <Feature text="Droguería" />
            <Feature text="Inventario FEFO" />
            <Feature text="Caja y ventas" />
            <Feature text="Reportes" />
          </div>

          <div className="border-t border-white/20 pt-4 text-xs text-emerald-100">
            Plataforma multiempresa y multi-RUC
          </div>
        </div>

        <div className="p-8 md:p-12">
          <div className="mb-8">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-100 text-2xl lg:hidden">
              🏥
            </div>

            <h1 className="text-3xl font-bold text-slate-800">
              Ingreso seguro
            </h1>

            <p className="mt-2 text-slate-500">
              Ingrese a la empresa donde realizará sus actividades.
            </p>
          </div>

          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => {
                setLoginMode("operational");
                setBusinessUnits([]);
                setSelectedBusinessUnitId("");
                setError("");
              }}
              disabled={loading}
              className={`rounded-xl border p-4 text-left transition ${
                loginMode === "operational"
                  ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200"
                  : "border-slate-200 bg-white hover:border-emerald-300"
              }`}
            >
              <span className="block font-bold text-slate-800">
                Acceso operativo
              </span>
              <span className="mt-1 block text-xs text-slate-500">
                Para trabajar en una empresa y sus módulos autorizados.
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setLoginMode("platform");
                setBusinessUnits([]);
                setSelectedBusinessUnitId("");
                setError("");
              }}
              disabled={loading}
              className={`rounded-xl border p-4 text-left transition ${
                loginMode === "platform"
                  ? "border-cyan-500 bg-cyan-50 ring-2 ring-cyan-200"
                  : "border-slate-200 bg-white hover:border-cyan-300"
              }`}
            >
              <span className="block font-bold text-slate-800">
                Administración global
              </span>
              <span className="mt-1 block text-xs text-slate-500">
                Acceso exclusivo al Centro de Control Global HCELM.
              </span>
            </button>
          </div>

          {loginMode === "operational" ? (
            <div className="mb-6 rounded-lg border border-emerald-100 bg-emerald-50 p-4">
              <p className="text-sm font-bold text-emerald-900">
                {selectedCompany?.displayName || "Acceso por RUC"}
              </p>
              <p className="mt-1 text-xs text-emerald-700">
                {selectedCompany?.description ||
                  "HCELM identificará la empresa después de validar el RUC y las credenciales."}
              </p>
              <p className="mt-1 text-xs text-emerald-700">
                RUC: {ruc || "Pendiente de ingreso"}
              </p>
            </div>
          ) : (
            <div className="mb-6 rounded-lg border border-cyan-200 bg-cyan-50 p-4">
              <p className="text-sm font-bold text-cyan-950">
                Centro de Control Global HCELM
              </p>
              <p className="mt-1 text-xs text-cyan-800">
                No requiere seleccionar empresa. Los ingresos temporales se
                realizan desde el panel global y quedan auditados.
              </p>
            </div>
          )}

          {error ? (
            <div className="mb-4 rounded-lg bg-red-100 p-3 text-sm font-semibold text-red-700">
              {error}
            </div>
          ) : null}

          <form onSubmit={handleLogin} className="space-y-4">
            {loginMode === "operational" ? (
              <div>
                <label
                  htmlFor="login-company"
                  className="block text-sm font-medium text-slate-700"
                >
                  RUC de la empresa
                </label>

                <input
                  id="login-company"
                  type="text"
                  inputMode="numeric"
                  autoComplete="organization"
                  list="login-company-options"
                  value={ruc}
                  onChange={(event) => {
                    setRuc(event.target.value.replace(/\D/g, "").slice(0, 11));
                    setBusinessUnits([]);
                    setSelectedBusinessUnitId("");
                  }}
                  disabled={loading}
                  maxLength={11}
                  pattern="\d{11}"
                  placeholder="Ingrese el RUC de 11 dígitos"
                  className="mt-1 min-h-12 w-full rounded-lg border border-slate-300 bg-white p-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60"
                  required
                />

                <datalist id="login-company-options">
                  {COMPANIES.map((company) => (
                    <option key={company.ruc} value={company.ruc}>
                      {company.displayName} — {company.legalName}
                    </option>
                  ))}
                </datalist>

                <div className="mt-2 flex flex-wrap gap-2">
                  {COMPANIES.map((company) => (
                    <button
                      key={company.ruc}
                      type="button"
                      disabled={loading}
                      onClick={() => {
                        setRuc(company.ruc);
                        setBusinessUnits([]);
                        setSelectedBusinessUnitId("");
                        setError("");
                      }}
                      className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 disabled:opacity-60"
                    >
                      {company.displayName}
                    </button>
                  ))}
                </div>

                <p className="mt-2 text-xs text-slate-500">
                  Puede usar una sugerencia o escribir el RUC de cualquier
                  empresa activa autorizada en HCELM.
                </p>
              </div>
            ) : null}

            {loginMode === "operational" && businessUnits.length > 1 ? (
              <fieldset className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <legend className="px-1 text-sm font-bold text-emerald-950">
                  Seleccione la unidad de negocio
                </legend>
                <p className="mb-3 text-xs text-emerald-800">
                  Sus credenciales fueron validadas. Elija dónde realizará la
                  sesión operativa.
                </p>
                <div className="space-y-2">
                  {businessUnits.map((unit) => (
                    <label
                      key={unit.id}
                      className="flex cursor-pointer items-start gap-3 rounded-lg border border-emerald-200 bg-white p-3"
                    >
                      <input
                        type="radio"
                        name="businessUnitId"
                        value={unit.id}
                        checked={selectedBusinessUnitId === unit.id}
                        onChange={() => {
                          setSelectedBusinessUnitId(unit.id);
                          setError("");
                        }}
                        className="mt-1"
                      />
                      <span>
                        <span className="block text-sm font-bold text-slate-900">
                          {unit.name || unit.code || "Unidad de negocio"}
                        </span>
                        <span className="block text-xs text-slate-500">
                          Código: {unit.code || "Sin código"}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
            ) : null}

            <div>
              <label
                htmlFor="login-email"
                className="block text-sm font-medium text-slate-700"
              >
                Usuario
              </label>

              <input
                id="login-email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={loading}
                className="mt-1 min-h-12 w-full rounded-lg border border-slate-300 p-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60"
                required
              />
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="block text-sm font-medium text-slate-700"
              >
                Contraseña
              </label>

              <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={loading}
                className="mt-1 min-h-12 w-full rounded-lg border border-slate-300 p-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-emerald-600 py-3 font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
            >
              {loading
                ? "Ingresando..."
                : loginMode === "platform"
                  ? "Ingresar a administración global"
                  : businessUnits.length > 1
                    ? "Ingresar a la unidad seleccionada"
                    : "Ingresar a HCELM"}
            </button>
          </form>

          <div className="mt-8 text-xs text-slate-400">
            React + NestJS + PostgreSQL + Prisma
          </div>
        </div>
      </div>
    </div>
  );
}

function Feature({ text }: { text: string }) {
  return <div className="rounded-lg bg-white/10 px-3 py-2">✓ {text}</div>;
}
