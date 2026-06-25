import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function Home() {
  const navigate = useNavigate();

  useEffect(() => {
    const token = sessionStorage.getItem('ame_token');

    if (!token) {
      navigate('/login', { replace: true });
    }
  }, [navigate]);

  return (
    <div className="p-8 max-w-6xl mx-auto bg-gray-50 min-h-screen">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Bienvenido, Dr. Alfonso</h1>
          <p className="text-gray-600 mt-2">Sistema de Historia Clínica Electrónica y Gestión Médica</p>
        </div>
        <button 
          onClick={() => { 
            sessionStorage.removeItem('ame_token');
            localStorage.removeItem('ame_token');
            navigate('/login'); 
          }} 
          className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition"
        >
          Cerrar Sesión
        </button>
      </div>
      
      {/* ✅ Grid ajustado a 4 columnas para incluir Configuración */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Tarjeta Pacientes */}
        <Link to="/patients" className="block p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition border-t-4 border-blue-500 group">
          <div className="text-4xl mb-4">👥</div>
          <h2 className="text-xl font-bold text-slate-700 group-hover:text-blue-600">Gestión de Pacientes</h2>
          <p className="text-sm text-gray-500 mt-2">Registrar y buscar pacientes.</p>
        </Link>

        {/* Tarjeta Anamnesis */}
        <Link to="/anamnesis" className="block p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition border-t-4 border-emerald-500 group">
          <div className="text-4xl mb-4">📋</div>
          <h2 className="text-xl font-bold text-slate-700 group-hover:text-emerald-600">Anamnesis y HCE</h2>
          <p className="text-sm text-gray-500 mt-2">Historia clínica y examen físico.</p>
        </Link>

        {/* Tarjeta Certificados */}
        <Link to="/certificates/issue" className="block p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition border-t-4 border-purple-500 group">
          <div className="text-4xl mb-4">📄</div>
          <h2 className="text-xl font-bold text-slate-700 group-hover:text-purple-600">Certificados Médicos</h2>
          <p className="text-sm text-gray-500 mt-2">Emisión de certificados y reposos.</p>
        </Link>

        {/* ✅ NUEVA Tarjeta: Configuración Institucional */}
        <Link to="/institution" className="block p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition border-t-4 border-orange-500 group">
          <div className="text-4xl mb-4">⚙️</div>
          <h2 className="text-xl font-bold text-slate-700 group-hover:text-orange-600">Configuración</h2>
          <p className="text-sm text-gray-500 mt-2">Datos institucionales, médicos y ajustes HCE.</p>
        </Link>
      </div>

      <div className="mt-10 p-6 bg-white rounded-xl shadow-sm border border-gray-100">
        <h3 className="font-bold text-slate-700 mb-2">📌 Estado del Sistema</h3>
        <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
          <li>✅ Módulo de Login: Activo</li>
          <li>✅ Emisión de Certificados: Activo y Optimizado</li>
          <li>✅ Anamnesis / HCE: Activo</li>
          <li>✅ Configuración Institucional: Activo</li>
          <li>🚧 Módulo de Pacientes: En desarrollo</li>
        </ul>
      </div>
    </div>
  );
}