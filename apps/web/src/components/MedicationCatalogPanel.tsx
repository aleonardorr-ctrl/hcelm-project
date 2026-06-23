// Archivo: MedicationCatalogPanel.tsx
// Ruta: apps/web/src/components/MedicationCatalogPanel.tsx
// Funcion: Importa, consulta y registra manualmente el maestro corporativo de Farmacia y Drogueria.
import { useEffect, useRef, useState } from 'react';

type ViewType = 'import' | 'create' | 'records' | 'history';
type ImportAction = 'CREATE' | 'UPDATE' | 'UNCHANGED';

type ProductPreviewRow = {
  rowNumber: number;
  masterCode?: string | null;
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
  shelfCode?: string | null;
  shelfLevel?: string | null;
  locationNotes?: string | null;
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
  shelfCode?: string | null;
  shelfLevel?: string | null;
  locationNotes?: string | null;
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
  masterCode?: string | null;
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

type CodePreview = {
  productType: string;
  companyPrefix: string;
  masterCode: string;
  companySku: string;
};

type ProductForm = {
  productType: string;
  masterCode: string;
  internalCode: string;
  barcode: string;
  genericName: string;
  commercialName: string;
  concentration: string;
  pharmaceuticalForm: string;
  presentation: string;
  route: string;
  unitMeasure: string;
  laboratory: string;
  sanitaryRegistration: string;
  requiresPrescription: boolean;
  controlled: boolean;
  coldChain: boolean;
  taxable: boolean;
  observations: string;
};

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const PRODUCT_TYPE_OPTIONS = [
  { value: 'MEDICAMENTO', label: 'Medicamento' },
  { value: 'DISPOSITIVO_MEDICO', label: 'Dispositivo medico' },
  { value: 'PRODUCTO_SANITARIO', label: 'Producto sanitario' },
  { value: 'MATERIAL_MEDICO', label: 'Material medico' },
  { value: 'COSMETICO', label: 'Cosmetico' },
  { value: 'OTRO', label: 'Otro' },
];

const PHARMACEUTICAL_FORM_OPTIONS = [
  '',
  'TABLETA',
  'CAPSULA',
  'JARABE',
  'SUSPENSION',
  'SOLUCION_INYECTABLE',
  'AMPOLLA',
  'VIAL',
  'CREMA',
  'UNGÜENTO',
  'GEL',
  'GOTAS',
  'SPRAY',
  'POLVO',
  'SOBRE',
];

const ROUTE_OPTIONS = [
  '',
  'ORAL',
  'SUBLINGUAL',
  'INTRAVENOSA',
  'INTRAMUSCULAR',
  'SUBCUTANEA',
  'TOPICA',
  'OFTALMICA',
  'OTICA',
  'NASAL',
  'INHALATORIA',
  'RECTAL',
  'VAGINAL',
];

const EMPTY_PRODUCT_FORM: ProductForm = {
  productType: 'MEDICAMENTO',
  masterCode: '',
  internalCode: '',
  barcode: '',
  genericName: '',
  commercialName: '',
  concentration: '',
  pharmaceuticalForm: '',
  presentation: '',
  route: '',
  unitMeasure: '',
  laboratory: '',
  sanitaryRegistration: '',
  requiresPrescription: true,
  controlled: false,
  coldChain: false,
  taxable: true,
  observations: '',
};

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
  const [codePreview, setCodePreview] = useState<CodePreview | null>(null);
  const [codeLoading, setCodeLoading] = useState(false);
  const [creatingProduct, setCreatingProduct] = useState(false);
  const [productForm, setProductForm] = useState<ProductForm>(EMPTY_PRODUCT_FORM);

  async function loadCodePreview(nextProductType = productForm.productType) {
    setCodeLoading(true);
    setError('');

    try {
      const params = new URLSearchParams({ productType: nextProductType });
      const response = await fetch(`${API_BASE}/medication-catalog/code-preview?${params}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!response.ok) {
        throw new Error(await readError(response, 'No se pudo generar el codigo sugerido.'));
      }

      const result = await response.json();
      setCodePreview(result);
      setProductForm((current) => ({
        ...current,
        productType: nextProductType,
        masterCode: current.masterCode || result.masterCode || '',
        internalCode: current.internalCode || result.companySku || '',
      }));
    } catch (reason: any) {
      setError(reason?.message || 'Error al generar codigos.');
    } finally {
      setCodeLoading(false);
    }
  }

  async function createProduct() {
    if (!productForm.genericName.trim()) {
      setError('Ingrese el nombre generico o principal del producto.');
      return;
    }

    if (!productForm.presentation.trim()) {
      setError('Ingrese la presentacion del producto.');
      return;
    }

    setCreatingProduct(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`${API_BASE}/medication-catalog/catalog`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(productForm),
      });
      if (!response.ok) {
        throw new Error(await readError(response, 'No se pudo crear el producto.'));
      }

      const created = await response.json();
      setSuccess(
        `Producto creado: ${created.internalCode || productForm.internalCode} - ${created.genericName || productForm.genericName}.`,
      );
      setProductForm(EMPTY_PRODUCT_FORM);
      setCodePreview(null);
      await loadCodePreview('MEDICAMENTO');
    } catch (reason: any) {
      setError(reason?.message || 'Error al crear el producto.');
    } finally {
      setCreatingProduct(false);
    }
  }

  function updateProductForm<K extends keyof ProductForm>(key: K, value: ProductForm[K]) {
    setProductForm((current) => ({ ...current, [key]: value }));
  }

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

  useEffect(() => {
    if (view === 'create' && !codePreview && !codeLoading) {
      loadCodePreview(productForm.productType);
    }
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
            Una sola plantilla para Farmacia y Drogueria. Gerencia utilizara la informacion consolidada de productos, stock, costos y precios.
          </p>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {([
            ['import', 'Importar Excel'],
            ['create', 'Nuevo producto'],
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
          <div className="mt-5 space-y-5">
            <ExcelInstructions />

            <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
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
                  {downloading ? 'Descargando...' : 'Descargar plantilla con SKU y ubicacion'}
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
          </div>
        )}
      </section>

      {view === 'create' && (
        <CreateProductPanel
          productForm={productForm}
          codePreview={codePreview}
          codeLoading={codeLoading}
          creatingProduct={creatingProduct}
          onRegenerate={() => loadCodePreview(productForm.productType)}
          onCreate={createProduct}
          onClear={() => {
            setProductForm(EMPTY_PRODUCT_FORM);
            setCodePreview(null);
            loadCodePreview('MEDICAMENTO');
          }}
          onChange={updateProductForm}
          onProductTypeChange={(next) => {
            setProductForm((current) => ({
              ...current,
              productType: next,
              masterCode: '',
              internalCode: '',
            }));
            loadCodePreview(next);
          }}
        />
      )}

      {preview && view === 'import' && (
        <PreviewPanel
          preview={preview}
          applying={applying}
          onApply={applyImport}
        />
      )}

      {view === 'records' && (
        <RecordsPanel
          query={query}
          status={status}
          productType={productType}
          page={page}
          catalog={catalog}
          catalogLoading={catalogLoading}
          onQueryChange={(value) => { setQuery(value); setPage(1); }}
          onStatusChange={(value) => { setStatus(value); setPage(1); }}
          onProductTypeChange={(value) => { setProductType(value); setPage(1); }}
          onRefresh={loadCatalog}
          onPreviousPage={() => setPage((current) => Math.max(1, current - 1))}
          onNextPage={() => setPage((current) => current + 1)}
          onChangeStatus={changeStatus}
        />
      )}

      {view === 'history' && (
        <HistoryPanel
          imports={imports}
          loading={historyLoading}
          onRefresh={loadHistory}
        />
      )}
    </div>
  );
}

function ExcelInstructions() {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
      <p className="font-bold">Indicaciones para llenar el Excel sin errores</p>
      <div className="mt-2 grid gap-2 md:grid-cols-2">
        <ul className="list-disc space-y-1 pl-5">
          <li>Obligatorios en Productos: tipo_producto, nombre_generico y presentacion.</li>
          <li>codigo_maestro_hcelm y sku_empresa pueden quedar vacios; HCELM los genera automaticamente.</li>
          <li>tipo_producto debe salir de la lista: MEDICAMENTO, DISPOSITIVO_MEDICO, PRODUCTO_SANITARIO, MATERIAL_MEDICO, COSMETICO u OTRO.</li>
          <li>No escriba TABLETA o CAPSULA en tipo_producto; eso corresponde a forma_farmaceutica.</li>
        </ul>
        <ul className="list-disc space-y-1 pl-5">
          <li>Si usa Inventario_Inicial, el sku_empresa debe coincidir con Productos.</li>
          <li>Si deja vacio el SKU en ambas hojas, mantenga el mismo orden de filas para vincular producto e inventario.</li>
          <li>andamio y nivel_andamio ayudan a ubicar el producto al escanear el codigo de barras.</li>
          <li>Use fechas reales de Excel o formato AAAA-MM-DD para vencimiento.</li>
        </ul>
      </div>
      <p className="mt-3 text-xs text-amber-900">
        Nota para el manual: esta misma regla se documentara como flujo de carga inicial y mantenimiento de maestro corporativo.
      </p>
    </div>
  );
}

function CreateProductPanel({
  productForm,
  codePreview,
  codeLoading,
  creatingProduct,
  onRegenerate,
  onCreate,
  onClear,
  onChange,
  onProductTypeChange,
}: {
  productForm: ProductForm;
  codePreview: CodePreview | null;
  codeLoading: boolean;
  creatingProduct: boolean;
  onRegenerate: () => void;
  onCreate: () => void;
  onClear: () => void;
  onChange: <K extends keyof ProductForm>(key: K, value: ProductForm[K]) => void;
  onProductTypeChange: (value: string) => void;
}) {
  return (
    <section className="rounded-lg bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Nuevo producto</h3>
          <p className="mt-1 text-sm text-slate-500">
            Registre un producto puntual sin usar Excel. El sistema propone codigo maestro y SKU automaticamente.
          </p>
        </div>
        <button
          type="button"
          onClick={onRegenerate}
          disabled={codeLoading}
          className="rounded-lg border border-cyan-700 px-4 py-2 text-sm font-bold text-cyan-800 disabled:opacity-60"
        >
          {codeLoading ? 'Generando...' : 'Regenerar codigos'}
        </button>
      </div>

      <div className="mb-5 rounded-lg border border-cyan-100 bg-cyan-50 p-4">
        <p className="text-sm font-bold text-cyan-900">Codigos sugeridos</p>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <CodeCard label="Empresa" value={codePreview?.companyPrefix || '-'} />
          <CodeCard label="Codigo maestro HCELM" value={productForm.masterCode || codePreview?.masterCode || '-'} />
          <CodeCard label="SKU empresa" value={productForm.internalCode || codePreview?.companySku || '-'} />
        </div>
        <p className="mt-2 text-xs text-cyan-800">
          Puede editarlos si necesita conservar una codificacion previa. Si los deja vacios, el backend los vuelve a generar al guardar.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <label className="text-sm font-semibold text-slate-700">
          Tipo de producto *
          <select
            value={productForm.productType}
            onChange={(event) => onProductTypeChange(event.target.value)}
            className="mt-1 w-full rounded-lg border p-2"
          >
            {PRODUCT_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>

        <TextInput label="Codigo maestro HCELM" value={productForm.masterCode} onChange={(value) => onChange('masterCode', value)} placeholder={codePreview?.masterCode || 'Automatico'} />
        <TextInput label="SKU empresa" value={productForm.internalCode} onChange={(value) => onChange('internalCode', value)} placeholder={codePreview?.companySku || 'Automatico'} />
        <TextInput label="Codigo de barras" value={productForm.barcode} onChange={(value) => onChange('barcode', value)} />
        <TextInput label="Nombre generico / principal *" value={productForm.genericName} onChange={(value) => onChange('genericName', value)} />
        <TextInput label="Nombre comercial" value={productForm.commercialName} onChange={(value) => onChange('commercialName', value)} />
        <TextInput label="Concentracion" value={productForm.concentration} onChange={(value) => onChange('concentration', value)} placeholder="Ej. 500 mg" />

        <label className="text-sm font-semibold text-slate-700">
          Forma farmaceutica
          <select
            value={productForm.pharmaceuticalForm}
            onChange={(event) => onChange('pharmaceuticalForm', event.target.value)}
            className="mt-1 w-full rounded-lg border p-2"
          >
            {PHARMACEUTICAL_FORM_OPTIONS.map((value) => (
              <option key={value || 'EMPTY'} value={value}>{value || 'Sin especificar'}</option>
            ))}
          </select>
        </label>

        <TextInput label="Presentacion *" value={productForm.presentation} onChange={(value) => onChange('presentation', value)} placeholder="Ej. Caja x 100 tabletas" />

        <label className="text-sm font-semibold text-slate-700">
          Via de administracion
          <select
            value={productForm.route}
            onChange={(event) => onChange('route', event.target.value)}
            className="mt-1 w-full rounded-lg border p-2"
          >
            {ROUTE_OPTIONS.map((value) => (
              <option key={value || 'EMPTY'} value={value}>{value || 'Sin especificar'}</option>
            ))}
          </select>
        </label>

        <TextInput label="Unidad de medida" value={productForm.unitMeasure} onChange={(value) => onChange('unitMeasure', value)} placeholder="Ej. unidad, caja, frasco" />
        <TextInput label="Laboratorio" value={productForm.laboratory} onChange={(value) => onChange('laboratory', value)} />
        <TextInput label="Registro sanitario" value={productForm.sanitaryRegistration} onChange={(value) => onChange('sanitaryRegistration', value)} />
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <CheckboxInput label="Requiere receta" checked={productForm.requiresPrescription} onChange={(value) => onChange('requiresPrescription', value)} />
        <CheckboxInput label="Controlado" checked={productForm.controlled} onChange={(value) => onChange('controlled', value)} />
        <CheckboxInput label="Cadena de frio" checked={productForm.coldChain} onChange={(value) => onChange('coldChain', value)} />
        <CheckboxInput label="Afecto IGV" checked={productForm.taxable} onChange={(value) => onChange('taxable', value)} />
      </div>

      <label className="mt-4 block text-sm font-semibold text-slate-700">
        Observaciones
        <textarea
          value={productForm.observations}
          onChange={(event) => onChange('observations', event.target.value)}
          className="mt-1 min-h-20 w-full rounded-lg border p-2"
          placeholder="Notas internas para farmacia, drogueria o gerencia."
        />
      </label>

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onCreate}
          disabled={creatingProduct}
          className="rounded-lg bg-emerald-700 px-5 py-2 text-sm font-bold text-white disabled:opacity-60"
        >
          {creatingProduct ? 'Guardando...' : 'Guardar producto'}
        </button>
        <button
          type="button"
          onClick={onClear}
          className="rounded-lg border border-slate-300 px-5 py-2 text-sm font-bold text-slate-700"
        >
          Limpiar
        </button>
      </div>
    </section>
  );
}

function PreviewPanel({
  preview,
  applying,
  onApply,
}: {
  preview: PreviewResponse;
  applying: boolean;
  onApply: () => void;
}) {
  return (
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
            onClick={onApply}
            disabled={applying || preview.summary.validRows === 0 || preview.summary.invalidRows > 0 || preview.summary.invalidInventoryLots > 0}
            className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
          >
            {applying ? 'Importando...' : 'Confirmar importacion'}
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y text-sm">
            <thead className="bg-slate-50 text-left">
              <tr>
                <th className="px-4 py-3">SKU empresa</th>
                <th className="px-4 py-3">Codigo maestro</th>
                <th className="px-4 py-3">Producto</th>
                <th className="px-4 py-3">Presentacion</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Accion</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {preview.validRows.map((row) => (
                <tr key={`${row.rowNumber}-${row.internalCode}`}>
                  <td className="px-4 py-3 font-bold text-cyan-800">{row.internalCode}</td>
                  <td className="px-4 py-3">{row.masterCode || '-'}</td>
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
        <InventoryPreviewTable rows={preview.inventoryRows} />
      )}
    </>
  );
}

function InventoryPreviewTable({ rows }: { rows: InventoryPreviewRow[] }) {
  return (
    <section className="overflow-hidden rounded-lg bg-white shadow-sm">
      <div className="border-b p-4"><h3 className="font-bold">Vista previa de lotes</h3></div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y text-sm">
          <thead className="bg-slate-50 text-left">
            <tr>
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3">Unidad</th>
              <th className="px-4 py-3">Almacen</th>
              <th className="px-4 py-3">Ubicacion</th>
              <th className="px-4 py-3">Lote</th>
              <th className="px-4 py-3">Vencimiento</th>
              <th className="px-4 py-3">Stock</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((row) => (
              <tr key={`${row.rowNumber}-${row.internalCode}-${row.businessUnit}-${row.lotNumber}`}>
                <td className="px-4 py-3 font-bold">{row.internalCode}</td>
                <td className="px-4 py-3">{row.businessUnit}</td>
                <td className="px-4 py-3">{row.warehouse}</td>
                <td className="px-4 py-3">
                  {[row.shelfCode, row.shelfLevel].filter(Boolean).join(' / ') || '-'}
                  {row.locationNotes ? <div className="text-xs text-slate-500">{row.locationNotes}</div> : null}
                </td>
                <td className="px-4 py-3">{row.lotNumber}</td>
                <td className="px-4 py-3">{row.expirationDate || '-'}</td>
                <td className="px-4 py-3">{row.stock}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function RecordsPanel({
  query,
  status,
  productType,
  page,
  catalog,
  catalogLoading,
  onQueryChange,
  onStatusChange,
  onProductTypeChange,
  onRefresh,
  onPreviousPage,
  onNextPage,
  onChangeStatus,
}: {
  query: string;
  status: string;
  productType: string;
  page: number;
  catalog: CatalogResponse | null;
  catalogLoading: boolean;
  onQueryChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onProductTypeChange: (value: string) => void;
  onRefresh: () => void;
  onPreviousPage: () => void;
  onNextPage: () => void;
  onChangeStatus: (product: Product) => void;
}) {
  return (
    <section className="overflow-hidden rounded-lg bg-white shadow-sm">
      <div className="grid gap-3 border-b p-4 md:grid-cols-[1fr_220px_180px_auto]">
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="SKU, codigo maestro, barras, producto o registro..."
          className="rounded-lg border p-2"
        />
        <select value={productType} onChange={(event) => onProductTypeChange(event.target.value)} className="rounded-lg border p-2">
          <option value="">Todos los tipos</option>
          {PRODUCT_TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        <select value={status} onChange={(event) => onStatusChange(event.target.value)} className="rounded-lg border p-2">
          <option value="all">Todos</option>
          <option value="active">Activos</option>
          <option value="inactive">Inactivos</option>
        </select>
        <button type="button" onClick={onRefresh} disabled={catalogLoading} className="rounded-lg bg-cyan-700 px-4 py-2 font-bold text-white disabled:opacity-60">
          {catalogLoading ? 'Cargando...' : 'Actualizar'}
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y text-sm">
          <thead className="bg-slate-50 text-left">
            <tr>
              <th className="px-4 py-3">SKU / maestro</th>
              <th className="px-4 py-3">Producto</th>
              <th className="px-4 py-3">Presentacion</th>
              <th className="px-4 py-3">Registro</th>
              <th className="px-4 py-3">Inventario y ubicacion</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Accion</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {!catalogLoading && (catalog?.items.length || 0) === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">No se encontraron productos.</td></tr>
            )}
            {catalog?.items.map((product) => {
              const totalStock = product.inventoryLots.reduce((sum, lot) => sum + Number(lot.stock), 0);
              return (
                <tr key={product.id}>
                  <td className="px-4 py-3 font-bold text-cyan-800">
                    {product.internalCode || '-'}
                    {product.masterCode ? <div className="text-xs font-normal text-slate-500">{product.masterCode}</div> : null}
                  </td>
                  <td className="px-4 py-3">
                    <strong>{product.genericName}</strong>
                    {product.commercialName ? <div className="text-xs text-slate-500">{product.commercialName}</div> : null}
                    {product.concentration ? <div className="text-xs">{product.concentration}</div> : null}
                  </td>
                  <td className="px-4 py-3">{product.presentation}</td>
                  <td className="px-4 py-3">{product.sanitaryRegistration || '-'}</td>
                  <td className="px-4 py-3">
                    <strong>{totalStock}</strong>
                    <div className="text-xs text-slate-500">{product.inventoryLots.length} lote(s)</div>
                    {product.inventoryLots.slice(0, 2).map((lot) => (
                      <div key={lot.id} className="mt-1 text-xs text-slate-600">
                        {lot.businessUnit} / {lot.warehouse}
                        {lot.shelfCode || lot.shelfLevel ? ` / ${[lot.shelfCode, lot.shelfLevel].filter(Boolean).join(' / ')}` : ''}
                      </div>
                    ))}
                  </td>
                  <td className="px-4 py-3">{product.active ? 'Activo' : 'Inactivo'}</td>
                  <td className="px-4 py-3">
                    <button type="button" onClick={() => onChangeStatus(product)} className={`rounded px-3 py-2 text-xs font-bold text-white ${product.active ? 'bg-red-700' : 'bg-emerald-700'}`}>
                      {product.active ? 'Inactivar' : 'Activar'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t px-4 py-3 text-sm">
        <span>{catalog?.total || 0} producto(s)</span>
        <div className="flex gap-2">
          <button type="button" disabled={page <= 1} onClick={onPreviousPage} className="rounded border px-3 py-1 disabled:opacity-40">Anterior</button>
          <span>Pagina {catalog?.page || page} de {catalog?.totalPages || 1}</span>
          <button type="button" disabled={page >= (catalog?.totalPages || 1)} onClick={onNextPage} className="rounded border px-3 py-1 disabled:opacity-40">Siguiente</button>
        </div>
      </div>
    </section>
  );
}

function HistoryPanel({
  imports,
  loading,
  onRefresh,
}: {
  imports: ImportRecord[];
  loading: boolean;
  onRefresh: () => void;
}) {
  return (
    <section className="overflow-hidden rounded-lg bg-white shadow-sm">
      <div className="flex items-center justify-between border-b p-4">
        <h3 className="font-bold">Historial de importaciones</h3>
        <button type="button" onClick={onRefresh} disabled={loading} className="rounded border px-3 py-2 text-sm font-bold">
          {loading ? 'Cargando...' : 'Actualizar'}
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y text-sm">
          <thead className="bg-slate-50 text-left">
            <tr>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Archivo</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Productos</th>
              <th className="px-4 py-3">Creados</th>
              <th className="px-4 py-3">Actualizados</th>
              <th className="px-4 py-3">Errores</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {!loading && imports.length === 0 && (
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
  );
}

function CodeCard({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase text-cyan-700">{label}</p>
      <p className="text-lg font-black text-cyan-950">{value}</p>
    </div>
  );
}

function TextInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="text-sm font-semibold text-slate-700">
      {label}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-lg border p-2"
      />
    </label>
  );
}

function CheckboxInput({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 rounded-lg border bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      {label}
    </label>
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
