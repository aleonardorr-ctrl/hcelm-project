// HCELM - pages/Patients.tsx
// Módulo de pacientes: registro, búsqueda, edición, selección y acceso a nueva atención.

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

type Patient = {
  id: string;
  name?: string | null;
  fullName?: string | null;
  documentType?: string | null;
  documentNumber?: string | null;
  firstName?: string | null;
  paternalLastName?: string | null;
  maternalLastName?: string | null;
  sex?: string | null;
  gender?: string | null;
  birthDate?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  allergies?: string | null;
  chronicDiseases?: string | null;
  usualMedication?: string | null;
  observations?: string | null;
  isActive?: boolean;
  encountersCount?: number | null;
  lastEncounterDate?: string | null;
  lastEncounterStatus?: string | null;
  lastDiagnosis?: string | null;
};

type PatientFormState = {
  documentType: string;
  documentNumber: string;
  firstName: string;
  paternalLastName: string;
  maternalLastName: string;
  sex: string;
  birthDate: string;
  phone: string;
  email: string;
  address: string;
  allergies: string;
  chronicDiseases: string;
  usualMedication: string;
  observations: string;
};

const emptyForm: PatientFormState = {
  documentType: 'DNI',
  documentNumber: '',
  firstName: '',
  paternalLastName: '',
  maternalLastName: '',
  sex: '',
  birthDate: '',
  phone: '',
  email: '',
  address: '',
  allergies: '',
  chronicDiseases: '',
  usualMedication: '',
  observations: '',
};

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

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

function calculateAge(birthDate?: string | null): string {
  if (!birthDate) return '';

  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return '';

  const today = new Date();

  let years = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  const dayDiff = today.getDate() - birth.getDate();

  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    years -= 1;
  }

  if (years < 0) return '';

  return `${years} años`;
}

function normalizeDateForInput(date?: string | null): string {
  if (!date) return '';
  return date.slice(0, 10);
}

function formatDateTime(date?: string | null): string {
  if (!date) return '—';

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) return '—';

  return parsedDate.toLocaleString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatEncounterStatus(status?: string | null): string {
  if (!status) return 'Sin atención';

  const normalizedStatus = status.toLowerCase();

  const statusMap: Record<string, string> = {
    open: 'En atención',
    opened: 'En atención',
    active: 'En atención',
    in_progress: 'En atención',
    pending: 'Pendiente',
    completed: 'Finalizada',
    closed: 'Finalizada',
    finished: 'Finalizada',
    cancelled: 'Cancelada',
    canceled: 'Cancelada',
  };

  return statusMap[normalizedStatus] || status;
}

function buildFullNameFromForm(form: PatientFormState): string {
  return [
    form.paternalLastName.trim(),
    form.maternalLastName.trim(),
    form.firstName.trim(),
  ]
    .filter(Boolean)
    .join(' ');
}

function getFullName(patient: Patient): string {
  const separatedName = [
    patient.paternalLastName,
    patient.maternalLastName,
    patient.firstName,
  ]
    .filter(Boolean)
    .join(' ')
    .trim();

  return separatedName || patient.fullName || patient.name || 'Paciente sin nombre';
}

function splitFullName(fullName?: string | null) {
  const parts = (fullName || '').trim().split(/\s+/).filter(Boolean);

  return {
    paternalLastName: parts[0] || '',
    maternalLastName: parts[1] || '',
    firstName: parts.slice(2).join(' ') || '',
  };
}

export default function Patients() {
  console.log('👥 Patients.tsx cargado');

  const navigate = useNavigate();

  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<PatientFormState>(emptyForm);

  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [editingPatientId, setEditingPatientId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const token = getAuthToken();

  const filteredPatients = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return patients;

    return patients.filter((patient) => {
      const fullName = getFullName(patient).toLowerCase();
      const documentNumber = patient.documentNumber?.toLowerCase() || '';
      const phone = patient.phone?.toLowerCase() || '';
      const email = patient.email?.toLowerCase() || '';
      const documentType = patient.documentType?.toLowerCase() || '';
      const lastDiagnosis = patient.lastDiagnosis?.toLowerCase() || '';
      const lastEncounterStatus = patient.lastEncounterStatus?.toLowerCase() || '';

      return (
        fullName.includes(term) ||
        documentNumber.includes(term) ||
        phone.includes(term) ||
        email.includes(term) ||
        documentType.includes(term) ||
        lastDiagnosis.includes(term) ||
        lastEncounterStatus.includes(term)
      );
    });
  }, [patients, search]);

  async function loadPatients() {
    try {
      setLoading(true);
      setError('');

      if (!token) {
        throw new Error(
          'No se encontró token de sesión. Cierre sesión e ingrese nuevamente.',
        );
      }

      const response = await fetch(`${API_URL}/patients`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const backendError = await response.json().catch(() => null);

        const message = Array.isArray(backendError?.message)
          ? backendError.message.join(' | ')
          : backendError?.message || backendError?.error;

        throw new Error(
          `Error ${response.status}: ${
            message || 'No se pudo cargar la lista de pacientes.'
          }`,
        );
      }

      const data = await response.json();

      if (Array.isArray(data)) {
        setPatients(data);
      } else if (Array.isArray(data.items)) {
        setPatients(data.items);
      } else {
        setPatients([]);
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Error al cargar pacientes.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPatients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleChange(
    event: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) {
    const { name, value } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingPatientId(null);
    setShowForm(false);
  }

  function validateForm(): string | null {
    if (!form.firstName.trim()) return 'Ingrese los nombres del paciente.';
    if (!form.paternalLastName.trim()) return 'Ingrese el apellido paterno.';
    if (!form.documentType.trim()) return 'Seleccione el tipo de documento.';

    if (form.documentType !== 'SIN_DOCUMENTO' && !form.documentNumber.trim()) {
      return 'Ingrese el número de documento.';
    }

    if (!form.birthDate) {
      return 'Ingrese la fecha de nacimiento.';
    }

    if (form.birthDate) {
      const birth = new Date(form.birthDate);
      const today = new Date();

      if (birth > today) {
        return 'La fecha de nacimiento no puede ser futura.';
      }
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

      if (!token) {
        throw new Error(
          'No se encontró token de sesión. Cierre sesión e ingrese nuevamente.',
        );
      }

      const fullName = buildFullNameFromForm(form);

      const payload = {
        documentType: form.documentType,
        documentNumber: form.documentNumber.trim(),
        fullName,
        birthDate: form.birthDate,

        gender: form.sex || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        address: form.address.trim() || null,
        allergies: form.allergies.trim() || null,
        chronicDiseases: form.chronicDiseases.trim() || null,
        usualMedication: form.usualMedication.trim() || null,
        observations: form.observations.trim() || null,
      };

      const url = editingPatientId
        ? `${API_URL}/patients/${editingPatientId}`
        : `${API_URL}/patients`;

      const method = editingPatientId ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
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
          message ||
            'No se pudo guardar el paciente. Revise los datos ingresados.',
        );
      }

      const savedPatient = await response.json();

    setSuccess(
      editingPatientId
        ? 'Paciente actualizado correctamente.'
        : 'Paciente registrado correctamente.',
    );

    const savedPatientFullName = getFullName(savedPatient);

    setSelectedPatient(savedPatient);

    localStorage.setItem(
      'selectedPatient',
      JSON.stringify({
        id: savedPatient.id,
        name: savedPatient.name,
        fullName: savedPatientFullName,
        documentType: savedPatient.documentType,
        documentNumber: savedPatient.documentNumber,
        firstName: savedPatient.firstName,
        paternalLastName: savedPatient.paternalLastName,
        maternalLastName: savedPatient.maternalLastName,
        gender: savedPatient.gender || savedPatient.sex,
        sex: savedPatient.gender || savedPatient.sex,
        birthDate: savedPatient.birthDate,
        age: calculateAge(savedPatient.birthDate),
        phone: savedPatient.phone,
        email: savedPatient.email,
        address: savedPatient.address,
        allergies: savedPatient.allergies,
        chronicDiseases: savedPatient.chronicDiseases,
        usualMedication: savedPatient.usualMedication,
        observations: savedPatient.observations,
      }),
    );

    resetForm();
    await loadPatients();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Error al guardar paciente.');
    } finally {
      setSaving(false);
    }
  }

  function handleNewPatient() {
    setError('');
    setSuccess('');
    setSelectedPatient(null);
    setEditingPatientId(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function handleEditPatient(patient: Patient) {
    setError('');
    setSuccess('');
    setSelectedPatient(patient);
    setEditingPatientId(patient.id);

    const splitName = splitFullName(patient.fullName || patient.name);

    setForm({
      documentType: patient.documentType || 'DNI',
      documentNumber: patient.documentNumber || '',
      firstName: patient.firstName || splitName.firstName || '',
      paternalLastName: patient.paternalLastName || splitName.paternalLastName || '',
      maternalLastName: patient.maternalLastName || splitName.maternalLastName || '',
      sex: patient.gender || patient.sex || '',
      birthDate: normalizeDateForInput(patient.birthDate),
      phone: patient.phone || '',
      email: patient.email || '',
      address: patient.address || '',
      allergies: patient.allergies || '',
      chronicDiseases: patient.chronicDiseases || '',
      usualMedication: patient.usualMedication || '',
      observations: patient.observations || '',
    });

    setShowForm(true);
  }

  function handleSelectPatient(patient: Patient) {
    const patientFullName = getFullName(patient);

    setSelectedPatient(patient);
    setSuccess(`Paciente seleccionado: ${patientFullName}`);
    setError('');

    localStorage.setItem(
      'selectedPatient',
      JSON.stringify({
        id: patient.id,
        name: patient.name,
        fullName: patientFullName,
        documentType: patient.documentType,
        documentNumber: patient.documentNumber,
        firstName: patient.firstName,
        paternalLastName: patient.paternalLastName,
        maternalLastName: patient.maternalLastName,
        gender: patient.gender || patient.sex,
        sex: patient.gender || patient.sex,
        birthDate: patient.birthDate,
        age: calculateAge(patient.birthDate),
        phone: patient.phone,
        email: patient.email,
        address: patient.address,
        allergies: patient.allergies,
        chronicDiseases: patient.chronicDiseases,
        usualMedication: patient.usualMedication,
        observations: patient.observations,
        encountersCount: patient.encountersCount,
        lastEncounterDate: patient.lastEncounterDate,
        lastEncounterStatus: patient.lastEncounterStatus,
        lastDiagnosis: patient.lastDiagnosis,
      }),
    );
  }

  function handleSearch() {
    setSearch(search.trim());
    setError('');
  }

  function handleClearSearch() {
    setSearch('');
    setError('');
  }

  function goToNewEncounter() {
    if (!selectedPatient) {
      setError('Primero seleccione un paciente.');
      return;
    }

    navigate('/new-encounter');
  }

  function goToAnamnesis() {
    if (!selectedPatient) {
      setError('Primero seleccione un paciente.');
      return;
    }

    navigate('/anamnesis');
  }

  return (
    <div className="space-y-6">
      <div className="p-6 bg-white rounded shadow border border-gray-200">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-blue-700">
              👥 Módulo de Pacientes
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Registro, búsqueda, edición y selección de pacientes.
            </p>
          </div>

          <button
            type="button"
            onClick={handleNewPatient}
            className="px-4 py-2 rounded bg-blue-700 text-white font-semibold hover:bg-blue-800"
          >
            + Nuevo paciente
          </button>
        </div>

        {selectedPatient && (
          <div className="mt-4 p-4 border border-blue-200 bg-blue-50 rounded">
            <p className="text-sm text-blue-900">
              <span className="font-bold">Paciente seleccionado:</span>{' '}
              {getFullName(selectedPatient)}
              {selectedPatient.documentNumber
                ? ` | ${selectedPatient.documentType || 'DNI'}: ${
                    selectedPatient.documentNumber
                  }`
                : ''}
              {selectedPatient.birthDate
                ? ` | ${calculateAge(selectedPatient.birthDate)}`
                : ''}
              {selectedPatient.gender || selectedPatient.sex
                ? ` | ${selectedPatient.gender || selectedPatient.sex}`
                : ''}
              {selectedPatient.phone ? ` | Cel: ${selectedPatient.phone}` : ''}
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={goToNewEncounter}
                className="px-3 py-2 rounded bg-green-700 text-white text-sm font-semibold hover:bg-green-800"
              >
                Nueva atención / Funciones vitales
              </button>

              <button
                type="button"
                onClick={goToAnamnesis}
                className="px-3 py-2 rounded bg-purple-700 text-white text-sm font-semibold hover:bg-purple-800"
              >
                Ir a anamnesis
              </button>

              <button
                type="button"
                onClick={() =>
                  setError('Historial de paciente pendiente de implementación.')
                }
                className="px-3 py-2 rounded bg-gray-700 text-white text-sm font-semibold hover:bg-gray-800"
              >
                Ver historial
              </button>
            </div>
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

      <div className="p-6 bg-white rounded shadow border border-gray-200">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Buscar paciente
        </label>

        <div className="flex flex-col md:flex-row gap-3">
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                handleSearch();
              }
            }}
            placeholder="Buscar por DNI, apellidos, nombres, celular o correo"
            className="flex-1 border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <button
            type="button"
            onClick={handleSearch}
            className="px-4 py-2 rounded bg-blue-700 text-white font-semibold hover:bg-blue-800"
          >
            Buscar
          </button>

          <button
            type="button"
            onClick={handleClearSearch}
            className="px-4 py-2 rounded bg-gray-200 text-gray-800 font-semibold hover:bg-gray-300"
          >
            Limpiar
          </button>
        </div>

        {search.trim() && (
          <p className="text-sm text-gray-500 mt-2">
            Resultados encontrados: {filteredPatients.length}
          </p>
        )}
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="p-6 bg-white rounded shadow border border-gray-200 space-y-5"
        >
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-xl font-bold text-gray-800">
                {editingPatientId ? 'Editar paciente' : 'Registrar nuevo paciente'}
              </h3>
              <p className="text-sm text-gray-500">
                Complete los datos administrativos y clínicos relevantes.
              </p>
            </div>

            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 rounded bg-gray-200 text-gray-800 font-semibold hover:bg-gray-300"
            >
              Cancelar
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Tipo documento
              </label>
              <select
                name="documentType"
                value={form.documentType}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded px-3 py-2"
              >
                <option value="DNI">DNI</option>
                <option value="CE">Carné de extranjería</option>
                <option value="PASAPORTE">Pasaporte</option>
                <option value="SIN_DOCUMENTO">Sin documento</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Número documento
              </label>
              <input
                type="text"
                name="documentNumber"
                value={form.documentNumber}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded px-3 py-2"
                placeholder="Ejemplo: 12345678"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Fecha nacimiento
              </label>
              <input
                type="date"
                name="birthDate"
                value={form.birthDate}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Edad
              </label>
              <input
                type="text"
                value={calculateAge(form.birthDate)}
                readOnly
                className="w-full border border-gray-300 rounded px-3 py-2 bg-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Apellido paterno
              </label>
              <input
                type="text"
                name="paternalLastName"
                value={form.paternalLastName}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Apellido materno
              </label>
              <input
                type="text"
                name="maternalLastName"
                value={form.maternalLastName}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded px-3 py-2"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Nombres
              </label>
              <input
                type="text"
                name="firstName"
                value={form.firstName}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Género
              </label>
              <select
                name="sex"
                value={form.sex}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded px-3 py-2"
              >
                <option value="">Seleccione</option>
                <option value="Masculino">Masculino</option>
                <option value="Femenino">Femenino</option>
                <option value="No especificado">No especificado</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Celular
              </label>
              <input
                type="text"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded px-3 py-2"
                placeholder="999888777"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Correo
              </label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded px-3 py-2"
                placeholder="correo@ejemplo.com"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Dirección
              </label>
              <input
                type="text"
                name="address"
                value={form.address}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded px-3 py-2"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Alergias
              </label>
              <textarea
                name="allergies"
                value={form.allergies}
                onChange={handleChange}
                rows={3}
                className="w-full border border-gray-300 rounded px-3 py-2"
                placeholder="Ejemplo: penicilina, AINES, alimentos, etc."
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Antecedentes / enfermedades crónicas
              </label>
              <textarea
                name="chronicDiseases"
                value={form.chronicDiseases}
                onChange={handleChange}
                rows={3}
                className="w-full border border-gray-300 rounded px-3 py-2"
                placeholder="Ejemplo: HTA, DM2, asma, ERC, cardiopatía, etc."
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Medicación habitual
              </label>
              <textarea
                name="usualMedication"
                value={form.usualMedication}
                onChange={handleChange}
                rows={3}
                className="w-full border border-gray-300 rounded px-3 py-2"
                placeholder="Ejemplo: losartán 50 mg cada 24 h"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Observaciones
              </label>
              <textarea
                name="observations"
                value={form.observations}
                onChange={handleChange}
                rows={3}
                className="w-full border border-gray-300 rounded px-3 py-2"
                placeholder="Observaciones administrativas o clínicas relevantes"
              />
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-3 md:justify-end pt-4 border-t">
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 rounded bg-gray-200 text-gray-800 font-semibold hover:bg-gray-300"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded bg-blue-700 text-white font-semibold hover:bg-blue-800 disabled:opacity-60"
            >
              {saving
                ? 'Guardando...'
                : editingPatientId
                  ? 'Guardar cambios'
                  : 'Registrar paciente'}
            </button>
          </div>
        </form>
      )}

      <div className="p-6 bg-white rounded shadow border border-gray-200">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-gray-800">Lista de pacientes</h3>
            <p className="text-sm text-gray-500">
              Total: {patients.length} paciente(s)
            </p>
          </div>

          <button
            type="button"
            onClick={loadPatients}
            disabled={loading}
            className="px-4 py-2 rounded bg-gray-200 text-gray-800 font-semibold hover:bg-gray-300 disabled:opacity-60"
          >
            {loading ? 'Actualizando...' : 'Actualizar'}
          </button>
        </div>

        {loading ? (
          <div className="text-gray-500 text-sm">Cargando pacientes...</div>
        ) : filteredPatients.length === 0 ? (
          <div className="text-gray-500 text-sm">
            No se encontraron pacientes.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border border-gray-200 text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border px-3 py-2 text-left">Documento</th>
                  <th className="border px-3 py-2 text-left">Paciente</th>
                  <th className="border px-3 py-2 text-left">Edad</th>
                  <th className="border px-3 py-2 text-left">Género</th>
                  <th className="border px-3 py-2 text-left">Celular</th>
                  <th className="border px-3 py-2 text-left">Última atención</th>
                  <th className="border px-3 py-2 text-left">N° atenciones</th>
                  <th className="border px-3 py-2 text-left">Último diagnóstico</th>
                  <th className="border px-3 py-2 text-left">Estado</th>
                  <th className="border px-3 py-2 text-left">Acciones</th>
                </tr>
              </thead>

              <tbody>
                {filteredPatients.map((patient) => (
                  <tr key={patient.id} className="hover:bg-gray-50">
                    <td className="border px-3 py-2">
                      {patient.documentType || 'DNI'}{' '}
                      {patient.documentNumber || '—'}
                    </td>

                    <td className="border px-3 py-2 font-medium">
                      {getFullName(patient)}
                    </td>

                    <td className="border px-3 py-2">
                      {calculateAge(patient.birthDate) || '—'}
                    </td>

                    <td className="border px-3 py-2">
                      {patient.gender || patient.sex || '—'}
                    </td>

                    <td className="border px-3 py-2">
                      {patient.phone || '—'}
                    </td>

                    <td className="border px-3 py-2">
                      {formatDateTime(patient.lastEncounterDate)}
                    </td>

                    <td className="border px-3 py-2 text-center">
                      {patient.encountersCount ?? 0}
                    </td>

                    <td className="border px-3 py-2 max-w-xs">
                      <span className="line-clamp-2">
                        {patient.lastDiagnosis || '—'}
                      </span>
                    </td>

                    <td className="border px-3 py-2">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                          patient.lastEncounterStatus
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {formatEncounterStatus(patient.lastEncounterStatus)}
                      </span>
                    </td>

                    <td className="border px-3 py-2">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleSelectPatient(patient)}
                          className="px-3 py-1 rounded bg-green-700 text-white text-xs font-semibold hover:bg-green-800"
                        >
                          Seleccionar
                        </button>

                        <button
                          type="button"
                          onClick={() => handleEditPatient(patient)}
                          className="px-3 py-1 rounded bg-blue-700 text-white text-xs font-semibold hover:bg-blue-800"
                        >
                          Editar
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            handleSelectPatient(patient);
                            navigate('/new-encounter');
                          }}
                          className="px-3 py-1 rounded bg-purple-700 text-white text-xs font-semibold hover:bg-purple-800"
                        >
                          Nueva atención
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>          </div>
        )}
      </div>
    </div>
  );
}