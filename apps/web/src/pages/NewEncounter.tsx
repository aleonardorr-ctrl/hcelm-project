import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

type SelectedPatient = {
  id: string;
  name?: string | null;
  fullName?: string | null;
  documentType?: string | null;
  documentNumber?: string | null;
  birthDate?: string | null;
  age?: string | null;
  gender?: string | null;
  sex?: string | null;
  phone?: string | null;
};

type EncounterForm = {
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

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const emptyForm: EncounterForm = {
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

function getAuthToken() {
  return (
    localStorage.getItem('ame_token') ||
    localStorage.getItem('token') ||
    localStorage.getItem('access_token') ||
    localStorage.getItem('accessToken') ||
    localStorage.getItem('authToken') ||
    localStorage.getItem('jwt')
  );
}

function getSelectedPatient(): SelectedPatient | null {
  const raw = localStorage.getItem('selectedPatient');

  if (!raw) return null;

  try {
    return JSON.parse(raw) as SelectedPatient;
  } catch {
    return null;
  }
}

function isEditVitalsMode(): boolean {
  const searchParams = new URLSearchParams(window.location.search);
  return searchParams.get('mode') === 'edit-vitals';
}

function getSelectedEncounterDraft(
  selectedPatient: SelectedPatient | null,
): Partial<EncounterForm> {
  const editVitalsMode = isEditVitalsMode();

  if (!editVitalsMode) {
    localStorage.removeItem('selectedEncounter');
    return {};
  }

  const raw = localStorage.getItem('selectedEncounter');

  if (!raw) return {};

  try {
    const encounter = JSON.parse(raw);

    const samePatient =
      selectedPatient?.id &&
      encounter?.patientId &&
      String(selectedPatient.id) === String(encounter.patientId);

    if (!samePatient) {
      localStorage.removeItem('selectedEncounter');
      return {};
    }

    const vitalSigns = encounter?.vitalSigns || {};

    return {
      type: encounter?.type || 'consulta',
      reason: encounter?.reason || '',
      systolicBP:
        vitalSigns?.systolicBP !== undefined && vitalSigns?.systolicBP !== null
          ? String(vitalSigns.systolicBP)
          : '',
      diastolicBP:
        vitalSigns?.diastolicBP !== undefined && vitalSigns?.diastolicBP !== null
          ? String(vitalSigns.diastolicBP)
          : '',
      heartRate:
        vitalSigns?.heartRate !== undefined && vitalSigns?.heartRate !== null
          ? String(vitalSigns.heartRate)
          : '',
      respiratoryRate:
        vitalSigns?.respiratoryRate !== undefined &&
        vitalSigns?.respiratoryRate !== null
          ? String(vitalSigns.respiratoryRate)
          : '',
      temperature:
        vitalSigns?.temperature !== undefined && vitalSigns?.temperature !== null
          ? String(vitalSigns.temperature)
          : '',
      oxygenSat:
        vitalSigns?.oxygenSat !== undefined && vitalSigns?.oxygenSat !== null
          ? String(vitalSigns.oxygenSat)
          : '',
      weightKg:
        vitalSigns?.weightKg !== undefined && vitalSigns?.weightKg !== null
          ? String(vitalSigns.weightKg)
          : '',
      heightCm:
        vitalSigns?.heightCm !== undefined && vitalSigns?.heightCm !== null
          ? String(vitalSigns.heightCm)
          : '',
      capillaryGlucose:
        vitalSigns?.capillaryGlucose !== undefined &&
        vitalSigns?.capillaryGlucose !== null
          ? String(vitalSigns.capillaryGlucose)
          : '',
      painScale:
        vitalSigns?.painScale !== undefined && vitalSigns?.painScale !== null
          ? String(vitalSigns.painScale)
          : '',
      consciousness: vitalSigns?.consciousness || 'Alerta',
      glasgowEye:
        vitalSigns?.glasgowEye !== undefined && vitalSigns?.glasgowEye !== null
          ? String(vitalSigns.glasgowEye)
          : '',
      glasgowVerbal:
        vitalSigns?.glasgowVerbal !== undefined &&
        vitalSigns?.glasgowVerbal !== null
          ? String(vitalSigns.glasgowVerbal)
          : '',
      glasgowMotor:
        vitalSigns?.glasgowMotor !== undefined &&
        vitalSigns?.glasgowMotor !== null
          ? String(vitalSigns.glasgowMotor)
          : '',
      oxygenSupport: vitalSigns?.oxygenSupport || 'Aire ambiente',
      fio2:
        vitalSigns?.fio2 !== undefined && vitalSigns?.fio2 !== null
          ? String(vitalSigns.fio2)
          : '',
      nursingNotes: vitalSigns?.nursingNotes || '',
    };
  } catch {
    return {};
  }
}

function getInitialEncounterForm(
  selectedPatient: SelectedPatient | null,
): EncounterForm {
  return {
    ...emptyForm,
    ...getSelectedEncounterDraft(selectedPatient),
  };
}

function isValidUuid(value?: string | null): boolean {
  if (!value) return false;

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function toNumberOrUndefined(value: string): number | undefined {
  if (value.trim() === '') return undefined;

  const numberValue = Number(value);

  if (Number.isNaN(numberValue)) return undefined;

  return numberValue;
}

function toIntegerOrUndefined(value: string): number | undefined {
  if (value.trim() === '') return undefined;

  const numberValue = Number(value);

  if (Number.isNaN(numberValue)) return undefined;

  return Math.trunc(numberValue);
}

function calculateBmi(weightKg: string, heightCm: string): string {
  const weight = Number(weightKg);
  const height = Number(heightCm);

  if (!weight || !height) return '';

  const heightM = height / 100;

  if (heightM <= 0) return '';

  const bmi = weight / (heightM * heightM);

  return bmi.toFixed(2);
}

function calculateGlasgowTotal(
  eye: string,
  verbal: string,
  motor: string,
): string {
  const e = Number(eye);
  const v = Number(verbal);
  const m = Number(motor);

  if (!e && !v && !m) return '';

  return String((e || 0) + (v || 0) + (m || 0));
}

export default function NewEncounter() {
  const navigate = useNavigate();
  const selectedPatient = getSelectedPatient();

  const [patient] = useState<SelectedPatient | null>(selectedPatient);
  const [form, setForm] = useState<EncounterForm>(() =>
    getInitialEncounterForm(selectedPatient),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const bmi = useMemo(
    () => calculateBmi(form.weightKg, form.heightCm),
    [form.weightKg, form.heightCm],
  );

  const glasgowTotal = useMemo(
    () =>
      calculateGlasgowTotal(
        form.glasgowEye,
        form.glasgowVerbal,
        form.glasgowMotor,
      ),
    [form.glasgowEye, form.glasgowVerbal, form.glasgowMotor],
  );

  function handleChange(
    event: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) {
    const { name, value } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function validateForm(): string | null {
  if (!patient?.id) {
    return 'No hay paciente seleccionado. Regrese a Pacientes, seleccione uno y vuelva a iniciar la atención.';
  }

  if (!isValidUuid(patient.id)) {
    return 'El paciente seleccionado no tiene un ID válido. Regrese a Pacientes, presione Actualizar y seleccione nuevamente al paciente.';
  }

  if (!form.reason.trim()) {
    return 'Ingrese el motivo de consulta o atención.';
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

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const token = getAuthToken();

      if (!token) {
        throw new Error(
          'No se encontró token de sesión. Cierre sesión e ingrese nuevamente.',
        );
      }

      const payload = {
        patientId: String(patient!.id),
        type: form.type || 'consulta',
        reason: form.reason.trim(),

        systolicBP: toIntegerOrUndefined(form.systolicBP),
        diastolicBP: toIntegerOrUndefined(form.diastolicBP),
        heartRate: toIntegerOrUndefined(form.heartRate),
        respiratoryRate: toIntegerOrUndefined(form.respiratoryRate),
        temperature: toNumberOrUndefined(form.temperature),
        oxygenSat: toIntegerOrUndefined(form.oxygenSat),

        weightKg: toNumberOrUndefined(form.weightKg),
        heightCm: toNumberOrUndefined(form.heightCm),
        bmi: toNumberOrUndefined(bmi),

        capillaryGlucose: toIntegerOrUndefined(form.capillaryGlucose),
        painScale: toIntegerOrUndefined(form.painScale),

        consciousness: form.consciousness || undefined,
        glasgowEye: toIntegerOrUndefined(form.glasgowEye),
        glasgowVerbal: toIntegerOrUndefined(form.glasgowVerbal),
        glasgowMotor: toIntegerOrUndefined(form.glasgowMotor),
        glasgowTotal: toIntegerOrUndefined(glasgowTotal),

        oxygenSupport: form.oxygenSupport || undefined,
        fio2: toIntegerOrUndefined(form.fio2),
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

        throw new Error(
          message || 'No se pudo guardar la nueva atención.',
        );
      }

      const savedEncounter = await response.json();

      localStorage.setItem('selectedEncounter', JSON.stringify(savedEncounter));

      setSuccess('Atención y funciones vitales guardadas correctamente.');

      navigate(
        `/anamnesis?encounterId=${savedEncounter.id}&section=diagnosticos`,
      );
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

  const patientName = patient?.fullName || patient?.name || 'Paciente no seleccionado';
  const patientDocument = patient?.documentNumber
    ? `${patient.documentType || 'DNI'}: ${patient.documentNumber}`
    : 'Sin documento';

  return (
    <div className="space-y-6">
      <div className="p-6 bg-white rounded shadow border border-gray-200">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-blue-700">
              🩺 Nueva atención + funciones vitales
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Registro inicial de atención, triaje y signos vitales.
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate('/patients')}
            className="px-4 py-2 rounded bg-gray-200 text-gray-800 font-semibold hover:bg-gray-300"
          >
            Volver a Pacientes
          </button>
        </div>

        <div className="mt-4 p-4 border border-blue-200 bg-blue-50 rounded">
          <p className="text-sm text-blue-900">
            <span className="font-bold">Paciente:</span> {patientName}
            {' | '}
            {patientDocument}
            {patient?.age ? ` | ${patient.age}` : ''}
            {patient?.gender || patient?.sex
              ? ` | ${patient.gender || patient.sex}`
              : ''}
            {patient?.phone ? ` | Cel: ${patient.phone}` : ''}
          </p>
        </div>

        {!patient?.id && (
          <div className="mt-4 p-3 rounded border border-red-300 bg-red-50 text-red-700 text-sm">
            No hay paciente seleccionado. Regrese a Pacientes, seleccione uno y vuelva a iniciar la atención.
          </div>
        )}

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

      <form
        onSubmit={handleSubmit}
        className="p-6 bg-white rounded shadow border border-gray-200 space-y-6"
      >
        <div>
          <h3 className="text-lg font-bold text-gray-800 mb-4">
            Datos de la atención
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-1">
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Tipo de atención
              </label>
              <select
                name="type"
                value={form.type}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded px-3 py-2"
              >
                <option value="consulta">Consulta médica</option>
                <option value="topico">Tópico / procedimiento</option>
                <option value="emergencia">Emergencia</option>
                <option value="control">Control</option>
                <option value="triaje">Triaje</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Motivo de consulta o atención
              </label>
              <textarea
                name="reason"
                value={form.reason}
                onChange={handleChange}
                rows={3}
                placeholder="Ejemplo: fiebre, dolor abdominal, control de presión, curación, etc."
                className="w-full border border-gray-300 rounded px-3 py-2"
              />
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-bold text-gray-800 mb-4">
            Funciones vitales
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                PA sistólica
              </label>
              <input
                type="number"
                name="systolicBP"
                value={form.systolicBP}
                onChange={handleChange}
                placeholder="120"
                className="w-full border border-gray-300 rounded px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                PA diastólica
              </label>
              <input
                type="number"
                name="diastolicBP"
                value={form.diastolicBP}
                onChange={handleChange}
                placeholder="80"
                className="w-full border border-gray-300 rounded px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                FC
              </label>
              <input
                type="number"
                name="heartRate"
                value={form.heartRate}
                onChange={handleChange}
                placeholder="78"
                className="w-full border border-gray-300 rounded px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                FR
              </label>
              <input
                type="number"
                name="respiratoryRate"
                value={form.respiratoryRate}
                onChange={handleChange}
                placeholder="18"
                className="w-full border border-gray-300 rounded px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Temperatura °C
              </label>
              <input
                type="number"
                step="0.1"
                name="temperature"
                value={form.temperature}
                onChange={handleChange}
                placeholder="36.7"
                className="w-full border border-gray-300 rounded px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                SpO₂ %
              </label>
              <input
                type="number"
                name="oxygenSat"
                value={form.oxygenSat}
                onChange={handleChange}
                placeholder="98"
                className="w-full border border-gray-300 rounded px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Peso kg
              </label>
              <input
                type="number"
                step="0.1"
                name="weightKg"
                value={form.weightKg}
                onChange={handleChange}
                placeholder="70"
                className="w-full border border-gray-300 rounded px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Talla cm
              </label>
              <input
                type="number"
                step="0.1"
                name="heightCm"
                value={form.heightCm}
                onChange={handleChange}
                placeholder="170"
                className="w-full border border-gray-300 rounded px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                IMC automático
              </label>
              <input
                type="text"
                value={bmi}
                readOnly
                className="w-full border border-gray-300 rounded px-3 py-2 bg-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Glicemia capilar
              </label>
              <input
                type="number"
                name="capillaryGlucose"
                value={form.capillaryGlucose}
                onChange={handleChange}
                placeholder="110"
                className="w-full border border-gray-300 rounded px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Dolor EVA
              </label>
              <input
                type="number"
                name="painScale"
                value={form.painScale}
                onChange={handleChange}
                min={0}
                max={10}
                placeholder="0 - 10"
                className="w-full border border-gray-300 rounded px-3 py-2"
              />
            </div>

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
                <option value="Confuso">Confuso</option>
                <option value="Estupor">Estupor</option>
                <option value="Coma">Coma</option>
              </select>
            </div>
          </div>
        </div>

        <div>
      <h3 className="text-lg font-bold text-gray-800 mb-4">
        Glasgow y soporte respiratorio
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
            <option value="4">4 - Apertura ocular espontánea</option>
            <option value="3">3 - Apertura ocular al llamado</option>
            <option value="2">2 - Apertura ocular al dolor</option>
            <option value="1">1 - No apertura ocular</option>
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
            <option value="5">5 - Orientado y conversa</option>
            <option value="4">4 - Confuso, conversa</option>
            <option value="3">3 - Palabras inapropiadas</option>
            <option value="2">2 - Sonidos incomprensibles</option>
            <option value="1">1 - Sin respuesta verbal</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Glasgow motor
          </label>
          <select
            name="glasgowMotor"
            value={form.glasgowMotor}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded px-3 py-2"
          >
            <option value="">Seleccione</option>
            <option value="6">6 - Obedece órdenes</option>
            <option value="5">5 - Localiza el dolor</option>
            <option value="4">4 - Retira al dolor</option>
            <option value="3">3 - Flexión anormal</option>
            <option value="2">2 - Extensión anormal</option>
            <option value="1">1 - Sin respuesta motora</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Glasgow total
          </label>
          <input
            type="text"
            value={glasgowTotal}
            readOnly
            className="w-full border border-gray-300 rounded px-3 py-2 bg-gray-100 font-bold text-blue-700"
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
            <option value="Mascarilla simple">Mascarilla simple</option>
            <option value="Mascarilla con reservorio">
              Mascarilla con reservorio
            </option>
            <option value="Venturi">Venturi</option>
            <option value="CNAF">Cánula nasal de alto flujo</option>
            <option value="VMNI">Ventilación mecánica no invasiva</option>
            <option value="VMI">Ventilación mecánica invasiva</option>
            <option value="Otro">Otro</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            FiO₂ %
          </label>
          <input
            type="number"
            name="fio2"
            value={form.fio2}
            onChange={handleChange}
            placeholder="21"
            min={21}
            max={100}
            className="w-full border border-gray-300 rounded px-3 py-2"
          />
        </div>

    <div className="md:col-span-2">
      <label className="block text-sm font-semibold text-gray-700 mb-1">
        Interpretación rápida Glasgow
      </label>
      <input
        type="text"
        value={
          glasgowTotal
            ? Number(glasgowTotal) >= 13
              ? 'Leve / conservado'
              : Number(glasgowTotal) >= 9
                ? 'Moderado'
                : 'Severo'
            : ''
        }
        readOnly
        className="w-full border border-gray-300 rounded px-3 py-2 bg-gray-100"
      />
    </div>

    <div className="md:col-span-4">
      <label className="block text-sm font-semibold text-gray-700 mb-1">
        Notas de enfermería / triaje
      </label>
      <textarea
        name="nursingNotes"
        value={form.nursingNotes}
        onChange={handleChange}
        rows={3}
        placeholder="Observaciones iniciales del paciente"
        className="w-full border border-gray-300 rounded px-3 py-2"
      />
    </div>
  </div>
</div>

        <div className="flex flex-col md:flex-row gap-3 md:justify-between pt-4 border-t">
          <button
            type="button"
            onClick={() => navigate('/patients')}
            className="px-4 py-2 rounded bg-gray-200 text-gray-800 font-semibold hover:bg-gray-300"
          >
            Volver
          </button>

          <button
            type="submit"
            disabled={saving || !patient?.id}
            className="px-5 py-2 rounded bg-green-700 text-white font-semibold hover:bg-green-800 disabled:opacity-60"
          >
            {saving
              ? 'Guardando...'
              : 'Guardar atención y continuar a Anamnesis'}
          </button>
        </div>
      </form>
    </div>
  );
}