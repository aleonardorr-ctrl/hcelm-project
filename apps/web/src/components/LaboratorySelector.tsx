import { useMemo, useState } from 'react';
import { laboratoryCatalog } from '../data/laboratoryCatalog';
import type { LaboratoryExamItem } from '../data/laboratoryCatalog';

type LaboratorySelectorProps = {
  selectedExams: string[];
  onChange: (exams: string[]) => void;
};

function isProfile(item: LaboratoryExamItem): item is { name: string; components: string[] } {
  return typeof item !== 'string';
}

function getItemName(item: LaboratoryExamItem) {
  return typeof item === 'string' ? item : item.name;
}

export default function LaboratorySelector({ selectedExams, onChange }: LaboratorySelectorProps) {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState(laboratoryCatalog[0]?.category || '');
  const [customExam, setCustomExam] = useState('');

  const activeCatalog = laboratoryCatalog.find((item) => item.category === activeCategory);

  const filteredExams = useMemo(() => {
    const term = search.trim().toLowerCase();

    const source = search.trim()
      ? laboratoryCatalog.flatMap((category) => category.exams)
      : activeCatalog?.exams || [];

    return source.filter((item) => getItemName(item).toLowerCase().includes(term));
  }, [search, activeCatalog]);

  const addUnique = (items: string[]) => {
    const merged = [...selectedExams];

    items.forEach((item) => {
      if (!merged.includes(item)) merged.push(item);
    });

    onChange(merged);
  };

  const removeItems = (items: string[]) => {
    onChange(selectedExams.filter((exam) => !items.includes(exam)));
  };

  const toggleItem = (item: LaboratoryExamItem) => {
    if (isProfile(item)) {
      const allSelected = item.components.every((component) =>
        selectedExams.includes(component),
      );

      if (allSelected) {
        removeItems(item.components);
      } else {
        addUnique(item.components);
      }

      return;
    }

    if (selectedExams.includes(item)) {
      onChange(selectedExams.filter((exam) => exam !== item));
    } else {
      onChange([...selectedExams, item]);
    }
  };

  const addCustomExam = () => {
    const exam = customExam.trim();
    if (!exam) return;

    if (!selectedExams.includes(exam)) {
      onChange([...selectedExams, exam]);
    }

    setCustomExam('');
  };

  return (
    <div className="border rounded-lg bg-white p-4">
      <div className="mb-4">
        <h3 className="font-bold text-blue-700 text-lg">
          Selector de exámenes de laboratorio
        </h3>
        <p className="text-sm text-slate-500">
          Los perfiles agregan automáticamente sus exámenes componentes para facilitar la
          orden y el cobro individual posterior.
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
              Buscar examen o perfil
            </label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Ejemplo: glucosa, perfil hepático, TSH..."
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
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredExams.map((item) => {
                const label = getItemName(item);
                const checked = isProfile(item)
                  ? item.components.every((component) => selectedExams.includes(component))
                  : selectedExams.includes(item);

                return (
                  <div
                    key={label}
                    className={`border rounded p-3 ${
                      checked ? 'bg-blue-100 border-blue-400' : 'bg-white border-slate-200'
                    }`}
                  >
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleItem(item)}
                        className="mt-1"
                      />

                      <div>
                        <p className="text-sm font-semibold text-slate-700">
                          {label}
                        </p>

                        {isProfile(item) && (
                          <div className="mt-2 text-xs text-slate-600">
                            <p className="font-medium text-blue-700 mb-1">
                              Incluye:
                            </p>
                            <ul className="list-disc pl-5 space-y-1">
                              {item.components.map((component) => (
                                <li key={component}>{component}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </label>
                  </div>
                );
              })}

              {filteredExams.length === 0 && (
                <div className="text-sm text-slate-500 bg-white border rounded p-3">
                  No se encontraron exámenes con ese criterio.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}