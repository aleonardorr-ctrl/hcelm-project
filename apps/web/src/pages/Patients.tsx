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
  birthDate?: string | null;
  phone?: string | null;
  address?: string | null;
  allergies?: string | null;
  chronicDiseases?: string | null;
  usualMedication?: string | null;
  observations?: string | null;
  isActive?: boolean;
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

  return (
    separatedName ||
    patient.fullName ||
    patient.name ||
    'Paciente sin nombre'
  );
}

function normalizeDateForInput(date?: string | null): string {
  if (!date) return '';
  return date.slice(0, 10);
}

export default function Patients() {
  console.log('👥 Patients.tsx cargado');

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
  const navigate = useNavigate();

  const filteredPatients = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return patients;

    return patients.filter((patient) => {
      const fullName = getFullName(patient).toLowerCase();
      const documentNumber = patient.documentNumber?.toLowerCase() || '';
      const phone = patient.phone?.toLowerCase() || '';
      const documentType = patient.documentType?.toLowerCase() || '';

      return (
        fullName.includes(term) ||
        documentNumber.includes(term) ||
        phone.includes(term) ||
        documentType.includes(term)
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
      setError(
        err instanceof Error ? err.message : 'Error al cargar pacientes.',
      );
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
      setSelectedPatient(savedPatient);
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

    const fullNameParts = (patient.fullName || patient.name || '')
      .trim()
      .split(' ');

    setForm({
      documentType: patient.documentType || 'DNI',
      documentNumber: patient.documentNumber || '',
      firstName: patient.firstName || fullNameParts.slice(2).join(' ') || '',
      paternalLastName: patient.paternalLastName || fullNameParts[0] || '',
      maternalLastName: patient.maternalLastName || fullNameParts[1] || '',
      sex: patient.sex || '',
      birthDate: normalizeDateForInput(patient.birthDate),
      phone: patient.phone || '',
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
        sex: patient.sex,
        birthDate: patient.birthDate,
        age: calculateAge(patient.birthDate),
        phone: patient.phone,
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
                ? ` | DNI: ${selectedPatient.documentNumber}`
                : ''}
              {selectedPatient.birthDate
                ? ` | ${calculateAge(selectedPatient.birthDate)}`
                : ''}
              {selectedPatient.sex ? ` | ${selectedPatient.sex}` : ''}
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => navigate('/new-encounter')}
                className="px-3 py-2 rounded bg-green-700 text-white text-sm font-semibold hover:bg-green-800"
              >
                Nueva atención / Funciones vitales
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
            placeholder="Buscar por DNI, apellidos, nombres o celular"
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
        <div className="p-6 bg-white rounded shadow border border-gray-200">
          <h3 className="text-xl font-bold text-gray-800 mb-4">
            {editingPatientId ? 'Editar paciente' : 'Nuevo paciente'}
          </h3>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Tipo de documento
                </label>
                <select
                  name="documentType"
                  value={form.documentType}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                >
                  <option value="DNI">DNI</option>
                  <option value="CE">Carnet de extranjería</option>
                  <option value="PASAPORTE">Pasaporte</option>
                  <option value="SIN_DOCUMENTO">Sin documento</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Número de documento
                </label>
                <input
                  name="documentNumber"
                  value={form.documentNumber}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  placeholder="Ej. 12345678"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Sexo
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
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Apellido paterno
                </label>
                <input
                  name="paternalLastName"
                  value={form.paternalLastName}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  placeholder="Apellido paterno"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Apellido materno
                </label>
                <input
                  name="maternalLastName"
                  value={form.maternalLastName}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  placeholder="Apellido materno"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Nombres
                </label>
                <input
                  name="firstName"
                  value={form.firstName}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  placeholder="Nombres"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Fecha de nacimiento
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
                  value={calculateAge(form.birthDate)}
                  readOnly
                  className="w-full border border-gray-200 bg-gray-100 rounded px-3 py-2"
                  placeholder="Automático"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Celular
                </label>
                <input
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  placeholder="Celular"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Dirección
                </label>
                <input
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  placeholder="Dirección"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Alergias
                </label>
                <textarea
                  name="allergies"
                  value={form.allergies}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  rows={2}
                  placeholder="Ej. Penicilina, AINES, niega alergias..."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Antecedentes / enfermedades crónicas
                </label>
                <textarea
                  name="chronicDiseases"
                  value={form.chronicDiseases}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  rows={2}
                  placeholder="Ej. HTA, DM2, asma, ERC..."
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Medicación habitual
                </label>
                <textarea
                  name="usualMedication"
                  value={form.usualMedication}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  rows={2}
                  placeholder="Medicamentos que usa habitualmente"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Observaciones
                </label>
                <textarea
                  name="observations"
                  value={form.observations}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  rows={2}
                  placeholder="Observaciones importantes"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded bg-blue-700 text-white font-semibold hover:bg-blue-800 disabled:opacity-60"
              >
                {saving
                  ? 'Guardando...'
                  : editingPatientId
                    ? 'Guardar cambios'
                    : 'Registrar paciente'}
              </button>

              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 rounded bg-gray-200 text-gray-800 font-semibold hover:bg-gray-300"
              >
                Volver al módulo Pacientes
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="p-6 bg-white rounded shadow border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-800">
            Pacientes registrados
          </h3>

          <button
            type="button"
            onClick={loadPatients}
            className="px-3 py-2 rounded bg-gray-100 text-gray-700 text-sm font-semibold hover:bg-gray-200"
          >
            Actualizar
          </button>
        </div>

        {loading ? (
          <p className="text-gray-500">Cargando pacientes...</p>
        ) : filteredPatients.length === 0 ? (
          <p className="text-gray-500">No hay pacientes para mostrar.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border border-gray-200 text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border px-3 py-2 text-left">Documento</th>
                  <th className="border px-3 py-2 text-left">Paciente</th>
                  <th className="border px-3 py-2 text-left">Edad</th>
                  <th className="border px-3 py-2 text-left">Sexo</th>
                  <th className="border px-3 py-2 text-left">Celular</th>
                  <th className="border px-3 py-2 text-left">Acciones</th>
                </tr>
              </thead>

              <tbody>
                {filteredPatients.map((patient) => (
                  <tr key={patient.id} className="hover:bg-gray-50">
                    <td className="border px-3 py-2">
                      {patient.documentNumber || '—'}
                    </td>

                    <td className="border px-3 py-2 font-medium">
                      {getFullName(patient)}
                    </td>

                    <td className="border px-3 py-2">
                      {calculateAge(patient.birthDate) || '—'}
                    </td>

                    <td className="border px-3 py-2">
                      {patient.sex || '—'}
                    </td>

                    <td className="border px-3 py-2">
                      {patient.phone || '—'}
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
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}