import type { ClinicalReferenceRange } from './clinical-alert.types';

type ClinicalReferenceModalProps = {
  reference: ClinicalReferenceRange | null;
  onClose: () => void;
};

const colorClasses = {
  green: 'bg-green-100 text-green-800 border-green-300',
  yellow: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  orange: 'bg-orange-100 text-orange-800 border-orange-300',
  red: 'bg-red-100 text-red-800 border-red-300',
};

export default function ClinicalReferenceModal({
  reference,
  onClose,
}: ClinicalReferenceModalProps) {
  if (!reference) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-2xl rounded-xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b px-5 py-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800">
              {reference.title}
            </h2>
            {reference.unit && (
              <p className="text-sm text-slate-500">
                Unidad: {reference.unit}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded bg-slate-100 px-3 py-1 text-slate-700 hover:bg-slate-200"
          >
            Cerrar
          </button>
        </div>

        <div className="max-h-[75vh] overflow-y-auto px-5 py-4">
          <p className="mb-4 text-sm text-slate-700">
            {reference.description}
          </p>

          <div className="overflow-hidden rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="border-b px-3 py-2 text-left">Color</th>
                  <th className="border-b px-3 py-2 text-left">Nivel</th>
                  <th className="border-b px-3 py-2 text-left">Criterio</th>
                </tr>
              </thead>
              <tbody>
                {reference.ranges.map((range) => (
                  <tr key={`${range.color}-${range.label}`}>
                    <td className="border-b px-3 py-2">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${
                          colorClasses[range.color]
                        }`}
                      >
                        {range.color === 'green' && 'Verde'}
                        {range.color === 'yellow' && 'Amarillo'}
                        {range.color === 'orange' && 'Naranja'}
                        {range.color === 'red' && 'Rojo'}
                      </span>
                    </td>
                    <td className="border-b px-3 py-2 font-semibold text-slate-800">
                      {range.label}
                    </td>
                    <td className="border-b px-3 py-2 text-slate-700">
                      {range.criteria}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-5">
            <h3 className="mb-2 font-bold text-slate-800">
              Bibliografía y sustento
            </h3>

            <div className="space-y-3">
              {reference.bibliography.map((item, index) => (
                <div
                  key={`${item.title}-${index}`}
                  className="rounded-lg border bg-slate-50 p-3"
                >
                  <p className="font-semibold text-slate-800">
                    {item.title}
                  </p>

                  <p className="text-sm text-slate-600">
                    {[item.institution, item.year].filter(Boolean).join(' · ')}
                  </p>

                  {item.note && (
                    <p className="mt-1 text-sm text-slate-700">
                      {item.note}
                    </p>
                  )}

                  {item.url && (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-block text-sm font-semibold text-blue-700 hover:underline"
                    >
                      Abrir fuente
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>

          <p className="mt-5 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
            Estos valores son una ayuda clínica y no reemplazan el criterio
            médico. Deben interpretarse según contexto, edad, comorbilidades,
            altura, oxigenoterapia, embarazo, medicamentos y evolución.
          </p>
        </div>
      </div>
    </div>
  );
}