import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

type InventoryLot = {
  id: string;
  businessUnit: string;
  warehouse: string;
  lotNumber: string;
  expirationDate?: string | null;
  stock: string | number;
  salePrice?: string | number | null;
  currency: string;
  active: boolean;
};

type Product = {
  id: string;
  internalCode?: string | null;
  masterCode?: string | null;
  genericName: string;
  commercialName?: string | null;
  concentration?: string | null;
  presentation: string;
  inventoryLots: InventoryLot[];
};

type CatalogResponse = {
  items: Product[];
  total: number;
};

type Movement = {
  id: string;
  movementType: string;
  direction: "IN" | "OUT";
  quantity: string | number;
  stockBefore: string | number;
  stockAfter: string | number;
  createdAt: string;
  reason?: string | null;
  sourceType?: string | null;
  documentNumber?: string | null;
  lot: { id: string; lotNumber: string; expirationDate?: string | null };
  company: { legalName: string };
  businessUnit: { name: string };
  warehouse: { name: string };
  createdBy?: { fullName?: string | null; email: string } | null;
};

type KardexResponse = {
  items: Movement[];
  total: number;
  page: number;
  totalPages: number;
};

type FefoAllocation = {
  lotId: string;
  lotNumber: string;
  expirationDate?: string | null;
  availableStock: string | number;
  allocatedQuantity: string | number;
  salePrice?: string | number | null;
  currency: string;
};

type FefoResponse = {
  requestedQuantity: string | number;
  availableQuantity: string | number;
  sufficientStock: boolean;
  missingQuantity: string | number;
  strategy: string;
  allocations: FefoAllocation[];
};

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
type InventoryMode = "PHARMACY" | "DRUGSTORE";

const MOVEMENT_LABELS: Record<string, string> = {
  INITIAL_STOCK: "Stock inicial",
  PURCHASE: "Compra",
  SALE: "Venta",
  PRESCRIPTION_DISPENSING: "Dispensacion por receta",
  POSITIVE_ADJUSTMENT: "Ajuste positivo",
  NEGATIVE_ADJUSTMENT: "Ajuste negativo",
  CUSTOMER_RETURN: "Devolucion de cliente",
  SUPPLIER_RETURN: "Devolucion a proveedor",
  TRANSFER_IN: "Transferencia de entrada",
  TRANSFER_OUT: "Transferencia de salida",
  REVERSAL: "Reversion",
};

function getToken() {
  return sessionStorage.getItem("ame_token") || "";
}

async function readError(response: Response, fallback: string) {
  try {
    const result = await response.json();
    if (Array.isArray(result?.message)) return result.message.join(" ");
    return result?.message || fallback;
  } catch {
    return fallback;
  }
}

function formatDate(value?: string | null) {
  if (!value) return "Sin fecha";
  return new Date(value).toLocaleDateString("es-PE");
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("es-PE");
}

export default function PharmacyInventory({
  mode = "PHARMACY",
}: {
  mode?: InventoryMode;
}) {
  const isDrugstore = mode === "DRUGSTORE";
  const operatingCompany =
    sessionStorage.getItem("hcelm_company_name") ||
    (isDrugstore ? "AME HEALTH SAC" : "Suministros Críticos EIRL");
  const operatingUnit =
    sessionStorage.getItem("hcelm_business_unit_name") ||
    (isDrugstore ? "Droguería AME HEALTH SAC" : "Botica Premium");
  const operatingWarehouse =
    sessionStorage.getItem("hcelm_warehouse_name") || "Almacén activo";
  const modulePath = isDrugstore ? "/drugstore" : "/pharmacy";
  const moduleLabel = isDrugstore ? "Droguería" : "Botica Premium";
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedLotId, setSelectedLotId] = useState("");
  const [scope, setScope] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [kardex, setKardex] = useState<KardexResponse | null>(null);
  const [fefo, setFefo] = useState<FefoResponse | null>(null);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingKardex, setLoadingKardex] = useState(false);
  const [loadingFefo, setLoadingFefo] = useState(false);
  const [error, setError] = useState("");

  const scopeOptions = useMemo(() => {
    if (!selectedProduct) return [];
    const unique = new Map<
      string,
      { value: string; businessUnit: string; warehouse: string }
    >();
    selectedProduct.inventoryLots
      .filter((lot) => lot.active && Number(lot.stock) > 0)
      .forEach((lot) => {
        const value = [lot.businessUnit, lot.warehouse].join("|");
        unique.set(value, {
          value,
          businessUnit: lot.businessUnit,
          warehouse: lot.warehouse,
        });
      });
    return [...unique.values()];
  }, [selectedProduct]);

  async function loadProducts() {
    setLoadingProducts(true);
    setError("");
    try {
      const params = new URLSearchParams({
        q: query.trim(),
        status: "active",
        page: "1",
        pageSize: "50",
      });
      const response = await fetch(
        `${API_BASE}/medication-catalog/catalog?${params}`,
        {
          headers: { Authorization: `Bearer ${getToken()}` },
        },
      );
      if (!response.ok)
        throw new Error(
          await readError(response, "No se pudo cargar productos."),
        );
      const result = (await response.json()) as CatalogResponse;
      const scopedItems = (result.items || []).filter(
        (product) => !isDrugstore || product.inventoryLots.length > 0,
      );
      setProducts(scopedItems);
    } catch (reason: any) {
      setError(reason?.message || "Error al cargar productos.");
    } finally {
      setLoadingProducts(false);
    }
  }

  function selectProduct(product: Product) {
    setSelectedProduct(product);
    setSelectedLotId("");
    setKardex(null);
    setFefo(null);
    const firstLot = product.inventoryLots.find(
      (lot) => lot.active && Number(lot.stock) > 0,
    );
    setScope(
      firstLot ? [firstLot.businessUnit, firstLot.warehouse].join("|") : "",
    );
  }

  async function loadKardex(lotId?: string) {
    if (!selectedProduct) return;
    setLoadingKardex(true);
    setError("");
    try {
      const path = lotId
        ? `/medication-catalog/lots/${lotId}/kardex?page=1&pageSize=100`
        : `/medication-catalog/catalog/${selectedProduct.id}/kardex?page=1&pageSize=100`;
      const response = await fetch(`${API_BASE}${path}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!response.ok)
        throw new Error(
          await readError(response, "No se pudo consultar el Kardex."),
        );
      setKardex(await response.json());
    } catch (reason: any) {
      setError(reason?.message || "Error al consultar el Kardex.");
    } finally {
      setLoadingKardex(false);
    }
  }

  async function previewFefo() {
    if (!selectedProduct || !scope) {
      setError("Seleccione un producto, unidad y almacen.");
      return;
    }
    if (!Number.isFinite(Number(quantity)) || Number(quantity) <= 0) {
      setError("La cantidad debe ser mayor que cero.");
      return;
    }
    const [businessUnit, warehouse] = scope.split("|");
    setLoadingFefo(true);
    setError("");
    setFefo(null);
    try {
      const params = new URLSearchParams({ quantity, businessUnit, warehouse });
      const response = await fetch(
        `${API_BASE}/medication-catalog/catalog/${selectedProduct.id}/fefo-preview?${params}`,
        { headers: { Authorization: `Bearer ${getToken()}` } },
      );
      if (!response.ok)
        throw new Error(await readError(response, "No se pudo simular FEFO."));
      setFefo(await response.json());
    } catch (reason: any) {
      setError(reason?.message || "Error al simular FEFO.");
    } finally {
      setLoadingFefo(false);
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-6 md:px-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="rounded-lg bg-white p-5 shadow-sm">
          <nav className="mb-3 flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-500">
            <Link to="/home" className="hover:text-emerald-700">
              Plataforma
            </Link>
            <span>/</span>
            <Link to={modulePath} className="hover:text-emerald-700">
              {moduleLabel}
            </Link>
            <span>/</span>
            <span className="text-slate-900">Inventario y Kardex</span>
          </nav>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                {isDrugstore
                  ? "FEFO de Droguería"
                  : "Inventario, Kardex y FEFO"}
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                Contexto: {operatingCompany} / {operatingUnit} /{" "}
                {operatingWarehouse}. Consulte movimientos auditados y simule la
                selección de lotes sin descontar stock
                {isDrugstore ? " ni aplicar promociones minoristas." : "."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {!isDrugstore ? (
                <Link
                  to="/pharmacy/catalogs?view=records"
                  className="rounded-lg border px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  Productos y lotes
                </Link>
              ) : null}
              <Link
                to={modulePath}
                className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-bold text-white hover:bg-slate-900"
              >
                Volver a {moduleLabel}
              </Link>
            </div>
          </div>
        </header>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">
            {error}
          </div>
        )}

        <section className="rounded-lg bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b p-4 md:flex-row">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") loadProducts();
              }}
              placeholder="Buscar por SKU, codigo, generico, comercial o registro"
              className="min-w-0 flex-1 rounded-lg border p-2"
            />
            <button
              type="button"
              onClick={loadProducts}
              disabled={loadingProducts}
              className="rounded-lg bg-cyan-700 px-5 py-2 font-bold text-white disabled:opacity-60"
            >
              {loadingProducts ? "Buscando..." : "Buscar"}
            </button>
          </div>
          <div className="max-h-80 overflow-auto">
            <table className="min-w-full divide-y text-sm">
              <thead className="sticky top-0 bg-slate-50 text-left">
                <tr>
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3">Producto</th>
                  <th className="px-4 py-3">Presentacion</th>
                  <th className="px-4 py-3">Stock</th>
                  <th className="px-4 py-3">Accion</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {!loadingProducts && products.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-slate-500"
                    >
                      No se encontraron productos.
                    </td>
                  </tr>
                )}
                {products.map((product) => (
                  <tr
                    key={product.id}
                    className={
                      selectedProduct?.id === product.id ? "bg-cyan-50" : ""
                    }
                  >
                    <td className="px-4 py-3 font-bold text-cyan-800">
                      {product.internalCode || "-"}
                    </td>
                    <td className="px-4 py-3">
                      <strong>{product.genericName}</strong>
                      {product.commercialName ? (
                        <div className="text-xs text-slate-500">
                          {product.commercialName}
                        </div>
                      ) : null}
                      {product.concentration ? (
                        <div className="text-xs">{product.concentration}</div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">{product.presentation}</td>
                    <td className="px-4 py-3 font-semibold">
                      {product.inventoryLots.reduce(
                        (sum, lot) => sum + Number(lot.stock),
                        0,
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => selectProduct(product)}
                        className="rounded bg-emerald-700 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-800"
                      >
                        Seleccionar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {selectedProduct && (
          <>
            <section className="rounded-lg bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase text-emerald-700">
                    Producto seleccionado
                  </p>
                  <h2 className="text-xl font-bold text-slate-900">
                    {selectedProduct.genericName}{" "}
                    {selectedProduct.concentration || ""}
                  </h2>
                  <p className="text-sm text-slate-600">
                    {selectedProduct.internalCode || "-"} /{" "}
                    {selectedProduct.presentation}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => loadKardex()}
                  disabled={loadingKardex}
                  className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
                >
                  {loadingKardex ? "Consultando..." : "Ver Kardex completo"}
                </button>
              </div>

              <div className="mt-5 overflow-x-auto rounded-lg border">
                <table className="min-w-full divide-y text-sm">
                  <thead className="bg-slate-50 text-left">
                    <tr>
                      <th className="px-4 py-3">Lote</th>
                      <th className="px-4 py-3">Unidad / almacén</th>
                      <th className="px-4 py-3">Vencimiento</th>
                      <th className="px-4 py-3">Stock</th>
                      <th className="px-4 py-3">Precio</th>
                      <th className="px-4 py-3">Kardex</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {selectedProduct.inventoryLots.map((lot) => (
                      <tr key={lot.id}>
                        <td className="px-4 py-3 font-bold">{lot.lotNumber}</td>
                        <td className="px-4 py-3">
                          {lot.businessUnit} / {lot.warehouse}
                        </td>
                        <td className="px-4 py-3">
                          {formatDate(lot.expirationDate)}
                        </td>
                        <td className="px-4 py-3">{lot.stock}</td>
                        <td className="px-4 py-3">
                          {lot.salePrice ?? "-"} {lot.currency}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedLotId(lot.id);
                              loadKardex(lot.id);
                            }}
                            className="rounded border border-cyan-700 px-3 py-1 text-xs font-bold text-cyan-800 hover:bg-cyan-50"
                          >
                            Ver lote
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="rounded-lg bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900">
                Simulacion FEFO
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Esta consulta no descuenta stock
                {isDrugstore
                  ? " y ordena los lotes para despacho mayorista."
                  : "."}
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-[1fr_180px_auto]">
                <select
                  value={scope}
                  onChange={(event) => setScope(event.target.value)}
                  className="rounded-lg border p-2"
                >
                  <option value="">Seleccione unidad y almacén</option>
                  {scopeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.businessUnit} / {option.warehouse}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min="0.001"
                  step="0.001"
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                  className="rounded-lg border p-2"
                  aria-label="Cantidad FEFO"
                />
                <button
                  type="button"
                  onClick={previewFefo}
                  disabled={loadingFefo}
                  className="rounded-lg bg-emerald-700 px-5 py-2 font-bold text-white disabled:opacity-60"
                >
                  {loadingFefo ? "Simulando..." : "Simular FEFO"}
                </button>
              </div>

              {fefo && (
                <div className="mt-5">
                  <div
                    className={
                      fefo.sufficientStock
                        ? "rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"
                        : "rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900"
                    }
                  >
                    Solicitado: <strong>{fefo.requestedQuantity}</strong> /
                    Disponible: <strong>{fefo.availableQuantity}</strong> /{" "}
                    {fefo.sufficientStock
                      ? "Stock suficiente"
                      : "Stock insuficiente"}
                  </div>
                  <div className="mt-3 overflow-x-auto rounded-lg border">
                    <table className="min-w-full divide-y text-sm">
                      <thead className="bg-slate-50 text-left">
                        <tr>
                          <th className="px-4 py-3">Orden</th>
                          <th className="px-4 py-3">Lote</th>
                          <th className="px-4 py-3">Vencimiento</th>
                          <th className="px-4 py-3">Disponible</th>
                          <th className="px-4 py-3">Asignado</th>
                          <th className="px-4 py-3">Precio</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {fefo.allocations.map((allocation, index) => (
                          <tr key={allocation.lotId}>
                            <td className="px-4 py-3 font-bold">{index + 1}</td>
                            <td className="px-4 py-3 font-bold">
                              {allocation.lotNumber}
                            </td>
                            <td className="px-4 py-3">
                              {formatDate(allocation.expirationDate)}
                            </td>
                            <td className="px-4 py-3">
                              {allocation.availableStock}
                            </td>
                            <td className="px-4 py-3 text-emerald-800 font-bold">
                              {allocation.allocatedQuantity}
                            </td>
                            <td className="px-4 py-3">
                              {allocation.salePrice ?? "-"}{" "}
                              {allocation.currency}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </section>
          </>
        )}

        {kardex && (
          <section className="overflow-hidden rounded-lg bg-white shadow-sm">
            <div className="flex flex-col gap-1 border-b p-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Movimientos de Kardex
                </h2>
                <p className="text-sm text-slate-500">
                  {selectedLotId
                    ? "Filtrado por lote seleccionado"
                    : "Todos los lotes del producto"}{" "}
                  / {kardex.total} movimiento(s)
                </p>
              </div>
              {selectedLotId && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedLotId("");
                    loadKardex();
                  }}
                  className="rounded border px-3 py-2 text-sm font-bold"
                >
                  Ver todos
                </button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y text-sm">
                <thead className="bg-slate-50 text-left">
                  <tr>
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3">Movimiento</th>
                    <th className="px-4 py-3">Lote</th>
                    <th className="px-4 py-3">Cantidad</th>
                    <th className="px-4 py-3">Stock</th>
                    <th className="px-4 py-3">Unidad / almacén</th>
                    <th className="px-4 py-3">Usuario y motivo</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {kardex.items.length === 0 && (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-8 text-center text-slate-500"
                      >
                        Sin movimientos.
                      </td>
                    </tr>
                  )}
                  {kardex.items.map((movement) => (
                    <tr key={movement.id}>
                      <td className="whitespace-nowrap px-4 py-3">
                        {formatDateTime(movement.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={
                            movement.direction === "IN"
                              ? "rounded-full bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-800"
                              : "rounded-full bg-red-100 px-2 py-1 text-xs font-bold text-red-800"
                          }
                        >
                          {movement.direction === "IN" ? "Entrada" : "Salida"}
                        </span>
                        <div className="mt-1 text-xs">
                          {MOVEMENT_LABELS[movement.movementType] ||
                            movement.movementType}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-bold">
                        {movement.lot.lotNumber}
                      </td>
                      <td className="px-4 py-3 font-bold">
                        {movement.quantity}
                      </td>
                      <td className="px-4 py-3">
                        {movement.stockBefore} a {movement.stockAfter}
                      </td>
                      <td className="px-4 py-3">
                        {movement.businessUnit.name}
                        <div className="text-xs text-slate-500">
                          {movement.warehouse.name}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {movement.createdBy?.fullName ||
                          movement.createdBy?.email ||
                          "Sistema"}
                        <div className="max-w-xs text-xs text-slate-500">
                          {movement.reason || movement.sourceType || "-"}
                        </div>
                      </td>
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
