import { useMemo, useState } from 'react';
import { laboratoryCatalog } from '../data/laboratoryCatalog';

type LaboratorySelectorProps = {
  selectedExams: string[];
  onChange: (exams: string[]) => void;
};

export default function LaboratorySelector({
  selectedExams,
  onChange,
}: LaboratorySelectorProps) {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState(
    laboratoryCatalog[0]?.category || '',
  );
  const [customExam, setCustomExam] = useState('');

  const activeCatalog = laboratoryCatalog.find(
    (item) => item.category === activeCategory,
  );

  const filteredExams = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) {
      return activeCatalog?.exams || [];
    }

    return laboratoryCatalog.flatMap((category) =>
      category.exams
        .filter((exam) => exam.toLowerCase().includes(term))
        .map((exam) => `${exam} (${category.category})`),
    );
  }, [search, activeCatalog]);

  const normalizeExamName = (exam: string) => {
    return exam.replace(/\s+\([^)]+\)$/, '').trim();
  };

  const toggleExam = (exam: string) => {
    const cleanExam = normalizeExamName(exam);

    if (selectedExams.includes(cleanExam)) {
      onChange(selectedExams.filter((item) => item !== cleanExam));
      return;
    }

    onChange([...selectedExams, cleanExam]);
  };

  const removeExam = (exam: string) => {
    onChange(selectedExams.filter((item) => item !== exam));
  };

  const addCustomExam = () => {
    const exam = customExam.trim();

    if (!exam) return;

    if (selectedExams.includes(exam)) {
      setCustomExam('');
      return;
    }

    onChange([...selectedExams, exam]);
    setCustomExam('');
  };

  const clearAll = () => {
    onChange([]);
  };

  return (
    <div className="border rounded-lg bg-white p-4">
      <div className="mb-4">
        <h3 className="font-bold text-blue-700 text-lg">
          Selector de exámenes de laboratorio
        </h3>
        <p className="text-sm text-slate-500">
          Busque por nombre o seleccione exámenes por categoría. La orden PDF se
          generará con los exámenes seleccionados.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="border rounded-lg p-3 bg-slate-50">
          <p className="font-semibold text-slate-700 mb-2">Categorías</p>

          <div className="space-y-2 max-h-80 overflow-y-auto">
            {laboratoryCatalog.map((category) => (
              <button
                key={category.category}
                type="button"
                onClick={() => {
                  setActiveCategory(category.category);
                  setSearch('');
                }}
                className={`w-full text-left px-3 py-2 rounded text-sm border ${
                  activeCategory === category.category
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-slate-700 hover:bg-blue-50 border-slate-200'
                }`}
              >
                {category.category}
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 border rounded-lg p-3 bg-slate-50">
          <div className="mb-3">
            <label className="block font-medium text-slate-700 mb-1">
              Buscar examen
            </label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Ejemplo: glucosa, hemograma, TSH..."
              className="w-full border p-2 rounded"
            />
          </div>

          {activeCatalog?.allowCustom ? (
            <div className="border rounded-lg p-3 bg-white">
              <p className="font-medium text-slate-700 mb-2">
                Otros exámenes de laboratorio
              </p>

              <div className="flex flex-col md:flex-row gap-2">
                <input
                  value={customExam}
                  onChange={(e) => setCustomExam(e.target.value)}
                  placeholder="Ingrese examen manualmente"
                  className="flex-1 border p-2 rounded"
                />

                <button
                  type="button"
                  onClick={addCustomExam}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Agregar
                </button>
              </div>

              <p className="text-xs text-slate-500 mt-2">
                Use este campo para exámenes no incluidos en el catálogo.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-80 overflow-y-auto">
              {filteredExams.map((exam) => {
                const cleanExam = normalizeExamName(exam);
                const checked = selectedExams.includes(cleanExam);

                return (
                  <label
                    key={exam}
                    className={`flex items-center gap-2 border rounded p-2 cursor-pointer ${
                      checked
                        ? 'bg-blue-100 border-blue-400'
                        : 'bg-white hover:bg-blue-50 border-slate-200'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleExam(exam)}
                    />
                    <span className="text-sm text-slate-700">{exam}</span>
                  </label>
                );
              })}

              {filteredExams.length === 0 && (
                <div className="text-sm text-slate-500 bg-white border rounded p-3 md:col-span-2">
                  No se encontraron exámenes con ese criterio.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 border rounded-lg p-3 bg-blue-50">
        <div className="flex flex-wrap justify-between gap-2 items-center mb-2">
          <p className="font-semibold text-blue-800">
            Exámenes seleccionados ({selectedExams.length})
          </p>

          {selectedExams.length > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="text-red-600 text-sm hover:underline"
            >
              Quitar todos
            </button>
          )}
        </div>

        {selectedExams.length === 0 ? (
          <p className="text-sm text-slate-500">
            Aún no se han seleccionado exámenes.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {selectedExams.map((exam) => (
              <span
                key={exam}
                className="inline-flex items-center gap-2 bg-white border border-blue-200 text-blue-800 px-3 py-1 rounded-full text-sm"
              >
                {exam}
                <button
                  type="button"
                  onClick={() => removeExam(exam)}
                  className="text-red-600 font-bold"
                  title="Quitar"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}