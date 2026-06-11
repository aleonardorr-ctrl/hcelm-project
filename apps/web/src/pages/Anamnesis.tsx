import { useState, useEffect } from 'react';
import { generateRecipePdf } from '../utils/recipePdf';
import { generateVoluntaryDischargePdf } from '../utils/voluntaryDischargePdf';
import { generateReferralPdf } from '../utils/referralPdf';
import { generateObservationPdf } from '../utils/observationPdf';

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
  const [institution, setInstitution] = useState<any>(null);
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

  const [selectedDiagnosis, setSelectedDiagnosis] = useState<Diagnosis>({
    codigo: '',
    descripcion: '',
    tipo: 'presuntivo',
  });

  const [destinationDetails, setDestinationDetails] = useState({
    altaIndicaciones: '',
    altaSignosAlarma: '',
    altaControl: '',
    voluntariaMotivo: '',
    voluntariaRiesgos: '',
    voluntariaResumenClinico: '',
    voluntariaResponsable: '',
    voluntariaDniResponsable: '',
    voluntariaParentesco: '',
    voluntariaTelefono: '',
    referenciaDestino: '',
    referenciaMotivo: '',
    referenciaEspecialidad: '',
    referenciaMedicoReceptor: '',
    referenciaTransporte: '',
    referenciaServicioOrigen: '',
    referenciaServicioDestino: '',
    referenciaCondicion: '',
    referenciaAcompanante: '',
    referenciaResumenClinico: '',
    observacionMotivo: '',
    observacionTiempoEstimado: '',
    observacionPlan: '',
    observacionIndicaciones: '',
    fallecidoFechaHora: '',
    fallecidoCausaProbable: '',
    fallecidoObservaciones: '',
    fallecidoGenerarCertificado: false,
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

    fetch(`${API_URL}/institution`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setInstitution(data))
      .catch(() => setInstitution(null));
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
    const patient = patients.find((p) => p.id === formData.patientId);

    generateRecipePdf({
      institution,
      patient,
      formData,
      recipeItems,
    });
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

  const updateSelectedDiagnosisByCode = (value: string) => {
    const found = CIE10_CODES.find((c) => c.code.toLowerCase() === value.toLowerCase());

    setSelectedDiagnosis((prev) => ({
      ...prev,
      codigo: value,
      descripcion: found ? found.desc : prev.descripcion,
    }));
  };

  const updateSelectedDiagnosisByDescription = (value: string) => {
    const found = CIE10_CODES.find((c) => c.desc.toLowerCase() === value.toLowerCase());

    setSelectedDiagnosis((prev) => ({
      ...prev,
      descripcion: value,
      codigo: found ? found.code : prev.codigo,
    }));
  };

  const addDiagnosisAsPrincipal = () => {
    if (!selectedDiagnosis.codigo.trim()) {
      alert('Seleccione o ingrese el código CIE-10.');
      return;
    }

    if (!selectedDiagnosis.descripcion.trim()) {
      alert('Ingrese la descripción del diagnóstico.');
      return;
    }

    setFormData((prev) => ({
      ...prev,
      diagnosticoPrincipal: {
        codigo: selectedDiagnosis.codigo,
        descripcion: selectedDiagnosis.descripcion,
        tipo: selectedDiagnosis.tipo || 'presuntivo',
      },
    }));

    setSelectedDiagnosis({
      codigo: '',
      descripcion: '',
      tipo: 'presuntivo',
    });
  };

  const addDiagnosisAsSecondary = () => {
    if (!selectedDiagnosis.codigo.trim()) {
      alert('Seleccione o ingrese el código CIE-10.');
      return;
    }

    if (!selectedDiagnosis.descripcion.trim()) {
      alert('Ingrese la descripción del diagnóstico.');
      return;
    }

    const newDiag = {
      id: nextDiagId,
      codigo: selectedDiagnosis.codigo,
      descripcion: selectedDiagnosis.descripcion,
      tipo: selectedDiagnosis.tipo || 'presuntivo',
    };

    setFormData((prev) => ({
      ...prev,
      diagnosticosSecundarios: [...prev.diagnosticosSecundarios, newDiag],
    }));

    setNextDiagId((prev) => prev + 1);

    setSelectedDiagnosis({
      codigo: '',
      descripcion: '',
      tipo: 'presuntivo',
    });
  };

  const clearSelectedDiagnosis = () => {
    setSelectedDiagnosis({
      codigo: '',
      descripcion: '',
      tipo: 'presuntivo',
    });
  };

  const removeSecondaryDiag = (id: number) => {
    setFormData((prev) => ({
      ...prev,
      diagnosticosSecundarios: prev.diagnosticosSecundarios.filter((d) => d.id !== id),
    }));
  };

  const handleDestinationDetailChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value, type } = e.target;

    setDestinationDetails((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
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
        body: JSON.stringify({ ...formData, destinationDetails, recipeItems }),
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
          <div className="flex justify-between items-start gap-4 mb-3">
            <div>
              <h2 className="text-lg font-bold text-slate-700">Diagnósticos CIE-10</h2>
              <p className="text-sm text-slate-600">
                Busque o ingrese un diagnóstico y luego agréguelo como principal o secundario.
              </p>
            </div>
          </div>

          <div className="border rounded-lg p-3 bg-white mb-4">
            <label className="block font-semibold text-slate-700 mb-2">
              Diagnóstico seleccionado
            </label>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <input
                list="cie-codes"
                placeholder="Código CIE-10"
                value={selectedDiagnosis.codigo}
                onChange={(e) => updateSelectedDiagnosisByCode(e.target.value)}
                className="border p-2 rounded"
              />

              <input
                list="cie-descs"
                placeholder="Descripción del diagnóstico"
                value={selectedDiagnosis.descripcion}
                onChange={(e) => updateSelectedDiagnosisByDescription(e.target.value)}
                className="md:col-span-2 border p-2 rounded"
              />

              <select
                value={selectedDiagnosis.tipo}
                onChange={(e) =>
                  setSelectedDiagnosis((prev) => ({ ...prev, tipo: e.target.value }))
                }
                className="border p-2 rounded"
              >
                <option value="presuntivo">Presuntivo</option>
                <option value="definitivo">Definitivo</option>
                <option value="repetitivo">Repetitivo</option>
              </select>
            </div>

            <div className="flex flex-wrap gap-2 mt-3">
              <button
                type="button"
                onClick={addDiagnosisAsPrincipal}
                className="bg-emerald-600 text-white px-4 py-2 rounded hover:bg-emerald-700"
              >
                Agregar como diagnóstico principal
              </button>

              <button
                type="button"
                onClick={addDiagnosisAsSecondary}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Agregar como diagnóstico secundario
              </button>

              <button
                type="button"
                onClick={clearSelectedDiagnosis}
                className="bg-gray-100 text-slate-700 px-4 py-2 rounded hover:bg-gray-200"
              >
                Limpiar selección
              </button>
            </div>
          </div>

          <div className="border rounded-lg p-3 bg-white mb-4">
            <h3 className="font-bold text-slate-700 mb-2">Diagnóstico principal</h3>

            {formData.diagnosticoPrincipal.codigo ? (
              <div className="flex justify-between gap-3 items-start">
                <div>
                  <p className="font-semibold text-slate-800">
                    {formData.diagnosticoPrincipal.codigo} - {formData.diagnosticoPrincipal.descripcion}
                  </p>
                  <p className="text-sm text-slate-500">
                    Tipo: {formData.diagnosticoPrincipal.tipo}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      diagnosticoPrincipal: {
                        codigo: '',
                        descripcion: '',
                        tipo: 'presuntivo',
                      },
                    }))
                  }
                  className="text-red-600 font-bold"
                >
                  Quitar
                </button>
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                Aún no se ha agregado diagnóstico principal.
              </p>
            )}
          </div>

          <div className="border rounded-lg p-3 bg-white">
            <h3 className="font-bold text-slate-700 mb-2">Diagnósticos secundarios</h3>

            {formData.diagnosticosSecundarios.length > 0 ? (
              <div className="space-y-2">
                {formData.diagnosticosSecundarios.map((diag) => (
                  <div key={diag.id} className="border rounded p-2 flex justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-800">
                        {diag.codigo} - {diag.descripcion}
                      </p>
                      <p className="text-sm text-slate-500">Tipo: {diag.tipo}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeSecondaryDiag(diag.id)}
                      className="text-red-600 font-bold"
                    >
                      Quitar
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                No hay diagnósticos secundarios agregados.
              </p>
            )}
          </div>

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
                Generar receta institucional / PDF
              </button>
            </div>
          )}
        </div>

        <div className="border rounded-lg p-4 bg-slate-50">
          <label className="block font-bold text-slate-700 mb-2">Destino final del paciente</label>

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

          {formData.destinoFinal === 'alta_medica' && (
            <div className="mt-4 border rounded-lg p-4 bg-white">
              <h3 className="font-bold text-emerald-700 mb-3">Alta médica</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <TextArea
                  label="Indicaciones finales"
                  name="altaIndicaciones"
                  value={destinationDetails.altaIndicaciones}
                  onChange={handleDestinationDetailChange}
                />

                <TextArea
                  label="Signos de alarma"
                  name="altaSignosAlarma"
                  value={destinationDetails.altaSignosAlarma}
                  onChange={handleDestinationDetailChange}
                />

                <TextArea
                  label="Control / seguimiento"
                  name="altaControl"
                  value={destinationDetails.altaControl}
                  onChange={handleDestinationDetailChange}
                />
              </div>
            </div>
          )}

          {formData.destinoFinal === 'alta_voluntaria' && (
            <div className="mt-4 border rounded-lg p-4 bg-white">
              <h3 className="font-bold text-orange-700 mb-3">Alta voluntaria</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <TextArea
                  label="Motivo de alta voluntaria"
                  name="voluntariaMotivo"
                  value={destinationDetails.voluntariaMotivo}
                  onChange={handleDestinationDetailChange}
                />

                <TextArea
                  label="Riesgos explicados al paciente/familiar"
                  name="voluntariaRiesgos"
                  value={destinationDetails.voluntariaRiesgos}
                  onChange={handleDestinationDetailChange}
                />

                <TextArea
                  label="Resumen clínico para alta voluntaria"
                  name="voluntariaResumenClinico"
                  value={destinationDetails.voluntariaResumenClinico}
                  onChange={handleDestinationDetailChange}
                />

                <InputText
                  label="Responsable / familiar"
                  name="voluntariaResponsable"
                  value={destinationDetails.voluntariaResponsable}
                  onChange={handleDestinationDetailChange}
                />

                <InputText
                  label="DNI del responsable"
                  name="voluntariaDniResponsable"
                  value={destinationDetails.voluntariaDniResponsable}
                  onChange={handleDestinationDetailChange}
                />

                <InputText
                  label="Parentesco"
                  name="voluntariaParentesco"
                  value={destinationDetails.voluntariaParentesco}
                  onChange={handleDestinationDetailChange}
                />

                <InputText
                  label="Teléfono"
                  name="voluntariaTelefono"
                  value={destinationDetails.voluntariaTelefono}
                  onChange={handleDestinationDetailChange}
                />
              </div>

              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => {
                    const patient = patients.find((p) => p.id === formData.patientId);

                    generateVoluntaryDischargePdf({
                      institution,
                      patient,
                      formData,
                      destinationDetails,
                    });
                  }}
                  className="bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700"
                >
                  Generar PDF de alta voluntaria
                </button>
              </div>
            </div>
          )}

          {formData.destinoFinal === 'referencia' && (
            <div className="mt-4 border rounded-lg p-4 bg-white">
              <h3 className="font-bold text-blue-700 mb-3">Referencia</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <InputText
                  label="Establecimiento destino"
                  name="referenciaDestino"
                  value={destinationDetails.referenciaDestino}
                  onChange={handleDestinationDetailChange}
                />

                <InputText
                  label="Especialidad receptora"
                  name="referenciaEspecialidad"
                  value={destinationDetails.referenciaEspecialidad}
                  onChange={handleDestinationDetailChange}
                />

                <InputText
                  label="Médico receptor"
                  name="referenciaMedicoReceptor"
                  value={destinationDetails.referenciaMedicoReceptor}
                  onChange={handleDestinationDetailChange}
                />

                <InputText
                  label="Medio de transporte"
                  name="referenciaTransporte"
                  value={destinationDetails.referenciaTransporte}
                  onChange={handleDestinationDetailChange}
                />

                <InputText
                  label="Servicio origen"
                  name="referenciaServicioOrigen"
                  value={destinationDetails.referenciaServicioOrigen}
                  onChange={handleDestinationDetailChange}
                />

                <InputText
                  label="Servicio destino"
                  name="referenciaServicioDestino"
                  value={destinationDetails.referenciaServicioDestino}
                  onChange={handleDestinationDetailChange}
                />

                <InputText
                  label="Condición actual del paciente"
                  name="referenciaCondicion"
                  value={destinationDetails.referenciaCondicion}
                  onChange={handleDestinationDetailChange}
                />

                <InputText
                  label="Acompañante"
                  name="referenciaAcompanante"
                  value={destinationDetails.referenciaAcompanante}
                  onChange={handleDestinationDetailChange}
                />

                <TextArea
                  label="Motivo de referencia"
                  name="referenciaMotivo"
                  value={destinationDetails.referenciaMotivo}
                  onChange={handleDestinationDetailChange}
                />

                <TextArea
                  label="Resumen clínico para referencia"
                  name="referenciaResumenClinico"
                  value={destinationDetails.referenciaResumenClinico}
                  onChange={handleDestinationDetailChange}
                />
              </div>

              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => {
                    const patient = patients.find((p) => p.id === formData.patientId);

                    generateReferralPdf({
                      institution,
                      patient,
                      formData,
                      destinationDetails,
                    });
                  }}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Generar hoja de referencia PDF
                </button>
              </div>
            </div>
          )}

          {formData.destinoFinal === 'observacion' && (
            <div className="mt-4 border rounded-lg p-4 bg-white">
              <h3 className="font-bold text-purple-700 mb-3">Observación</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <TextArea
                  label="Motivo de observación"
                  name="observacionMotivo"
                  value={destinationDetails.observacionMotivo}
                  onChange={handleDestinationDetailChange}
                />

                <InputText
                  label="Tiempo estimado"
                  name="observacionTiempoEstimado"
                  value={destinationDetails.observacionTiempoEstimado}
                  onChange={handleDestinationDetailChange}
                />

                <TextArea
                  label="Plan de monitoreo"
                  name="observacionPlan"
                  value={destinationDetails.observacionPlan}
                  onChange={handleDestinationDetailChange}
                />

                <TextArea
                  label="Indicaciones"
                  name="observacionIndicaciones"
                  value={destinationDetails.observacionIndicaciones}
                  onChange={handleDestinationDetailChange}
                />
              </div>

              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => {
                    const patient = patients.find((p) => p.id === formData.patientId);

                    generateObservationPdf({
                      institution,
                      patient,
                      formData,
                      destinationDetails,
                    });
                  }}
                  className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
                >
                  Generar orden de observación PDF
                </button>
              </div>
            </div>
          )}

          {formData.destinoFinal === 'fallecido' && (
            <div className="mt-4 border rounded-lg p-4 bg-white">
              <h3 className="font-bold text-red-700 mb-3">Fallecido / pase a certificado de defunción</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <InputText
                  label="Fecha y hora de fallecimiento"
                  name="fallecidoFechaHora"
                  value={destinationDetails.fallecidoFechaHora}
                  onChange={handleDestinationDetailChange}
                />

                <InputText
                  label="Causa probable"
                  name="fallecidoCausaProbable"
                  value={destinationDetails.fallecidoCausaProbable}
                  onChange={handleDestinationDetailChange}
                />

                <TextArea
                  label="Observaciones"
                  name="fallecidoObservaciones"
                  value={destinationDetails.fallecidoObservaciones}
                  onChange={handleDestinationDetailChange}
                />

                <label className="flex items-center gap-2 border rounded p-3 bg-red-50">
                  <input
                    type="checkbox"
                    name="fallecidoGenerarCertificado"
                    checked={destinationDetails.fallecidoGenerarCertificado}
                    onChange={handleDestinationDetailChange}
                  />
                  <span className="text-red-700 font-medium">
                    Generar pase a certificado de defunción
                  </span>
                </label>
              </div>
            </div>
          )}
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

function InputText({
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

function TextArea({
  label,
  name,
  value,
  onChange,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
}) {
  return (
    <div className="md:col-span-2">
      <label className="block font-medium text-slate-700 mb-1">{label}</label>
      <textarea
        name={name}
        value={value || ''}
        onChange={onChange}
        className="w-full border p-2 rounded h-24"
      />
    </div>
  );
}

