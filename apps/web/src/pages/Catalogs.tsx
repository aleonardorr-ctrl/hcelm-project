/**
 * Archivo: Catalogs.tsx
 * Ruta: apps/web/src/pages/Catalogs.tsx
 * Función: Administración de plantillas e importaciones de catálogos maestros.
 */
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

type CatalogSystem = 'CIE10' | 'CIE11';
type ImportAction = 'CREATE' | 'UPDATE' | 'UNCHANGED';

type ValidRow = {
  rowNumber: number;
  code: string;
  description: string;
  chapter?: string | null;
  group?: string | null;
  subgroup?: string | null;
  synonyms?: string[];
  active: boolean;
  action: ImportAction;
};

type InvalidRow = {
  rowNumber: number;
  code?: string | null;
  description?: string | null;
  errors: string[];
};

type PreviewResponse = {
  previewId: string;
  system: CatalogSystem;
  summary: {
    totalRows: number;
    validRows: number;
    invalidRows: number;
    toCreate: number;
    toUpdate: number;
    unchanged: number;
  };
  validRows: ValidRow[];
  invalidRows: InvalidRow[];
  previewLimited?: boolean;
};

type CatalogItem = {
  id: string;
  code: string;
  description: string;
  chapter?: string | null;
  synonyms?: string[];
  active: boolean;
  source?: string | null;
  updatedAt: string;
};

type CatalogResponse = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  items: CatalogItem[];
};

type ImportRecord = {
  id: string;
  sourceFileName: string;
  status: string;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  createdRows: number;
  updatedRows: number;
  skippedRows: number;
  createdAt: string;
  completedAt?: string | null;
};

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const actionLabels: Record<ImportAction, string> = {
  CREATE: 'Crear',
  UPDATE: 'Actualizar',
  UNCHANGED: 'Sin cambios',
};

const actionClasses: Record<ImportAction, string> = {
  CREATE: 'bg-emerald-100 text-emerald-800',
  UPDATE: 'bg-blue-100 text-blue-800',
  UNCHANGED: 'bg-slate-100 text-slate-700',
};

function getToken() {
  return localStorage.getItem('ame_token') || '';
}

async function readError(response: Response, fallback: string) {
  try {
    const result = await response.json();
    if (Array.isArray(result?.message)) return result.message.join(' ');
    return result?.message || fallback;
  } catch {
    return fallback;
  }
}

function formatDateTime(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString('es-PE');
}

export default function Catalogs() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [system, setSystem] = useState<CatalogSystem>('CIE10');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [view, setView] = useState<'import' | 'records' | 'history'>('import');
  const [catalogQuery, setCatalogQuery] = useState('');
  const [catalogStatus, setCatalogStatus] = useState('all');
  const [catalogPage, setCatalogPage] = useState(1);
  const [catalog, setCatalog] = useState<CatalogResponse | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [imports, setImports] = useState<ImportRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  function resetImport(nextSystem?: CatalogSystem) {
    if (nextSystem) setSystem(nextSystem);
    setFile(null);
    setPreview(null);
    setError('');
    setSuccess('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    setCatalogPage(1);
    setCatalog(null);
    setImports([]);
  }

  async function loadCatalog() {
    setCatalogLoading(true);
    setError('');

    try {
      const params = new URLSearchParams({
        system,
        q: catalogQuery.trim(),
        status: catalogStatus,
        page: String(catalogPage),
        pageSize: '50',
      });
      const response = await fetch(`${API_BASE}/diagnoses/catalog?${params}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!response.ok) {
        throw new Error(await readError(response, 'No se pudo cargar el catálogo.'));
      }
      setCatalog(await response.json());
    } catch (err: any) {
      setError(err?.message || 'Error al cargar el catálogo.');
    } finally {
      setCatalogLoading(false);
    }
  }

  async function loadImportHistory() {
    setHistoryLoading(true);
    setError('');
    try {
      const response = await fetch(
        `${API_BASE}/diagnoses/imports?system=${system}`,
        { headers: { Authorization: `Bearer ${getToken()}` } },
      );
      if (!response.ok) {
        throw new Error(await readError(response, 'No se pudo cargar el historial.'));
      }
      const result = await response.json();
      setImports(Array.isArray(result) ? result : []);
    } catch (err: any) {
      setError(err?.message || 'Error al cargar el historial.');
    } finally {
      setHistoryLoading(false);
    }
  }

  async function changeCatalogStatus(item: CatalogItem) {
    const nextActive = !item.active;
    const confirmed = window.confirm(
      `${nextActive ? 'Activar' : 'Inactivar'} ${item.code} - ${item.description}?`,
    );
    if (!confirmed) return;

    setError('');
    setSuccess('');
    try {
      const response = await fetch(
        `${API_BASE}/diagnoses/catalog/${item.id}/status`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${getToken()}`,
          },
          body: JSON.stringify({ active: nextActive }),
        },
      );
      if (!response.ok) {
        throw new Error(await readError(response, 'No se pudo cambiar el estado.'));
      }
      const result = await response.json();
      setSuccess(result?.message || 'Estado actualizado correctamente.');
      await loadCatalog();
    } catch (err: any) {
      setError(err?.message || 'Error al cambiar el estado.');
    }
  }

  useEffect(() => {
    if (view !== 'records') return;
    const timeout = window.setTimeout(loadCatalog, 300);
    return () => window.clearTimeout(timeout);
  }, [view, system, catalogQuery, catalogStatus, catalogPage]);

  useEffect(() => {
    if (view === 'history') loadImportHistory();
  }, [view, system]);

  async function downloadTemplate() {
    setDownloading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(
        `${API_BASE}/diagnoses/template?system=${system}`,
        { headers: { Authorization: `Bearer ${getToken()}` } },
      );

      if (!response.ok) {
        throw new Error(await readError(response, 'No se pudo descargar la plantilla.'));
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `plantilla_${system.toLowerCase()}.xlsx`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setSuccess('Plantilla descargada correctamente.');
    } catch (err: any) {
      setError(err?.message || 'Error al descargar la plantilla.');
    } finally {
      setDownloading(false);
    }
  }

  async function previewImport() {
    if (!file) {
      setError('Seleccione un archivo Excel antes de continuar.');
      return;
    }

    setLoading(true);
    setPreview(null);
    setError('');
    setSuccess('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(
        `${API_BASE}/diagnoses/import/preview?system=${system}`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${getToken()}` },
          body: formData,
        },
      );

      if (!response.ok) {
        throw new Error(await readError(response, 'No se pudo validar el archivo.'));
      }

      const result = (await response.json()) as PreviewResponse;
      setPreview(result);
      setSuccess('Archivo validado. Revise el resumen antes de confirmar.');
    } catch (err: any) {
      setError(err?.message || 'Error al previsualizar la importación.');
    } finally {
      setLoading(false);
    }
  }

  async function applyImport() {
    if (!preview?.previewId) return;

    const confirmed = window.confirm(
      `Se crearán ${preview.summary.toCreate} registros y se actualizarán ${preview.summary.toUpdate}. ¿Desea aplicar la importación?`,
    );
    if (!confirmed) return;

    setApplying(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(
        `${API_BASE}/diagnoses/import/${preview.previewId}/apply`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${getToken()}` },
        },
      );

      if (!response.ok) {
        throw new Error(await readError(response, 'No se pudo aplicar la importación.'));
      }

      const result = await response.json();
      setSuccess(
        `${result.createdRows} registro(s) creado(s), ${result.updatedRows} actualizado(s) y ${result.skippedRows} sin cambios.`,
      );
      setPreview(null);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      setError(err?.message || 'Error al aplicar la importación.');
    } finally {
      setApplying(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-6 md:px-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="flex flex-col gap-3 rounded-lg bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-bold uppercase text-cyan-700">Administración</p>
            <h1 className="text-2xl font-bold text-slate-900">Catálogos maestros</h1>
          </div>
          <button
            type="button"
            onClick={() => navigate('/home')}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            Volver al inicio
          </button>
        </header>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
            {success}
          </div>
        )}

        <section className="rounded-lg bg-white p-5 shadow-sm">
          <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-4">
            {(['CIE10', 'CIE11'] as CatalogSystem[]).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => resetImport(item)}
                className={`rounded-lg px-4 py-2 text-sm font-bold ${
                  system === item
                    ? 'bg-cyan-700 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {item === 'CIE10' ? 'CIE-10' : 'CIE-11'}
              </button>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {[
              ['import', 'Importar Excel'],
              ['records', 'Registros del catálogo'],
              ['history', 'Historial de cargas'],
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setView(id as typeof view)}
                className={`rounded-lg border px-4 py-2 text-sm font-bold ${
                  view === id
                    ? 'border-slate-800 bg-slate-800 text-white'
                    : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className={`${view === 'import' ? 'grid' : 'hidden'} mt-5 gap-5 lg:grid-cols-[1fr_auto] lg:items-end`}>
            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                Archivo Excel
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xlsm"
                onChange={(event) => {
                  setFile(event.target.files?.[0] || null);
                  setPreview(null);
                  setError('');
                  setSuccess('');
                }}
                className="block w-full rounded-lg border border-slate-300 bg-white p-2 text-sm text-slate-700 file:mr-4 file:rounded-md file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:font-bold file:text-slate-700"
              />
              {file && (
                <p className="mt-2 text-xs text-slate-500">
                  {file.name} · {(file.size / 1024).toFixed(1)} KB
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={downloadTemplate}
                disabled={downloading}
                className="rounded-lg border border-cyan-700 px-4 py-2 text-sm font-bold text-cyan-800 hover:bg-cyan-50 disabled:opacity-60"
              >
                {downloading ? 'Descargando...' : 'Descargar plantilla'}
              </button>
              <button
                type="button"
                onClick={previewImport}
                disabled={!file || loading}
                className="rounded-lg bg-cyan-700 px-4 py-2 text-sm font-bold text-white hover:bg-cyan-800 disabled:opacity-60"
              >
                {loading ? 'Validando...' : 'Validar y previsualizar'}
              </button>
            </div>
          </div>
        </section>

        {preview && view === 'import' && (
          <>
            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
              {[
                ['Total', preview.summary.totalRows, 'text-slate-900'],
                ['Válidos', preview.summary.validRows, 'text-emerald-700'],
                ['Con errores', preview.summary.invalidRows, 'text-red-700'],
                ['Nuevos', preview.summary.toCreate, 'text-emerald-700'],
                ['Actualizar', preview.summary.toUpdate, 'text-blue-700'],
                ['Sin cambios', preview.summary.unchanged, 'text-slate-600'],
              ].map(([label, value, color]) => (
                <div key={String(label)} className="rounded-lg bg-white p-4 shadow-sm">
                  <p className="text-xs font-bold uppercase text-slate-500">{label}</p>
                  <p className={`mt-1 text-2xl font-black ${color}`}>{value}</p>
                </div>
              ))}
            </section>

            {preview.invalidRows.length > 0 && (
              <section className="overflow-hidden rounded-lg bg-white shadow-sm">
                <div className="border-b border-red-100 bg-red-50 px-4 py-3">
                  <h2 className="font-bold text-red-900">Filas con errores</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50 text-left text-slate-700">
                      <tr>
                        <th className="px-4 py-3">Fila</th>
                        <th className="px-4 py-3">Código</th>
                        <th className="px-4 py-3">Descripción</th>
                        <th className="px-4 py-3">Errores</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {preview.invalidRows.map((row) => (
                        <tr key={`${row.rowNumber}-${row.code || ''}`}>
                          <td className="px-4 py-3 font-bold">{row.rowNumber}</td>
                          <td className="px-4 py-3">{row.code || '—'}</td>
                          <td className="px-4 py-3">{row.description || '—'}</td>
                          <td className="px-4 py-3 text-red-700">{row.errors.join(' ')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            <section className="overflow-hidden rounded-lg bg-white shadow-sm">
              <div className="flex flex-col gap-2 border-b border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="font-bold text-slate-900">Registros válidos</h2>
                <button
                  type="button"
                  onClick={applyImport}
                  disabled={applying || preview.summary.validRows === 0}
                  className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-60"
                >
                  {applying ? 'Importando...' : 'Confirmar importación'}
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-left text-slate-700">
                    <tr>
                      <th className="px-4 py-3">Fila</th>
                      <th className="px-4 py-3">Código</th>
                      <th className="px-4 py-3">Descripción</th>
                      <th className="px-4 py-3">Capítulo</th>
                      <th className="px-4 py-3">Estado</th>
                      <th className="px-4 py-3">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {preview.validRows.map((row) => (
                      <tr key={`${row.rowNumber}-${row.code}`}>
                        <td className="px-4 py-3">{row.rowNumber}</td>
                        <td className="px-4 py-3 font-bold text-cyan-800">{row.code}</td>
                        <td className="px-4 py-3">{row.description}</td>
                        <td className="px-4 py-3">{row.chapter || '—'}</td>
                        <td className="px-4 py-3">{row.active ? 'Activo' : 'Inactivo'}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-3 py-1 text-xs font-bold ${actionClasses[row.action]}`}>
                            {actionLabels[row.action]}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {preview.previewLimited && (
                <p className="border-t border-slate-200 px-4 py-3 text-xs text-slate-500">
                  La tabla muestra como máximo 100 registros de cada grupo.
                </p>
              )}
            </section>
          </>
        )}

        {view === 'records' && (
          <section className="overflow-hidden rounded-lg bg-white shadow-sm">
            <div className="grid gap-3 border-b border-slate-200 p-4 md:grid-cols-[1fr_180px_auto]">
              <input
                value={catalogQuery}
                onChange={(event) => {
                  setCatalogQuery(event.target.value);
                  setCatalogPage(1);
                }}
                placeholder="Buscar código, descripción o sinónimo..."
                className="rounded-lg border border-slate-300 p-2"
              />
              <select
                value={catalogStatus}
                onChange={(event) => {
                  setCatalogStatus(event.target.value);
                  setCatalogPage(1);
                }}
                className="rounded-lg border border-slate-300 p-2"
              >
                <option value="all">Todos</option>
                <option value="active">Activos</option>
                <option value="inactive">Inactivos</option>
              </select>
              <button
                type="button"
                onClick={loadCatalog}
                disabled={catalogLoading}
                className="rounded-lg bg-cyan-700 px-4 py-2 font-bold text-white disabled:opacity-60"
              >
                {catalogLoading ? 'Cargando...' : 'Actualizar'}
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-slate-700">
                  <tr>
                    <th className="px-4 py-3">Código</th>
                    <th className="px-4 py-3">Descripción</th>
                    <th className="px-4 py-3">Sinónimos</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {!catalogLoading && (catalog?.items.length || 0) === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                        No se encontraron registros.
                      </td>
                    </tr>
                  )}
                  {catalog?.items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3 font-extrabold text-cyan-800">{item.code}</td>
                      <td className="px-4 py-3">{item.description}</td>
                      <td className="max-w-sm px-4 py-3 text-xs text-slate-600">
                        {item.synonyms?.join('; ') || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-3 py-1 text-xs font-bold ${item.active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}>
                          {item.active ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => changeCatalogStatus(item)}
                          className={`rounded-lg px-3 py-2 text-xs font-bold text-white ${item.active ? 'bg-red-700 hover:bg-red-800' : 'bg-emerald-700 hover:bg-emerald-800'}`}
                        >
                          {item.active ? 'Inactivar' : 'Activar'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm">
              <span>{catalog?.total || 0} registro(s)</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={catalogPage <= 1}
                  onClick={() => setCatalogPage((page) => Math.max(1, page - 1))}
                  className="rounded border px-3 py-1 disabled:opacity-40"
                >
                  Anterior
                </button>
                <span>Página {catalog?.page || catalogPage} de {catalog?.totalPages || 1}</span>
                <button
                  type="button"
                  disabled={catalogPage >= (catalog?.totalPages || 1)}
                  onClick={() => setCatalogPage((page) => page + 1)}
                  className="rounded border px-3 py-1 disabled:opacity-40"
                >
                  Siguiente
                </button>
              </div>
            </div>
          </section>
        )}

        {view === 'history' && (
          <section className="overflow-hidden rounded-lg bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <h2 className="font-bold text-slate-900">Historial de importaciones</h2>
              <button
                type="button"
                onClick={loadImportHistory}
                disabled={historyLoading}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold"
              >
                {historyLoading ? 'Cargando...' : 'Actualizar'}
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-slate-700">
                  <tr>
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3">Archivo</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3">Total</th>
                    <th className="px-4 py-3">Creados</th>
                    <th className="px-4 py-3">Actualizados</th>
                    <th className="px-4 py-3">Errores</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {!historyLoading && imports.length === 0 && (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">Sin importaciones registradas.</td></tr>
                  )}
                  {imports.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3">{formatDateTime(item.createdAt)}</td>
                      <td className="px-4 py-3 font-semibold">{item.sourceFileName}</td>
                      <td className="px-4 py-3">{item.status}</td>
                      <td className="px-4 py-3">{item.totalRows}</td>
                      <td className="px-4 py-3 text-emerald-700">{item.createdRows}</td>
                      <td className="px-4 py-3 text-blue-700">{item.updatedRows}</td>
                      <td className="px-4 py-3 text-red-700">{item.invalidRows}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
