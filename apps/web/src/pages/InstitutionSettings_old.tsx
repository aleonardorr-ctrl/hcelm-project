import { useState, useEffect } from 'react';

export default function InstitutionSettings() {
  const [activeTab, setActiveTab] = useState<'general' | 'branding' | 'users' | 'hce'>('general');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Estado para datos institucionales
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
    language: 'es'
  });

  // Estado para usuarios/médicos
  const [users, setUsers] = useState<any[]>([]);
  const [newUser, setNewUser] = useState({ email: '', fullName: '', role: 'medico', cmp: '', active: true });
  const [showUserForm, setShowUserForm] = useState(false);

  // Estado para configuración HCE
  const [hceConfig, setHceConfig] = useState({
    requireCie10: true,
    allowMultipleDiagnoses: true,
    defaultRestDays: 1,
    requireVitalSigns: true,
    autoSaveDrafts: true,
    signatureRequired: true,
    customFields: [] as { label: string; type: 'text' | 'textarea' | 'select'; options?: string }[]
  });

  // Cargar datos al iniciar
  useEffect(() => {
    const token = localStorage.getItem('ame_token');
    Promise.all([
      fetch('http://localhost:3000/institution', { headers: { Authorization: `Bearer ${token}` } }),
      fetch('http://localhost:3000/institution/users', { headers: { Authorization: `Bearer ${token}` } }),
      fetch('http://localhost:3000/institution/hce-config', { headers: { Authorization: `Bearer ${token}` } })
    ])
    .then(async ([resInst, resUsers, resHce]) => {
      if (resInst.ok) setInstitution(await resInst.json());
      if (resUsers.ok) setUsers(await resUsers.json());
      if (resHce.ok) setHceConfig(await resHce.json());
      setLoading(false);
    })
    .catch(() => setLoading(false));
  }, []);

  const handleInstitutionChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setInstitution(prev => ({ ...prev, [name]: value }));
  };

  const handleHceChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setHceConfig(prev => ({ ...prev, [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value }));
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.email || !newUser.fullName) return alert('⚠️ Email y nombre son obligatorios');
    
    setSaving(true);
    try {
      const token = localStorage.getItem('ame_token');
      const res = await fetch('http://localhost:3000/institution/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(newUser)
      });
      if (res.ok) {
        const created = await res.json();
        setUsers([...users, created]);
        setNewUser({ email: '', fullName: '', role: 'medico', cmp: '', active: true });
        setShowUserForm(false);
        alert('✅ Médico agregado exitosamente');
      } else {
        alert('⚠️ No se pudo agregar el usuario');
      }
    } catch {
      alert('❌ Error de conexión');
    } finally {
      setSaving(false);
    }
  };

  const toggleUserActive = async (userId: string, current: boolean) => {
    const token = localStorage.getItem('ame_token');
    await fetch(`http://localhost:3000/institution/users/${userId}/toggle`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ active: !current })
    });
    setUsers(users.map(u => u.id === userId ? { ...u, active: !current } : u));
  };

  const saveAll = async () => {
    setSaving(true);
    const token = localStorage.getItem('ame_token');
    
    try {
      // Guardar datos institucionales
      await fetch('http://localhost:3000/institution', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(institution)
      });
      
      // Guardar configuración HCE
      await fetch('http://localhost:3000/institution/hce-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(hceConfig)
      });
      
      alert('✅ Configuración guardada exitosamente. Los cambios se aplicarán en toda la plataforma.');
    } catch {
      alert('❌ Error al guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6 text-center">Cargando configuración institucional...</div>;

  return (
    <div className="p-6 max-w-6xl mx-auto bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold mb-6 text-slate-800">⚙️ Configuración Institucional</h1>
      
      {/* Pestañas de navegación */}
      <div className="flex border-b mb-6">
        {[
          { id: 'general', label: '🏢 Datos Institucionales' },
          { id: 'branding', label: '🎨 Marca y Logo' },
          { id: 'users', label: '👥 Médicos y Permisos' },
          { id: 'hce', label: '📋 Configuración HCE' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 font-medium border-b-2 transition ${
              activeTab === tab.id 
                ? 'border-emerald-600 text-emerald-700' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Contenido de pestañas */}
      <div className="bg-white p-6 rounded-lg shadow">
        
        {/* 🏢 DATOS INSTITUCIONALES */}
        {activeTab === 'general' && (
          <div className="space-y-4">
            <h3 className="font-bold text-lg text-slate-700 mb-4">Información Legal y de Contacto</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Nombre Comercial *</label>
                <input name="name" value={institution.name} onChange={handleInstitutionChange} className="w-full border p-2 rounded" placeholder="Ej: AME HEALTH SAC" />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Nombre Legal</label>
                <input name="legalName" value={institution.legalName} onChange={handleInstitutionChange} className="w-full border p-2 rounded" />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">RUC</label>
                <input name="ruc" value={institution.ruc} onChange={handleInstitutionChange} className="w-full border p-2 rounded" placeholder="20611138777" />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Teléfono</label>
                <input name="phone" value={institution.phone} onChange={handleInstitutionChange} className="w-full border p-2 rounded" />
              </div>
              <div className="md:col-span-2">
                <label className="block font-medium text-slate-700 mb-1">Dirección *</label>
                <input name="address" value={institution.address} onChange={handleInstitutionChange} className="w-full border p-2 rounded" placeholder="Av. Principal 123, Arequipa" />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Ciudad</label>
                <input name="city" value={institution.city} onChange={handleInstitutionChange} className="w-full border p-2 rounded" />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">País</label>
                <input name="country" value={institution.country} onChange={handleInstitutionChange} className="w-full border p-2 rounded" />
              </div>
            </div>
          </div>
        )}

        {/* 🎨 MARCA Y LOGO */}
        {activeTab === 'branding' && (
          <div className="space-y-4">
            <h3 className="font-bold text-lg text-slate-700 mb-4">Personalización Visual</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-medium text-slate-700 mb-1">URL del Logo</label>
                <input name="logoUrl" value={institution.logoUrl} onChange={handleInstitutionChange} className="w-full border p-2 rounded" placeholder="https://... o data:image/png;base64,..." />
                {institution.logoUrl && <img src={institution.logoUrl} alt="Preview" className="mt-2 h-24 w-auto border rounded bg-gray-50" />}
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Color Primario</label>
                <input type="color" name="primaryColor" value={institution.primaryColor} onChange={handleInstitutionChange} className="w-full h-10 border rounded cursor-pointer" />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Color Secundario</label>
                <input type="color" name="secondaryColor" value={institution.secondaryColor} onChange={handleInstitutionChange} className="w-full h-10 border rounded cursor-pointer" />
              </div>
            </div>
            <div className="p-4 bg-emerald-50 rounded border border-emerald-200">
              <p className="text-sm text-emerald-800">💡 Los colores se aplicarán automáticamente en: menús, botones, encabezados de PDF y certificados.</p>
            </div>
          </div>
        )}

        {/* 👥 MÉDICOS Y PERMISOS */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg text-slate-700">Médicos de la Institución</h3>
              <button onClick={() => setShowUserForm(!showUserForm)} className="bg-emerald-600 text-white px-4 py-2 rounded hover:bg-emerald-700 text-sm">
                {showUserForm ? 'Cancelar' : '+ Agregar Médico'}
              </button>
            </div>

            {showUserForm && (
              <form onSubmit={handleAddUser} className="p-4 border rounded-lg bg-gray-50 mb-4 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input placeholder="Email *" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} className="border p-2 rounded" required />
                  <input placeholder="Nombre Completo *" value={newUser.fullName} onChange={e => setNewUser({...newUser, fullName: e.target.value})} className="border p-2 rounded" required />
                  <input placeholder="CMP (opcional)" value={newUser.cmp} onChange={e => setNewUser({...newUser, cmp: e.target.value})} className="border p-2 rounded" />
                  <select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})} className="border p-2 rounded">
                    <option value="medico">👨‍⚕️ Médico</option>
                    <option value="enfermeria">👩‍⚕️ Enfermería</option>
                    <option value="admin">⚙️ Administrador</option>
                    <option value="recepcion">📋 Recepción</option>
                  </select>
                </div>
                <button type="submit" disabled={saving} className="bg-emerald-600 text-white px-4 py-2 rounded hover:bg-emerald-700">
                  {saving ? 'Guardando...' : '💾 Guardar Médico'}
                </button>
              </form>
            )}

            {/* Lista de usuarios */}
            <div className="border rounded overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-100 text-slate-700">
                  <tr>
                    <th className="px-4 py-3">Nombre</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Rol</th>
                    <th className="px-4 py-3">CMP</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.id} className="border-t">
                      <td className="px-4 py-3">{user.fullName}</td>
                      <td className="px-4 py-3">{user.email}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs ${
                          user.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                          user.role === 'medico' ? 'bg-blue-100 text-blue-700' :
                          user.role === 'enfermeria' ? 'bg-emerald-100 text-emerald-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">{user.cmp || '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs ${user.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {user.active ? '✅ Activo' : '❌ Inactivo'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => toggleUserActive(user.id, user.active)} className="text-blue-600 hover:underline text-xs">
                          {user.active ? 'Desactivar' : 'Activar'}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-500">No hay médicos registrados</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 📋 CONFIGURACIÓN HCE */}
        {activeTab === 'hce' && (
          <div className="space-y-4">
            <h3 className="font-bold text-lg text-slate-700 mb-4">Comportamiento de la Historia Clínica</h3>
            
            <div className="space-y-3">
              <label className="flex items-center gap-3">
                <input type="checkbox" name="requireCie10" checked={hceConfig.requireCie10} onChange={handleHceChange} className="w-4 h-4" />
                <span>🔖 Exigir código CIE-10 en diagnósticos</span>
              </label>
              
              <label className="flex items-center gap-3">
                <input type="checkbox" name="allowMultipleDiagnoses" checked={hceConfig.allowMultipleDiagnoses} onChange={handleHceChange} className="w-4 h-4" />
                <span>📋 Permitir múltiples diagnósticos por atención</span>
              </label>
              
              <label className="flex items-center gap-3">
                <input type="checkbox" name="requireVitalSigns" checked={hceConfig.requireVitalSigns} onChange={handleHceChange} className="w-4 h-4" />
                <span>🩺 Requerir signos vitales para finalizar atención</span>
              </label>
              
              <label className="flex items-center gap-3">
                <input type="checkbox" name="autoSaveDrafts" checked={hceConfig.autoSaveDrafts} onChange={handleHceChange} className="w-4 h-4" />
                <span>💾 Guardar automáticamente borradores cada 2 min</span>
              </label>
              
              <label className="flex items-center gap-3">
                <input type="checkbox" name="signatureRequired" checked={hceConfig.signatureRequired} onChange={handleHceChange} className="w-4 h-4" />
                <span>✍️ Requerir firma digital en certificados</span>
              </label>
            </div>

            <div className="pt-4 border-t">
              <label className="block font-medium text-slate-700 mb-2">Días de descanso predeterminados</label>
              <input type="number" name="defaultRestDays" value={hceConfig.defaultRestDays} onChange={handleHceChange} className="w-24 border p-2 rounded" min="0" max="30" />
              <p className="text-sm text-gray-500 mt-1">Valor que aparecerá por defecto al emitir certificados de descanso.</p>
            </div>
          </div>
        )}

        {/* Botón de guardar global */}
        <div className="mt-8 pt-4 border-t flex justify-end">
          <button onClick={saveAll} disabled={saving} className="bg-emerald-600 text-white px-6 py-3 rounded-lg hover:bg-emerald-700 font-medium transition">
            {saving ? '⏳ Guardando configuración...' : '💾 Guardar Todos los Cambios'}
          </button>
        </div>
      </div>
    </div>
  );
}