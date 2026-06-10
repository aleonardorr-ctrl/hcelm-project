import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API_URL = 'http://localhost:3000/api';

const PROFESSIONAL_TYPES = [
  'Médico',
  'Enfermería',
  'Técnico de enfermería',
  'Psicólogo',
  'Químico farmacéutico',
  'Administrador',
  'Caja',
  'Almacén',
  'Gerencia',
  'Otro',
];

export default function ProfessionalVerification() {
  const navigate = useNavigate();

  const [users, setUsers] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');

  const [form, setForm] = useState({
    name: '',
    dni: '',
    professionalType: '',
    cmp: '',
    rne: '',
    professionalLicense: '',
    role: '',
  });

  const professionalVerified = localStorage.getItem('hcelm_professional_verified') === 'true';
  const currentProfessionalName = localStorage.getItem('hcelm_professional_name');
  const currentProfessionalType = localStorage.getItem('hcelm_professional_type');
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

  const inferProfessionalType = (role: string) => {
    const normalized = (role || '').toLowerCase();

    if (normalized.includes('medico') || normalized.includes('médico')) return 'Médico';
    if (normalized.includes('enfer')) return 'Enfermería';
    if (normalized.includes('farmacia')) return 'Químico farmacéutico';
    if (normalized.includes('caja')) return 'Caja';
    if (normalized.includes('almacen') || normalized.includes('almacén')) return 'Almacén';
    if (normalized.includes('admin')) return 'Administrador';
    if (normalized.includes('gerencia')) return 'Gerencia';

    return '';
  };

  const handleSelectUser = (userId: string) => {
    setSelectedUserId(userId);
    const user = users.find((u) => u.id === userId);

    if (user) {
      const inferredType = inferProfessionalType(user.role || '');

      setForm({
        name: user.fullName || '',
        dni: '',
        professionalType: inferredType,
        cmp: user.cmp || '',
        rne: user.rne || '',
        professionalLicense: '',
        role: user.role || '',
      });
    }
  };

  const requiresCmp = form.professionalType === 'Médico';
  const showsProfessionalLicense = [
    'Enfermería',
    'Psicólogo',
    'Químico farmacéutico',
    'Otro',
  ].includes(form.professionalType);

  const getLicenseLabel = () => {
    if (form.professionalType === 'Enfermería') return 'Colegiatura de enfermería';
    if (form.professionalType === 'Psicólogo') return 'Colegiatura profesional';
    if (form.professionalType === 'Químico farmacéutico') return 'CQFP / Colegiatura Q.F.';
    return 'Registro / colegiatura profesional';
  };

  const validateProfessional = () => {
    if (!form.name.trim()) return alert('Ingrese el nombre del profesional.');
    if (!form.professionalType.trim()) return alert('Seleccione el tipo de profesional.');
    if (!form.dni.trim()) return alert('Ingrese el DNI del profesional.');

    if (requiresCmp && !form.cmp.trim()) {
      return alert('Para médico se requiere CMP.');
    }

    localStorage.setItem('hcelm_professional_verified', 'true');
    localStorage.setItem('hcelm_professional_name', form.name);
    localStorage.setItem('hcelm_professional_dni', form.dni);
    localStorage.setItem('hcelm_professional_type', form.professionalType);
    localStorage.setItem('hcelm_professional_cmp', form.cmp || '');
    localStorage.setItem('hcelm_professional_rne', form.rne || '');
    localStorage.setItem('hcelm_professional_license', form.professionalLicense || '');
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
    localStorage.removeItem('hcelm_professional_type');
    localStorage.removeItem('hcelm_professional_cmp');
    localStorage.removeItem('hcelm_professional_rne');
    localStorage.removeItem('hcelm_professional_license');
    localStorage.removeItem('hcelm_professional_role');

    setSelectedUserId('');
    setForm({
      name: '',
      dni: '',
      professionalType: '',
      cmp: '',
      rne: '',
      professionalLicense: '',
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
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-emerald-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-4xl p-8">
        <div className="flex justify-between items-start gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-emerald-700">
              Validación profesional
            </h1>
            <p className="text-slate-600 mt-1">
              Identifique al responsable operativo o clínico antes de ingresar a HCELM.
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
              {currentProfessionalType ? ` | ${currentProfessionalType}` : ''}
              {currentProfessionalCmp ? ` | CMP ${currentProfessionalCmp}` : ''}
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

        <div className="space-y-5">
          <div>
            <label className="block font-medium text-slate-700 mb-1">
              Seleccionar usuario del sistema
            </label>
            <select
              value={selectedUserId}
              onChange={(e) => handleSelectUser(e.target.value)}
              className="w-full border p-2 rounded"
            >
              <option value="">-- Seleccione usuario --</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.fullName || u.email} - {u.role}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Nombre del responsable"
              value={form.name}
              onChange={(value) => setForm({ ...form, name: value })}
            />

            <Input
              label="DNI"
              value={form.dni}
              onChange={(value) => setForm({ ...form, dni: value })}
            />

            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Tipo de profesional / responsable
              </label>
              <select
                value={form.professionalType}
                onChange={(e) =>
                  setForm({
                    ...form,
                    professionalType: e.target.value,
                    cmp: e.target.value === 'Médico' ? form.cmp : '',
                    rne: e.target.value === 'Médico' ? form.rne : '',
                  })
                }
                className="w-full border p-2 rounded"
              >
                <option value="">-- Seleccione tipo --</option>
                {PROFESSIONAL_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="Rol en el sistema"
              value={form.role}
              onChange={(value) => setForm({ ...form, role: value })}
            />

            {form.professionalType === 'Médico' && (
              <>
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
              </>
            )}

            {showsProfessionalLicense && (
              <Input
                label={getLicenseLabel()}
                value={form.professionalLicense}
                onChange={(value) => setForm({ ...form, professionalLicense: value })}
              />
            )}
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