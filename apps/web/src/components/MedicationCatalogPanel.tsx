// Archivo: MedicationCatalogPanel.tsx
// Ruta: apps/web/src/components/MedicationCatalogPanel.tsx
// Funcion: Importa y consulta el maestro corporativo de Farmacia y Drogueria.
import { useEffect, useRef, useState } from 'react';

type ViewType = 'import' | 'records' | 'history';
type ImportAction = 'CREATE' | 'UPDATE' | 'UNCHANGED';

type ProductPreviewRow = {
  rowNumber: number;
  internalCode: string;
  productType: string;
  genericName: string;
  commercialName?: string | null;
  concentration?: string | null;
  presentation: string;
  active: boolean;
  action: ImportAction;
};

type InvalidProductRow = {
  rowNumber: number;
  code?: string | null;
  name?: string | null;
  errors: string[];
};

type InventoryPreviewRow = {
  rowNumber: number;
  internalCode: string;
  businessUnit: string;
  warehouse: string;
  lotNumber: string;
  expirationDate?: string | null;
  stock: number;
  minimumStock: number;
  purchasePrice?: number | null;
  salePrice?: number | null;
  wholesalePrice?: number | null;
  currency: string;
};

type InvalidInventoryRow = {
  rowNumber: number;
  errors: string[];
};

type PreviewResponse = {
  previewId: string;
  summary: {
    totalRows: number;
    validRows: number;
    invalidRows: number;
    toCreate: number;
    toUpdate: number;
    unchanged: number;
    inventoryLots: number;
    invalidInventoryLots: number;
  };
  validRows: ProductPreviewRow[];
  invalidRows: InvalidProductRow[];
  inventoryRows: InventoryPreviewRow[];
  invalidInventoryRows: InvalidInventoryRow[];
};

type InventoryLot = {
  id: string;
  businessUnit: string;
  warehouse: string;
  lotNumber: string;
  expirationDate?: string | null;
  stock: string | number;
  minimumStock: string | number;
  purchasePrice?: string | number | null;
  salePrice?: string | number | null;
  wholesalePrice?: string | number | null;
  currency: string;
};

type Product = {
  id: string;
  internalCode?: string | null;
  barcode?: string | null;
  productType: string;
  genericName: string;
  commercialName?: string | null;
  concentration?: string | null;
  pharmaceuticalForm?: string | null;
  presentation: string;
  laboratory?: string | null;
  sanitaryRegistration?: string | null;
  active: boolean;
  inventoryLots: InventoryLot[];
};

type CatalogResponse = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  items: Product[];
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
    if (typeof result?.message === 'object') {
      return result.message?.message || JSON.stringify(result.message);
    }
    return result?.message || fallback;
  } catch {
    return fallback;
  }
}

function formatDateTime(value?: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleString('es-PE');
}

export default function MedicationCatalogPanel() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [view, setView] = useState<ViewType>('import');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [productType, setProductType] = useState('');
  const [page, setPage] = useState(1);
  const [catalog, setCatalog] = useState<CatalogResponse | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [imports, setImports] = useState<ImportRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  async function downloadTemplate() {
    setDownloading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`${API_BASE}/medication-catalog/template`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!response.ok) {
        throw new Error(await readError(response, 'No se pudo descargar la plantilla.'));
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'plantilla_maestro_corporativo_farmacia.xlsx';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setSuccess('Plantilla corporativa descargada correctamente.');
    } catch (reason: any) {
      setError(reason?.message || 'Error al descargar la plantilla.');
    } finally {
      setDownloading(false);
    }
  }

  async function previewImport() {
    if (!file) {
      setError('Seleccione un archivo Excel.');
      return;
    }

    setLoading(true);
    setPreview(null);
    setError('');
    setSuccess('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch(`${API_BASE}/medication-catalog/import/preview`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: formData,
      });
      if (!response.ok) {
        throw new Error(await readError(response, 'No se pudo validar el archivo.'));
      }

      setPreview(await response.json());
      setSuccess('Archivo validado. Revise productos, lotes y errores.');
    } catch (reason: any) {
      setError(reason?.message || 'Error al validar la importacion.');
    } finally {
      setLoading(false);
    }
  }

  async function applyImport() {
    if (!preview?.previewId) return;
    if (preview.summary.invalidRows > 0) {
      setError('Corrija todos los errores antes de confirmar la importacion.');
      return;
    }
    if (!window.confirm(
      `Se crearan ${preview.summary.toCreate} productos, se actualizaran ${preview.summary.toUpdate} y se procesaran ${preview.summary.inventoryLots} lotes. Desea continuar?`,
    )) return;

    setApplying(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(
        `${API_BASE}/medication-catalog/import/${preview.previewId}/apply`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${getToken()}` },
        },
      );
      if (!response.ok) {
        throw new Error(await readError(response, 'No se pudo aplicar la importacion.'));
      }

      const result = await response.json();
      setSuccess(
        `${result.createdRows} creado(s), ${result.updatedRows} actualizado(s), ${result.skippedRows} sin cambios y ${result.inventoryLots} lote(s) procesado(s).`,
      );
      setPreview(null);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (reason: any) {
      setError(reason?.message || 'Error al aplicar la importacion.');
    } finally {
      setApplying(false);
    }
  }

  async function loadCatalog() {
    setCatalogLoading(true);
    setError('');

    try {
      const params = new URLSearchParams({
        q: query.trim(),
        status,
        productType,
        page: String(page),
        pageSize: '50',
      });
      const response = await fetch(`${API_BASE}/medication-catalog/catalog?${params}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!response.ok) {
        throw new Error(await readError(response, 'No se pudo cargar el catalogo.'));
      }

      setCatalog(await response.json());
    } catch (reason: any) {
      setError(reason?.message || 'Error al cargar el catalogo.');
    } finally {
      setCatalogLoading(false);
    }
  }

  async function loadHistory() {
    setHistoryLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE}/medication-catalog/imports`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!response.ok) {
        throw new Error(await readError(response, 'No se pudo cargar el historial.'));
      }

      const result = await response.json();
      setImports(Array.isArray(result) ? result : []);
    } catch (reason: any) {
      setError(reason?.message || 'Error al cargar el historial.');
    } finally {
      setHistoryLoading(false);
    }
  }

  async function changeStatus(product: Product) {
    const nextActive = !product.active;
    if (!window.confirm(
      `${nextActive ? 'Activar' : 'Inactivar'} ${product.internalCode || ''} - ${product.genericName}?`,
    )) return;

    setError('');
    setSuccess('');

    try {
      const response = await fetch(
        `${API_BASE}/medication-catalog/catalog/${product.id}/status`,
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
      setSuccess(result?.message || 'Estado actualizado.');
      await loadCatalog();
    } catch (reason: any) {
      setError(reason?.message || 'Error al cambiar el estado.');
    }
  }

  useEffect(() => {
    if (view !== 'records') return;
    const timeout = window.setTimeout(loadCatalog, 300);
    return () => window.clearTimeout(timeout);
  }, [view, query, status, productType, page]);

  useEffect(() => {
    if (view === 'history') loadHistory();
  }, [view]);

  return (
    <div className="space-y-5">
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
        <div>
          <h2 className="text-lg font-bold text-slate-900">Maestro corporativo de productos</h2>
          <p className="mt-1 text-sm text-slate-500">
            Una sola plantilla para Farmacia y Drogueria. Gerencia utilizara la
            informacion consolidada de productos, stock, costos y precios.
          </p>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {([
            ['import', 'Importar Excel'],
            ['records', 'Productos y lotes'],
            ['history', 'Historial de cargas'],
          ] as Array<[ViewType, string]>).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setView(id)}
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

        {view === 'import' && (
          <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                Archivo Excel corporativo
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
                className="block w-full rounded-lg border border-slate-300 bg-white p-2 text-sm file:mr-4 file:rounded-md file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:font-bold"
              />
              {file && (
                <p className="mt-2 text-xs text-slate-500">
                  {file.name} - {(file.size / 1024).toFixed(1)} KB
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={downloadTemplate}
                disabled={downloading}
                className="rounded-lg border border-cyan-700 px-4 py-2 text-sm font-bold text-cyan-800 disabled:opacity-60"
              >
                {downloading ? 'Descargando...' : 'Descargar plantilla'}
              </button>
              <button
                type="button"
                onClick={previewImport}
                disabled={!file || loading}
                className="rounded-lg bg-cyan-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
              >
                {loading ? 'Validando...' : 'Validar y previsualizar'}
              </button>
            </div>
          </div>
        )}
      </section>

      {preview && view === 'import' && (
        <>
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ['Productos validos', preview.summary.validRows, 'text-emerald-700'],
              ['Con errores', preview.summary.invalidRows, 'text-red-700'],
              ['Nuevos', preview.summary.toCreate, 'text-emerald-700'],
              ['Actualizar', preview.summary.toUpdate, 'text-blue-700'],
              ['Sin cambios', preview.summary.unchanged, 'text-slate-600'],
              ['Lotes validos', preview.summary.inventoryLots, 'text-blue-700'],
              ['Lotes con errores', preview.summary.invalidInventoryLots, 'text-red-700'],
            ].map(([label, value, color]) => (
              <div key={String(label)} className="rounded-lg bg-white p-4 shadow-sm">
                <p className="text-xs font-bold uppercase text-slate-500">{label}</p>
                <p className={`mt-1 text-2xl font-black ${color}`}>{value}</p>
              </div>
            ))}
          </section>

          {preview.invalidRows.length > 0 && (
            <ErrorTable title="Productos con errores" rows={preview.invalidRows} />
          )}
          {preview.invalidInventoryRows.length > 0 && (
            <ErrorTable title="Lotes con errores" rows={preview.invalidInventoryRows} />
          )}

          <section className="overflow-hidden rounded-lg bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
              <h3 className="font-bold text-slate-900">Productos validos</h3>
              <button
                type="button"
                onClick={applyImport}
                disabled={applying || preview.summary.validRows === 0 || preview.summary.invalidRows > 0}
                className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
              >
                {applying ? 'Importando...' : 'Confirmar importacion'}
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y text-sm">
                <thead className="bg-slate-50 text-left">
                  <tr><th className="px-4 py-3">Codigo</th><th className="px-4 py-3">Producto</th><th className="px-4 py-3">Presentacion</th><th className="px-4 py-3">Tipo</th><th className="px-4 py-3">Accion</th></tr>
                </thead>
                <tbody className="divide-y">
                  {preview.validRows.map((row) => (
                    <tr key={`${row.rowNumber}-${row.internalCode}`}>
                      <td className="px-4 py-3 font-bold text-cyan-800">{row.internalCode}</td>
                      <td className="px-4 py-3">{row.genericName}{row.commercialName ? ` / ${row.commercialName}` : ''}{row.concentration ? ` ${row.concentration}` : ''}</td>
                      <td className="px-4 py-3">{row.presentation}</td>
                      <td className="px-4 py-3">{row.productType}</td>
                      <td className="px-4 py-3"><span className={`rounded-full px-3 py-1 text-xs font-bold ${actionClasses[row.action]}`}>{actionLabels[row.action]}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {preview.inventoryRows.length > 0 && (
            <section className="overflow-hidden rounded-lg bg-white shadow-sm">
              <div className="border-b p-4"><h3 className="font-bold">Vista previa de lotes</h3></div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y text-sm">
                  <thead className="bg-slate-50 text-left"><tr><th className="px-4 py-3">Codigo</th><th className="px-4 py-3">Unidad</th><th className="px-4 py-3">Almacen</th><th className="px-4 py-3">Lote</th><th className="px-4 py-3">Vencimiento</th><th className="px-4 py-3">Stock</th></tr></thead>
                  <tbody className="divide-y">{preview.inventoryRows.map((row) => <tr key={`${row.rowNumber}-${row.internalCode}-${row.businessUnit}-${row.lotNumber}`}><td className="px-4 py-3 font-bold">{row.internalCode}</td><td className="px-4 py-3">{row.businessUnit}</td><td className="px-4 py-3">{row.warehouse}</td><td className="px-4 py-3">{row.lotNumber}</td><td className="px-4 py-3">{row.expirationDate || '-'}</td><td className="px-4 py-3">{row.stock}</td></tr>)}</tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}

      {view === 'records' && (
        <section className="overflow-hidden rounded-lg bg-white shadow-sm">
          <div className="grid gap-3 border-b p-4 md:grid-cols-[1fr_220px_180px_auto]">
            <input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Codigo, producto, laboratorio o registro..." className="rounded-lg border p-2" />
            <select value={productType} onChange={(event) => { setProductType(event.target.value); setPage(1); }} className="rounded-lg border p-2"><option value="">Todos los tipos</option><option value="MEDICAMENTO">Medicamentos</option><option value="DISPOSITIVO_MEDICO">Dispositivos medicos</option><option value="PRODUCTO_SANITARIO">Productos sanitarios</option><option value="OTRO">Otros</option></select>
            <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className="rounded-lg border p-2"><option value="all">Todos</option><option value="active">Activos</option><option value="inactive">Inactivos</option></select>
            <button type="button" onClick={loadCatalog} disabled={catalogLoading} className="rounded-lg bg-cyan-700 px-4 py-2 font-bold text-white disabled:opacity-60">{catalogLoading ? 'Cargando...' : 'Actualizar'}</button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y text-sm">
              <thead className="bg-slate-50 text-left"><tr><th className="px-4 py-3">Codigo</th><th className="px-4 py-3">Producto</th><th className="px-4 py-3">Presentacion</th><th className="px-4 py-3">Registro</th><th className="px-4 py-3">Inventario</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3">Accion</th></tr></thead>
              <tbody className="divide-y">
                {!catalogLoading && (catalog?.items.length || 0) === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">No se encontraron productos.</td></tr>}
                {catalog?.items.map((product) => {
                  const totalStock = product.inventoryLots.reduce((sum, lot) => sum + Number(lot.stock), 0);
                  return <tr key={product.id}><td className="px-4 py-3 font-bold text-cyan-800">{product.internalCode || '-'}</td><td className="px-4 py-3"><strong>{product.genericName}</strong>{product.commercialName ? <div className="text-xs text-slate-500">{product.commercialName}</div> : null}{product.concentration ? <div className="text-xs">{product.concentration}</div> : null}</td><td className="px-4 py-3">{product.presentation}</td><td className="px-4 py-3">{product.sanitaryRegistration || '-'}</td><td className="px-4 py-3"><strong>{totalStock}</strong><div className="text-xs text-slate-500">{product.inventoryLots.length} lote(s)</div></td><td className="px-4 py-3">{product.active ? 'Activo' : 'Inactivo'}</td><td className="px-4 py-3"><button type="button" onClick={() => changeStatus(product)} className={`rounded px-3 py-2 text-xs font-bold text-white ${product.active ? 'bg-red-700' : 'bg-emerald-700'}`}>{product.active ? 'Inactivar' : 'Activar'}</button></td></tr>;
                })}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t px-4 py-3 text-sm"><span>{catalog?.total || 0} producto(s)</span><div className="flex gap-2"><button type="button" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} className="rounded border px-3 py-1 disabled:opacity-40">Anterior</button><span>Pagina {catalog?.page || page} de {catalog?.totalPages || 1}</span><button type="button" disabled={page >= (catalog?.totalPages || 1)} onClick={() => setPage((current) => current + 1)} className="rounded border px-3 py-1 disabled:opacity-40">Siguiente</button></div></div>
        </section>
      )}

      {view === 'history' && (
        <section className="overflow-hidden rounded-lg bg-white shadow-sm">
          <div className="flex items-center justify-between border-b p-4"><h3 className="font-bold">Historial de importaciones</h3><button type="button" onClick={loadHistory} disabled={historyLoading} className="rounded border px-3 py-2 text-sm font-bold">{historyLoading ? 'Cargando...' : 'Actualizar'}</button></div>
          <div className="overflow-x-auto"><table className="min-w-full divide-y text-sm"><thead className="bg-slate-50 text-left"><tr><th className="px-4 py-3">Fecha</th><th className="px-4 py-3">Archivo</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3">Productos</th><th className="px-4 py-3">Creados</th><th className="px-4 py-3">Actualizados</th><th className="px-4 py-3">Errores</th></tr></thead><tbody className="divide-y">{!historyLoading && imports.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">Sin importaciones registradas.</td></tr>}{imports.map((item) => <tr key={item.id}><td className="px-4 py-3">{formatDateTime(item.createdAt)}</td><td className="px-4 py-3 font-semibold">{item.sourceFileName}</td><td className="px-4 py-3">{item.status}</td><td className="px-4 py-3">{item.totalRows}</td><td className="px-4 py-3 text-emerald-700">{item.createdRows}</td><td className="px-4 py-3 text-blue-700">{item.updatedRows}</td><td className="px-4 py-3 text-red-700">{item.invalidRows}</td></tr>)}</tbody></table></div>
        </section>
      )}
    </div>
  );
}

function ErrorTable({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ rowNumber: number; errors: string[] }>;
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-red-200 bg-white">
      <div className="bg-red-50 px-4 py-3 font-bold text-red-900">{title}</div>
      <div className="max-h-64 overflow-auto">
        {rows.map((row) => (
          <p key={row.rowNumber} className="border-t px-4 py-2 text-sm text-red-800">
            Fila {row.rowNumber}: {row.errors.join(' ')}
          </p>
        ))}
      </div>
    </section>
  );
}
