import { useMemo, useState } from 'react';
import { imagingCatalog } from '../data/imagingCatalog';

type ImagingSelectorProps = {
  selectedStudies: string[];
  onChange: (studies: string[]) => void;
};

export default function ImagingSelector({
  selectedStudies,
  onChange,
}: ImagingSelectorProps) {
  const [search, setSearch] = useState('');
  const [customStudy, setCustomStudy] = useState('');
  const [activeCategory, setActiveCategory] = useState(
    imagingCatalog[0]?.category || '',
  );

  const activeCatalog = imagingCatalog.find(
    (item) => item.category === activeCategory,
  );

  const filteredStudies = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) {
      return activeCatalog?.studies || [];
    }

    return imagingCatalog.flatMap((category) =>
      category.studies
        .filter((study) => study.toLowerCase().includes(term))
        .map((study) => `${study} (${category.category})`),
    );
  }, [search, activeCatalog]);

  const normalizeStudyName = (study: string) => {
    return study.replace(/\s+\([^)]+\)$/, '').trim();
  };

  const toggleStudy = (study: string) => {
    const cleanStudy = normalizeStudyName(study);

    if (selectedStudies.includes(cleanStudy)) {
      onChange(selectedStudies.filter((item) => item !== cleanStudy));
      return;
    }

    onChange([...selectedStudies, cleanStudy]);
  };

  const addCustomStudy = () => {
    const study = customStudy.trim();

    if (!study) return;

    if (!selectedStudies.includes(study)) {
      onChange([...selectedStudies, study]);
    }

    setCustomStudy('');
  };

  return (
    <div className="border rounded-lg bg-white p-4">
      <div className="mb-4">
        <h3 className="font-bold text-purple-700 text-lg">
          Selector de imágenes y estudios auxiliares
        </h3>

        <p className="text-sm text-slate-500">
          Seleccione estudios por categoría o búsquelos por nombre.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="border rounded-lg p-3 bg-slate-50">
          <p className="font-semibold text-slate-700 mb-2">
            Categorías
          </p>

          <div className="space-y-2 max-h-80 overflow-y-auto">
            {imagingCatalog.map((category) => (
              <button
                key={category.category}
                type="button"
                onClick={() => {
                  setActiveCategory(category.category);
                  setSearch('');
                }}
                className={`w-full text-left px-3 py-2 rounded text-sm border ${
                  activeCategory === category.category
                    ? 'bg-purple-600 text-white border-purple-600'
                    : 'bg-white text-slate-700 hover:bg-purple-50 border-slate-200'
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
              Buscar estudio
            </label>

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Ejemplo: tomografía, ecografía, resonancia..."
              className="w-full border p-2 rounded"
            />
          </div>

          {activeCatalog?.allowCustom ? (
            <div className="border rounded-lg p-3 bg-white">
              <p className="font-medium text-slate-700 mb-2">
                Otros estudios
              </p>

              <div className="flex flex-col md:flex-row gap-2">
                <input
                  value={customStudy}
                  onChange={(e) => setCustomStudy(e.target.value)}
                  placeholder="Ingrese estudio manualmente"
                  className="flex-1 border p-2 rounded"
                />

                <button
                  type="button"
                  onClick={addCustomStudy}
                  className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
                >
                  Agregar
                </button>
              </div>

              <p className="text-xs text-slate-500 mt-2">
                Utilice este campo para estudios no incluidos en el catálogo.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-80 overflow-y-auto">
              {filteredStudies.map((study) => {
                const cleanStudy = normalizeStudyName(study);
                const checked = selectedStudies.includes(cleanStudy);

                return (
                  <label
                    key={study}
                    className={`flex items-center gap-2 border rounded p-2 cursor-pointer ${
                      checked
                        ? 'bg-purple-100 border-purple-400'
                        : 'bg-white hover:bg-purple-50 border-slate-200'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleStudy(study)}
                    />

                    <span className="text-sm text-slate-700">
                      {study}
                    </span>
                  </label>
                );
              })}

              {filteredStudies.length === 0 && (
                <div className="text-sm text-slate-500 bg-white border rounded p-3 md:col-span-2">
                  No se encontraron estudios con ese criterio.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}