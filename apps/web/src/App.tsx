// Archivo: App.tsx
// Ruta: apps/web/src/App.tsx
// Funcion: Rutas, navegacion y acceso segun modulos habilitados.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type {
  ReactElement,
  ReactNode,
} from 'react';
import {
  BrowserRouter as Router,
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom';

import Anamnesis from './pages/Anamnesis';
import Catalogs from './pages/Catalogs';
import Certificates from './pages/Certificates';
import DataQuality from './pages/DataQuality';
import Home from './pages/Home';
import InstitutionSettings from './pages/InstitutionSettings';
import Login from './pages/Login';
import NewEncounter from './pages/NewEncounter';
import Patients from './pages/Patients';
import ProfessionalVerification from './pages/ProfessionalVerification';
import {
  clearAuthSession,
  getAuthToken,
  hasProfessionalVerification,
  hasValidToken,
} from './lib/auth';
import Pharmacy from './pages/Pharmacy';
import PharmacyCatalogs from './pages/PharmacyCatalogs';
import ClinicalNavigation from './components/clinical/ClinicalNavigation';

const API_URL = 'http://localhost:3000/api';

type SystemModuleKey =
  | 'CLINICAL'
  | 'PHARMACY'
  | 'DRUGSTORE'
  | 'BILLING'
  | 'MANAGEMENT';

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
    const token = useMemo(
    () => getAuthToken(),
    [location.pathname],
  );
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

      if (!response.ok) throw new Error('No se pudieron cargar los modulos.');

      const data = await response.json();
      const nextModules = { ...DEFAULT_MODULES };

      if (Array.isArray(data)) {
        data.forEach((item) => {
          const key = String(item?.key || '') as SystemModuleKey;

          if (key in nextModules) {
            nextModules[key] = item?.enabled === true;
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

    window.addEventListener('hcelm:system-modules-updated', refreshModules);

    return () => {
      window.removeEventListener('hcelm:system-modules-updated', refreshModules);
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
  const token = sessionStorage.getItem('ame_token');

  if (!token) {
    return (
      <div style={{ padding: 24, color: '#991b1b', background: '#fee2e2' }}>
        <h1>Error de seguridad HCELM</h1>
        <p>No existe ame_token en sessionStorage.</p>
        <p>La ruta protegida no puede abrirse.</p>
      </div>
    );
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

  const enabled =
    modules.CLINICAL || modules.PHARMACY || modules.DRUGSTORE;

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
  return <p style={{ color: '#475569' }}>Cargando modulos del sistema...</p>;
}

function ModulePlaceholder({ title, description }: { title: string; description: string }) {
  return (
    <section
      style={{
        border: '1px solid #cbd5e1',
        borderRadius: '8px',
        background: 'white',
        padding: '24px',
      }}
    >
      <h1 style={{ color: '#1e293b', fontSize: '24px', margin: 0 }}>{title}</h1>
      <p style={{ color: '#64748b', marginBottom: 0, marginTop: '8px' }}>
        {description}
      </p>
    </section>
  );
}

function Navbar() {
  const location = useLocation();

  const isAuthPage =
    location.pathname === '/login' ||
    location.pathname === '/professional-verification';

  if (isAuthPage) {
    return null;
  }

  const userName =
    sessionStorage.getItem('hcelm_professional_name') ||
    sessionStorage.getItem('hcelm_user_name') ||
    'Usuario HCELM';

  const tenantName =
    sessionStorage.getItem('hcelm_tenant_name') || 'Tenant activo';

  const companyName =
    sessionStorage.getItem('hcelm_company_name') || 'Empresa activa';

  const roleName =
    sessionStorage.getItem('hcelm_professional_role') ||
    sessionStorage.getItem('hcelm_user_role') ||
    'Rol operativo';

  const handleLogout = () => {
    clearAuthSession();
    window.location.href = '/login';
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
            <span className="text-slate-400">Tenant:</span>{' '}
            <span className="font-semibold">{tenantName}</span>
          </div>

          <div className="bg-slate-900 rounded-lg px-3 py-2 border border-slate-800">
            <span className="text-slate-400">Empresa:</span>{' '}
            <span className="font-semibold">{companyName}</span>
          </div>

          <div className="bg-slate-900 rounded-lg px-3 py-2 border border-slate-800">
            <span className="text-slate-400">Usuario:</span>{' '}
            <span className="font-semibold">{userName}</span>
            <span className="text-slate-500"> / {roleName}</span>
          </div>

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
    '/patients',
    '/new-encounter',
    '/anamnesis',
    '/certificates',
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

function AppRoutes() {
  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<Login />} />

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
              <Home />
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
          path="/billing"
          element={
            <ModuleProtected moduleKey="BILLING">
              <ModulePlaceholder
                title="Caja y facturacion"
                description="Modulo habilitado para cobros, pagos y comprobantes de los servicios y productos vendidos."
              />
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
