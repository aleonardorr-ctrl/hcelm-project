/**
 * Archivo: Catalogs.tsx
 * Ruta: apps/web/src/pages/Catalogs.tsx
 * Función: Administración de plantillas e importaciones de catálogos maestros.
 */
import { useRef, useState } from 'react';
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

  function resetImport(nextSystem?: CatalogSystem) {
    if (nextSystem) setSystem(nextSystem);
    setFile(null);
    setPreview(null);
    setError('');
    setSuccess('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

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

          <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
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

        {preview && (
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
      </div>
    </div>
  );
}
