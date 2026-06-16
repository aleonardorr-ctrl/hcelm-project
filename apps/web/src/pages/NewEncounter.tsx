import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

type SelectedPatient = {
  id: string;
  fullName?: string;
  name?: string;
  documentNumber?: string;
  documentType?: string;
  birthDate?: string;
  age?: string;
  sex?: string;
  gender?: string;
  phone?: string;
};

type EncounterFormState = {
  type: string;
  reason: string;

  systolicBP: string;
  diastolicBP: string;
  heartRate: string;
  respiratoryRate: string;
  temperature: string;
  oxygenSat: string;

  weightKg: string;
  heightCm: string;

  capillaryGlucose: string;
  painScale: string;

  consciousness: string;
  glasgowEye: string;
  glasgowVerbal: string;
  glasgowMotor: string;

  oxygenSupport: string;
  fio2: string;
  nursingNotes: string;
};

const emptyForm: EncounterFormState = {
  type: 'consulta',
  reason: '',

  systolicBP: '',
  diastolicBP: '',
  heartRate: '',
  respiratoryRate: '',
  temperature: '',
  oxygenSat: '',

  weightKg: '',
  heightCm: '',

  capillaryGlucose: '',
  painScale: '',

  consciousness: 'Alerta',
  glasgowEye: '',
  glasgowVerbal: '',
  glasgowMotor: '',

  oxygenSupport: 'Aire ambiente',
  fio2: '',
  nursingNotes: '',
};

function getToken() {
  return localStorage.getItem('ame_token');
}

function getSelectedPatient(): SelectedPatient | null {
  const raw = localStorage.getItem('selectedPatient');

  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function toNumber(value: string): number | undefined {
  if (value.trim() === '') return undefined;

  const parsed = Number(value);

  if (Number.isNaN(parsed)) return undefined;

  return parsed;
}

function toInt(value: string): number | undefined {
  if (value.trim() === '') return undefined;

  const parsed = Number(value);

  if (Number.isNaN(parsed)) return undefined;

  return Math.trunc(parsed);
}

function calculateBmi(weightKg: string, heightCm: string): string {
  const weight = Number(weightKg);
  const height = Number(heightCm);

  if (!weight || !height) return '';

  const heightM = height / 100;
  const bmi = weight / (heightM * heightM);

  if (!Number.isFinite(bmi)) return '';

  return bmi.toFixed(2);
}

function calculateGlasgow(eye: string, verbal: string, motor: string): string {
  const e = Number(eye);
  const v = Number(verbal);
  const m = Number(motor);

  if (!e || !v || !m) return '';

  return String(e + v + m);
}

export default function NewEncounter() {
  const navigate = useNavigate();

  const [form, setForm] = useState<EncounterFormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const selectedPatient = useMemo(() => getSelectedPatient(), []);

  const bmi = useMemo(
    () => calculateBmi(form.weightKg, form.heightCm),
    [form.weightKg, form.heightCm],
  );

  const glasgowTotal = useMemo(
    () => calculateGlasgow(form.glasgowEye, form.glasgowVerbal, form.glasgowMotor),
    [form.glasgowEye, form.glasgowVerbal, form.glasgowMotor],
  );

  function handleChange(
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) {
    const { name, value } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function handleBackToPatients() {
    localStorage.removeItem('selectedEncounter');
    navigate('/patients');
  }

  function validateForm(): string | null {
    if (!selectedPatient?.id) {
      return 'No hay paciente seleccionado. Regrese al módulo Pacientes y seleccione uno.';
    }

    if (!form.reason.trim()) {
      return 'Ingrese el motivo de atención.';
    }

    if (form.systolicBP && !form.diastolicBP) {
      return 'Si ingresa presión sistólica, ingrese también presión diastólica.';
    }

    if (!form.systolicBP && form.diastolicBP) {
      return 'Si ingresa presión diastólica, ingrese también presión sistólica.';
    }

    return null;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      setSuccess('');
      return;
    }

    const token = getToken();

    if (!token) {
      setError('No se encontró token de sesión. Inicie sesión nuevamente.');
      setSuccess('');
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const payload = {
        patientId: selectedPatient?.id,
        type: form.type,
        reason: form.reason.trim(),

        systolicBP: toInt(form.systolicBP),
        diastolicBP: toInt(form.diastolicBP),
        heartRate: toInt(form.heartRate),
        respiratoryRate: toInt(form.respiratoryRate),
        temperature: toNumber(form.temperature),
        oxygenSat: toInt(form.oxygenSat),

        weightKg: toNumber(form.weightKg),
        heightCm: toNumber(form.heightCm),
        bmi: toNumber(bmi),

        capillaryGlucose: toInt(form.capillaryGlucose),
        painScale: toInt(form.painScale),

        consciousness: form.consciousness || undefined,
        glasgowEye: toInt(form.glasgowEye),
        glasgowVerbal: toInt(form.glasgowVerbal),
        glasgowMotor: toInt(form.glasgowMotor),
        glasgowTotal: toInt(glasgowTotal),

        oxygenSupport: form.oxygenSupport || undefined,
        fio2: toInt(form.fio2),
        nursingNotes: form.nursingNotes.trim() || undefined,
      };

      const response = await fetch(`${API_URL}/encounters`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const backendError = await response.json().catch(() => null);

        const message = Array.isArray(backendError?.message)
          ? backendError.message.join(' | ')
          : backendError?.message || backendError?.error;

        throw new Error(message || 'No se pudo guardar la nueva atención.');
      }

      const savedEncounter = await response.json();

      localStorage.setItem(
        'selectedEncounter',
        JSON.stringify({
          id: savedEncounter.id,
          patientId: savedEncounter.patientId,
          type: savedEncounter.type,
          reason: savedEncounter.reason,
          status: savedEncounter.status,
          createdAt: savedEncounter.createdAt,
          vitalSigns: savedEncounter.vitalSigns,
        }),
      );

      setSuccess('Nueva atención y funciones vitales guardadas correctamente.');

      navigate('/anamnesis');
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : 'Error al guardar la nueva atención.',
      );
    } finally {
      setSaving(false);
    }
  }

  if (!selectedPatient?.id) {
    return (
      <div className="p-6 bg-white rounded shadow border border-red-200">
        <h2 className="text-2xl font-bold text-red-700 mb-4">
          Nueva atención + Funciones vitales
        </h2>

        <p className="text-red-700 mb-4">
          No hay paciente seleccionado.
        </p>

        <button
          type="button"
          onClick={() => navigate('/patients')}
          className="px-4 py-2 rounded bg-blue-700 text-white font-semibold hover:bg-blue-800"
        >
          Ir a Pacientes
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="p-6 bg-white rounded shadow border border-gray-200">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-blue-700">
              Nueva atención + Funciones vitales
            </h2>

            <p className="text-sm text-gray-500 mt-1">
              Registre la evaluación inicial antes de continuar a Anamnesis.
            </p>
          </div>

          <button
            type="button"
            onClick={handleBackToPatients}
            className="px-4 py-2 rounded bg-gray-700 text-white font-semibold hover:bg-gray-800"
          >
            ← Cambiar paciente
          </button>
        </div>

        <div className="mt-4 p-4 border border-blue-200 bg-blue-50 rounded">
          <p className="text-sm text-blue-900">
            <span className="font-bold">Paciente seleccionado:</span>{' '}
            {selectedPatient.fullName || selectedPatient.name || 'Paciente sin nombre'}
            {selectedPatient.documentNumber ? ` | Documento: ${selectedPatient.documentNumber}` : ''}
            {selectedPatient.age ? ` | ${selectedPatient.age}` : ''}
            {selectedPatient.sex || selectedPatient.gender
              ? ` | ${selectedPatient.sex || selectedPatient.gender}`
              : ''}
          </p>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded border border-red-300 bg-red-50 text-red-700 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="mt-4 p-3 rounded border border-green-300 bg-green-50 text-green-700 text-sm">
            {success}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="p-6 bg-white rounded shadow border border-gray-200">
          <h3 className="text-xl font-bold text-gray-800 mb-4">
            Datos de la atención
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Tipo de atención
              </label>
              <select
                name="type"
                value={form.type}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded px-3 py-2"
              >
                <option value="consulta">Consulta</option>
                <option value="control">Control</option>
                <option value="procedimiento">Procedimiento</option>
                <option value="emergencia">Emergencia</option>
                <option value="triaje">Triaje</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Motivo de atención
              </label>
              <input
                name="reason"
                value={form.reason}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded px-3 py-2"
                placeholder="Ej. fiebre, dolor abdominal, control de presión..."
              />
            </div>
          </div>
        </div>

        <div className="p-6 bg-white rounded shadow border border-gray-200">
          <h3 className="text-xl font-bold text-gray-800 mb-4">
            Funciones vitales
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                PA sistólica
              </label>
              <input
                name="systolicBP"
                value={form.systolicBP}
                onChange={handleChange}
                type="number"
                className="w-full border border-gray-300 rounded px-3 py-2"
                placeholder="120"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                PA diastólica
              </label>
              <input
                name="diastolicBP"
                value={form.diastolicBP}
                onChange={handleChange}
                type="number"
                className="w-full border border-gray-300 rounded px-3 py-2"
                placeholder="80"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Frecuencia cardiaca
              </label>
              <input
                name="heartRate"
                value={form.heartRate}
                onChange={handleChange}
                type="number"
                className="w-full border border-gray-300 rounded px-3 py-2"
                placeholder="78"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Frecuencia respiratoria
              </label>
              <input
                name="respiratoryRate"
                value={form.respiratoryRate}
                onChange={handleChange}
                type="number"
                className="w-full border border-gray-300 rounded px-3 py-2"
                placeholder="18"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Temperatura °C
              </label>
              <input
                name="temperature"
                value={form.temperature}
                onChange={handleChange}
                type="number"
                step="0.1"
                className="w-full border border-gray-300 rounded px-3 py-2"
                placeholder="36.8"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Saturación O₂ %
              </label>
              <input
                name="oxygenSat"
                value={form.oxygenSat}
                onChange={handleChange}
                type="number"
                className="w-full border border-gray-300 rounded px-3 py-2"
                placeholder="98"
              />
            </div>
          </div>
        </div>

        <div className="p-6 bg-white rounded shadow border border-gray-200">
          <h3 className="text-xl font-bold text-gray-800 mb-4">
            Antropometría y evaluación rápida
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Peso kg
              </label>
              <input
                name="weightKg"
                value={form.weightKg}
                onChange={handleChange}
                type="number"
                step="0.1"
                className="w-full border border-gray-300 rounded px-3 py-2"
                placeholder="70"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Talla cm
              </label>
              <input
                name="heightCm"
                value={form.heightCm}
                onChange={handleChange}
                type="number"
                step="0.1"
                className="w-full border border-gray-300 rounded px-3 py-2"
                placeholder="170"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                IMC
              </label>
              <input
                value={bmi}
                readOnly
                className="w-full border border-gray-200 bg-gray-100 rounded px-3 py-2"
                placeholder="Automático"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Dolor EVA 0-10
              </label>
              <input
                name="painScale"
                value={form.painScale}
                onChange={handleChange}
                type="number"
                min="0"
                max="10"
                className="w-full border border-gray-300 rounded px-3 py-2"
                placeholder="0"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Glicemia capilar mg/dl
              </label>
              <input
                name="capillaryGlucose"
                value={form.capillaryGlucose}
                onChange={handleChange}
                type="number"
                className="w-full border border-gray-300 rounded px-3 py-2"
                placeholder="110"
              />
            </div>
          </div>
        </div>

        <div className="p-6 bg-white rounded shadow border border-gray-200">
          <h3 className="text-xl font-bold text-gray-800 mb-4">
            Neurológico y oxígeno
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Estado de conciencia
              </label>
              <select
                name="consciousness"
                value={form.consciousness}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded px-3 py-2"
              >
                <option value="Alerta">Alerta</option>
                <option value="Somnoliento">Somnoliento</option>
                <option value="Estupor">Estupor</option>
                <option value="Coma">Coma</option>
                <option value="Confuso">Confuso</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Glasgow ocular
              </label>
              <select
                name="glasgowEye"
                value={form.glasgowEye}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded px-3 py-2"
              >
                <option value="">Seleccione</option>
                <option value="4">4 - Espontánea</option>
                <option value="3">3 - A la voz</option>
                <option value="2">2 - Al dolor</option>
                <option value="1">1 - Ninguna</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Glasgow verbal
              </label>
              <select
                name="glasgowVerbal"
                value={form.glasgowVerbal}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded px-3 py-2"
              >
                <option value="">Seleccione</option>
                <option value="5">5 - Orientado</option>
                <option value="4">4 - Confuso</option>
                <option value="3">3 - Palabras inapropiadas</option>
                <option value="2">2 - Sonidos</option>
                <option value="1">1 - Ninguna</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Glasgow motora
              </label>
              <select
                name="glasgowMotor"
                value={form.glasgowMotor}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded px-3 py-2"
              >
                <option value="">Seleccione</option>
                <option value="6">6 - Obedece órdenes</option>
                <option value="5">5 - Localiza dolor</option>
                <option value="4">4 - Retira al dolor</option>
                <option value="3">3 - Flexión anormal</option>
                <option value="2">2 - Extensión</option>
                <option value="1">1 - Ninguna</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Glasgow total
              </label>
              <input
                value={glasgowTotal}
                readOnly
                className="w-full border border-gray-200 bg-gray-100 rounded px-3 py-2"
                placeholder="Automático"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Soporte de oxígeno
              </label>
              <select
                name="oxygenSupport"
                value={form.oxygenSupport}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded px-3 py-2"
              >
                <option value="Aire ambiente">Aire ambiente</option>
                <option value="Cánula binasal">Cánula binasal</option>
                <option value="Máscara simple">Máscara simple</option>
                <option value="Máscara con reservorio">Máscara con reservorio</option>
                <option value="Venturi">Venturi</option>
                <option value="Oxígeno alto flujo">Oxígeno alto flujo</option>
                <option value="Ventilación no invasiva">Ventilación no invasiva</option>
                <option value="Ventilación mecánica">Ventilación mecánica</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                FiO₂ %
              </label>
              <input
                name="fio2"
                value={form.fio2}
                onChange={handleChange}
                type="number"
                className="w-full border border-gray-300 rounded px-3 py-2"
                placeholder="21"
              />
            </div>
          </div>
        </div>

        <div className="p-6 bg-white rounded shadow border border-gray-200">
          <h3 className="text-xl font-bold text-gray-800 mb-4">
            Observaciones de triaje / enfermería
          </h3>

          <textarea
            name="nursingNotes"
            value={form.nursingNotes}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded px-3 py-2"
            rows={4}
            placeholder="Ej. paciente ingresa caminando, en aparente regular estado general..."
          />
        </div>

        <div className="p-6 bg-white rounded shadow border border-gray-200 flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded bg-green-700 text-white font-semibold hover:bg-green-800 disabled:opacity-60"
          >
            {saving ? 'Guardando...' : 'Guardar y continuar a Anamnesis'}
          </button>

          <button
            type="button"
            onClick={handleBackToPatients}
            className="px-4 py-2 rounded bg-gray-200 text-gray-800 font-semibold hover:bg-gray-300"
          >
            Cancelar y volver a Pacientes
          </button>
        </div>
      </form>
    </div>
  );
}