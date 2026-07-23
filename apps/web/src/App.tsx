// Archivo: App.tsx
// Ruta: apps/web/src/App.tsx
// Funcion: Rutas, navegacion y acceso segun modulos habilitados.
import {
  createContext,
  lazy,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactElement, ReactNode } from "react";
import {
  BrowserRouter as Router,
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";

const Anamnesis = lazy(() => import("./pages/Anamnesis"));
const Catalogs = lazy(() => import("./pages/Catalogs"));
const Certificates = lazy(() => import("./pages/Certificates"));
const DataQuality = lazy(() => import("./pages/DataQuality"));
const Home = lazy(() => import("./pages/Home"));
const InstitutionSettings = lazy(() => import("./pages/InstitutionSettings"));
const Login = lazy(() => import("./pages/Login"));
const PlatformDashboard = lazy(
  () => import("./pages/platform/PlatformDashboard"),
);
const NewEncounter = lazy(() => import("./pages/NewEncounter"));
const OrganizationAdministration = lazy(
  () => import("./pages/OrganizationAdministration"),
);
const Patients = lazy(() => import("./pages/Patients"));
const ProfessionalVerification = lazy(
  () => import("./pages/ProfessionalVerification"),
);
import {
  clearAuthSession,
  getAuthToken,
  hasPreservedPlatformToken,
  hasProfessionalVerification,
  hasValidToken,
  removeSessionItem,
  restorePlatformToken,
} from "./lib/auth";
const Pharmacy = lazy(() => import("./pages/Pharmacy"));
const PharmacyCatalogs = lazy(() => import("./pages/PharmacyCatalogs"));
const PharmacyInventory = lazy(() => import("./pages/PharmacyInventory"));
const PharmacySales = lazy(() => import("./pages/PharmacySales"));
const PharmacyFefoAuthorizations = lazy(
  () => import("./pages/PharmacyFefoAuthorizations"),
);
const PharmacyFefoSettings = lazy(() => import("./pages/PharmacyFefoSettings"));
const Billing = lazy(() => import("./pages/Billing"));
import ClinicalNavigation from "./components/clinical/ClinicalNavigation";

const API_URL = "http://localhost:3000/api";

type SystemModuleKey =
  | "CLINICAL"
  | "PHARMACY"
  | "DRUGSTORE"
  | "BILLING"
  | "MANAGEMENT";

type SystemModulesState = Record<SystemModuleKey, boolean>;

type SystemModulesContextValue = {
  modules: SystemModulesState;
  loading: boolean;
  isEnabled: (key: SystemModuleKey) => boolean;
};

const DEFAULT_MODULES: SystemModulesState = {
  CLINICAL: true,
  PHARMACY: false,
  DRUGSTORE: false,
  BILLING: false,
  MANAGEMENT: false,
};

const SystemModulesContext = createContext<SystemModulesContextValue>({
  modules: DEFAULT_MODULES,
  loading: true,
  isEnabled: (_key: SystemModuleKey) => false,
});

function SystemModulesProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const token = useMemo(() => getAuthToken(), [location.pathname]);
  const [modules, setModules] = useState<SystemModulesState>(DEFAULT_MODULES);
  const [loading, setLoading] = useState(true);

  const loadModules = useCallback(async () => {
    if (!token) {
      setModules(DEFAULT_MODULES);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/institution/system-modules`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("No se pudieron cargar los modulos.");

      const data = await response.json();
      const nextModules = { ...DEFAULT_MODULES };

      if (Array.isArray(data)) {
        data.forEach((item) => {
          const key = String(item?.key || "") as SystemModuleKey;

          if (key in nextModules) {
            nextModules[key] =
              typeof item?.effectiveEnabled === "boolean"
                ? item.effectiveEnabled
                : item?.enabled === true;
          }
        });
      }

      setModules(nextModules);
    } catch {
      setModules(DEFAULT_MODULES);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadModules();
  }, [loadModules]);

  useEffect(() => {
    const refreshModules = () => loadModules();

    window.addEventListener("hcelm:system-modules-updated", refreshModules);

    return () => {
      window.removeEventListener(
        "hcelm:system-modules-updated",
        refreshModules,
      );
    };
  }, [loadModules]);

  const value = useMemo(
    () => ({
      modules,
      loading,
      isEnabled: (key: SystemModuleKey) => modules[key] === true,
    }),
    [loading, modules],
  );

  return (
    <SystemModulesContext.Provider value={value}>
      {children}
    </SystemModulesContext.Provider>
  );
}

function useSystemModules() {
  return useContext(SystemModulesContext);
}

function TokenProtected({ children }: { children: ReactElement }) {
  const token = sessionStorage.getItem("ame_token");

  if (!token) {
    return (
      <div style={{ padding: 24, color: "#991b1b", background: "#fee2e2" }}>
        <h1>Error de seguridad HCELM</h1>
        <p>No existe ame_token en sessionStorage.</p>
        <p>La ruta protegida no puede abrirse.</p>
      </div>
    );
  }

  return children;
}

function readJwtPayload() {
  const token = getAuthToken();

  if (!token) return null;

  try {
    const payload = token.split(".")[1];

    if (!payload) return null;

    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = decodeURIComponent(
      atob(normalized)
        .split("")
        .map(
          (character) =>
            `%${character.charCodeAt(0).toString(16).padStart(2, "0")}`,
        )
        .join(""),
    );

    return JSON.parse(decoded) as {
      platformRole?: string | null;
    };
  } catch {
    return null;
  }
}

function PlatformProtected({ children }: { children: ReactElement }) {
  if (!hasValidToken()) {
    return <Navigate to="/login" replace />;
  }

  const payload = readJwtPayload();
  const platformRole = String(payload?.platformRole || "").toUpperCase();

  if (platformRole !== "PLATFORM_SUPERADMIN") {
    return <Navigate to="/home" replace />;
  }

  return children;
}
function ProfessionalProtected({ children }: { children: ReactElement }) {
  if (!hasValidToken()) {
    return <Navigate to="/login" replace />;
  }

  if (!hasProfessionalVerification()) {
    return <Navigate to="/professional-verification" replace />;
  }

  return children;
}

function ModuleProtected({
  moduleKey,
  children,
}: {
  moduleKey: SystemModuleKey;
  children: ReactElement;
}) {
  const { loading, isEnabled } = useSystemModules();

  if (loading) return <LoadingModules />;

  return (
    <ProfessionalProtected>
      {isEnabled(moduleKey) ? children : <Navigate to="/home" replace />}
    </ProfessionalProtected>
  );
}

function SharedCatalogProtected({ children }: { children: ReactElement }) {
  const { loading, modules } = useSystemModules();

  if (loading) return <LoadingModules />;

  const enabled = modules.CLINICAL || modules.PHARMACY || modules.DRUGSTORE;

  return (
    <ProfessionalProtected>
      {enabled ? children : <Navigate to="/home" replace />}
    </ProfessionalProtected>
  );
}

function RootRedirect() {
  if (!hasValidToken()) {
    return <Navigate to="/login" replace />;
  }

  if (!hasProfessionalVerification()) {
    return <Navigate to="/professional-verification" replace />;
  }

  return <Navigate to="/home" replace />;
}

function LoadingModules() {
  return <p style={{ color: "#475569" }}>Cargando modulos del sistema...</p>;
}

function ContextualHome() {
  const { loading, modules } = useSystemModules();

  if (loading) return <LoadingModules />;

  return <Home enabledModules={modules} />;
}

function ModulePlaceholder({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <section
      style={{
        border: "1px solid #cbd5e1",
        borderRadius: "8px",
        background: "white",
        padding: "24px",
      }}
    >
      <h1 style={{ color: "#1e293b", fontSize: "24px", margin: 0 }}>{title}</h1>
      <p style={{ color: "#64748b", marginBottom: 0, marginTop: "8px" }}>
        {description}
      </p>
    </section>
  );
}

function Navbar() {
  const location = useLocation();

  const isAuthPage =
    location.pathname === "/login" ||
    location.pathname === "/professional-verification" ||
    location.pathname.startsWith("/platform");

  if (isAuthPage) {
    return null;
  }

  const userName =
    sessionStorage.getItem("hcelm_professional_name") ||
    sessionStorage.getItem("hcelm_user_name") ||
    "Usuario HCELM";

  const tenantName =
    sessionStorage.getItem("hcelm_tenant_name") || "Grupo empresarial";

  const companyName =
    sessionStorage.getItem("hcelm_company_name") || "Empresa activa";

  const roleName =
    sessionStorage.getItem("hcelm_professional_role") ||
    sessionStorage.getItem("hcelm_user_role") ||
    "Rol operativo";

  const temporaryPlatformAccess =
    sessionStorage.getItem("hcelm_context_source") === "PLATFORM_SUPERADMIN" &&
    sessionStorage.getItem("hcelm_access_mode") === "COMPANY_OPERATION" &&
    hasPreservedPlatformToken();
  const handleReturnToPlatform = async () => {
    const operationalToken = getAuthToken();

    if (!operationalToken) {
      window.alert("No se encontró la sesión operativa activa.");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/platform/context/company/exit`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${operationalToken}`,
        },
      });

      const body = await response.json().catch(() => null);

      if (!response.ok) {
        const message =
          body && typeof body.message === "string"
            ? body.message
            : "No se pudo cerrar el registro de auditoría.";

        throw new Error(message);
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo cerrar el acceso temporal.";

      const continueReturn = window.confirm(
        `${message}\n\nEl acceso podría quedar pendiente para revisión. ¿Desea volver al panel global de todas maneras?`,
      );

      if (!continueReturn) {
        return;
      }
    }

    if (!restorePlatformToken()) {
      window.alert(
        "No se encontró la sesión global conservada. Inicie sesión nuevamente.",
      );
      return;
    }

    [
      "hcelm_professional_verified",
      "hcelm_professional_name",
      "hcelm_professional_dni",
      "hcelm_professional_type",
      "hcelm_professional_cmp",
      "hcelm_professional_rne",
      "hcelm_professional_license",
      "hcelm_professional_role",
      "hcelm_require_professional_verification",
      "hcelm_access_mode",
      "hcelm_context_source",
      "hcelm_platform_access_audit_id",
      "hcelm_platform_access_reason",
      "hcelm_platform_access_entered_at",
    ].forEach(removeSessionItem);

    window.location.href = "/platform";
  };

  const handleLogout = () => {
    clearAuthSession();
    window.location.href = "/login";
  };

  return (
    <header className="bg-slate-950 text-white border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link to="/home" className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-cyan-500 flex items-center justify-center font-black text-slate-950">
              H
            </div>

            <div>
              <p className="font-bold leading-5">HCELM Plataforma</p>
              <p className="text-xs text-slate-300">
                Sistema integral multiempresa
              </p>
            </div>
          </Link>
        </div>

        <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 text-xs md:text-sm">
          <div className="bg-slate-900 rounded-lg px-3 py-2 border border-slate-800">
            <span className="text-slate-400">Grupo:</span>{" "}
            <span className="font-semibold">{tenantName}</span>
          </div>

          <div className="bg-slate-900 rounded-lg px-3 py-2 border border-slate-800">
            <span className="text-slate-400">Empresa:</span>{" "}
            <span className="font-semibold">{companyName}</span>
          </div>

          <div className="bg-slate-900 rounded-lg px-3 py-2 border border-slate-800">
            <span className="text-slate-400">Usuario:</span>{" "}
            <span className="font-semibold">{userName}</span>
            <span className="text-slate-500"> / {roleName}</span>
          </div>

          {temporaryPlatformAccess ? (
            <button
              type="button"
              onClick={() => void handleReturnToPlatform()}
              className="rounded-lg border border-cyan-300 bg-cyan-500 px-4 py-2 font-black text-slate-950 transition hover:bg-cyan-400"
            >
              Volver al panel global
            </button>
          ) : null}

          <button
            type="button"
            onClick={handleLogout}
            className="bg-red-600 hover:bg-red-700 text-white rounded-lg px-4 py-2 font-semibold transition"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </header>
  );
}

function ClinicalNavigationSlot() {
  const location = useLocation();

  const clinicalPaths = [
    "/patients",
    "/new-encounter",
    "/anamnesis",
    "/certificates",
  ];

  const shouldShowClinicalNavigation = clinicalPaths.some(
    (path) =>
      location.pathname === path || location.pathname.startsWith(`${path}/`),
  );

  if (!shouldShowClinicalNavigation) {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 pt-4">
      <ClinicalNavigation />
    </div>
  );
}

function LoadingPage() {
  return (
    <div className="flex min-h-[240px] items-center justify-center rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-cyan-600" />
        <p className="mt-4 font-semibold text-slate-700">Cargando sección...</p>
        <p className="mt-1 text-sm text-slate-500">
          HCELM está preparando únicamente el módulo solicitado.
        </p>
      </div>
    </div>
  );
}
function AppRoutes() {
  return (
    <div style={{ padding: "20px", maxWidth: "1800px", margin: "0 auto" }}>
      <Suspense fallback={<LoadingPage />}>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<Login />} />
          <Route
            path="/platform"
            element={
              <PlatformProtected>
                <PlatformDashboard />
              </PlatformProtected>
            }
          />

          <Route
            path="/professional-verification"
            element={
              <TokenProtected>
                <ProfessionalVerification />
              </TokenProtected>
            }
          />

          <Route
            path="/home"
            element={
              <ProfessionalProtected>
                <ContextualHome />
              </ProfessionalProtected>
            }
          />

          <Route
            path="/patients"
            element={
              <ModuleProtected moduleKey="CLINICAL">
                <Patients />
              </ModuleProtected>
            }
          />
          <Route
            path="/new-encounter"
            element={
              <ModuleProtected moduleKey="CLINICAL">
                <NewEncounter />
              </ModuleProtected>
            }
          />
          <Route
            path="/anamnesis"
            element={
              <ModuleProtected moduleKey="CLINICAL">
                <Anamnesis />
              </ModuleProtected>
            }
          />
          <Route
            path="/certificates"
            element={
              <ModuleProtected moduleKey="CLINICAL">
                <Certificates />
              </ModuleProtected>
            }
          />
          <Route
            path="/certificates/issue"
            element={<Navigate to="/certificates" replace />}
          />

          <Route
            path="/pharmacy"
            element={
              <ModuleProtected moduleKey="PHARMACY">
                <Pharmacy />
              </ModuleProtected>
            }
          />
          <Route
            path="/pharmacy/catalogs"
            element={
              <ModuleProtected moduleKey="PHARMACY">
                <PharmacyCatalogs />
              </ModuleProtected>
            }
          />
          <Route
            path="/pharmacy/inventory"
            element={
              <ModuleProtected moduleKey="PHARMACY">
                <PharmacyInventory />
              </ModuleProtected>
            }
          />
          <Route
            path="/pharmacy/sales/new"
            element={
              <ModuleProtected moduleKey="PHARMACY">
                <PharmacySales />
              </ModuleProtected>
            }
          />
          <Route
            path="/drugstore"
            element={
              <ModuleProtected moduleKey="DRUGSTORE">
                <ModulePlaceholder
                  title="Drogueria"
                  description="Modulo habilitado para su desarrollo independiente y posterior integracion con inventarios y ventas."
                />
              </ModuleProtected>
            }
          />
          <Route
            path="/drugstore/inventory"
            element={
              <ModuleProtected moduleKey="DRUGSTORE">
                <ModulePlaceholder
                  title="Inventario de Droguería"
                  description="Próxima fase para almacenes, lotes, cadena de frío, FEFO de despacho, transferencias y distribución empresarial. No utiliza las reglas comerciales minoristas de Botica Premium."
                />
              </ModuleProtected>
            }
          />
          <Route
            path="/drugstore/fefo"
            element={
              <ModuleProtected moduleKey="DRUGSTORE">
                <PharmacyInventory mode="DRUGSTORE" />
              </ModuleProtected>
            }
          />
          <Route
            path="/pharmacy/authorizations/fefo"
            element={
              <ModuleProtected moduleKey="PHARMACY">
                <PharmacyFefoAuthorizations />
              </ModuleProtected>
            }
          />
          <Route
            path="/pharmacy/settings/fefo"
            element={
              <ModuleProtected moduleKey="PHARMACY">
                <PharmacyFefoSettings />
              </ModuleProtected>
            }
          />
          <Route
            path="/billing"
            element={
              <ModuleProtected moduleKey="BILLING">
                <Billing />
              </ModuleProtected>
            }
          />
          <Route
            path="/management"
            element={
              <ModuleProtected moduleKey="MANAGEMENT">
                <ModulePlaceholder
                  title="Gerencia"
                  description="Modulo habilitado para indicadores y reportes consolidados."
                />
              </ModuleProtected>
            }
          />

          <Route
            path="/admin/organization"
            element={
              <ProfessionalProtected>
                <OrganizationAdministration />
              </ProfessionalProtected>
            }
          />
          <Route
            path="/institution"
            element={
              <ProfessionalProtected>
                <InstitutionSettings />
              </ProfessionalProtected>
            }
          />
          <Route
            path="/clinical/catalogs"
            element={
              <ModuleProtected moduleKey="CLINICAL">
                <Catalogs />
              </ModuleProtected>
            }
          />
          <Route
            path="/admin/catalogs"
            element={
              <SharedCatalogProtected>
                <Navigate to="/clinical/catalogs" replace />
              </SharedCatalogProtected>
            }
          />
          <Route
            path="/admin/data-quality"
            element={
              <ModuleProtected moduleKey="CLINICAL">
                <DataQuality />
              </ModuleProtected>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <SystemModulesProvider>
        <Navbar />
        <ClinicalNavigationSlot />
        <AppRoutes />
      </SystemModulesProvider>
    </Router>
  );
}
