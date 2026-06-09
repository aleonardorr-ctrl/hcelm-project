import { useState, useEffect } from 'react';

const API_URL = 'http://localhost:3000/api';

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
  { code: 'R10.4', desc: 'Dolor abdominal' },
  { code: 'F41.1', desc: 'Trastorno de ansiedad generalizada' },
];

export default function Anamnesis() {
  const [patients, setPatients] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [nextDiagId, setNextDiagId] = useState(1);

  const [medSearch, setMedSearch] = useState('');
  const [medResults, setMedResults] = useState<any[]>([]);
  const [selectedMed, setSelectedMed] = useState<any | null>(null);
  const [recipeItems, setRecipeItems] = useState<any[]>([]);

  const [recipeForm, setRecipeForm] = useState({
    quantity: '',
    presentation: '',
    route: '',
    dose: '',
    frequency: '',
    durationDays: '',
    indications: '',
  });

  const [formData, setFormData] = useState({
    patientId: '',
    fechaAtencion: new Date().toISOString().split('T')[0],
    motivoConsulta: '',
    tiempoEnfermedad: '',
    anamnesisActual: '',
    funcionesBiologicas: '',
    antecedentesPersonales: '',
    antecedentesFamiliares: '',
    signosVitales: {
      ta: '',
      fc: '',
      fr: '',
      temp: '',
      spo2: '',
      ingresadoPor: 'Médico',
    },
    examenFisico: '',
    diagnosticoPrincipal: {
      codigo: '',
      descripcion: '',
      tipo: 'presuntivo',
    },
    diagnosticosSecundarios: [] as {
      id: number;
      codigo: string;
      descripcion: string;
      tipo: string;
    }[],
    examenesAuxiliares: '',
    prescripcionesFarmacia: '',
    destinoFinal: 'alta_medica',
  });

  useEffect(() => {
    const token = localStorage.getItem('ame_token');

    fetch(`${API_URL}/patients`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setPatients(Array.isArray(data) ? data : []))
      .catch(() => setPatients([]));
  }, []);

  const updatePrescriptionText = (items: any[]) => {
    setFormData((prev) => ({
      ...prev,
      prescripcionesFarmacia: items
        .map(
          (m, i) =>
            `${i + 1}. ${m.medicationName} ${m.concentration} ${m.presentation} - Cantidad: ${m.quantity} - Vía: ${m.route} - Dosis: ${m.dose} - Frecuencia: ${m.frequency} - Duración: ${m.durationDays || ''} días. ${m.indications}`,
        )
        .join('\n'),
    }));
  };

  const searchMedication = async () => {
    if (!medSearch.trim()) return alert('Ingrese un medicamento para buscar');

    const token = localStorage.getItem('ame_token');

    if (!token) {
      alert('No hay token de sesión. Vuelva a iniciar sesión.');
      return;
    }

    const res = await fetch(`${API_URL}/medications/search?q=${encodeURIComponent(medSearch)}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (res.status === 401) {
      alert('Sesión no autorizada. Ingrese nuevamente.');
      return;
    }

    const data = await res.json();
    setMedResults(Array.isArray(data) ? data : []);

    if (Array.isArray(data) && data.length === 0) {
      alert('No se encontraron medicamentos con ese nombre.');
    }
  };

  const addMedicationToRecipe = () => {
    if (!selectedMed) return alert('Seleccione un medicamento');
    if (!recipeForm.quantity) return alert('Ingrese cantidad o número de medicamentos');
    if (!recipeForm.presentation) return alert('Ingrese presentación');
    if (!recipeForm.route) return alert('Ingrese vía de administración');
    if (!recipeForm.dose) return alert('Ingrese dosis');
    if (!recipeForm.frequency) return alert('Ingrese frecuencia');
    if (!recipeForm.durationDays) return alert('Ingrese número de días de tratamiento');

    const item = {
      medicationId: selectedMed.id,
      medicationName: `${selectedMed.genericName}${selectedMed.commercialName ? ` (${selectedMed.commercialName})` : ''}`,
      concentration: selectedMed.concentration || '',
      presentation: recipeForm.presentation,
      quantity: Number(recipeForm.quantity),
      route: recipeForm.route,
      dose: recipeForm.dose,
      frequency: recipeForm.frequency,
      durationDays: Number(recipeForm.durationDays),
      indications: recipeForm.indications,
    };

    const newItems = [...recipeItems, item];
    setRecipeItems(newItems);
    updatePrescriptionText(newItems);

    setSelectedMed(null);
    setMedSearch('');
    setMedResults([]);
    setRecipeForm({
      quantity: '',
      presentation: '',
      route: '',
      dose: '',
      frequency: '',
      durationDays: '',
      indications: '',
    });
  };

  const removeMedication = (index: number) => {
    const newItems = recipeItems.filter((_, i) => i !== index);
    setRecipeItems(newItems);
    updatePrescriptionText(newItems);
  };

  const printRecipe = () => {
    if (recipeItems.length === 0) {
      alert('No hay medicamentos en la receta.');
      return;
    }

    const patient = patients.find((p) => p.id === formData.patientId);

    const html = `
      <html>
        <head>
          <title>Receta Médica</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 30px; }
            h1 { text-align: center; margin-bottom: 5px; }
            h2 { text-align: center; margin-top: 0; font-size: 16px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #333; padding: 8px; font-size: 13px; vertical-align: top; }
            .datos { margin-top: 20px; font-size: 14px; }
            .firma { margin-top: 80px; text-align: center; }
            .footer { margin-top: 40px; font-size: 12px; text-align: center; }
          </style>
        </head>
        <body>
          <h1>RECETA MÉDICA</h1>
          <h2>AME HEALTH SAC</h2>

          <div class="datos">
            <p><b>Paciente:</b> ${patient?.fullName || ''}</p>
            <p><b>Documento:</b> ${patient?.documentNumber || ''}</p>
            <p><b>Fecha:</b> ${formData.fechaAtencion}</p>
            <p><b>Diagnóstico:</b> ${formData.diagnosticoPrincipal.codigo} - ${formData.diagnosticoPrincipal.descripcion}</p>
          </div>

          <table>
            <thead>
              <tr>
                <th>Medicamento</th>
                <th>Presentación</th>
                <th>Cantidad</th>
                <th>Vía</th>
                <th>Dosis</th>
                <th>Frecuencia</th>
                <th>Días</th>
                <th>Indicaciones</th>
              </tr>
            </thead>
            <tbody>
              ${recipeItems
                .map(
                  (m) => `
                <tr>
                  <td>${m.medicationName} ${m.concentration}</td>
                  <td>${m.presentation}</td>
                  <td>${m.quantity}</td>
                  <td>${m.route}</td>
                  <td>${m.dose}</td>
                  <td>${m.frequency}</td>
                  <td>${m.durationDays || ''}</td>
                  <td>${m.indications || ''}</td>
                </tr>
              `,
                )
                .join('')}
            </tbody>
          </table>

          <div class="firma">
            ___________________________<br/>
            Médico tratante<br/>
            CMP
          </div>

          <div class="footer">
            Esta receta forma parte de la Historia Clínica Electrónica Las Mercedes.
          </div>
        </body>
      </html>
    `;

    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      win.print();
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;

    if (name.startsWith('sv.')) {
      const key = name.replace('sv.', '');
      setFormData((prev) => ({
        ...prev,
        signosVitales: { ...prev.signosVitales, [key]: value },
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>, id: number | null) => {
    const val = e.target.value;
    const found = CIE10_CODES.find((c) => c.code.toLowerCase() === val.toLowerCase());

    if (id === null) {
      setFormData((prev) => ({
        ...prev,
        diagnosticoPrincipal: {
          ...prev.diagnosticoPrincipal,
          codigo: val,
          descripcion: found ? found.desc : prev.diagnosticoPrincipal.descripcion,
        },
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        diagnosticosSecundarios: prev.diagnosticosSecundarios.map((d) =>
          d.id === id
            ? {
                ...d,
                codigo: val,
                descripcion: found ? found.desc : d.descripcion,
              }
            : d,
        ),
      }));
    }
  };

  const handleDescChange = (e: React.ChangeEvent<HTMLInputElement>, id: number | null) => {
    const val = e.target.value;
    const found = CIE10_CODES.find((c) => c.desc.toLowerCase() === val.toLowerCase());

    if (id === null) {
      setFormData((prev) => ({
        ...prev,
        diagnosticoPrincipal: {
          ...prev.diagnosticoPrincipal,
          descripcion: val,
          codigo: found ? found.code : prev.diagnosticoPrincipal.codigo,
        },
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        diagnosticosSecundarios: prev.diagnosticosSecundarios.map((d) =>
          d.id === id
            ? {
                ...d,
                descripcion: val,
                codigo: found ? found.code : d.codigo,
              }
            : d,
        ),
      }));
    }
  };

  const addSecondaryDiag = () => {
    setFormData((prev) => ({
      ...prev,
      diagnosticosSecundarios: [
        ...prev.diagnosticosSecundarios,
        {
          id: nextDiagId,
          codigo: '',
          descripcion: '',
          tipo: 'presuntivo',
        },
      ],
    }));
    setNextDiagId((prev) => prev + 1);
  };

  const removeSecondaryDiag = (id: number) => {
    setFormData((prev) => ({
      ...prev,
      diagnosticosSecundarios: prev.diagnosticosSecundarios.filter((d) => d.id !== id),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.patientId) return alert('Seleccione un paciente');
    if (!formData.diagnosticoPrincipal.codigo.trim()) return alert('Ingrese diagnóstico principal');

    setSaving(true);

    try {
      const token = localStorage.getItem('ame_token');

      const res = await fetch(`${API_URL}/anamnesis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        alert('Historia clínica guardada exitosamente');
      } else {
        const err = await res.json();
        alert(`Error: ${err.message || 'No se pudo guardar'}`);
      }
    } catch {
      alert('Error de conexión con el servidor');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold mb-6 text-slate-800">
        Anamnesis y Historia Clínica Electrónica
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block font-medium text-slate-700 mb-1">Paciente *</label>
            <select
              value={formData.patientId}
              onChange={(e) => setFormData({ ...formData, patientId: e.target.value })}
              className="w-full border p-2 rounded"
              required
            >
              <option value="">-- Seleccione un paciente --</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.fullName} ({p.documentNumber})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Fecha de atención</label>
            <input
              type="date"
              name="fechaAtencion"
              value={formData.fechaAtencion}
              onChange={handleChange}
              className="w-full border p-2 rounded bg-gray-50"
            />
          </div>
        </div>

        <div>
          <label className="block font-medium text-slate-700 mb-1">Motivo de consulta *</label>
          <input
            name="motivoConsulta"
            value={formData.motivoConsulta}
            onChange={handleChange}
            className="w-full border p-2 rounded"
            placeholder="Ejemplo: dolor abdominal, fiebre, cefalea"
            required
          />
        </div>

        <div>
          <label className="block font-medium text-slate-700 mb-1">Tiempo de enfermedad</label>
          <input
            name="tiempoEnfermedad"
            value={formData.tiempoEnfermedad}
            onChange={handleChange}
            className="w-full border p-2 rounded"
            placeholder="Ejemplo: 3 días"
          />
        </div>

        <div>
          <label className="block font-medium text-slate-700 mb-1">
            Anamnesis de enfermedad actual
          </label>
          <textarea
            name="anamnesisActual"
            value={formData.anamnesisActual}
            onChange={handleChange}
            className="w-full border p-2 rounded h-24"
          />
        </div>

        <div>
          <label className="block font-medium text-slate-700 mb-1">Examen físico</label>
          <textarea
            name="examenFisico"
            value={formData.examenFisico}
            onChange={handleChange}
            className="w-full border p-2 rounded h-28"
          />
        </div>

        <div className="border rounded-lg p-4 bg-yellow-50">
          <label className="block font-bold text-slate-700 mb-3">Diagnóstico principal</label>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <input
              list="cie-codes"
              placeholder="Código"
              value={formData.diagnosticoPrincipal.codigo}
              onChange={(e) => handleCodeChange(e, null)}
              className="border p-2 rounded"
            />

            <input
              list="cie-descs"
              placeholder="Descripción"
              value={formData.diagnosticoPrincipal.descripcion}
              onChange={(e) => handleDescChange(e, null)}
              className="md:col-span-2 border p-2 rounded"
            />

            <select
              value={formData.diagnosticoPrincipal.tipo}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  diagnosticoPrincipal: {
                    ...prev.diagnosticoPrincipal,
                    tipo: e.target.value,
                  },
                }))
              }
              className="border p-2 rounded"
            >
              <option value="presuntivo">Presuntivo</option>
              <option value="definitivo">Definitivo</option>
              <option value="repetitivo">Repetitivo</option>
            </select>
          </div>

          {formData.diagnosticosSecundarios.map((diag) => (
            <div key={diag.id} className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-3">
              <input
                list="cie-codes"
                placeholder="Código"
                value={diag.codigo}
                onChange={(e) => handleCodeChange(e, diag.id)}
                className="border p-2 rounded"
              />

              <input
                list="cie-descs"
                placeholder="Descripción"
                value={diag.descripcion}
                onChange={(e) => handleDescChange(e, diag.id)}
                className="md:col-span-2 border p-2 rounded"
              />

              <button
                type="button"
                onClick={() => removeSecondaryDiag(diag.id)}
                className="text-red-600 font-bold"
              >
                Quitar
              </button>
            </div>
          ))}

          <button type="button" onClick={addSecondaryDiag} className="text-blue-600 mt-3">
            + Agregar diagnóstico secundario
          </button>

          <datalist id="cie-codes">
            {CIE10_CODES.map((c) => (
              <option key={c.code} value={c.code} />
            ))}
          </datalist>

          <datalist id="cie-descs">
            {CIE10_CODES.map((c) => (
              <option key={c.desc} value={c.desc} />
            ))}
          </datalist>
        </div>

        <div className="border rounded-lg p-4 bg-emerald-50">
          <h2 className="text-lg font-bold text-slate-700 mb-3">Farmacia / Receta</h2>

          <div className="flex gap-2 mb-3">
            <input
              value={medSearch}
              onChange={(e) => setMedSearch(e.target.value)}
              className="flex-1 border p-2 rounded"
              placeholder="Buscar por nombre genérico o comercial"
            />

            <button
              type="button"
              onClick={searchMedication}
              className="bg-blue-600 text-white px-4 rounded"
            >
              Buscar
            </button>
          </div>

          {medResults.length > 0 && (
            <div className="border rounded bg-white mb-4">
              {medResults.map((m) => (
                <button
                  type="button"
                  key={m.id}
                  onClick={() => {
                    setSelectedMed(m);
                    setRecipeForm((prev) => ({
                      ...prev,
                      presentation: m.presentation || '',
                      route: m.route || '',
                    }));
                  }}
                  className="block w-full text-left p-2 hover:bg-blue-50 border-b"
                >
                  <b>{m.genericName}</b>
                  {m.commercialName ? ` (${m.commercialName})` : ''} - {m.concentration} -{' '}
                  {m.presentation} - {m.route}
                </button>
              ))}
            </div>
          )}

          {selectedMed && (
            <div className="border rounded p-3 bg-white mb-4">
              <p className="font-semibold mb-2">
                Medicamento seleccionado: {selectedMed.genericName}{' '}
                {selectedMed.commercialName ? `(${selectedMed.commercialName})` : ''}{' '}
                {selectedMed.concentration}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                  placeholder="Número / cantidad"
                  value={recipeForm.quantity}
                  onChange={(e) => setRecipeForm({ ...recipeForm, quantity: e.target.value })}
                  className="border p-2 rounded"
                />

                <input
                  placeholder="Presentación"
                  value={recipeForm.presentation}
                  onChange={(e) => setRecipeForm({ ...recipeForm, presentation: e.target.value })}
                  className="border p-2 rounded"
                />

                <input
                  placeholder="Vía de administración"
                  value={recipeForm.route}
                  onChange={(e) => setRecipeForm({ ...recipeForm, route: e.target.value })}
                  className="border p-2 rounded"
                />

                <input
                  placeholder="Dosis"
                  value={recipeForm.dose}
                  onChange={(e) => setRecipeForm({ ...recipeForm, dose: e.target.value })}
                  className="border p-2 rounded"
                />

                <input
                  placeholder="Frecuencia"
                  value={recipeForm.frequency}
                  onChange={(e) => setRecipeForm({ ...recipeForm, frequency: e.target.value })}
                  className="border p-2 rounded"
                />

                <input
                  placeholder="Días de tratamiento"
                  value={recipeForm.durationDays}
                  onChange={(e) =>
                    setRecipeForm({ ...recipeForm, durationDays: e.target.value })
                  }
                  className="border p-2 rounded"
                />

                <input
                  placeholder="Indicaciones adicionales"
                  value={recipeForm.indications}
                  onChange={(e) => setRecipeForm({ ...recipeForm, indications: e.target.value })}
                  className="border p-2 rounded md:col-span-3"
                />
              </div>

              <button
                type="button"
                onClick={addMedicationToRecipe}
                className="mt-3 bg-emerald-600 text-white px-4 py-2 rounded"
              >
                Agregar a receta
              </button>
            </div>
          )}

          {recipeItems.length > 0 && (
            <div className="bg-white border rounded p-3">
              <h3 className="font-bold mb-2">Medicamentos indicados</h3>

              {recipeItems.map((m, index) => (
                <div key={index} className="border-b py-2 flex justify-between gap-2">
                  <div>
                    <b>{m.medicationName}</b> {m.concentration}
                    <br />
                    Presentación: {m.presentation} | Cantidad: {m.quantity} | Vía: {m.route}
                    <br />
                    Dosis: {m.dose} | Frecuencia: {m.frequency} | Duración: {m.durationDays} días
                    <br />
                    <span className="text-sm text-slate-600">{m.indications}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeMedication(index)}
                    className="text-red-600 font-bold"
                  >
                    Quitar
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={printRecipe}
                className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded"
              >
                Imprimir receta
              </button>
            </div>
          )}
        </div>

        <div>
          <label className="block font-medium text-slate-700 mb-1">Destino final</label>
          <select
            name="destinoFinal"
            value={formData.destinoFinal}
            onChange={handleChange}
            className="w-full md:w-1/2 border p-2 rounded"
          >
            <option value="alta_medica">Alta médica</option>
            <option value="alta_voluntaria">Alta voluntaria</option>
            <option value="referencia">Referencia</option>
            <option value="observacion">Observación</option>
            <option value="fallecido">Fallecido</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-emerald-600 text-white py-3 rounded-lg hover:bg-emerald-700 font-medium"
        >
          {saving ? 'Guardando...' : 'Guardar y finalizar atención'}
        </button>
      </form>
    </div>
  );
}