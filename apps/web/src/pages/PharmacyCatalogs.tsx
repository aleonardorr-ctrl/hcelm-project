import { Link, useSearchParams } from "react-router-dom";
import MedicationCatalogPanel from "../components/MedicationCatalogPanel";

type MedicationView = "import" | "create" | "records" | "history";

export default function PharmacyCatalogs() {
  const [searchParams] = useSearchParams();
  const requestedView = searchParams.get("view") || "import";
  const initialView: MedicationView =
    requestedView === "create"
      ? "create"
      : requestedView === "records" || requestedView === "lots"
        ? "records"
        : requestedView === "history"
          ? "history"
          : "import";

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-6 md:px-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="flex flex-col gap-3 rounded-lg bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-bold uppercase text-emerald-700">
              Farmacia / Botica
            </p>
            <h1 className="text-2xl font-bold text-slate-900">
              Catálogos maestros de Farmacia
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/pharmacy"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              ← Volver a Farmacia
            </Link>
            <Link
              to="/pharmacy/inventory"
              className="rounded-lg border border-emerald-300 px-4 py-2 text-sm font-bold text-emerald-800 hover:bg-emerald-50"
            >
              Inventario y Kardex
            </Link>
            <Link
              to="/home"
              className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-bold text-white hover:bg-slate-900"
            >
              Volver a Plataforma
            </Link>
          </div>
        </header>

        {requestedView === "lots" ? (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
            Busque el producto y presione <strong>Agregar lote / stock</strong>.
            La ubicación se registrará por unidad de negocio, almacén, andamio y
            nivel.
          </div>
        ) : null}

        <MedicationCatalogPanel key={requestedView} initialView={initialView} />
      </div>
    </div>
  );
}
