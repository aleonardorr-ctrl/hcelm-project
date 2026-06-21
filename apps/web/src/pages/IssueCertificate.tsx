import { useState, useEffect } from 'react';

// ✅ Lista de códigos CIE-10 para autocompletado
const CIE10_CODES = [
  { code: 'J06.9', desc: 'Infección aguda de vías respiratorias' },
  { code: 'J00', desc: 'Nasofaringitis aguda (Resfriado común)' },
  { code: 'R51', desc: 'Cefalea (Dolor de cabeza)' },
  { code: 'M54.5', desc: 'Dolor lumbar bajo' },
  { code: 'E11.9', desc: 'Diabetes mellitus tipo 2' },
  { code: 'I10', desc: 'Hipertensión esencial' },
  { code: 'K21.0', desc: 'Enfermedad por reflujo gastroesofágico' },
  { code: 'N39.0', desc: 'Infección de vías urinarias' },
  { code: 'A09', desc: 'Diarrea y gastroenteritis' },
  { code: 'B34.9', desc: 'Infección viral no especificada' },
  { code: 'J18.9', desc: 'Neumonía no especificada' },
  { code: 'M25.5', desc: 'Dolor articular' },
  { code: 'R10.4', desc: 'Dolor abdominal' },
  { code: 'F41.1', desc: 'Trastorno de ansiedad generalizada' },
];

export default function IssueCertificate() {
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState('');
  
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [place, setPlace] = useState('Arequipa');
  
  const [diagnoses, setDiagnoses] = useState<{ code: string; description: string }[]>([]);
  const [newCode, setNewCode] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const [restDays, setRestDays] = useState<number | ''>(0);
  const [observations, setObservations] = useState('');
  const [loading, setLoading] = useState(false);

  // Cargar pacientes al iniciar
  useEffect(() => {
    const token = localStorage.getItem('ame_token');
    fetch('http://localhost:3000/patients', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setPatients(Array.isArray(data) ? data : []));
  }, []);

  const addDiagnosis = () => {
    if (newCode.trim() && newDesc.trim()) {
      setDiagnoses([...diagnoses, { code: newCode.trim(), description: newDesc.trim() }]);
      setNewCode('');
      setNewDesc('');
    }
  };

  const removeDiagnosis = (idx: number) => {
    setDiagnoses(diagnoses.filter((_, i) => i !== idx));
  };

  // Búsqueda inteligente (Código o Descripción)
  const handleSearch = (field: 'code' | 'desc', value: string) => {
    if (field === 'code') {
      setNewCode(value);
      const found = CIE10_CODES.find(c => c.code.toLowerCase() === value.toLowerCase());
      if (found) setNewDesc(found.desc);
    } else {
      setNewDesc(value);
      const found = CIE10_CODES.find(c => c.desc.toLowerCase() === value.toLowerCase());
      if (found) setNewCode(found.code);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) return alert('Seleccione un paciente');
    if (diagnoses.length === 0) return alert('Agregue al menos un diagnóstico');

    setLoading(true);
    const token = localStorage.getItem('ame_token');

    // Buscar los datos completos del paciente seleccionado
    const patientData = patients.find(p => p.id === selectedPatient);

    try {
      const res = await fetch('http://localhost:3000/certificates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          patientId: selectedPatient,
          // Enviamos nombre y DNI planos para el PDF
          patientName: patientData?.fullName || 'Paciente Sin Nombre',
          patientDoc: patientData?.documentNumber || 'S/N',
          // También enviamos el objeto completo por seguridad
          patient: patientData,
          
          certificateType: 'REST_CERTIFICATE',
          diagnoses: diagnoses.map(d => `${d.code} - ${d.description}`),
          restDays: parseInt(restDays.toString()) || 0,
          observations,
          place,
          issueDate
        })
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Certificado_${patientData?.fullName || 'Medico'}.pdf`;
        document.body.appendChild(a); a.click(); a.remove();
        alert('✅ Certificado generado exitosamente');
      } else {
        const err = await res.json();
        alert(`⚠️ Error: ${err.message || 'Intente nuevamente'}`);
      }
    } catch (err) {
      // ✅ Línea corregida con comillas cerradas
      alert('❌ Error de conexión con el servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold mb-6 text-slate-800">📄 Emisión de Certificado Médico</h1>
      
      <form onSubmit={handleGenerate} className="space-y-6 bg-white p-6 rounded shadow" noValidate>
        
        {/* Paciente y Fecha */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block font-medium text-slate-700">Paciente *</label>
            <select value={selectedPatient} onChange={e => setSelectedPatient(e.target.value)} className="w-full border p-2 rounded mt-1" required>
              <option value="">-- Seleccione un paciente --</option>
              {patients.map(p => <option key={p.id} value={p.id}>{p.fullName} ({p.documentNumber})</option>)}
            </select>
          </div>
          <div>
            <label className="block font-medium text-slate-700">Fecha de Emisión *</label>
            <input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} className="w-full border p-2 rounded mt-1" required />
          </div>
        </div>

        <div>
          <label className="block font-medium text-slate-700">Lugar de Emisión *</label>
          <input value={place} onChange={e => setPlace(e.target.value)} className="w-full border p-2 rounded mt-1" placeholder="Ej: Arequipa" required />
        </div>

        {/* Diagnósticos con Autocompletado */}
        <div className="border rounded-lg p-4 bg-slate-50">
          <label className="block font-medium text-slate-700 mb-2">Diagnósticos (CIE-10)</label>
          <div className="flex gap-2 mb-3">
            <input 
              list="cie10-list"
              value={newCode} 
              onChange={e => handleSearch('code', e.target.value)} 
              placeholder="Código (Ej: J06.9)" 
              className="w-1/3 border p-2 rounded" 
            />
            <datalist id="cie10-list">
              {CIE10_CODES.map(c => <option key={c.code} value={c.code} />)}
            </datalist>

            <input 
              list="cie10-desc-list"
              value={newDesc} 
              onChange={e => handleSearch('desc', e.target.value)} 
              placeholder="Descripción (Ej: Gripe)" 
              className="w-2/3 border p-2 rounded" 
            />
            <datalist id="cie10-desc-list">
              {CIE10_CODES.map(c => <option key={c.code} value={c.desc} />)}
            </datalist>

            <button type="button" onClick={addDiagnosis} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">+ Agregar</button>
          </div>
          
          <table className="w-full text-sm text-left text-slate-600">
            <thead className="text-xs text-slate-700 uppercase bg-slate-200">
              <tr>
                <th className="px-4 py-2">Código CIE-10</th>
                <th className="px-4 py-2">Descripción</th>
                <th className="px-4 py-2">Acción</th>
              </tr>
            </thead>
            <tbody>
              {diagnoses.map((d, i) => (
                <tr key={i} className="bg-white border-b">
                  <td className="px-4 py-2 font-medium">{d.code}</td>
                  <td className="px-4 py-2">{d.description}</td>
                  <td className="px-4 py-2">
                    <button type="button" onClick={() => removeDiagnosis(i)} className="text-red-600 hover:text-red-900 font-bold">×</button>
                  </td>
                </tr>
              ))}
              {diagnoses.length === 0 && <tr><td colSpan={3} className="px-4 py-2 text-center italic">Sin diagnósticos agregados</td></tr>}
            </tbody>
          </table>
        </div>

        {/* Días y Observaciones */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block font-medium text-slate-700">Días de Descanso</label>
            <input type="number" min="0" value={restDays} onChange={e => setRestDays(e.target.value === '' ? '' : parseInt(e.target.value))} className="w-full border p-2 rounded mt-1" />
          </div>
          <div className="md:col-span-2">
            <label className="block font-medium text-slate-700">Observaciones</label>
            <textarea value={observations} onChange={e => setObservations(e.target.value)} className="w-full border p-2 rounded mt-1" rows={2} />
          </div>
        </div>

        <button type="submit" disabled={loading} className="w-full bg-emerald-600 text-white py-3 rounded-lg hover:bg-emerald-700 font-medium">
          {loading ? 'Generando...' : '🖨️ Emitir Certificado'}
        </button>
      </form>
    </div>
  );
}