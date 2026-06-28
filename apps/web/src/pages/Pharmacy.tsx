import { Link } from "react-router-dom";

type PharmacyCardProps = {
  title: string;
  description: string;
  to?: string;
  status?: "activo" | "pendiente";
  emoji: string;
};

export default function Pharmacy() {
  return (
    <div className="space-y-6">
      <section className="bg-gradient-to-r from-emerald-700 to-cyan-700 text-white rounded-2xl shadow p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Farmacia / Botica</h1>
            <p className="text-emerald-50 mt-2 max-w-3xl">
              Panel operativo para productos, lotes, stock, ubicación física,
              dispensación de recetas, inventario FEFO y ventas de farmacia.
            </p>
          </div>

          <div className="flex flex-col items-stretch gap-2 sm:items-end">
            <div className="bg-white/15 rounded-lg px-4 py-3 text-sm">
              <p className="font-semibold">Estado del módulo</p>
              <p className="text-emerald-50">Dashboard inicial activo</p>
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

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SummaryCard label="Productos" value="Catálogo maestro" />
        <SummaryCard label="Lotes / Stock" value="Control por ubicación" />
        <SummaryCard label="Dispensación" value="Siguiente fase" />
      </section>

      <section>
        <h2 className="text-xl font-bold text-slate-800 mb-3">
          Operaciones principales
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
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
            title="Catálogos maestros de Farmacia"
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
            description="Consultar movimientos auditados y simular la salida por vencimiento mas proximo."
            to="/pharmacy/inventory"
            status="activo"
          />

          <PharmacyCard
            emoji="💵"
            title="Ventas farmacia"
            description="Venta directa, venta por receta, precios minoristas/mayoristas y futura conexión con caja."
            status="pendiente"
          />
        </div>
      </section>

      <section className="bg-white border rounded-xl p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-800 mb-2">
          Flujo objetivo del módulo
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
          <FlowStep number="1" text="Receta emitida en consulta" />
          <FlowStep number="2" text="Farmacia recibe la receta" />
          <FlowStep number="3" text="Se selecciona producto y lote" />
          <FlowStep number="4" text="Se descuenta stock y se genera venta" />
        </div>
      </section>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-xl border shadow-sm p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="text-lg font-bold text-slate-800 mt-1">{value}</p>
    </div>
  );
}

function PharmacyCard({
  title,
  description,
  to,
  status = "pendiente",
  emoji,
}: PharmacyCardProps) {
  const content = (
    <div className="h-full bg-white border rounded-xl shadow-sm p-5 hover:shadow-md transition">
      <div className="flex items-start justify-between gap-3">
        <div className="text-3xl">{emoji}</div>

        <span
          className={
            status === "activo"
              ? "text-xs px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 font-semibold"
              : "text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-700 font-semibold"
          }
        >
          {status === "activo" ? "Activo" : "Pendiente"}
        </span>
      </div>

      <h3 className="text-lg font-bold text-slate-800 mt-4">{title}</h3>
      <p className="text-sm text-slate-600 mt-2 leading-6">{description}</p>

      {to ? (
        <p className="text-sm text-emerald-700 font-semibold mt-4">Abrir →</p>
      ) : (
        <p className="text-sm text-slate-400 font-semibold mt-4">
          Próxima fase
        </p>
      )}
    </div>
  );

  if (to) {
    return (
      <Link to={to} className="block">
        {content}
      </Link>
    );
  }

  return content;
}

function FlowStep({ number, text }: { number: string; text: string }) {
  return (
    <div className="border rounded-lg p-3 bg-slate-50">
      <div className="h-8 w-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold mb-2">
        {number}
      </div>
      <p className="text-slate-700">{text}</p>
    </div>
  );
}
