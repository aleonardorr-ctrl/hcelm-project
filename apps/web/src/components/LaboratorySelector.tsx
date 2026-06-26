/**
 * Archivo: LaboratorySelector.tsx
 * Ruta: apps/web/src/components/LaboratorySelector.tsx
 * Funcion: Selecciona examenes y expande perfiles desde el catalogo maestro.
 */
import { useEffect, useMemo, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

type LaboratoryComponent = {
  order: number;
  component: { id: string; code: string; name: string; category: string };
};

type LaboratoryItem = {
  id: string;
  code: string;
  name: string;
  category: string;
  isProfile: boolean;
  profileComponents?: LaboratoryComponent[];
};

type CategoryItem = { category: string; count: number };

type LaboratorySelectorProps = {
  selectedExams: string[];
  onChange: (exams: string[]) => void;
};

function getToken() {
  return sessionStorage.getItem('ame_token') || '';
}

function normalize(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

export default function LaboratorySelector({
  selectedExams,
  onChange,
}: LaboratorySelectorProps) {
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [activeCategory, setActiveCategory] = useState('');
  const [items, setItems] = useState<LaboratoryItem[]>([]);
  const [search, setSearch] = useState('');
  const [customExam, setCustomExam] = useState('');
  const [loading, setLoading] = useState(false);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [error, setError] = useState('');

  const loadCategories = async () => {
    setCategoriesLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE}/laboratory-catalog/categories`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!response.ok) throw new Error('No se pudo cargar el catálogo.');
      const result = await response.json();
      const next: CategoryItem[] = Array.isArray(result) ? result : [];
      setCategories(next);
      setActiveCategory((current) =>
        next.some((item) => item.category === current)
          ? current
          : next[0]?.category || '',
      );
    } catch (reason: any) {
      setError(reason?.message || 'No se pudo cargar el catálogo.');
    } finally {
      setCategoriesLoading(false);
    }
  };

  useEffect(() => {
    void loadCategories();
  }, []);

  useEffect(() => {
    const term = search.trim();
    if (activeCategory === '__CUSTOM__') {
      setItems([]);
      return;
    }
    if (!term && !activeCategory) return;

    const timeout = window.setTimeout(async () => {
      setLoading(true);
      setError('');
      try {
        const url = term.length >= 2
          ? `${API_BASE}/laboratory-catalog/search?q=${encodeURIComponent(term)}`
          : `${API_BASE}/laboratory-catalog/catalog?category=${encodeURIComponent(activeCategory)}&status=active&page=1&pageSize=100`;
        const response = await fetch(url, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        if (!response.ok) throw new Error('No se pudieron cargar los exámenes.');
        const result = await response.json();
        setItems(Array.isArray(result) ? result : result?.items || []);
      } catch (reason: any) {
        setError(reason?.message || 'Error al cargar los exámenes.');
      } finally {
        setLoading(false);
      }
    }, term ? 300 : 0);

    return () => window.clearTimeout(timeout);
  }, [activeCategory, search]);

  const selectedKeys = useMemo(
    () => new Set(selectedExams.map(normalize)),
    [selectedExams],
  );

  const addUnique = (names: string[]) => {
    const merged = [...selectedExams];
    const keys = new Set(merged.map(normalize));
    for (const name of names) {
      const key = normalize(name);
      if (key && !keys.has(key)) {
        merged.push(name);
        keys.add(key);
      }
    }
    onChange(merged);
  };

  const removeNames = (names: string[]) => {
    const keys = new Set(names.map(normalize));
    onChange(selectedExams.filter((exam) => !keys.has(normalize(exam))));
  };

  const componentNames = (item: LaboratoryItem) =>
    (item.profileComponents || [])
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((entry) => entry.component.name);

  const toggleItem = (item: LaboratoryItem) => {
    if (item.isProfile) {
      const components = componentNames(item);
      if (components.length === 0) {
        setError(`El perfil ${item.name} todavía no tiene componentes configurados.`);
        return;
      }
      const allSelected = components.every((name) => selectedKeys.has(normalize(name)));
      if (allSelected) removeNames(components);
      else addUnique(components);
      return;
    }

    if (selectedKeys.has(normalize(item.name))) removeNames([item.name]);
    else addUnique([item.name]);
  };

  const addCustomExam = () => {
    const exam = customExam.trim();
    if (!exam) return;
    addUnique([exam]);
    setCustomExam('');
  };

  return (
    <div className="rounded-lg border bg-white p-4">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-blue-700">Selector de exámenes de laboratorio</h3>
        <p className="text-sm text-slate-500">
          Al marcar un perfil se agregan todos sus componentes, sin duplicarlos.
        </p>
      </div>

      {error && <div className="mb-3 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-lg border bg-slate-50 p-3">
          <p className="mb-2 font-semibold text-slate-700">Categorías</p>
          <div className="max-h-80 space-y-2 overflow-y-auto">
            {categoriesLoading && (
              <div className="rounded border bg-white p-3 text-sm text-slate-500">
                Cargando catálogo...
              </div>
            )}
            {categories.map((category) => (
              <button
                key={category.category}
                type="button"
                onClick={() => { setActiveCategory(category.category); setSearch(''); }}
                className={`w-full rounded border px-3 py-2 text-left text-sm ${activeCategory === category.category ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 bg-white text-slate-700 hover:bg-blue-50'}`}
              >
                {category.category} ({category.count})
              </button>
            ))}
            <button
              type="button"
              onClick={() => { setActiveCategory('__CUSTOM__'); setSearch(''); setItems([]); }}
              className={`w-full rounded border px-3 py-2 text-left text-sm ${activeCategory === '__CUSTOM__' ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 bg-white text-slate-700 hover:bg-blue-50'}`}
            >
              Otros exámenes
            </button>
          </div>
        </div>

        <div className="rounded-lg border bg-slate-50 p-3 lg:col-span-2">
          {!categoriesLoading && categories.length === 0 ? (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-900">
              <p className="font-bold">El catálogo maestro todavía está vacío.</p>
              <p className="mt-1 text-sm">
                Valide y confirme la importación desde Administración → Catálogos
                maestros → Laboratorio. La previsualización por sí sola no crea registros.
              </p>
              <button
                type="button"
                onClick={() => void loadCategories()}
                className="mt-3 rounded bg-amber-700 px-4 py-2 text-sm font-bold text-white"
              >
                Volver a consultar catálogo
              </button>
            </div>
          ) : activeCategory === '__CUSTOM__' ? (
            <div className="rounded-lg border bg-white p-3">
              <p className="mb-2 font-medium text-slate-700">Examen manual</p>
              <div className="flex flex-col gap-2 md:flex-row">
                <input value={customExam} onChange={(event) => setCustomExam(event.target.value)} className="flex-1 rounded border p-2" />
                <button type="button" onClick={addCustomExam} className="rounded bg-blue-600 px-4 py-2 text-white">Agregar</button>
              </div>
            </div>
          ) : (
            <>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por código o nombre..."
                className="mb-3 w-full rounded border p-2"
              />
              <div className="max-h-96 space-y-2 overflow-y-auto">
                {loading && <div className="rounded border bg-white p-3 text-sm text-slate-500">Cargando...</div>}
                {!loading && items.map((item) => {
                  const components = componentNames(item);
                  const checked = item.isProfile
                    ? components.length > 0 && components.every((name) => selectedKeys.has(normalize(name)))
                    : selectedKeys.has(normalize(item.name));
                  return (
                    <label key={item.id} className={`block cursor-pointer rounded border p-3 ${checked ? 'border-blue-400 bg-blue-100' : 'border-slate-200 bg-white'}`}>
                      <div className="flex items-start gap-2">
                        <input type="checkbox" checked={checked} onChange={() => toggleItem(item)} className="mt-1" />
                        <div>
                          <p className="text-sm font-semibold text-slate-700">{item.code} - {item.name}</p>
                          {item.isProfile && (
                            <div className="mt-2 text-xs text-slate-600">
                              <p className="mb-1 font-medium text-blue-700">Incluye {components.length} componente(s):</p>
                              {components.length > 0 ? (
                                <ul className="list-disc space-y-1 pl-5">{components.map((name) => <li key={name}>{name}</li>)}</ul>
                              ) : (
                                <p className="font-semibold text-amber-700">Perfil pendiente de configurar.</p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </label>
                  );
                })}
                {!loading && items.length === 0 && <div className="rounded border bg-white p-3 text-sm text-slate-500">No se encontraron exámenes.</div>}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

