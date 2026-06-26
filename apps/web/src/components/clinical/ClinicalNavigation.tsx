import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';

type ClinicalNavigationProps = {
  patientId?: string;
  encounterId?: string;
  patientName?: string;
};

type ClinicalNavItem = {
  label: string;
  to: string;
  emoji: string;
  disabled?: boolean;
  helper?: string;
};

function getStoredObjectId(storageKey: string): string {
  const raw =
    sessionStorage.getItem(storageKey) || localStorage.getItem(storageKey);

  if (!raw) return '';

  try {
    const parsed = JSON.parse(raw);

    return String(parsed?.id || parsed?.patientId || parsed?.encounterId || '');
  } catch {
    return '';
  }
}

function getStoredPatientName(): string {
  const raw =
    sessionStorage.getItem('selectedPatient') ||
    localStorage.getItem('selectedPatient');

  if (!raw) return '';

  try {
    const patient = JSON.parse(raw);

    const fullName =
      patient?.fullName ||
      [patient?.lastName, patient?.secondLastName, patient?.firstName]
        .filter(Boolean)
        .join(' ') ||
      [patient?.paternalSurname, patient?.maternalSurname, patient?.names]
        .filter(Boolean)
        .join(' ');

    return fullName || '';
  } catch {
    return '';
  }
}

export default function ClinicalNavigation({
  patientId,
  encounterId,
  patientName,
}: ClinicalNavigationProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const patientIdFromUrl = searchParams.get('patientId') || '';
  const encounterIdFromUrl = searchParams.get('encounterId') || '';

  const selectedPatientId =
    patientId ||
    patientIdFromUrl ||
    sessionStorage.getItem('selectedPatientId') ||
    localStorage.getItem('selectedPatientId') ||
    getStoredObjectId('selectedPatient') ||
    '';

  const selectedEncounterId =
    encounterId ||
    encounterIdFromUrl ||
    sessionStorage.getItem('selectedEncounterId') ||
    localStorage.getItem('selectedEncounterId') ||
    getStoredObjectId('selectedEncounter') ||
    '';

  const activePatientName = patientName || getStoredPatientName();

  const hasPatient = Boolean(selectedPatientId);

  const clinicalItems: ClinicalNavItem[] = [
    {
      label: 'Pacientes',
      to: '/patients',
      emoji: '👥',
    },
    {
      label: 'Nueva atención',
      to: hasPatient
        ? `/new-encounter?patientId=${selectedPatientId}`
        : '/patients',
      emoji: '➕',
      disabled: !hasPatient,
      helper: 'Primero seleccione un paciente',
    },
    {
      label: 'Anamnesis / HCE',
      to: hasPatient
        ? `/anamnesis?patientId=${selectedPatientId}${
            selectedEncounterId ? `&encounterId=${selectedEncounterId}` : ''
          }`
        : '/patients',
      emoji: '🩺',
      disabled: !hasPatient,
      helper: 'Primero seleccione un paciente',
    },
    {
      label: 'Certificados',
      to: hasPatient
        ? `/certificates?patientId=${selectedPatientId}`
        : '/certificates',
      emoji: '📄',
    },
    {
      label: 'Catálogos clínicos',
      to: '/admin/catalogs',
      emoji: '📚',
    },
  ];

  const goBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate('/home');
  };

  return (
    <section className="bg-white border rounded-2xl shadow-sm p-4 mb-5">
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-cyan-700 font-bold">
            Módulo clínico
          </p>

          <h2 className="text-xl font-bold text-slate-800">
            Atención clínica
          </h2>

          <p className="text-sm text-slate-500 mt-1">
            Pacientes, nueva atención, anamnesis, recetas, órdenes y certificados.
          </p>

          {hasPatient ? (
            <p className="text-sm text-emerald-700 font-semibold mt-2">
              Paciente activo:{' '}
              {activePatientName || `ID ${selectedPatientId}`}
            </p>
          ) : (
            <p className="text-sm text-amber-700 font-semibold mt-2">
              No hay paciente activo. Seleccione un paciente para abrir nueva atención o anamnesis.
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {clinicalItems.map((item) => {
            const basePath = item.to.split('?')[0];

            const isActive =
              location.pathname === basePath ||
              location.pathname.startsWith(`${basePath}/`);

            const className = item.disabled
              ? 'px-3 py-2 rounded-lg bg-slate-100 text-slate-400 text-sm font-semibold cursor-not-allowed'
              : isActive
                ? 'px-3 py-2 rounded-lg bg-cyan-700 text-white text-sm font-semibold shadow-sm'
                : 'px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold transition';

            if (item.disabled) {
              return (
                <button
                  key={item.label}
                  type="button"
                  className={className}
                  title={item.helper}
                  onClick={() => navigate('/patients')}
                >
                  <span className="mr-1">{item.emoji}</span>
                  {item.label}
                </button>
              );
            }

            return (
              <Link key={item.label} to={item.to} className={className}>
                <span className="mr-1">{item.emoji}</span>
                {item.label}
              </Link>
            );
          })}

          <button
            type="button"
            onClick={goBack}
            className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-sm font-semibold transition"
          >
            ← Volver
          </button>

          <Link
            to="/home"
            className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition"
          >
            🏠 Plataforma
          </Link>
        </div>
      </div>
    </section>
  );
}