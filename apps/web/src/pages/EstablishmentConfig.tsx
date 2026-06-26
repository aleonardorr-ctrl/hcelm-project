import { useState, useEffect } from 'react';

export default function EstablishmentConfig() {
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    const token = sessionStorage.getItem('ame_token');
    try {
      const res = await fetch('http://localhost:3000/establishment', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
        if (data.logoUrl) setLogoPreview(data.logoUrl);
      }
    } catch (err) {
      console.error('Error cargando configuración:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setConfig({ ...config, [e.target.name]: e.target.value });
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setLogoPreview(base64);
        setConfig({ ...config, logoUrl: base64 });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const token = sessionStorage.getItem('ame_token');
    
    try {
      const res = await fetch('http://localhost:3000/establishment', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(config)
      });

      if (res.ok) {
        alert('✅ Configuración guardada exitosamente');
        fetchConfig();
      } else {
        alert('⚠️ Error al guardar. Verifique permisos.');
      }
    } catch (err) {
      alert('❌ Error de conexión');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6">Cargando...</div>;
  if (!config) return <div className="p-6">Error al cargar.</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-slate-800">🏥 Configuración Institucional</h1>
      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow">
        <div className="flex items-center gap-6">
          <div className="w-32 h-32 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center overflow-hidden bg-slate-50">
            {logoPreview ? <img src={logoPreview} alt="Logo" className="w-full h-full object-contain" /> : <span className="text-slate-400 text-sm">Sin Logo</span>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Logo del Establecimiento</label>
            <input type="file" accept="image/*" onChange={handleLogoChange} className="block w-full text-sm text-slate-500" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Nombre</label>
            <input name="name" value={config.name || ''} onChange={handleChange} className="w-full border p-2 rounded mt-1" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Teléfono</label>
            <input name="phone" value={config.phone || ''} onChange={handleChange} className="w-full border p-2 rounded mt-1" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Dirección</label>
          <input name="address" value={config.address || ''} onChange={handleChange} className="w-full border p-2 rounded mt-1" />
        </div>
        <div className="border-t pt-4 mt-4">
          <h3 className="text-lg font-medium text-slate-800 mb-4">👨‍⚕️ Director Médico</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Nombre Completo</label>
              <input name="directorName" value={config.directorName || ''} onChange={handleChange} className="w-full border p-2 rounded mt-1" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">CMP / RNE</label>
              <input name="directorCmp" value={config.directorCmp || ''} onChange={handleChange} className="w-full border p-2 rounded mt-1" required />
            </div>
          </div>
        </div>
        <button type="submit" disabled={saving} className="w-full bg-emerald-600 text-white py-3 rounded-lg hover:bg-emerald-700 font-medium disabled:opacity-50 transition">
          {saving ? '💾 Guardando...' : '💾 Guardar Configuración'}
        </button>
      </form>
    </div>
  );
}
