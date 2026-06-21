import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const navigate = useNavigate();
  const doctor = 'Dr. Alfonso Rodriguez Rojas';

  useEffect(() => {
    const token = localStorage.getItem('ame_token');
    if (!token) navigate('/');
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('ame_token');
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <aside className="w-64 bg-slate-900 text-white p-6 flex flex-col">
        <h2 className="text-xl font-bold mb-8 text-blue-400">AME HEALTH SAC</h2>
        
        <nav className="flex-1 space-y-2">
          <Link to="/dashboard" className="block px-4 py-2 bg-blue-600 rounded-lg font-medium">Inicio</Link>
          <Link to="/patients" className="block px-4 py-2 hover:bg-slate-800 rounded-lg transition">Pacientes</Link>
          <Link to="/consultas" className="block px-4 py-2 hover:bg-slate-800 rounded-lg transition">Consultas</Link>
          <Link to="/certificates/issue" className="block px-4 py-2 hover:bg-slate-800 rounded-lg transition">Emitir Certificado</Link>
          <a href="#" className="block px-4 py-2 hover:bg-slate-800 rounded-lg transition">Recetas</a>
          <a href="#" className="block px-4 py-2 hover:bg-slate-800 rounded-lg transition">Auditoria</a>
        </nav>
        
        <button onClick={handleLogout} className="mt-6 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition">
          Cerrar Sesion
        </button>
      </aside>

      <main className="flex-1 p-8">
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-slate-800">Panel de Control Clinico</h1>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="font-semibold text-slate-700">{doctor}</p>
              <p className="text-sm text-slate-500">CMP 43992</p>
            </div>
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">AR</div>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <p className="text-sm text-slate-500 mb-1">Pacientes Activos</p>
            <p className="text-3xl font-bold text-slate-800">124</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <p className="text-sm text-slate-500 mb-1">Certificados Emitidos</p>
            <p className="text-3xl font-bold text-slate-800">18</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <p className="text-sm text-slate-500 mb-1">Recetas Pendientes</p>
            <p className="text-3xl font-bold text-slate-800">5</p>
          </div>
        </div>

        <div className="bg-blue-600 text-white p-8 rounded-xl shadow-lg">
          <h3 className="text-xl font-bold mb-2">Bienvenido al Sistema</h3>
          <p className="opacity-90">AME HEALTH SAC operativo. Puede registrar pacientes y emitir certificados.</p>
        </div>
      </main>
    </div>
  );
}