import { useEffect, useState } from 'react';

const API_URL = 'http://localhost:3000/api';

type TabType = 'general' | 'professionals' | 'branding' | 'hce';

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
    primaryColor: '#0f766e',
    secondaryColor: '#14b8a6',
    directorName: '',
    directorCmp: '',
    directorRne: '',
    timezone: 'America/Lima',
    language: 'es',
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
      const [instRes, usersRes, hceRes] = await Promise.all([
        fetch(`${API_URL}/institution`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/institution/users`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/institution/hce-config`, { headers: getAuthHeaders() }),
      ]);

      if (instRes.ok) {
        const inst = await instRes.json();
        setInstitution((prev) => ({ ...prev, ...inst }));
      }

      if (usersRes.ok) {
        const data = await usersRes.json();
        setUsers(Array.isArray(data) ? data : []);
      }

      if (hceRes.ok) {
        const config = await hceRes.json();
        setHceConfig((prev) => ({ ...prev, ...config }));
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
    const { name, value } = e.target;
    setInstitution((prev) => ({ ...prev, [name]: value }));
  };

  const handleHceChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;

    setHceConfig((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const saveInstitution = async () => {
    setSaving(true);

    try {
      const res = await fetch(`${API_URL}/institution`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(institution),
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

        {activeTab === 'branding' && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-slate-700">Marca y apariencia</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="URL del logotipo" name="logoUrl" value={institution.logoUrl} onChange={handleInstitutionChange} />
              
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

            <div className="border rounded-lg p-4 bg-gray-50">
              <p className="font-medium text-slate-700 mb-2">Vista previa del encabezado</p>

              <div
                className="rounded p-4 text-white"
                style={{ background: institution.primaryColor || '#0f766e' }}
              >
                <div className="flex items-center gap-4">
                  {institution.logoUrl ? (
                    <img
                      src={institution.logoUrl}
                      alt="Logo"
                      className="h-16 w-16 object-contain bg-white rounded p-1"
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
            </div>

            <SaveButton saving={saving} onClick={saveInstitution} label="Guardar branding" />
          </div>
        )}

        {activeTab === 'hce' && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-slate-700">Configuración de historia clínica</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CheckBox
                label="Requerir CIE-10"
                name="requireCie10"
                checked={hceConfig.requireCie10}
                onChange={handleHceChange}
              />

              <CheckBox
                label="Permitir múltiples diagnósticos"
                name="allowMultipleDiagnoses"
                checked={hceConfig.allowMultipleDiagnoses}
                onChange={handleHceChange}
              />

              <CheckBox
                label="Requerir signos vitales"
                name="requireVitalSigns"
                checked={hceConfig.requireVitalSigns}
                onChange={handleHceChange}
              />

              <CheckBox
                label="Autoguardar borradores"
                name="autoSaveDrafts"
                checked={hceConfig.autoSaveDrafts}
                onChange={handleHceChange}
              />

              <CheckBox
                label="Requerir firma en documentos"
                name="signatureRequired"
                checked={hceConfig.signatureRequired}
                onChange={handleHceChange}
              />

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