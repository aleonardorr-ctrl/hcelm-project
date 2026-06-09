import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API_URL = 'http://localhost:3000/api';

export default function ProfessionalVerification() {
  const navigate = useNavigate();

  const [users, setUsers] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');

  const [form, setForm] = useState({
    name: '',
    dni: '',
    cmp: '',
    rne: '',
    role: '',
  });

  const professionalVerified = localStorage.getItem('hcelm_professional_verified') === 'true';
  const currentProfessionalName = localStorage.getItem('hcelm_professional_name');
  const currentProfessionalCmp = localStorage.getItem('hcelm_professional_cmp');

  useEffect(() => {
    const token = localStorage.getItem('ame_token');

    fetch(`${API_URL}/institution/users`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setUsers(Array.isArray(data) ? data : []))
      .catch(() => setUsers([]));
  }, []);

  const handleSelectUser = (userId: string) => {
    setSelectedUserId(userId);
    const user = users.find((u) => u.id === userId);

    if (user) {
      setForm({
        name: user.fullName || '',
        dni: '',
        cmp: user.cmp || '',
        rne: user.rne || '',
        role: user.role || '',
      });
    }
  };

  const validateProfessional = () => {
    if (!form.name.trim()) return alert('Ingrese el nombre del profesional.');
    if (!form.dni.trim()) return alert('Ingrese el DNI del profesional.');
    if (!form.cmp.trim()) return alert('Ingrese el CMP del profesional.');

    localStorage.setItem('hcelm_professional_verified', 'true');
    localStorage.setItem('hcelm_professional_name', form.name);
    localStorage.setItem('hcelm_professional_dni', form.dni);
    localStorage.setItem('hcelm_professional_cmp', form.cmp);
    localStorage.setItem('hcelm_professional_rne', form.rne || '');
    localStorage.setItem('hcelm_professional_role', form.role || '');

    navigate('/');
  };

  const simulateDniReader = () => {
    alert('Lector DNIe pendiente de integración. Próxima fase: servicio local HCELM DNI Reader.');
  };

  const clearProfessional = () => {
    localStorage.removeItem('hcelm_professional_verified');
    localStorage.removeItem('hcelm_professional_name');
    localStorage.removeItem('hcelm_professional_dni');
    localStorage.removeItem('hcelm_professional_cmp');
    localStorage.removeItem('hcelm_professional_rne');
    localStorage.removeItem('hcelm_professional_role');

    setSelectedUserId('');
    setForm({
      name: '',
      dni: '',
      cmp: '',
      rne: '',
      role: '',
    });
  };

  const goBack = () => {
    if (professionalVerified) {
      navigate('/');
    } else {
      navigate('/login');
    }
  };

  const logout = () => {
    localStorage.removeItem('ame_token');
    clearProfessional();
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-3xl p-8">
        <div className="flex justify-between items-start gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-emerald-700">
              Validación profesional
            </h1>
            <p className="text-slate-600 mt-1">
              Identifique al profesional responsable antes de ingresar al sistema clínico.
            </p>
          </div>

          <button
            type="button"
            onClick={goBack}
            className="bg-gray-100 text-slate-700 px-4 py-2 rounded hover:bg-gray-200"
          >
            ← Volver
          </button>
        </div>

        {professionalVerified && (
          <div className="mb-6 border rounded-lg p-4 bg-emerald-50">
            <p className="font-semibold text-emerald-800">Profesional activo</p>
            <p className="text-slate-700">
              {currentProfessionalName || 'Profesional validado'}
              {currentProfessionalCmp ? ` | ${currentProfessionalCmp}` : ''}
            </p>

            <button
              type="button"
              onClick={clearProfessional}
              className="mt-3 text-blue-600 hover:underline"
            >
              Cambiar profesional
            </button>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block font-medium text-slate-700 mb-1">
              Seleccionar profesional
            </label>
            <select
              value={selectedUserId}
              onChange={(e) => handleSelectUser(e.target.value)}
              className="w-full border p-2 rounded"
            >
              <option value="">-- Seleccione profesional --</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.fullName || u.email} - {u.role}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Nombre del profesional"
              value={form.name}
              onChange={(value) => setForm({ ...form, name: value })}
            />

            <Input
              label="DNI"
              value={form.dni}
              onChange={(value) => setForm({ ...form, dni: value })}
            />

            <Input
              label="CMP"
              value={form.cmp}
              onChange={(value) => setForm({ ...form, cmp: value })}
            />

            <Input
              label="RNE"
              value={form.rne}
              onChange={(value) => setForm({ ...form, rne: value })}
            />
          </div>

          <div className="border rounded-lg p-4 bg-blue-50">
            <p className="font-medium text-slate-700 mb-2">Lector DNI electrónico</p>

            <button
              type="button"
              onClick={simulateDniReader}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Leer DNI electrónico
            </button>

            <p className="text-sm text-slate-500 mt-2">
              Esta opción quedará conectada luego al lector físico mediante un servicio local.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 pt-4">
            <button
              type="button"
              onClick={validateProfessional}
              className="flex-1 min-w-[220px] bg-emerald-600 text-white py-3 rounded-lg hover:bg-emerald-700 font-medium"
            >
              Validar e ingresar
            </button>

            <button
              type="button"
              onClick={clearProfessional}
              className="px-6 bg-blue-100 text-blue-700 py-3 rounded-lg hover:bg-blue-200"
            >
              Cambiar profesional
            </button>

            <button
              type="button"
              onClick={logout}
              className="px-6 bg-red-100 text-red-700 py-3 rounded-lg hover:bg-red-200"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="block font-medium text-slate-700 mb-1">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border p-2 rounded"
      />
    </div>
  );
}