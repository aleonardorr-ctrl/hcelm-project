import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";

type ModuleStatus = "activo" | "proceso" | "proxima_fase";

type EnabledModules = {
  CLINICAL: boolean;
  PHARMACY: boolean;
  DRUGSTORE: boolean;
  BILLING: boolean;
  MANAGEMENT: boolean;
};

type PlatformModule = {
  title: string;
  subtitle: string;
  description: string;
  emoji: string;
  to?: string;
  status: ModuleStatus;
  moduleKey: string;
};

const platformModules: PlatformModule[] = [
  {
    title: "Atención clínica",
    subtitle: "Consultorio / HCE",
    description:
      "Pacientes, historia clínica, anamnesis, diagnósticos, recetas, órdenes y certificados.",
    emoji: "🩺",
    to: "/patients",
    status: "activo",
    moduleKey: "CLINIC",
  },
  {
    title: "Ventas de Botica Premium",
    subtitle: "Venta OTC y control FEFO",
    description:
      "Buscar productos, preparar el carrito, validar FEFO y cobrar ventas OTC con descuento atómico de stock.",
    emoji: "S/",
    to: "/pharmacy/sales/new",
    status: "activo",
    moduleKey: "PHARMACY_SALES",
  },
  {
    title: "Productos y lotes",
    subtitle: "Catálogo y existencias",
    description:
      "Consultar el maestro corporativo, SKU, códigos, lotes, vencimientos y stock disponible.",
    emoji: "💊",
    to: "/pharmacy/catalogs?view=records",
    status: "activo",
    moduleKey: "PHARMACY_PRODUCTS",
  },
  {
    title: "Nuevo producto",
    subtitle: "Registro farmacéutico",
    description:
      "Registrar productos manualmente con código maestro HCELM y SKU empresarial sugerido.",
    emoji: "➕",
    to: "/pharmacy/catalogs?view=create",
    status: "activo",
    moduleKey: "PHARMACY_PRODUCT_CREATE",
  },
  {
    title: "Agregar lote / stock",
    subtitle: "Ingreso al almacén",
    description:
      "Ingresar lote, vencimiento, almacén, ubicación, precios, proveedor y stock mínimo.",
    emoji: "📦",
    to: "/pharmacy/catalogs?view=lots",
    status: "activo",
    moduleKey: "PHARMACY_LOTS",
  },
  {
    title: "Catálogo maestro de Botica",
    subtitle: "Importación e historial",
    description:
      "Importar productos y lotes desde Excel, revisar registros y consultar el historial de cargas.",
    emoji: "📚",
    to: "/pharmacy/catalogs?view=import",
    status: "activo",
    moduleKey: "PHARMACY_CATALOG",
  },
  {
    title: "Dispensación de receta",
    subtitle: "Recetas del consultorio",
    description:
      "Recibir recetas emitidas desde consulta, seleccionar producto y lote, y preparar el descuento de stock.",
    emoji: "🧾",
    status: "proxima_fase",
    moduleKey: "PHARMACY_PRESCRIPTIONS",
  },
  {
    title: "Autorizaciones FEFO",
    subtitle: "Excepciones y lotes críticos",
    description:
      "Revisar solicitudes, aprobar o rechazar ventas de lotes críticos y entregar el token de un solo uso.",
    emoji: "✅",
    to: "/pharmacy/authorizations/fefo",
    status: "activo",
    moduleKey: "PHARMACY_FEFO_AUTHORIZATIONS",
  },
  {
    title: "Inventario, Kardex y FEFO",
    subtitle: "Control de stock de Botica",
    description:
      "Consultar movimientos auditados y simular la salida por vencimiento más próximo.",
    emoji: "K",
    to: "/pharmacy/inventory",
    status: "activo",
    moduleKey: "PHARMACY_INVENTORY",
  },
  {
    title: "Droguería",
    subtitle: "Distribución y almacenes",
    description:
      "Compras, proveedores, lotes, transferencias hacia boticas y control de distribución.",
    emoji: "🏭",
    to: "/drugstore",
    status: "proxima_fase",
    moduleKey: "DRUGSTORE",
  },
  {
    title: "Caja y ventas",
    subtitle: "Multiempresa / multi-RUC",
    description:
      "Caja por empresa, venta de servicios, venta de productos, cierre de caja y comprobantes.",
    emoji: "💵",
    status: "proxima_fase",
    moduleKey: "CASH_SALES",
  },
  {
    title: "Inventario de Droguería",
    subtitle: "Almacenes, lotes y distribución",
    description:
      "Stock mayorista, cadena de frío, trazabilidad, FEFO de despacho, transferencias y distribución empresarial.",
    emoji: "🏬",
    to: "/drugstore/inventory",
    status: "proxima_fase",
    moduleKey: "DRUGSTORE_INVENTORY",
  },
  {
    title: "FEFO de Droguería",
    subtitle: "Despacho por vencimiento y trazabilidad",
    description:
      "Priorizar lotes próximos a vencer para despachos y transferencias, controlar excepciones y mantener trazabilidad mayorista.",
    emoji: "⏳",
    to: "/drugstore/fefo",
    status: "activo",
    moduleKey: "DRUGSTORE_FEFO",
  },
  {
    title: "Facturación SUNAT",
    subtitle: "Boletas, facturas y XML",
    description:
      "Preparación fiscal, series, correlativos, clientes, comprobantes, XML, firma digital, CDR y futura conexión SUNAT/OSE.",
    emoji: "🧾",
    to: "/billing",
    status: "proceso",
    moduleKey: "BILLING",
  },
  {
    title: "Reportes gerenciales",
    subtitle: "Visión corporativa",
    description:
      "Ingresos por empresa, ventas, caja, stock valorizado, productos por vencer y reportes consolidados.",
    emoji: "📊",
    status: "proxima_fase",
    moduleKey: "REPORTS",
  },
  {
    title: "Administración SaaS",
    subtitle: "Tenants, empresas y usuarios",
    description:
      "Gestión de grupos, empresas/RUC, usuarios, roles, permisos, planes y auditoría de plataforma.",
    emoji: "⚙️",
    to: "/admin/organization",
    status: "activo",
    moduleKey: "SAAS_ADMIN",
  },
];

export default function Home({
  enabledModules,
}: {
  enabledModules: EnabledModules;
}) {
  const navigate = useNavigate();

  useEffect(() => {
    const token = sessionStorage.getItem("ame_token");

    if (!token) {
      navigate("/login", { replace: true });
    }
  }, [navigate]);

  const userName =
    sessionStorage.getItem("hcelm_professional_name") ||
    sessionStorage.getItem("hcelm_user_name") ||
    "Usuario HCELM";

  const tenantName =
    sessionStorage.getItem("hcelm_tenant_name") || "Grupo Rodríguez";

  const companyName =
    sessionStorage.getItem("hcelm_company_name") || "Empresa activa";

  const roleName =
    sessionStorage.getItem("hcelm_professional_role") ||
    sessionStorage.getItem("hcelm_user_role") ||
    "Rol operativo";
  const userRole = String(
    sessionStorage.getItem("hcelm_user_role") || "",
  ).toUpperCase();
  const platformRole = String(
    sessionStorage.getItem("hcelm_platform_role") || "",
  ).toUpperCase();
  const canAdministerOrganization =
    ["ADMIN", "SUPERADMIN", "SUPER_ADMIN"].includes(userRole) ||
    platformRole === "PLATFORM_SUPERADMIN";

  const visibleModules = platformModules.filter((module) => {
    if (module.moduleKey === "SAAS_ADMIN") return canAdministerOrganization;
    if (module.moduleKey === "CLINIC") return enabledModules.CLINICAL;
    if (module.moduleKey.startsWith("PHARMACY_"))
      return enabledModules.PHARMACY;
    if (module.moduleKey === "DRUGSTORE") return enabledModules.DRUGSTORE;
    if (module.moduleKey === "BILLING") return enabledModules.BILLING;
    if (module.moduleKey === "CASH_SALES") return enabledModules.BILLING;
    if (module.moduleKey === "DRUGSTORE_INVENTORY")
      return enabledModules.DRUGSTORE;
    if (module.moduleKey === "DRUGSTORE_FEFO") return enabledModules.DRUGSTORE;
    if (module.moduleKey === "REPORTS") return enabledModules.MANAGEMENT;

    return false;
  });

  return (
    <div className="space-y-6">
      <section className="bg-gradient-to-r from-slate-900 via-cyan-900 to-emerald-800 text-white rounded-2xl shadow p-6">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6">
          <div>
            <p className="text-sm uppercase tracking-widest text-cyan-100 font-semibold">
              Plataforma integral
            </p>

            <h1 className="text-3xl md:text-4xl font-bold mt-2">
              HCELM Plataforma
            </h1>

            <p className="text-cyan-50 mt-3 max-w-4xl leading-7">
              Sistema modular para atención clínica, farmacia, droguería,
              inventario, caja, ventas, facturación, reportes y administración
              multiempresa.
            </p>
          </div>

          <div className="bg-white/15 rounded-2xl p-4 min-w-[280px]">
            <p className="text-sm text-cyan-100">Sesión activa</p>
            <p className="font-bold text-lg mt-1">{userName}</p>

            <div className="mt-3 text-sm text-cyan-50 space-y-1">
              <p>
                <span className="font-semibold">Grupo:</span> {tenantName}
              </p>
              <p>
                <span className="font-semibold">Empresa:</span> {companyName}
              </p>
              <p>
                <span className="font-semibold">Rol:</span> {roleName}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <SummaryCard title="Modelo" value="Multiempresa" />
        <SummaryCard title="Seguridad" value="Roles y permisos" />
        <SummaryCard title="Datos" value="Separados por tenant" />
        <SummaryCard title="Escalamiento" value="SaaS futuro" />
      </section>

      <section className="bg-white rounded-2xl border shadow-sm p-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">
              Menú principal de módulos
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Los módulos visibles dependerán del usuario, empresa, rol y
              permisos asignados.
            </p>
          </div>

          <span className="text-xs px-3 py-2 rounded-full bg-cyan-50 text-cyan-700 font-semibold border border-cyan-100">
            Dashboard de plataforma
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {visibleModules.map((module) => (
            <PlatformModuleCard key={module.moduleKey} module={module} />
          ))}
        </div>
      </section>

      <section className="bg-slate-50 border rounded-2xl p-5">
        <h2 className="text-xl font-bold text-slate-800">
          Estructura objetivo de HCELM
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mt-4 text-sm">
          <FlowStep number="1" title="Plataforma" text="HCELM SaaS" />
          <FlowStep number="2" title="Tenant" text="Grupo o cliente" />
          <FlowStep number="3" title="Empresa" text="RUC independiente" />
          <FlowStep
            number="4"
            title="Unidad"
            text="Consultorio, botica, droguería"
          />
          <FlowStep number="5" title="Usuario" text="Rol y permisos" />
        </div>
      </section>
    </div>
  );
}

function SummaryCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="bg-white rounded-xl border shadow-sm p-4">
      <p className="text-sm text-slate-500">{title}</p>
      <p className="text-lg font-bold text-slate-800 mt-1">{value}</p>
    </div>
  );
}

function PlatformModuleCard({ module }: { module: PlatformModule }) {
  const card = (
    <div className="h-full bg-white border rounded-xl p-5 shadow-sm hover:shadow-md transition">
      <div className="flex items-start justify-between gap-3">
        <div className="text-3xl">{module.emoji}</div>
        <StatusBadge status={module.status} />
      </div>

      <div className="mt-4">
        <h3 className="text-lg font-bold text-slate-800">{module.title}</h3>
        <p className="text-sm font-semibold text-cyan-700 mt-1">
          {module.subtitle}
        </p>
        <p className="text-sm text-slate-600 mt-3 leading-6">
          {module.description}
        </p>
      </div>

      <div className="mt-4">
        {module.to ? (
          <span className="text-sm font-bold text-emerald-700">
            Abrir módulo →
          </span>
        ) : (
          <span className="text-sm font-bold text-slate-400">Próxima fase</span>
        )}
      </div>
    </div>
  );

  if (module.to) {
    return (
      <Link to={module.to} className="block">
        {card}
      </Link>
    );
  }

  return card;
}

function StatusBadge({ status }: { status: ModuleStatus }) {
  if (status === "activo") {
    return (
      <span className="text-xs px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 font-semibold">
        Activo
      </span>
    );
  }

  if (status === "proceso") {
    return (
      <span className="text-xs px-2 py-1 rounded-full bg-cyan-100 text-cyan-700 font-semibold">
        En proceso
      </span>
    );
  }

  return (
    <span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-700 font-semibold">
      Próxima fase
    </span>
  );
}

function FlowStep({
  number,
  title,
  text,
}: {
  number: string;
  title: string;
  text: string;
}) {
  return (
    <div className="bg-white border rounded-xl p-4">
      <div className="h-8 w-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold">
        {number}
      </div>
      <p className="font-bold text-slate-800 mt-3">{title}</p>
      <p className="text-slate-500 mt-1">{text}</p>
    </div>
  );
}
