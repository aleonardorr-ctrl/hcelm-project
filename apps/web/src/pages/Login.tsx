import { useEffect, useState } from "react";
import { clearAuthSession } from "../lib/auth";

const API_URL = "http://localhost:3000/api";

export default function Login() {
  const [ruc, setRuc] = useState("20611138777");
  const [email, setEmail] = useState("admin@amehealth.pe");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    clearAuthSession();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ruc, email, password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.message || "Credenciales inválidas.");
        return;
      }

      const token = data.access_token || data.accessToken || data.token;

      if (!token) {
        setError("Login correcto, pero el backend no envió token.");
        return;
      }

      clearAuthSession();

      sessionStorage.setItem("ame_token", token);
      sessionStorage.setItem("hcelm_professional_verified", "false");
      sessionStorage.setItem("hcelm_require_professional_verification", "true");

      const savedToken = sessionStorage.getItem("ame_token");

      if (!savedToken) {
        setError("No se pudo guardar la sesión en el navegador.");
        return;
      }

      window.location.href = "/professional-verification";
    } catch {
      setError("Error de conexión. Verifique que el backend esté activo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-emerald-700 to-cyan-700 flex items-center justify-center p-6">
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="hidden lg:flex flex-col justify-between p-10 text-white bg-gradient-to-br from-emerald-800 to-slate-900">
          <div>
            <div className="h-16 w-16 rounded-2xl bg-white/15 flex items-center justify-center text-3xl mb-6">
              🏥
            </div>

            <h1 className="text-4xl font-bold leading-tight mb-4">HCELM</h1>

            <h2 className="text-xl font-semibold mb-6 text-emerald-100">
              Plataforma Clínica, Farmacéutica y Gerencial
            </h2>

            <p className="text-emerald-50 text-sm leading-6 max-w-md">
              Sistema modular para historia clínica electrónica, farmacia,
              droguería, inventario, caja, ventas, reportes gerenciales y
              administración institucional.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <Feature text="Historia clínica" />
            <Feature text="Farmacia / Botica" />
            <Feature text="Droguería" />
            <Feature text="Inventario FEFO" />
            <Feature text="Caja y ventas" />
            <Feature text="Reportes" />
          </div>

          <div className="text-xs text-emerald-100 border-t border-white/20 pt-4">
            Consultorio Médico y Tópico de Procedimientos Las Mercedes · AME
            HEALTH SAC
          </div>
        </div>

        <div className="p-8 md:p-12">
          <div className="mb-8">
            <div className="lg:hidden h-14 w-14 rounded-xl bg-emerald-100 flex items-center justify-center text-2xl mb-4">
              🏥
            </div>

            <h1 className="text-3xl font-bold text-slate-800">
              Ingreso seguro
            </h1>

            <p className="text-slate-500 mt-2">
              Acceda con sus credenciales institucionales.
            </p>
          </div>

          <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-4 mb-6">
            <p className="text-sm text-emerald-800 font-medium">
              Flujo de seguridad HCELM
            </p>
            <p className="text-xs text-emerald-700 mt-1">
              Login institucional → validación profesional → acceso al sistema.
            </p>
          </div>

          {error && (
            <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Empresa / RUC
              </label>
              <input
                value={ruc}
                onChange={(e) => setRuc(e.target.value)}
                className="w-full border border-slate-300 p-3 rounded-lg mt-1 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Usuario
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-slate-300 p-3 rounded-lg mt-1 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-slate-300 p-3 rounded-lg mt-1 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 text-white py-3 rounded-lg hover:bg-emerald-700 transition font-semibold disabled:opacity-60"
            >
              {loading ? "Ingresando..." : "Ingresar a HCELM"}
            </button>
          </form>

          <div className="mt-8 text-xs text-slate-400">
            Versión web modular · React + NestJS + PostgreSQL + Prisma
          </div>
        </div>
      </div>
    </div>
  );
}

function Feature({ text }: { text: string }) {
  return <div className="bg-white/10 rounded-lg px-3 py-2">✓ {text}</div>;
}
