import { useState } from "react";
import { clearAuthSession, getAuthToken, getSessionItem } from "../lib/auth";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

type VerifiedProfessional = {
  id: string;
  email?: string | null;
  fullName?: string | null;
  dni?: string | null;
  role?: string | null;
  cmp?: string | null;
  rne?: string | null;
  active?: boolean;
};

type VerificationResponse = {
  verified?: boolean;
  professional?: VerifiedProfessional;
  message?: string | string[];
};

function inferProfessionalType(role?: string | null) {
  const normalized = String(role || "").toLowerCase();

  if (normalized.includes("medico") || normalized.includes("médico")) {
    return "Médico";
  }

  if (normalized.includes("enfer")) return "Enfermería";
  if (normalized.includes("farm")) return "Químico farmacéutico";
  if (normalized.includes("caja")) return "Caja";
  if (normalized.includes("almacen") || normalized.includes("almacén")) {
    return "Almacén";
  }

  if (normalized.includes("admin")) return "Administrador";
  if (normalized.includes("gerencia")) return "Gerencia";
  if (normalized.includes("recepcion")) return "Recepción";

  return "Otro";
}

function getErrorMessage(
  payload: VerificationResponse | null,
  fallback: string,
) {
  if (Array.isArray(payload?.message)) {
    return payload.message.join(" ");
  }

  if (typeof payload?.message === "string" && payload.message.trim()) {
    return payload.message;
  }

  return fallback;
}

export default function ProfessionalVerification() {
  const [dni, setDni] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const userName = getSessionItem("hcelm_user_name") || "Usuario autenticado";

  async function validateProfessional(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const normalizedDni = dni.trim();

    if (!/^\d{8}$/.test(normalizedDni)) {
      setError("El DNI debe contener exactamente 8 dígitos.");
      return;
    }

    const token = getAuthToken();

    if (!token) {
      clearAuthSession();
      window.location.replace("/login");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `${API_URL}/institution/professional-verification`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            dni: normalizedDni,
          }),
        },
      );

      const payload = (await response
        .json()
        .catch(() => null)) as VerificationResponse | null;

      if (!response.ok || !payload?.verified || !payload.professional) {
        setError(
          getErrorMessage(
            payload,
            "El DNI no coincide con el usuario autenticado.",
          ),
        );
        return;
      }

      const professional = payload.professional;
      const professionalType = inferProfessionalType(professional.role);

      sessionStorage.setItem("hcelm_professional_verified", "true");
      sessionStorage.setItem("hcelm_professional_user_id", professional.id);
      sessionStorage.setItem(
        "hcelm_professional_name",
        professional.fullName || professional.email || userName,
      );
      sessionStorage.setItem(
        "hcelm_professional_dni",
        professional.dni || normalizedDni,
      );
      sessionStorage.setItem("hcelm_professional_type", professionalType);
      sessionStorage.setItem("hcelm_professional_cmp", professional.cmp || "");
      sessionStorage.setItem("hcelm_professional_rne", professional.rne || "");
      sessionStorage.setItem("hcelm_professional_license", "");
      sessionStorage.setItem(
        "hcelm_professional_role",
        professional.role || "",
      );

      sessionStorage.removeItem("hcelm_require_professional_verification");

      window.location.replace("/home");
    } catch {
      setError(
        "No se pudo verificar la identidad. Confirme que el backend esté activo.",
      );
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    clearAuthSession();
    window.location.href = "/login";
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 to-emerald-50 p-6">
      <div className="w-full max-w-xl rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-600">
            Seguridad de acceso
          </p>

          <h1 className="mt-1 text-2xl font-bold text-slate-800">
            Verificación profesional
          </h1>

          <p className="mt-2 text-sm text-slate-600">
            Confirme su identidad antes de acceder a los módulos operativos y
            clínicos de HCELM.
          </p>
        </div>

        <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
            Usuario autenticado
          </p>
          <p className="mt-1 font-bold text-blue-950">{userName}</p>
          <p className="mt-1 text-xs text-blue-800">
            Solo puede verificarse el DNI registrado para esta cuenta. No es
            posible seleccionar o identificarse como otro usuario.
          </p>
        </div>

        <form onSubmit={validateProfessional} className="space-y-5">
          <div>
            <label
              htmlFor="professional-dni"
              className="mb-1 block text-sm font-semibold text-slate-700"
            >
              DNI registrado
            </label>

            <input
              id="professional-dni"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              value={dni}
              onChange={(event) =>
                setDni(event.target.value.replace(/\D/g, "").slice(0, 8))
              }
              maxLength={8}
              disabled={loading}
              className="min-h-12 w-full rounded-lg border border-slate-300 px-4 py-3 text-lg tracking-[0.3em] outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 disabled:opacity-60"
              placeholder="••••••••"
            />

            <p className="mt-2 text-xs text-slate-500">
              El DNI no se consulta en RENIEC en esta etapa. Se compara de forma
              segura con el DNI previamente registrado por la institución.
            </p>
          </div>

          {error ? (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            >
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading || dni.length !== 8}
            className="min-h-12 w-full rounded-lg bg-emerald-600 px-4 py-3 font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Verificando identidad..." : "Verificar e ingresar"}
          </button>

          <button
            type="button"
            onClick={logout}
            disabled={loading}
            className="w-full text-sm font-medium text-slate-500 hover:text-red-600 disabled:opacity-50"
          >
            Cerrar sesión
          </button>
        </form>
      </div>
    </div>
  );
}
