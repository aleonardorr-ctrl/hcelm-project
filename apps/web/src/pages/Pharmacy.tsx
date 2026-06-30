import { Link } from "react-router-dom";

type PharmacyCardProps = {
  title: string;
  description: string;
  to?: string;
  status?: "activo" | "pendiente";
  emoji: string;
  featured?: boolean;
};

const OPERATING_COMPANY = "Suministros Críticos EIRL";
const OPERATING_UNIT = "Botica Premium";
const OPERATING_WAREHOUSE = "Almacén principal";

export default function Pharmacy() {
  return (
    <div className="space-y-6">
      <section className="rounded-lg bg-emerald-800 p-6 text-white shadow">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-emerald-100">
              Módulo PHARMACY
            </p>
            <h1 className="text-3xl font-bold">Botica Premium / Farmacia</h1>
            <p className="mt-2 max-w-3xl text-emerald-50">
              Panel operativo para productos, lotes, stock, ubicación física,
              inventario FEFO, ventas OTC y futura dispensación de recetas.
            </p>
          </div>

          <div className="flex flex-col items-stretch gap-2 sm:items-end">
            <div className="rounded-lg bg-white/15 px-4 py-3 text-sm">
              <p className="font-semibold">Contexto operativo activo</p>
              <p className="text-emerald-50">{OPERATING_COMPANY}</p>
              <p className="text-emerald-50">
                {OPERATING_UNIT} / {OPERATING_WAREHOUSE}
              </p>
            </div>
            <Link
              to="/home"
              className="rounded-lg border border-white/40 bg-white/10 px-4 py-2 text-center text-sm font-bold text-white hover:bg-white/20"
            >
              ← Volver a Plataforma
            </Link>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <SummaryCard label="Empresa emisora" value={OPERATING_COMPANY} />
        <SummaryCard label="Unidad" value={OPERATING_UNIT} />
        <SummaryCard label="Almacén" value={OPERATING_WAREHOUSE} />
        <SummaryCard label="Ventas OTC" value="Operación activa" />
      </section>

      <section>
        <h2 className="mb-3 text-xl font-bold text-slate-800">
          Operaciones principales
        </h2>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <PharmacyCard
            emoji="S/"
            title="Ventas de Botica Premium"
            description="Busque por código o nombre, prepare el carrito, valide FEFO y cobre una venta OTC con descuento atómico de stock."
            to="/pharmacy/sales/new"
            status="activo"
            featured
          />

          <PharmacyCard
            emoji="💊"
            title="Productos y lotes"
            description="Consultar el maestro corporativo, SKU, códigos, lotes, vencimientos y stock disponible."
            to="/pharmacy/catalogs?view=records"
            status="activo"
          />

          <PharmacyCard
            emoji="➕"
            title="Nuevo producto"
            description="Registrar productos manualmente con código maestro HCELM y SKU empresarial sugerido."
            to="/pharmacy/catalogs?view=create"
            status="activo"
          />

          <PharmacyCard
            emoji="📦"
            title="Agregar lote / stock"
            description="Ingresar lote, vencimiento, almacén, andamio, nivel, precios, proveedor y stock mínimo."
            to="/pharmacy/catalogs?view=lots"
            status="activo"
          />

          <PharmacyCard
            emoji="📚"
            title="Catálogo maestro de Botica"
            description="Importar productos y lotes desde Excel, revisar registros y consultar el historial de cargas."
            to="/pharmacy/catalogs?view=import"
            status="activo"
          />

          <PharmacyCard
            emoji="🧾"
            title="Dispensación de receta"
            description="Recibir recetas emitidas desde consulta, seleccionar producto/lote y preparar descuento de stock."
            status="pendiente"
          />

          <PharmacyCard
            emoji="K"
            title="Inventario, Kardex y FEFO"
            description="Consultar movimientos auditados y simular la salida por vencimiento más próximo."
            to="/pharmacy/inventory"
            status="activo"
          />
        </div>
      </section>

      <section className="rounded-xl border bg-white p-5 shadow-sm">
        <h2 className="mb-2 text-lg font-bold text-slate-800">
          Flujo objetivo del módulo
        </h2>

        <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-4">
          <FlowStep number="1" text="Receta emitida en consulta" />
          <FlowStep number="2" text="Botica Premium recibe la receta" />
          <FlowStep number="3" text="Se selecciona producto y lote" />
          <FlowStep number="4" text="Se descuenta stock y se genera venta" />
        </div>
      </section>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-bold text-slate-800">{value}</p>
    </div>
  );
}

function PharmacyCard({
  title,
  description,
  to,
  status = "pendiente",
  emoji,
  featured = false,
}: PharmacyCardProps) {
  const content = (
    <div
      className={`h-full rounded-lg border bg-white p-5 shadow-sm transition hover:shadow-md ${
        featured ? "border-emerald-400 bg-emerald-50" : "border-slate-200"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="text-3xl">{emoji}</div>

        <span
          className={
            status === "activo"
              ? "rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700"
              : "rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700"
          }
        >
          {status === "activo" ? "Activo" : "Pendiente"}
        </span>
      </div>

      <h3 className="mt-4 text-lg font-bold text-slate-800">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>

      {to ? (
        <p className="mt-4 text-sm font-semibold text-emerald-700">Abrir →</p>
      ) : (
        <p className="mt-4 text-sm font-semibold text-slate-400">
          Próxima fase
        </p>
      )}
    </div>
  );

  if (to) {
    return (
      <Link
        to={to}
        className={featured ? "block md:col-span-2 xl:col-span-2" : "block"}
      >
        {content}
      </Link>
    );
  }

  return content;
}

function FlowStep({ number, text }: { number: string; text: string }) {
  return (
    <div className="rounded-lg border bg-slate-50 p-3">
      <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 font-bold text-white">
        {number}
      </div>
      <p className="text-slate-700">{text}</p>
    </div>
  );
}
