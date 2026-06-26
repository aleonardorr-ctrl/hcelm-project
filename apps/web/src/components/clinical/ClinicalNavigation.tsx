import { Link, useLocation, useNavigate } from 'react-router-dom';

type ClinicalNavigationProps = {
  patientId?: string;
  encounterId?: string;
  patientName?: string;
};

type ClinicalNavItem = {
  label: string;
  to: string;
  emoji: string;
};

export default function ClinicalNavigation({
  patientId,
  encounterId,
  patientName,
}: ClinicalNavigationProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const selectedPatientId =
    patientId ||
    sessionStorage.getItem('selectedPatientId') ||
    localStorage.getItem('selectedPatientId') ||
    '';

  const selectedEncounterId =
    encounterId ||
    sessionStorage.getItem('selectedEncounterId') ||
    localStorage.getItem('selectedEncounterId') ||
    '';

  const clinicalItems: ClinicalNavItem[] = [
    {
      label: 'Pacientes',
      to: '/patients',
      emoji: '👥',
    },
    {
      label: 'Nueva atención',
      to: selectedPatientId
        ? `/encounters/new?patientId=${selectedPatientId}`
        : '/patients',
      emoji: '➕',
    },
    {
      label: 'Anamnesis / HCE',
      to: selectedPatientId
        ? `/anamnesis?patientId=${selectedPatientId}${
            selectedEncounterId ? `&encounterId=${selectedEncounterId}` : ''
          }`
        : '/patients',
      emoji: '🩺',
    },
    {
      label: 'Certificados',
      to: '/certificates',
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
            Pacientes, nueva atención, anamnesis, recetas, órdenes y
            certificados.
          </p>

          {patientName ? (
            <p className="text-sm text-emerald-700 font-semibold mt-2">
              Paciente activo: {patientName}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          {clinicalItems.map((item) => {
            const isActive =
              location.pathname === item.to ||
              location.pathname.startsWith(item.to.split('?')[0]);

            return (
              <Link
                key={item.label}
                to={item.to}
                className={
                  isActive
                    ? 'px-3 py-2 rounded-lg bg-cyan-700 text-white text-sm font-semibold shadow-sm'
                    : 'px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold transition'
                }
              >
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