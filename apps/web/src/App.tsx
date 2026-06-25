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
  CSSProperties,
  MouseEvent as ReactMouseEvent,
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
  getSessionItem,
  hasProfessionalVerification,
  hasValidToken,
} from './lib/auth';

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
  const { loading, modules } = useSystemModules();

  if (
    location.pathname === '/login' ||
    location.pathname === '/professional-verification'
  ) {
    return null;
  }

  const professionalName = getSessionItem('hcelm_professional_name');
  const professionalCmp = getSessionItem('hcelm_professional_cmp');

  const isActive = (path: string) => {
    if (path === '/home') return location.pathname === '/home';
    return location.pathname.startsWith(path);
  };

  const linkStyle = (path: string): CSSProperties => ({
    color: 'white',
    textDecoration: 'none',
    padding: '8px 12px',
    borderRadius: '8px',
    fontWeight: isActive(path) ? 'bold' : 'normal',
    background: isActive(path) ? 'rgba(255,255,255,0.28)' : 'transparent',
    borderBottom: isActive(path) ? '2px solid white' : '2px solid transparent',
    transition: 'all 0.2s ease',
  });

  const handleMouseEnter = (event: ReactMouseEvent<HTMLAnchorElement>) => {
    event.currentTarget.style.background = 'rgba(255,255,255,0.20)';
    event.currentTarget.style.transform = 'translateY(-1px)';
  };

  const handleMouseLeave = (
    event: ReactMouseEvent<HTMLAnchorElement>,
    path: string,
  ) => {
    event.currentTarget.style.background = isActive(path)
      ? 'rgba(255,255,255,0.28)'
      : 'transparent';
    event.currentTarget.style.transform = 'translateY(0)';
  };

  const logout = () => {
    clearAuthSession();
    window.location.href = '/login';
  };

  const MenuLink = ({ to, label }: { to: string; label: string }) => (
    <Link
      to={to}
      style={linkStyle(to)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={(event) => handleMouseLeave(event, to)}
    >
      {label}
    </Link>
  );

  const catalogsEnabled =
    modules.CLINICAL || modules.PHARMACY || modules.DRUGSTORE;

  return (
    <nav style={{ background: '#0f766e', padding: '14px', color: 'white' }}>
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          gap: '10px',
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <span style={{ fontWeight: 'bold', fontSize: '18px', marginRight: '8px' }}>
          AME HEALTH
        </span>

        <MenuLink to="/home" label="Inicio" />

        {!loading && modules.CLINICAL && (
          <>
            <MenuLink to="/patients" label="Pacientes" />
            <MenuLink to="/anamnesis" label="Anamnesis" />
            <MenuLink to="/certificates" label="Certificados" />
          </>
        )}

        {!loading && modules.PHARMACY && (
          <MenuLink to="/pharmacy" label="Farmacia" />
        )}
        {!loading && modules.DRUGSTORE && (
          <MenuLink to="/drugstore" label="Drogueria" />
        )}
        {!loading && modules.BILLING && (
          <MenuLink to="/billing" label="Caja" />
        )}
        {!loading && modules.MANAGEMENT && (
          <MenuLink to="/management" label="Gerencia" />
        )}

        {!loading && catalogsEnabled && (
          <MenuLink to="/admin/catalogs" label="Catalogos maestros" />
        )}
        {!loading && modules.CLINICAL && (
          <MenuLink to="/admin/data-quality" label="Calidad de datos" />
        )}

        <MenuLink to="/institution" label="Configuracion" />
        <MenuLink to="/professional-verification" label="Profesional" />

        {professionalName && (
          <span style={{ marginLeft: 'auto', fontSize: '13px', opacity: 0.95 }}>
            {professionalName} {professionalCmp ? `| ${professionalCmp}` : ''}
          </span>
        )}

        <button
          onClick={logout}
          style={{
            background: 'rgba(255,255,255,0.2)',
            border: '1px solid white',
            color: 'white',
            padding: '7px 14px',
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(event) => {
            event.currentTarget.style.background = 'rgba(255,255,255,0.32)';
          }}
          onMouseLeave={(event) => {
            event.currentTarget.style.background = 'rgba(255,255,255,0.2)';
          }}
        >
          Salir
        </button>
      </div>
    </nav>
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
              <ModulePlaceholder
                title="Farmacia"
                description="Modulo habilitado. El maestro de productos, lotes, dispensacion y ventas se implementara en los siguientes bloques."
              />
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
          path="/admin/catalogs"
          element={
            <SharedCatalogProtected>
              <Catalogs />
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
        <AppRoutes />
      </SystemModulesProvider>
    </Router>
  );
}
