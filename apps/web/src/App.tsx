import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  useLocation,
  Navigate,
} from 'react-router-dom';

import Login from './pages/Login';
import Home from './pages/Home';
import Patients from './pages/Patients';
import Anamnesis from './pages/Anamnesis';
import InstitutionSettings from './pages/InstitutionSettings';
import ProfessionalVerification from './pages/ProfessionalVerification';
import NewEncounter from './pages/NewEncounter';
import Certificates from './pages/Certificates';
import DataQuality from './pages/DataQuality';

function TokenProtected({ children }: { children: JSX.Element }) {
  const token = localStorage.getItem('ame_token');

  if (!token) return <Navigate to="/login" replace />;

  return <>{children}</>;
}

function ClinicalProtected({ children }: { children: JSX.Element }) {
  const token = localStorage.getItem('ame_token');
  const professionalVerified = localStorage.getItem('hcelm_professional_verified') === 'true';

  if (!token) return <Navigate to="/login" replace />;
  if (!professionalVerified) return <Navigate to="/professional-verification" replace />;

  return <>{children}</>;
}

function RootRedirect() {
  return <Navigate to="/login" replace />;
}

function Navbar() {
  const location = useLocation();

  if (location.pathname === '/login' || location.pathname === '/professional-verification') {
    return null;
  }

  const professionalName = localStorage.getItem('hcelm_professional_name');
  const professionalCmp = localStorage.getItem('hcelm_professional_cmp');

  const isActive = (path: string) => {
    if (path === '/home') return location.pathname === '/home';
    return location.pathname.startsWith(path);
  };

  const linkStyle = (path: string): React.CSSProperties => ({
    color: 'white',
    textDecoration: 'none',
    padding: '8px 12px',
    borderRadius: '8px',
    fontWeight: isActive(path) ? 'bold' : 'normal',
    background: isActive(path) ? 'rgba(255,255,255,0.28)' : 'transparent',
    borderBottom: isActive(path) ? '2px solid white' : '2px solid transparent',
    transition: 'all 0.2s ease',
  });

  const handleMouseEnter = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.currentTarget.style.background = 'rgba(255,255,255,0.20)';
    e.currentTarget.style.transform = 'translateY(-1px)';
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
    e.currentTarget.style.background = isActive(path) ? 'rgba(255,255,255,0.28)' : 'transparent';
    e.currentTarget.style.transform = 'translateY(0)';
  };

  const logout = () => {
    localStorage.removeItem('ame_token');
    localStorage.removeItem('hcelm_professional_verified');
    localStorage.removeItem('hcelm_professional_name');
    localStorage.removeItem('hcelm_professional_dni');
    localStorage.removeItem('hcelm_professional_type');
    localStorage.removeItem('hcelm_professional_cmp');
    localStorage.removeItem('hcelm_professional_rne');
    localStorage.removeItem('hcelm_professional_license');
    localStorage.removeItem('hcelm_professional_role');
    localStorage.removeItem('selectedPatient');
    localStorage.removeItem('selectedEncounter');

    window.location.href = '/login';
  };

  const MenuLink = ({ to, label }: { to: string; label: string }) => (
    <Link
      to={to}
      style={linkStyle(to)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={(e) => handleMouseLeave(e, to)}
    >
      {label}
    </Link>
  );

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
        <MenuLink to="/patients" label="Pacientes" />
        <MenuLink to="/anamnesis" label="Anamnesis" />
        <MenuLink to="/certificates" label="Certificados" />
        <MenuLink to="/institution" label="Configuración" />
        <MenuLink to="/admin/data-quality" label="Calidad de datos" />
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
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.32)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
          }}
        >
          Salir
        </button>
      </div>
    </nav>
  );
}

export default function App() {
  return (
    <Router>
      <Navbar />

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
              <ClinicalProtected>
                <Home />
              </ClinicalProtected>
            }
          />

          <Route
            path="/patients"
            element={
              <ClinicalProtected>
                <Patients />
              </ClinicalProtected>
            }
          />

          <Route
            path="/new-encounter"
            element={
              <ClinicalProtected>
                <NewEncounter />
              </ClinicalProtected>
            }
          />

          <Route
            path="/anamnesis"
            element={
              <ClinicalProtected>
                <Anamnesis />
              </ClinicalProtected>
            }
          />

          <Route
            path="/certificates"
            element={
              <ClinicalProtected>
                <Certificates />
              </ClinicalProtected>
            }
          />

          <Route path="/certificates/issue" element={<Navigate to="/certificates" replace />} />

          <Route
            path="/institution"
            element={
              <ClinicalProtected>
                <InstitutionSettings />
              </ClinicalProtected>
            }
          />

          <Route
            path="/admin/data-quality"
            element={
              <ClinicalProtected>
                <DataQuality />
              </ClinicalProtected>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}
