// Archivo: InstitutionSettings.tsx
// Ruta: apps/web/src/pages/InstitutionSettings.tsx
// Funcion: Configuracion institucional, modulos, clinica, usuarios, marca e HCE.
import { useEffect, useState } from 'react';

const API_URL = 'http://localhost:3000/api';

type TabType =
  | 'general'
  | 'modules'
  | 'clinical'
  | 'professionals'
  | 'branding'
  | 'hce';

type SystemModule = {
  key: 'CLINICAL' | 'PHARMACY' | 'DRUGSTORE' | 'BILLING' | 'MANAGEMENT';
  name: string;
  description: string;
  enabled: boolean;
};

const DEFAULT_SYSTEM_MODULES: SystemModule[] = [
  {
    key: 'CLINICAL',
    name: 'Consultorio medico',
    description: 'Pacientes, atenciones, HCE, recetas y documentos clinicos.',
    enabled: true,
  },
  {
    key: 'PHARMACY',
    name: 'Farmacia',
    description: 'Dispensacion, lotes, existencias y venta minorista.',
    enabled: false,
  },
  {
    key: 'DRUGSTORE',
    name: 'Drogueria',
    description: 'Almacenes, distribucion y venta mayorista.',
    enabled: false,
  },
  {
    key: 'BILLING',
    name: 'Caja y facturacion',
    description: 'Cobros, pagos, boletas, facturas y cierres de caja.',
    enabled: false,
  },
  {
    key: 'MANAGEMENT',
    name: 'Gerencia',
    description: 'Indicadores consolidados, valorizacion y reportes gerenciales.',
    enabled: false,
  },
];

function getSuggestedSpo2Range(altitudeMeters: number) {
  if (altitudeMeters < 1500) return { min: 95, max: 100 };
  if (altitudeMeters <= 2500) return { min: 92, max: 95 };
  if (altitudeMeters <= 3500) return { min: 87, max: 92 };
  if (altitudeMeters < 5500) return { min: 75, max: 87 };
  return { min: 50, max: 74 };
}

export default function InstitutionSettings() {
  const [activeTab, setActiveTab] = useState<TabType>('general');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [institution, setInstitution] = useState({
    name: '',
    legalName: '',
    ruc: '',
    address: '',
    phone: '',
    email: '',
    city: 'Arequipa',
    country: 'Perú',

    logoUrl: '',
    signatureUrl: '',
    sealUrl: '',

    logoWidth: 70,
    logoHeight: 70,
    signatureWidth: 180,
    signatureHeight: 70,
    sealWidth: 120,
    sealHeight: 70,

    primaryColor: '#0f766e',
    secondaryColor: '#14b8a6',

    directorName: '',
    directorCmp: '',
    directorRne: '',

    timezone: 'America/Lima',
    language: 'es',

    altitudeMeters: 0,
    spo2AltitudeAdjustmentEnabled: false,
    spo2ReferenceProfile: 'ADULT_ACCLIMATIZED',
    spo2ExpectedMin: 95,
    spo2ExpectedMax: 100,
  });

  const [users, setUsers] = useState<any[]>([]);
  const [showUserForm, setShowUserForm] = useState(false);

  const [newUser, setNewUser] = useState({
    email: '',
    fullName: '',
    role: 'medico',
    cmp: '',
    rne: '',
    password: 'AME2026',
    active: true,
  });

  const [hceConfig, setHceConfig] = useState({
    requireCie10: true,
    allowMultipleDiagnoses: true,
    defaultRestDays: 1,
    requireVitalSigns: true,
    autoSaveDrafts: true,
    signatureRequired: true,
    customFields: [] as any[],
  });

  const [systemModules, setSystemModules] = useState<SystemModule[]>(
    DEFAULT_SYSTEM_MODULES,
  );

  const getAuthHeaders = () => {
    const token = localStorage.getItem('ame_token');

    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
  };

  const loadData = async () => {
    setLoading(true);

    try {
      const [instRes, usersRes, hceRes, modulesRes] = await Promise.all([
        fetch(`${API_URL}/institution`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/institution/users`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/institution/hce-config`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/institution/system-modules`, {
          headers: getAuthHeaders(),
        }),
      ]);

      if (instRes.ok) {
        const inst = await instRes.json();

        setInstitution((prev) => ({
          ...prev,
          ...inst,
          logoWidth: Number(inst.logoWidth || 70),
          logoHeight: Number(inst.logoHeight || 70),
          signatureWidth: Number(inst.signatureWidth || 180),
          signatureHeight: Number(inst.signatureHeight || 70),
          sealWidth: Number(inst.sealWidth || 120),
          sealHeight: Number(inst.sealHeight || 70),
          altitudeMeters: Number(inst.altitudeMeters || 0),
          spo2AltitudeAdjustmentEnabled:
            inst.spo2AltitudeAdjustmentEnabled === true,
          spo2ExpectedMin: Number(inst.spo2ExpectedMin ?? 95),
          spo2ExpectedMax: Number(inst.spo2ExpectedMax ?? 100),
        }));
      }

      if (usersRes.ok) {
        const data = await usersRes.json();
        setUsers(Array.isArray(data) ? data : []);
      }

      if (hceRes.ok) {
        const config = await hceRes.json();
        setHceConfig((prev) => ({ ...prev, ...config }));
      }

      if (modulesRes.ok) {
        const modules = await modulesRes.json();

        if (Array.isArray(modules)) {
          setSystemModules(modules);
        }
      }
    } catch {
      alert('No se pudo cargar la configuración institucional.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleInstitutionChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value, type } = e.target;

    const numericFields = [
      'logoWidth',
      'logoHeight',
      'signatureWidth',
      'signatureHeight',
      'sealWidth',
      'sealHeight',
      'altitudeMeters',
      'spo2ExpectedMin',
      'spo2ExpectedMax',
    ];

    setInstitution((prev) => ({
      ...prev,
      [name]: numericFields.includes(name) || type === 'number' ? Number(value) : value,
    }));
  };

  const handleAltitudeAdjustmentChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setInstitution((prev) => ({
      ...prev,
      spo2AltitudeAdjustmentEnabled: e.target.checked,
    }));
  };

  const applySuggestedSpo2Range = () => {
    const range = getSuggestedSpo2Range(Number(institution.altitudeMeters));

    setInstitution((prev) => ({
      ...prev,
      spo2ExpectedMin: range.min,
      spo2ExpectedMax: range.max,
    }));
  };

  const handleHceChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;

    setHceConfig((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const imageToBase64 = (file: File, field: 'logoUrl' | 'signatureUrl' | 'sealUrl') => {
    const reader = new FileReader();

    reader.onload = () => {
      setInstitution((prev) => ({
        ...prev,
        [field]: String(reader.result || ''),
      }));
    };

    reader.onerror = () => {
      alert('No se pudo leer la imagen seleccionada.');
    };

    reader.readAsDataURL(file);
  };

  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: 'logoUrl' | 'signatureUrl' | 'sealUrl',
  ) => {
    const file = e.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Seleccione un archivo de imagen válido.');
      return;
    }

    const maxSizeMb = 2;
    const maxSizeBytes = maxSizeMb * 1024 * 1024;

    if (file.size > maxSizeBytes) {
      alert(`La imagen no debe superar ${maxSizeMb} MB.`);
      return;
    }

    imageToBase64(file, field);
  };

  const clearImage = (field: 'logoUrl' | 'signatureUrl' | 'sealUrl') => {
    setInstitution((prev) => ({ ...prev, [field]: '' }));
  };

  const saveInstitution = async () => {
    setSaving(true);

    try {
      const res = await fetch(`${API_URL}/institution`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          ...institution,
          logoWidth: Number(institution.logoWidth || 70),
          logoHeight: Number(institution.logoHeight || 70),
          signatureWidth: Number(institution.signatureWidth || 180),
          signatureHeight: Number(institution.signatureHeight || 70),
          sealWidth: Number(institution.sealWidth || 120),
          sealHeight: Number(institution.sealHeight || 70),
          altitudeMeters: Number(institution.altitudeMeters || 0),
          spo2ExpectedMin: Number(institution.spo2ExpectedMin),
          spo2ExpectedMax: Number(institution.spo2ExpectedMax),
        }),
      });

      if (!res.ok) {
        alert('No se pudo guardar la configuración institucional.');
        return;
      }

      alert('Configuración institucional guardada correctamente.');
      await loadData();
    } catch {
      alert('Error de conexión al guardar configuración institucional.');
    } finally {
      setSaving(false);
    }
  };

  const saveHceConfig = async () => {
    setSaving(true);

    try {
      const res = await fetch(`${API_URL}/institution/hce-config`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          ...hceConfig,
          defaultRestDays: Number(hceConfig.defaultRestDays),
        }),
      });

      if (!res.ok) {
        alert('No se pudo guardar la configuración HCE.');
        return;
      }

      alert('Configuración HCE guardada correctamente.');
      await loadData();
    } catch {
      alert('Error de conexión al guardar configuración HCE.');
    } finally {
      setSaving(false);
    }
  };

  const toggleSystemModule = (key: SystemModule['key']) => {
    setSystemModules((current) =>
      current.map((module) =>
        module.key === key ? { ...module, enabled: !module.enabled } : module,
      ),
    );
  };

  const saveSystemModules = async () => {
    const hasOperationalModule = systemModules.some(
      (module) =>
        ['CLINICAL', 'PHARMACY', 'DRUGSTORE'].includes(module.key) &&
        module.enabled,
    );

    if (!hasOperationalModule) {
      alert(
        'Debe permanecer activo al menos Consultorio medico, Farmacia o Drogueria.',
      );
      return;
    }

    setSaving(true);

    try {
      const res = await fetch(`${API_URL}/institution/system-modules`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          modules: systemModules.map(({ key, enabled }) => ({ key, enabled })),
        }),
      });

      const result = await res.json().catch(() => null);

      if (!res.ok) {
        alert(result?.message || 'No se pudo guardar la configuracion de modulos.');
        return;
      }

      if (Array.isArray(result?.modules)) {
        setSystemModules(result.modules);
      }

      alert('Modulos del sistema guardados correctamente.');
    } catch {
      alert('Error de conexion al guardar los modulos del sistema.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newUser.email.trim()) return alert('Ingrese correo electrónico.');
    if (!newUser.fullName.trim()) return alert('Ingrese nombre completo.');

    setSaving(true);

    try {
      const res = await fetch(`${API_URL}/institution/users`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(newUser),
      });

      if (!res.ok) {
        alert('No se pudo crear el profesional.');
        return;
      }

      alert('Profesional creado correctamente.');

      setNewUser({
        email: '',
        fullName: '',
        role: 'medico',
        cmp: '',
        rne: '',
        password: 'AME2026',
        active: true,
      });

      setShowUserForm(false);
      await loadData();
    } catch {
      alert('Error de conexión al crear profesional.');
    } finally {
      setSaving(false);
    }
  };

  const toggleUser = async (userId: string, active: boolean) => {
    setSaving(true);

    try {
      const res = await fetch(`${API_URL}/institution/users/${userId}/toggle`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ active }),
      });

      if (!res.ok) {
        alert('No se pudo actualizar el usuario.');
        return;
      }

      await loadData();
    } catch {
      alert('Error de conexión al actualizar usuario.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-slate-600">Cargando configuración institucional...</p>
      </div>
    );
  }

  const tabs: { id: TabType; label: string }[] = [
    { id: 'general', label: 'General' },
    { id: 'modules', label: 'Modulos' },
    { id: 'clinical', label: 'Contexto clinico' },
    { id: 'professionals', label: 'Profesionales' },
    { id: 'branding', label: 'Branding' },
    { id: 'hce', label: 'HCE' },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto bg-gray-50 min-h-screen">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Configuración institucional</h1>
        <p className="text-sm text-slate-500 mt-1">
          Estos datos se usarán en recetas, certificados, órdenes, reportes e informes.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 border-b mb-6">
        {tabs.map((tab) => (
          <button
            type="button"
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 font-medium border-b-2 transition ${
              activeTab === tab.id
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
            <div className="bg-white rounded-lg shadow p-6">
        {activeTab === 'general' && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-slate-700">Datos generales</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Nombre comercial" name="name" value={institution.name} onChange={handleInstitutionChange} />
              <Input label="Razón social" name="legalName" value={institution.legalName} onChange={handleInstitutionChange} />
              <Input label="RUC" name="ruc" value={institution.ruc} onChange={handleInstitutionChange} />
              <Input label="Teléfono" name="phone" value={institution.phone} onChange={handleInstitutionChange} />
              <Input label="Correo" name="email" value={institution.email} onChange={handleInstitutionChange} />
              <Input label="Ciudad" name="city" value={institution.city} onChange={handleInstitutionChange} />
              <Input label="País" name="country" value={institution.country} onChange={handleInstitutionChange} />

              <div className="md:col-span-2">
                <Input label="Dirección" name="address" value={institution.address} onChange={handleInstitutionChange} />
              </div>
            </div>

            <div className="border-t pt-6">
              <h3 className="font-bold text-slate-700 mb-4">Director médico</h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input label="Nombre" name="directorName" value={institution.directorName} onChange={handleInstitutionChange} />
                <Input label="CMP" name="directorCmp" value={institution.directorCmp} onChange={handleInstitutionChange} />
                <Input label="RNE" name="directorRne" value={institution.directorRne} onChange={handleInstitutionChange} />
              </div>
            </div>

            <SaveButton saving={saving} onClick={saveInstitution} label="Guardar datos generales" />
          </div>
        )}

        {activeTab === 'modules' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-700">
                Modulos habilitados
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Active solamente las unidades que utiliza esta institucion. Los
                datos compartidos conservaran el aislamiento por institucion.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {systemModules.map((module) => (
                <label
                  key={module.key}
                  className={`flex cursor-pointer items-start justify-between gap-4 rounded border p-4 ${
                    module.enabled
                      ? 'border-emerald-400 bg-emerald-50'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <div>
                    <p className="font-semibold text-slate-800">{module.name}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {module.description}
                    </p>
                    <p
                      className={`mt-2 text-xs font-semibold ${
                        module.enabled ? 'text-emerald-700' : 'text-slate-500'
                      }`}
                    >
                      {module.enabled ? 'ACTIVO' : 'INACTIVO'}
                    </p>
                  </div>

                  <input
                    type="checkbox"
                    checked={module.enabled}
                    onChange={() => toggleSystemModule(module.key)}
                    className="mt-1 h-5 w-5"
                  />
                </label>
              ))}
            </div>

            <div className="rounded border border-blue-200 bg-blue-50 p-4 text-sm text-slate-700">
              <p className="font-semibold">Reglas de funcionamiento</p>
              <p className="mt-1">
                Debe permanecer activo al menos Consultorio medico, Farmacia o
                Drogueria. Caja y Gerencia consumiran informacion de los modulos
                operativos habilitados.
              </p>
            </div>

            <SaveButton
              saving={saving}
              onClick={saveSystemModules}
              label="Guardar modulos"
            />
          </div>
        )}

        {activeTab === 'professionals' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-700">Profesionales y usuarios</h2>
                <p className="text-sm text-slate-500">
                  Administre médicos, enfermería, recepción y administradores.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowUserForm(!showUserForm)}
                className="bg-emerald-600 text-white px-4 py-2 rounded hover:bg-emerald-700"
              >
                {showUserForm ? 'Cancelar' : '+ Agregar profesional'}
              </button>
            </div>

            {showUserForm && (
              <form onSubmit={handleAddUser} className="border rounded-lg p-4 bg-gray-50 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input label="Correo" name="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} />
                  <Input label="Nombre completo" name="fullName" value={newUser.fullName} onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })} />
                  <Input label="Contraseña temporal" name="password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} />
                  <Input label="CMP" name="cmp" value={newUser.cmp} onChange={(e) => setNewUser({ ...newUser, cmp: e.target.value })} />
                  <Input label="RNE" name="rne" value={newUser.rne} onChange={(e) => setNewUser({ ...newUser, rne: e.target.value })} />

                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Rol</label>
                    <select
                      value={newUser.role}
                      onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                      className="w-full border p-2 rounded"
                    >
                      <option value="admin">Administrador</option>
                      <option value="medico">Médico</option>
                      <option value="enfermeria">Enfermería</option>
                      <option value="recepcion">Recepción</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="bg-emerald-600 text-white px-4 py-2 rounded hover:bg-emerald-700"
                >
                  {saving ? 'Guardando...' : 'Guardar profesional'}
                </button>
              </form>
            )}

            <div className="border rounded overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-100 text-slate-700">
                  <tr>
                    <th className="px-4 py-3 text-left">Nombre</th>
                    <th className="px-4 py-3 text-left">Correo</th>
                    <th className="px-4 py-3 text-left">Rol</th>
                    <th className="px-4 py-3 text-left">CMP</th>
                    <th className="px-4 py-3 text-left">RNE</th>
                    <th className="px-4 py-3 text-left">Estado</th>
                    <th className="px-4 py-3 text-left">Acción</th>
                  </tr>
                </thead>

                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-t">
                      <td className="px-4 py-3">{user.fullName || '-'}</td>
                      <td className="px-4 py-3">{user.email}</td>
                      <td className="px-4 py-3">{user.role}</td>
                      <td className="px-4 py-3">{user.cmp || '-'}</td>
                      <td className="px-4 py-3">{user.rne || '-'}</td>
                      <td className="px-4 py-3">
                        <span className={user.active ? 'text-emerald-700 font-medium' : 'text-red-600 font-medium'}>
                          {user.active ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => toggleUser(user.id, !user.active)}
                          className="text-blue-600 hover:underline"
                        >
                          {user.active ? 'Desactivar' : 'Activar'}
                        </button>
                      </td>
                    </tr>
                  ))}

                  {users.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-6 text-center text-slate-500">
                        No hay usuarios registrados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'clinical' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-700">
                Altitud y referencia de oxigenacion
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                El rango es contextual para adultos sanos aclimatados. No sustituye
                la evaluacion clinica, los sintomas, el soporte de oxigeno ni la FiO2.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1 block font-medium text-slate-700">
                  Altitud del establecimiento (msnm)
                </label>
                <input
                  type="number"
                  name="altitudeMeters"
                  min={0}
                  max={8849}
                  value={institution.altitudeMeters}
                  onChange={handleInstitutionChange}
                  className="w-full rounded border p-2"
                />
              </div>

              <div>
                <label className="mb-1 block font-medium text-slate-700">
                  SpO2 esperada minima (%)
                </label>
                <input
                  type="number"
                  name="spo2ExpectedMin"
                  min={50}
                  max={100}
                  value={institution.spo2ExpectedMin}
                  onChange={handleInstitutionChange}
                  className="w-full rounded border p-2"
                />
              </div>

              <div>
                <label className="mb-1 block font-medium text-slate-700">
                  SpO2 esperada maxima (%)
                </label>
                <input
                  type="number"
                  name="spo2ExpectedMax"
                  min={50}
                  max={100}
                  value={institution.spo2ExpectedMax}
                  onChange={handleInstitutionChange}
                  className="w-full rounded border p-2"
                />
              </div>
            </div>

            <label className="flex items-center gap-3 rounded border bg-gray-50 p-3">
              <input
                type="checkbox"
                checked={institution.spo2AltitudeAdjustmentEnabled}
                onChange={handleAltitudeAdjustmentChange}
              />
              <span className="text-slate-700">
                Usar este rango como contexto en las alertas de SpO2
              </span>
            </label>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={applySuggestedSpo2Range}
                className="rounded bg-slate-700 px-4 py-2 text-white hover:bg-slate-800"
              >
                Calcular rango orientativo por altitud
              </button>
              <span className="text-sm text-slate-600">
                Perfil: adulto sano aclimatado, en reposo y sin oxigeno suplementario.
              </span>
            </div>

            <div className="rounded border border-blue-200 bg-blue-50 p-4 text-sm text-slate-700">
              <p className="font-bold">Base bibliografica registrada</p>
              <p className="mt-1">
                Luks AM, Hackett PH. Medical Conditions and High-Altitude Travel.
                N Engl J Med. 2022;386:364-373. DOI: 10.1056/NEJMra2104829.
              </p>
              <p className="mt-1">
                CDC Yellow Book 2026: rango esperado de SpO2 por altitud despues de
                1-2 dias de aclimatizacion.
              </p>
              <p className="mt-1">
                Institut national de sante publique du Quebec. Altitude, tabla 1:
                Saturation selon l'altitude. Actualizacion 2025.
              </p>
              <p className="mt-2 text-xs text-slate-500">
                El calculo por bandas es orientativo. En pediatria, neonatologia,
                embarazo, enfermedad cardiopulmonar o llegada reciente se requieren
                referencias especificas.
              </p>
            </div>

            <SaveButton
              saving={saving}
              onClick={saveInstitution}
              label="Guardar contexto clinico"
            />
          </div>
        )}

        {activeTab === 'branding' && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-slate-700">Marca, logo, firma y sello</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ImageUploader
                label="Logotipo institucional"
                value={institution.logoUrl}
                onUpload={(e) => handleImageUpload(e, 'logoUrl')}
                onClear={() => clearImage('logoUrl')}
                width={institution.logoWidth}
                height={institution.logoHeight}
                widthName="logoWidth"
                heightName="logoHeight"
                onSizeChange={handleInstitutionChange}
              />

              <ImageUploader
                label="Firma escaneada"
                value={institution.signatureUrl}
                onUpload={(e) => handleImageUpload(e, 'signatureUrl')}
                onClear={() => clearImage('signatureUrl')}
                width={institution.signatureWidth}
                height={institution.signatureHeight}
                widthName="signatureWidth"
                heightName="signatureHeight"
                onSizeChange={handleInstitutionChange}
              />

              <ImageUploader
                label="Sello escaneado"
                value={institution.sealUrl}
                onUpload={(e) => handleImageUpload(e, 'sealUrl')}
                onClear={() => clearImage('sealUrl')}
                width={institution.sealWidth}
                height={institution.sealHeight}
                widthName="sealWidth"
                heightName="sealHeight"
                onSizeChange={handleInstitutionChange}
              />

              <div className="grid grid-cols-1 gap-4 border rounded-lg p-4 bg-gray-50">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Color primario</label>
                  <input
                    type="color"
                    name="primaryColor"
                    value={institution.primaryColor || '#0f766e'}
                    onChange={handleInstitutionChange}
                    className="w-full h-11 border rounded"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Color secundario</label>
                  <input
                    type="color"
                    name="secondaryColor"
                    value={institution.secondaryColor || '#14b8a6'}
                    onChange={handleInstitutionChange}
                    className="w-full h-11 border rounded"
                  />
                </div>
              </div>
            </div>

            <div className="border rounded-lg p-4 bg-gray-50">
              <p className="font-medium text-slate-700 mb-2">Vista previa institucional</p>

              <div
                className="rounded p-4 text-white"
                style={{ background: institution.primaryColor || '#0f766e' }}
              >
                <div className="flex items-center gap-4">
                  {institution.logoUrl ? (
                    <img
                      src={institution.logoUrl}
                      alt="Logo"
                      style={{
                        width: `${institution.logoWidth}px`,
                        height: `${institution.logoHeight}px`,
                        objectFit: 'contain',
                      }}
                      className="bg-white rounded p-1"
                    />
                  ) : (
                    <div className="h-16 w-16 bg-white/20 rounded flex items-center justify-center">
                      Logo
                    </div>
                  )}

                  <div>
                    <h3 className="font-bold text-lg">{institution.name || 'Nombre comercial'}</h3>
                    <p>{institution.legalName || 'Razón social'}</p>
                    <p>RUC: {institution.ruc || '-'}</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 bg-white border rounded p-4">
                <p className="text-sm font-medium text-slate-700 mb-3">Vista previa de firma y sello</p>

                <div className="flex flex-wrap gap-6 items-end">
                  <div className="text-center">
                    {institution.signatureUrl ? (
                      <img
                        src={institution.signatureUrl}
                        alt="Firma"
                        style={{
                          width: `${institution.signatureWidth}px`,
                          height: `${institution.signatureHeight}px`,
                          objectFit: 'contain',
                        }}
                        className="border rounded bg-white p-1"
                      />
                    ) : (
                      <div className="h-20 w-48 border rounded flex items-center justify-center text-slate-400">
                        Firma
                      </div>
                    )}
                    <p className="text-xs text-slate-500 mt-1">Firma escaneada</p>
                  </div>

                  <div className="text-center">
                    {institution.sealUrl ? (
                      <img
                        src={institution.sealUrl}
                        alt="Sello"
                        style={{
                          width: `${institution.sealWidth}px`,
                          height: `${institution.sealHeight}px`,
                          objectFit: 'contain',
                        }}
                        className="border rounded bg-white p-1"
                      />
                    ) : (
                      <div className="h-20 w-48 border rounded flex items-center justify-center text-slate-400">
                        Sello
                      </div>
                    )}
                    <p className="text-xs text-slate-500 mt-1">Sello escaneado</p>
                  </div>
                </div>
              </div>
            </div>

            <SaveButton saving={saving} onClick={saveInstitution} label="Guardar branding" />
          </div>
        )}

        {activeTab === 'hce' && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-slate-700">Configuración de historia clínica</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CheckBox label="Requerir CIE-10" name="requireCie10" checked={hceConfig.requireCie10} onChange={handleHceChange} />
              <CheckBox label="Permitir múltiples diagnósticos" name="allowMultipleDiagnoses" checked={hceConfig.allowMultipleDiagnoses} onChange={handleHceChange} />
              <CheckBox label="Requerir signos vitales" name="requireVitalSigns" checked={hceConfig.requireVitalSigns} onChange={handleHceChange} />
              <CheckBox label="Autoguardar borradores" name="autoSaveDrafts" checked={hceConfig.autoSaveDrafts} onChange={handleHceChange} />
              <CheckBox label="Requerir firma en documentos" name="signatureRequired" checked={hceConfig.signatureRequired} onChange={handleHceChange} />

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Días de descanso por defecto
                </label>
                <input
                  type="number"
                  name="defaultRestDays"
                  min={0}
                  max={30}
                  value={hceConfig.defaultRestDays}
                  onChange={handleHceChange}
                  className="w-full border p-2 rounded"
                />
              </div>
            </div>

            <SaveButton saving={saving} onClick={saveHceConfig} label="Guardar configuración HCE" />
          </div>
        )}
      </div>
    </div>
  );
}

function Input({
  label,
  name,
  value,
  onChange,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div>
      <label className="block font-medium text-slate-700 mb-1">{label}</label>
      <input
        name={name}
        value={value || ''}
        onChange={onChange}
        className="w-full border p-2 rounded"
      />
    </div>
  );
}

function ImageUploader({
  label,
  value,
  onUpload,
  onClear,
  width,
  height,
  widthName,
  heightName,
  onSizeChange,
}: {
  label: string;
  value: string;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
  width: number;
  height: number;
  widthName: string;
  heightName: string;
  onSizeChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="border rounded-lg p-4 bg-gray-50">
      <label className="block font-medium text-slate-700 mb-2">{label}</label>

      <div className="mb-3">
        {value ? (
          <img
            src={value}
            alt={label}
            style={{
              width: `${width}px`,
              height: `${height}px`,
              objectFit: 'contain',
            }}
            className="border rounded bg-white p-1"
          />
        ) : (
          <div
            style={{ width: `${width}px`, height: `${height}px` }}
            className="border rounded bg-white flex items-center justify-center text-slate-400"
          >
            Sin imagen
          </div>
        )}
      </div>

      <input
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp"
        onChange={onUpload}
        className="w-full border p-2 rounded bg-white text-sm"
      />

      <div className="grid grid-cols-2 gap-3 mt-3">
        <div>
          <label className="block text-xs text-slate-600 mb-1">Ancho px</label>
          <input
            type="number"
            min={20}
            max={500}
            name={widthName}
            value={width}
            onChange={onSizeChange}
            className="w-full border p-2 rounded"
          />
        </div>

        <div>
          <label className="block text-xs text-slate-600 mb-1">Alto px</label>
          <input
            type="number"
            min={20}
            max={500}
            name={heightName}
            value={height}
            onChange={onSizeChange}
            className="w-full border p-2 rounded"
          />
        </div>
      </div>

      {value && (
        <button
          type="button"
          onClick={onClear}
          className="mt-2 text-red-600 hover:underline text-sm"
        >
          Quitar imagen
        </button>
      )}

      <p className="text-xs text-slate-500 mt-2">
        Formatos aceptados: PNG, JPG, WEBP. Máximo sugerido: 2 MB.
      </p>
    </div>
  );
}

function CheckBox({
  label,
  name,
  checked,
  onChange,
}: {
  label: string;
  name: string;
  checked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <label className="flex items-center gap-3 border rounded p-3 bg-gray-50">
      <input type="checkbox" name={name} checked={checked} onChange={onChange} />
      <span className="text-slate-700">{label}</span>
    </label>
  );
}

function SaveButton({
  saving,
  onClick,
  label,
}: {
  saving: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <div className="pt-4 border-t flex justify-end">
      <button
        type="button"
        disabled={saving}
        onClick={onClick}
        className="bg-emerald-600 text-white px-6 py-3 rounded-lg hover:bg-emerald-700 font-medium"
      >
        {saving ? 'Guardando...' : label}
      </button>
    </div>
  );
}
