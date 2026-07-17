import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

type FefoRule = {
  id: "NORMAL" | "WATCH" | "PROMOTION" | "CRITICAL";
  label: string;
  minDays: number;
  maxDays: number | null;
  discountPercent: number;
  action: "NORMAL" | "ALERT" | "SUGGEST_DISCOUNT" | "REQUIRE_AUTHORIZATION";
};

const STORAGE_KEY = "hcelm_fefo_rules_v1";

const DEFAULT_RULES: FefoRule[] = [
  {
    id: "NORMAL",
    label: "Vencimiento normal",
    minDays: 181,
    maxDays: null,
    discountPercent: 0,
    action: "NORMAL",
  },
  {
    id: "WATCH",
    label: "Vigilar rotación",
    minDays: 91,
    maxDays: 180,
    discountPercent: 0,
    action: "ALERT",
  },
  {
    id: "PROMOTION",
    label: "Promoción FEFO",
    minDays: 31,
    maxDays: 90,
    discountPercent: 15,
    action: "SUGGEST_DISCOUNT",
  },
  {
    id: "CRITICAL",
    label: "Vencimiento crítico",
    minDays: 0,
    maxDays: 30,
    discountPercent: 20,
    action: "REQUIRE_AUTHORIZATION",
  },
];

const RULE_STYLES: Record<FefoRule["id"], string> = {
  NORMAL: "border-emerald-700 bg-emerald-100 text-emerald-950",
  WATCH: "border-yellow-700 bg-yellow-100 text-yellow-950",
  PROMOTION: "border-orange-700 bg-orange-100 text-orange-950",
  CRITICAL: "border-red-700 bg-red-100 text-red-950",
};

const RULE_SYMBOLS: Record<FefoRule["id"], string> = {
  NORMAL: "●",
  WATCH: "▲",
  PROMOTION: "◆",
  CRITICAL: "⛔",
};

function readRules(): FefoRule[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return DEFAULT_RULES;
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : DEFAULT_RULES;
  } catch {
    return DEFAULT_RULES;
  }
}

export default function PharmacyFefoSettings() {
  const [rules, setRules] = useState<FefoRule[]>(readRules);
  const [message, setMessage] = useState("");

  const validationError = useMemo(() => {
    for (const rule of rules) {
      if (rule.minDays < 0) return "Los días mínimos no pueden ser negativos.";
      if (rule.maxDays !== null && rule.maxDays < rule.minDays) {
        return `En ${rule.label}, el máximo no puede ser menor que el mínimo.`;
      }
      if (rule.discountPercent < 0 || rule.discountPercent > 100) {
        return `El descuento de ${rule.label} debe estar entre 0 % y 100 %.`;
      }
    }

    const sorted = [...rules].sort((a, b) => a.minDays - b.minDays);
    for (let index = 0; index < sorted.length - 1; index += 1) {
      const current = sorted[index];
      const next = sorted[index + 1];
      if (current.maxDays === null) continue;
      if (current.maxDays + 1 !== next.minDays) {
        return "Los rangos deben ser continuos, sin días repetidos ni vacíos.";
      }
    }

    return "";
  }, [rules]);

  function updateRule(
    id: FefoRule["id"],
    field: keyof FefoRule,
    value: string | number | null,
  ) {
    setRules((current) =>
      current.map((rule) =>
        rule.id === id ? { ...rule, [field]: value } : rule,
      ),
    );
    setMessage("");
  }

  function saveRules() {
    if (validationError) {
      setMessage(validationError);
      return;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(rules));
    setMessage("Configuración FEFO guardada en este navegador.");
  }

  function restoreDefaults() {
    setRules(DEFAULT_RULES);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_RULES));
    setMessage("Se restauraron los valores recomendados.");
  }

  return (
    <div className="min-h-screen bg-slate-100 px-3 py-4 sm:px-5 md:px-6">
      <div className="mx-auto w-full max-w-[1600px] space-y-5">
        <header className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="overflow-x-auto border-b px-4 py-3 sm:px-5">
            <nav className="flex min-w-max items-center gap-2 text-sm font-semibold text-slate-500">
              <Link to="/home" className="hover:text-emerald-700">
                Plataforma
              </Link>
              <span>›</span>
              <Link to="/pharmacy" className="hover:text-emerald-700">
                Botica Premium
              </Link>
              <span>›</span>
              <span className="text-slate-900">Configuración FEFO</span>
            </nav>
          </div>

          <div className="flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-emerald-700">
                Inventario y promociones
              </p>
              <h1 className="mt-1 text-2xl font-black text-slate-950 sm:text-3xl">
                Configuración FEFO
              </h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-600">
                Modifique los rangos de vencimiento, descuentos sugeridos y
                acciones de control. Los colores y figuras permanecen fijos para
                evitar confusiones.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
              <Link
                to="/pharmacy"
                className="inline-flex min-h-11 items-center justify-center rounded-lg border bg-white px-4 py-2 text-sm font-bold text-slate-700"
              >
                ← Farmacia
              </Link>
              <Link
                to="/pharmacy/sales/new"
                className="inline-flex min-h-11 items-center justify-center rounded-lg bg-emerald-700 px-4 py-2 text-sm font-bold text-white"
              >
                Ir a Ventas →
              </Link>
            </div>
          </div>
        </header>

        <section className="rounded-2xl border border-cyan-200 bg-cyan-50 p-4 text-sm text-cyan-950">
          <p className="font-bold">Primera etapa de configuración</p>
          <p className="mt-1">
            Los cambios se guardan en este navegador. En la siguiente fase se
            conectarán al servidor para compartirlos entre todos los equipos y
            registrar auditoría.
          </p>
        </section>

        {message && (
          <div
            className={`rounded-xl border p-4 text-sm font-bold ${
              validationError
                ? "border-red-300 bg-red-50 text-red-900"
                : "border-emerald-300 bg-emerald-50 text-emerald-900"
            }`}
          >
            {message}
          </div>
        )}

        <section className="grid gap-4 xl:grid-cols-2">
          {rules.map((rule) => (
            <article
              key={rule.id}
              className={`rounded-2xl border-2 p-4 shadow-sm ${RULE_STYLES[rule.id]}`}
            >
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 border-current bg-white text-2xl font-black">
                  {RULE_SYMBOLS[rule.id]}
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg font-black">{rule.label}</h2>
                  <p className="mt-1 text-sm font-semibold">
                    Vista previa permanente de color, borde y figura.
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="text-sm font-bold">
                  Desde días
                  <input
                    type="number"
                    min="0"
                    value={rule.minDays}
                    onChange={(event) =>
                      updateRule(
                        rule.id,
                        "minDays",
                        Number(event.target.value),
                      )
                    }
                    className="mt-1 w-full rounded-lg border border-current bg-white px-3 py-2 text-slate-950"
                  />
                </label>

                <label className="text-sm font-bold">
                  Hasta días
                  <input
                    type="number"
                    min="0"
                    disabled={rule.id === "NORMAL"}
                    value={rule.maxDays ?? ""}
                    placeholder="Sin límite"
                    onChange={(event) =>
                      updateRule(
                        rule.id,
                        "maxDays",
                        event.target.value === ""
                          ? null
                          : Number(event.target.value),
                      )
                    }
                    className="mt-1 w-full rounded-lg border border-current bg-white px-3 py-2 text-slate-950 disabled:bg-slate-200"
                  />
                </label>

                <label className="text-sm font-bold">
                  Descuento sugerido
                  <div className="mt-1 flex items-center rounded-lg border border-current bg-white">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={rule.discountPercent}
                      onChange={(event) =>
                        updateRule(
                          rule.id,
                          "discountPercent",
                          Number(event.target.value),
                        )
                      }
                      className="min-w-0 flex-1 rounded-lg px-3 py-2 text-slate-950 outline-none"
                    />
                    <span className="px-3 font-black">%</span>
                  </div>
                </label>

                <label className="text-sm font-bold">
                  Acción
                  <select
                    value={rule.action}
                    onChange={(event) =>
                      updateRule(
                        rule.id,
                        "action",
                        event.target.value as FefoRule["action"],
                      )
                    }
                    className="mt-1 w-full rounded-lg border border-current bg-white px-3 py-2 text-slate-950"
                  >
                    <option value="NORMAL">Venta normal</option>
                    <option value="ALERT">Solo alerta</option>
                    <option value="SUGGEST_DISCOUNT">
                      Sugerir descuento
                    </option>
                    <option value="REQUIRE_AUTHORIZATION">
                      Requerir autorización
                    </option>
                  </select>
                </label>
              </div>
            </article>
          ))}
        </section>

        {validationError && (
          <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm font-bold text-red-900">
            {validationError}
          </div>
        )}

        <footer className="sticky bottom-3 rounded-2xl border bg-white p-4 shadow-xl">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-600">
              Los lotes vencidos seguirán bloqueados aunque se cambien los
              porcentajes.
            </p>
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <button
                type="button"
                onClick={restoreDefaults}
                className="min-h-11 rounded-lg border px-4 py-2 font-bold text-slate-700"
              >
                Restaurar recomendados
              </button>
              <button
                type="button"
                onClick={saveRules}
                disabled={Boolean(validationError)}
                className="min-h-11 rounded-lg bg-emerald-700 px-5 py-2 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                Guardar cambios
              </button>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}