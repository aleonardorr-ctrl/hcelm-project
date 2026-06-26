import { useState, useEffect } from 'react';

export default function Consultas() {
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState('');
  const [motivo, setMotivo] = useState('');
  const [anamnesis, setAnamnesis] = useState({
    personales: '', familiares: '', alergias: '', habitos: '', ginecoObstetricos: ''
  });
  const [examenFisico, setExamenFisico] = useState('');
  const [diagnostico, setDiagnostico] = useState('');
  const [tratamiento, setTratamiento] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingPatients, setLoadingPatients] = useState(true);

  useEffect(() => {
    const token = sessionStorage.getItem('ame_token');
    if (!token) {
      window.location.href = '/';
      return;
    }
    fetch('http://localhost:3000/patients', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => {
        if (!res.ok) throw new Error('Sesión inválida');
        return res.json();
      })
      .then(data => setPatients(Array.isArray(data) ? data : []))
      .catch(() => {
        localStorage.removeItem('ame_token');
        window.location.href = '/';
      })
      .finally(() => setLoadingPatients(false));
  }, []);

   const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const token = sessionStorage.getItem('ame_token');

    const payload = {
      patientId: selectedPatient,
      reasonForConsultation: motivo,
      anamnesis: JSON.stringify(anamnesis),
      physicalExam: JSON.stringify({ texto: examenFisico }),
      diagnoses: JSON.stringify([diagnostico]),
      treatmentPlan: tratamiento,
      status: 'COMPLETED'
    };

    try {
      const res = await fetch('http://localhost:3000/encounters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        alert('✅ Historia Clínica guardada exitosamente');
        setSelectedPatient(''); setMotivo('');
        setAnamnesis({ personales: '', familiares: '', alergias: '', habitos: '', ginecoObstetricos: '' });
        setExamenFisico(''); setDiagnostico(''); setTratamiento('');
      } else {
        // 🔍 ESTA LÍNEA NOS MOSTRARÁ EL ERROR REAL DEL BACKEND
        const errData = await res.json().catch(() => ({ message: 'Sin detalles técnicos' }));
        alert(`⚠️ Error del Servidor (Código: ${res.status})\n\n${errData.message || 'Verifique datos o intente en 2 min'}`);
      }
    } catch {
      alert('❌ No hay conexión con el servidor backend.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-slate-800">📝 Nueva Consulta Clínica</h1>

      {loadingPatients && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded mb-4">
          🔄 Cargando lista de pacientes...
        </div>
      )}
      {!loadingPatients && patients.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded mb-4">
          ⚠️ No se encontraron pacientes. Registre uno primero en el menú Pacientes.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <label className="block text-sm font-medium text-slate-700">Seleccionar Paciente</label>
          <select
            value={selectedPatient}
            onChange={e => setSelectedPatient(e.target.value)}
            className="w-full border p-2 rounded mt-1"
            required
            disabled={loadingPatients || patients.length === 0}
          >
            <option value="">-- Seleccione un paciente --</option>
            {patients.map(p => (
              <option key={p.id} value={p.id}>{p.fullName} ({p.documentNumber})</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <label className="block text-sm font-medium text-slate-700">Motivo de Consulta</label>
            <input value={motivo} onChange={e => setMotivo(e.target.value)} className="w-full border p-2 rounded mt-1" placeholder="Ej: Cefalea frontal" required />
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <label className="block text-sm font-medium text-slate-700">Diagnóstico (CIE-10)</label>
            <input value={diagnostico} onChange={e => setDiagnostico(e.target.value)} className="w-full border p-2 rounded mt-1" placeholder="Ej: R51" required />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow space-y-4">
          <h2 className="text-lg font-semibold text-slate-700 border-b pb-2">📋 Anamnesis</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { key: 'personales', label: 'Antecedentes Personales' },
              { key: 'familiares', label: 'Antecedentes Familiares' },
              { key: 'alergias', label: 'Alergias Conocidas' },
              { key: 'habitos', label: 'Hábitos / Toxicomanías' },
              { key: 'ginecoObstetricos', label: 'Antec. Gineco-Obstétricos' }
            ].map(({ key, label }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-slate-700">{label}</label>
                <textarea
                  value={anamnesis[key as keyof typeof anamnesis]}
                  onChange={(e) => setAnamnesis({ ...anamnesis, [key]: e.target.value })}
                  className="w-full border p-2 rounded mt-1"
                  rows={2}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <label className="block text-sm font-medium text-slate-700">Examen Físico</label>
            <textarea value={examenFisico} onChange={e => setExamenFisico(e.target.value)} className="w-full border p-2 rounded mt-1" rows={3} placeholder="Signos vitales, ORL, cardio..." />
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <label className="block text-sm font-medium text-slate-700">Plan / Tratamiento</label>
            <textarea value={tratamiento} onChange={e => setTratamiento(e.target.value)} className="w-full border p-2 rounded mt-1" rows={3} placeholder="Fármacos, dosis, indicaciones..." />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || patients.length === 0}
          className="w-full md:w-auto bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 transition"
        >
          {loading ? '⏳ Guardando...' : '💾 Guardar Historia Clínica'}
        </button>
      </form>
    </div>
  );
}
