import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import IssueCertificate from './pages/IssueCertificate';
import Home from './pages/Home';
import Patients from './pages/Patients';
import Anamnesis from './pages/Anamnesis';
import InstitutionSettings from './pages/InstitutionSettings';

// ✅ Protección de rutas: Si no hay token, manda al Login
function Protected({ children }: { children: JSX.Element }) {
  const token = localStorage.getItem('ame_token');
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

// ✅ Menú de navegación completo
function Navbar() {
  const location = useLocation();
  if (location.pathname === '/login') return null;

  return (
    <nav style={{ background: '#0f766e', padding: '15px', color: 'white' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 'bold', fontSize: '18px' }}>🏥 AME HEALTH</span>
        <Link to="/" style={{ color: 'white', textDecoration: 'none' }}>🏠 Inicio</Link>
        <Link to="/patients" style={{ color: 'white', textDecoration: 'none' }}>👥 Pacientes</Link>
        <Link to="/anamnesis" style={{ color: 'white', textDecoration: 'none' }}>📋 Anamnesis</Link>
        <Link to="/certificates/issue" style={{ color: 'white', textDecoration: 'none' }}>📄 Certificados</Link>
        <Link to="/institution" style={{ color: 'white', textDecoration: 'none', fontWeight: 'bold', borderBottom: '2px solid white' }}>⚙️ Configuración</Link>
        
        <button 
          onClick={() => { localStorage.removeItem('ame_token'); window.location.href = '/login'; }} 
          style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.2)', border: '1px solid white', color: 'white', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer' }}
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
          {/* Login público */}
          <Route path="/login" element={<Login />} />
          
          {/* Rutas protegidas */}
          <Route path="/" element={<Protected><Home /></Protected>} />
          <Route path="/patients" element={<Protected><Patients /></Protected>} />
          <Route path="/anamnesis" element={<Protected><Anamnesis /></Protected>} />
          <Route path="/certificates/issue" element={<Protected><IssueCertificate /></Protected>} />
          <Route path="/institution" element={<Protected><InstitutionSettings /></Protected>} />
          
          {/* Cualquier ruta no definida vuelve al inicio */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}