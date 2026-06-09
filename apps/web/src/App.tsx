import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  useLocation,
  Navigate,
} from 'react-router-dom';

import Login from './pages/Login';
import IssueCertificate from './pages/IssueCertificate';
import Home from './pages/Home';
import Patients from './pages/Patients';
import Anamnesis from './pages/Anamnesis';
import InstitutionSettings from './pages/InstitutionSettings';
import ProfessionalVerification from './pages/ProfessionalVerification';

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

function Navbar() {
  const location = useLocation();

  if (location.pathname === '/login' || location.pathname === '/professional-verification') {
    return null;
  }

  const professionalName = localStorage.getItem('hcelm_professional_name');
  const professionalCmp = localStorage.getItem('hcelm_professional_cmp');

  const logout = () => {
    localStorage.removeItem('ame_token');
    localStorage.removeItem('hcelm_professional_verified');
    localStorage.removeItem('hcelm_professional_name');
    localStorage.removeItem('hcelm_professional_dni');
    localStorage.removeItem('hcelm_professional_cmp');
    localStorage.removeItem('hcelm_professional_rne');
    localStorage.removeItem('hcelm_professional_role');

    window.location.href = '/login';
  };

  return (
    <nav style={{ background: '#0f766e', padding: '15px', color: 'white' }}>
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          gap: '20px',
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <span style={{ fontWeight: 'bold', fontSize: '18px' }}>AME HEALTH</span>

        <Link to="/" style={{ color: 'white', textDecoration: 'none' }}>
          Inicio
        </Link>

        <Link to="/patients" style={{ color: 'white', textDecoration: 'none' }}>
          Pacientes
        </Link>

        <Link to="/anamnesis" style={{ color: 'white', textDecoration: 'none' }}>
          Anamnesis
        </Link>

        <Link to="/certificates/issue" style={{ color: 'white', textDecoration: 'none' }}>
          Certificados
        </Link>

        <Link to="/institution" style={{ color: 'white', textDecoration: 'none' }}>
          Configuración
        </Link>

        <Link
          to="/professional-verification"
          style={{ color: 'white', textDecoration: 'none' }}
        >
          Profesional
        </Link>

        {professionalName && (
          <span style={{ marginLeft: 'auto', fontSize: '13px', opacity: 0.9 }}>
            {professionalName} {professionalCmp ? `| ${professionalCmp}` : ''}
          </span>
        )}

        <button
          onClick={logout}
          style={{
            background: 'rgba(255,255,255,0.2)',
            border: '1px solid white',
            color: 'white',
            padding: '6px 14px',
            borderRadius: '6px',
            cursor: 'pointer',
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
            path="/"
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
            path="/anamnesis"
            element={
              <ClinicalProtected>
                <Anamnesis />
              </ClinicalProtected>
            }
          />

          <Route
            path="/certificates/issue"
            element={
              <ClinicalProtected>
                <IssueCertificate />
              </ClinicalProtected>
            }
          />

          <Route
            path="/institution"
            element={
              <ClinicalProtected>
                <InstitutionSettings />
              </ClinicalProtected>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}