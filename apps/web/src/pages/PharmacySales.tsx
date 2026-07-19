import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";

type PaymentMethod =
  | "CASH"
  | "CARD"
  | "YAPE"
  | "PLIN"
  | "BANK_TRANSFER"
  | "OTHER";

type FefoLot = {
  id: string;
  lotNumber: string;
  expirationDate?: string | null;
  availableStock: string | number;
  salePrice?: string | number | null;
  currency: string;
};

type SaleProduct = {
  id: string;
  companyMedicationId: string;
  companySku?: string | null;
  barcode?: string | null;
  masterCode?: string | null;
  productType: string;
  genericName: string;
  commercialName?: string | null;
  concentration?: string | null;
  pharmaceuticalForm?: string | null;
  presentation: string;
  laboratory?: string | null;
  manufacturer?: string | null;
  sanitaryRegistration?: string | null;
  requiresPrescription: boolean;
  controlled: boolean;
  availableStock: string | number;
  salePrice?: string | number | null;
  currency: string;
  saleAllowed: boolean;
  blockReason?: string | null;
  fefoLot?: FefoLot | null;
};

type SearchResponse = {
  items: SaleProduct[];
  total: number;
  scope: {
    companyId: string;
    businessUnit: string;
    warehouse: string;
  };
};

type FefoAllocation = {
  lotId: string;
  lotNumber: string;
  expirationDate?: string | null;
  allocatedQuantity: string | number;
  availableStock: string | number;
  currency: string;
  purchasePrice?: string | number | null;
  originalSalePrice?: string | number | null;
  configuredDiscountPercent?: string | number;
  appliedDiscountPercent?: string | number;
  discountLimitedByCost?: boolean;
  finalSalePrice?: string | number | null;
  salePrice?: string | number | null;
  fefoRuleKey?: string;
  fefoRuleLabel?: string;
  fefoAction?: string;
  requiresAuthorization?: boolean;
  blockedReason?: string | null;
  originalSubtotal?: string | number | null;
  discountAmount?: string | number | null;
  finalSubtotal?: string | number | null;
};

type FefoResponse = {
  sufficientStock: boolean;
  availableQuantity: string | number;
  missingQuantity: string | number;
  allocations: FefoAllocation[];
  pricingAuthority?: string;
  requiresAuthorization?: boolean;
  blocked?: boolean;
  blockedReasons?: string[];
  originalTotal?: string | number;
  discountTotal?: string | number;
  finalTotal?: string | number;
};

type CartItem = {
  product: SaleProduct;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  originalSubtotal?: number;
  discountAmount?: number;
  allocations: FefoAllocation[];
};

type FefoAuthorizationEntry = {
  authorizationId: string;
  token: string;
  status?: string;
  requesting?: boolean;
  validating?: boolean;
  valid?: boolean;
  error?: string;
};

type CompletedSale = {
  id: string;
  saleNumber: string;
  status: string;
  total: string | number;
  customerName?: string | null;
  items: Array<{
    id: string;
    genericName: string;
    quantity: string | number;
    total: string | number;
  }>;
  payments: Array<{
    id: string;
    method: PaymentMethod;
    amount: string | number;
    changeAmount?: string | number | null;
  }>;
};

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
const OPERATING_COMPANY = "Suministros Críticos EIRL";
const OPERATING_UNIT = "Botica Premium";
const OPERATING_WAREHOUSE = "Almacén principal";

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  CASH: "Efectivo",
  CARD: "Tarjeta",
  YAPE: "Yape",
  PLIN: "Plin",
  BANK_TRANSFER: "Transferencia / depósito bancario",
  OTHER: "Otro",
};

const SALE_STEPS = [
  "Buscar producto con stock",
  "Agregar cantidad al carrito",
  "Registrar cliente",
  "Elegir medio de pago",
  "Revisar y completar venta",
];

const BLOCK_LABELS: Record<string, string> = {
  REQUIRES_PRESCRIPTION: "Requiere receta: venta bloqueada",
  OUT_OF_STOCK: "Sin stock disponible",
  MISSING_PRICE: "Lote FEFO sin precio",
};

function ProductBlockHelp({ product }: { product: SaleProduct }) {
  const label = BLOCK_LABELS[product.blockReason || ""] || "No disponible";

  if (product.blockReason === "REQUIRES_PRESCRIPTION") {
    return (
      <div className="mt-2 max-w-64 rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
        <p className="font-bold">{label}</p>
        <p className="mt-1">
          Para venderlo debe registrar una receta valida. Para probar
          facturación SUNAT, use un producto de venta libre.
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Link
            to="/pharmacy/catalogs"
            className="rounded-md border border-amber-300 bg-white px-2 py-1 font-bold text-amber-900 hover:bg-amber-100"
          >
            Revisar catálogo
          </Link>
          <Link
            to="/pharmacy/inventory"
            className="rounded-md bg-amber-700 px-2 py-1 font-bold text-white hover:bg-amber-800"
          >
            Producto libre
          </Link>
        </div>
      </div>
    );
  }

  return <div className="mt-1 max-w-40 text-xs text-slate-500">{label}</div>;
}

function getToken() {
  return sessionStorage.getItem("ame_token") || "";
}

async function readError(response: Response, fallback: string) {
  try {
    const data = await response.json();
    if (Array.isArray(data?.message)) return data.message.join(" ");
    return data?.message || fallback;
  } catch {
    return fallback;
  }
}

function formatMoney(value: number | string) {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    minimumFractionDigits: 2,
  }).format(Number(value || 0));
}

function formatDate(value?: string | null) {
  if (!value) return "Sin vencimiento";
  return new Date(value).toLocaleDateString("es-PE");
}

type FefoRuleAction =
  | "NORMAL"
  | "ALERT"
  | "SUGGEST_DISCOUNT"
  | "REQUIRE_AUTHORIZATION";

type FefoRule = {
  id: "NORMAL" | "WATCH" | "PROMOTION" | "CRITICAL";
  label: string;
  minDays: number;
  maxDays: number | null;
  discountPercent: number;
  action: FefoRuleAction;
};

type FefoVisualState = {
  key: "NORMAL" | "WATCH" | "PROMOTION" | "CRITICAL" | "UNKNOWN";
  label: string;
  detail: string;
  discountPercent: number;
  action: FefoRuleAction | "UNKNOWN";
  containerClass: string;
  symbolClass: string;
  symbol: string;
};

const FEFO_STORAGE_KEY = "hcelm_fefo_rules_v1";

const DEFAULT_FEFO_RULES: FefoRule[] = [
  {
    id: "NORMAL",
    label: "Vencimiento normal",
    minDays: 181,
    maxDays: null,
    discountPercent: 0,
    action: "NORMAL",
  },
  {
    id: "WATCH",
    label: "Vigilar rotación",
    minDays: 91,
    maxDays: 180,
    discountPercent: 0,
    action: "ALERT",
  },
  {
    id: "PROMOTION",
    label: "Promoción FEFO",
    minDays: 31,
    maxDays: 90,
    discountPercent: 15,
    action: "SUGGEST_DISCOUNT",
  },
  {
    id: "CRITICAL",
    label: "Vencimiento crítico",
    minDays: 0,
    maxDays: 30,
    discountPercent: 20,
    action: "REQUIRE_AUTHORIZATION",
  },
];

function readFefoRules(): FefoRule[] {
  try {
    const saved = localStorage.getItem(FEFO_STORAGE_KEY);

    if (!saved) {
      return DEFAULT_FEFO_RULES;
    }

    const parsed = JSON.parse(saved);

    if (!Array.isArray(parsed) || parsed.length !== 4) {
      return DEFAULT_FEFO_RULES;
    }

    const validRules = parsed.filter(
      (rule): rule is FefoRule =>
        rule &&
        typeof rule.id === "string" &&
        typeof rule.label === "string" &&
        typeof rule.minDays === "number" &&
        (typeof rule.maxDays === "number" || rule.maxDays === null) &&
        typeof rule.discountPercent === "number" &&
        typeof rule.action === "string",
    );

    return validRules.length === 4 ? validRules : DEFAULT_FEFO_RULES;
  } catch {
    return DEFAULT_FEFO_RULES;
  }
}

function saveFefoRulesLocally(rules: FefoRule[]) {
  localStorage.setItem(FEFO_STORAGE_KEY, JSON.stringify(rules));
}

async function loadFefoRulesFromServer(): Promise<FefoRule[]> {
  const token = sessionStorage.getItem("ame_token");

  if (!token) {
    return readFefoRules();
  }

  const response = await fetch(`${API_BASE}/pharmacy-fefo/rules`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.status === 401) {
    sessionStorage.removeItem("ame_token");
    window.location.assign("/login");
    return readFefoRules();
  }

  if (!response.ok) {
    return readFefoRules();
  }

  const data = await response.json();
  const rules = Array.isArray(data?.rules) ? data.rules : [];

  if (rules.length !== 4) {
    return readFefoRules();
  }

  const normalized = rules.filter((rule: unknown): rule is FefoRule => {
    if (!rule || typeof rule !== "object") return false;

    const candidate = rule as Partial<FefoRule>;

    return (
      typeof candidate.id === "string" &&
      typeof candidate.label === "string" &&
      typeof candidate.minDays === "number" &&
      (typeof candidate.maxDays === "number" || candidate.maxDays === null) &&
      typeof candidate.discountPercent === "number" &&
      typeof candidate.action === "string"
    );
  });

  if (normalized.length !== 4) {
    return readFefoRules();
  }

  saveFefoRulesLocally(normalized);
  return normalized;
}
function getDaysUntilExpiration(value?: string | null) {
  if (!value) return null;

  const expiration = new Date(value);
  expiration.setHours(23, 59, 59, 999);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return Math.ceil(
    (expiration.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );
}

function getFefoRuleForDays(days: number, rules: FefoRule[]): FefoRule {
  const matched = rules.find((rule) => {
    const insideMinimum = days >= rule.minDays;
    const insideMaximum = rule.maxDays === null || days <= rule.maxDays;

    return insideMinimum && insideMaximum;
  });

  return matched ?? DEFAULT_FEFO_RULES[0];
}

function getFefoVisualState(
  value: string | null | undefined,
  rules: FefoRule[],
): FefoVisualState {
  const days = getDaysUntilExpiration(value);

  if (days === null) {
    return {
      key: "UNKNOWN",
      label: "Sin fecha registrada",
      detail: "Revisar información del lote",
      discountPercent: 0,
      action: "UNKNOWN",
      containerClass:
        "border-slate-500 bg-slate-100 text-slate-950 ring-2 ring-slate-300",
      symbolClass: "rounded-md border-2 border-slate-800 bg-white",
      symbol: "?",
    };
  }

  if (days < 0) {
    return {
      key: "CRITICAL",
      label: "Lote vencido",
      detail: "Bloqueado: no debe venderse",
      discountPercent: 0,
      action: "REQUIRE_AUTHORIZATION",
      containerClass:
        "border-red-800 bg-red-100 text-red-950 ring-2 ring-red-400",
      symbolClass:
        "border-2 border-red-950 bg-red-700 text-white [clip-path:polygon(30%_0%,70%_0%,100%_30%,100%_70%,70%_100%,30%_100%,0%_70%,0%_30%)]",
      symbol: "!",
    };
  }

  const rule = getFefoRuleForDays(days, rules);

  const visualByRule: Record<
    FefoRule["id"],
    Pick<FefoVisualState, "containerClass" | "symbolClass" | "symbol">
  > = {
    NORMAL: {
      containerClass: "fefo-card-normal",
      symbolClass: "fefo-shape fefo-shape-normal",
      symbol: "●",
    },
    WATCH: {
      containerClass: "fefo-card-watch",
      symbolClass: "fefo-shape fefo-shape-watch",
      symbol: "▲",
    },
    PROMOTION: {
      containerClass: "fefo-card-promotion",
      symbolClass: "fefo-shape fefo-shape-promotion",
      symbol: "◆",
    },
    CRITICAL: {
      containerClass: "fefo-card-critical",
      symbolClass: "fefo-shape fefo-shape-critical",
      symbol: "!",
    },
  };

  const visual = visualByRule[rule.id];

  return {
    key: rule.id,
    label: rule.label,
    detail: `${days} día(s) para vencer`,
    discountPercent: rule.discountPercent,
    action: rule.action,
    ...visual,
  };
}
function FefoStatusBadge({
  expirationDate,
  rules,
}: {
  expirationDate?: string | null;
  rules: FefoRule[];
}) {
  const status = getFefoVisualState(expirationDate, rules);

  return (
    <div
      className={`mt-3 min-w-56 rounded-xl border-2 p-3 shadow-sm ${status.containerClass}`}
      aria-label={`${status.label}. ${status.detail}`}
    >
      <div className="flex items-center gap-3">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center text-sm font-black ${status.symbolClass}`}
          aria-hidden="true"
        >
          <span
            className={
              status.key === "PROMOTION" ? "-rotate-45 text-lg" : "text-lg"
            }
          >
            {status.symbol}
          </span>
        </span>

        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-wide">
            {status.label}
          </p>
          <p className="mt-0.5 text-xs font-semibold">{status.detail}</p>
        </div>
      </div>

      {status.discountPercent > 0 && (
        <div className="mt-2 rounded-lg border-2 border-current bg-white px-3 py-2 text-center">
          <span className="text-xs font-black uppercase">
            {status.action === "REQUIRE_AUTHORIZATION"
              ? "Descuento con autorización"
              : status.action === "SUGGEST_DISCOUNT"
                ? "Descuento sugerido"
                : "Descuento configurado"}
          </span>
          <strong className="ml-2 text-lg">{status.discountPercent} %</strong>
        </div>
      )}
    </div>
  );
}

function redirectToBillingAfterSale(sale: CompletedSale) {
  const params = new URLSearchParams({
    fromSale: "1",
    saleId: sale.id,
    saleNumber: sale.saleNumber,
  });

  window.location.assign("/billing?" + params.toString());
}

export default function PharmacySales() {
  const [fefoRules, setFefoRules] = useState<FefoRule[]>(readFefoRules);

  useEffect(() => {
    let cancelled = false;

    async function refreshFefoRules() {
      try {
        const serverRules = await loadFefoRulesFromServer();

        if (!cancelled) {
          setFefoRules(serverRules);
        }
      } catch {
        if (!cancelled) {
          setFefoRules(readFefoRules());
        }
      }
    }

    void refreshFefoRules();

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        void refreshFefoRules();
      }
    };

    window.addEventListener("focus", refreshFefoRules);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", refreshFefoRules);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchRequestRef = useRef(0);
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<SaleProduct[]>([]);
  const [scopeCompanyId, setScopeCompanyId] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerDocumentType, setCustomerDocumentType] = useState("DNI");
  const [customerDocumentNumber, setCustomerDocumentNumber] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [paymentReference, setPaymentReference] = useState("");
  const [receivedAmount, setReceivedAmount] = useState("");
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<CompletedSale | null>(null);
  const [authorizationReason, setAuthorizationReason] = useState(
    "Venta de lote crítico solicitada por necesidad operativa.",
  );
  const [fefoAuthorizations, setFefoAuthorizations] = useState<
    Record<string, FefoAuthorizationEntry>
  >({});

  const cartTotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.subtotal, 0),
    [cart],
  );
  const changeAmount = useMemo(() => {
    if (paymentMethod !== "CASH" || !receivedAmount) return 0;
    return Math.max(0, Number(receivedAmount) - cartTotal);
  }, [cartTotal, paymentMethod, receivedAmount]);

  const criticalAllocations = useMemo(
    () =>
      cart.flatMap((item) =>
        item.allocations
          .filter((allocation) => allocation.requiresAuthorization === true)
          .map((allocation) => ({
            item,
            allocation,
            key: authorizationKey(item.product.id, allocation.lotId),
          })),
      ),
    [cart],
  );

  const allCriticalAuthorizationsValid = useMemo(
    () =>
      criticalAllocations.every(
        ({ key }) => fefoAuthorizations[key]?.valid === true,
      ),
    [criticalAllocations, fefoAuthorizations],
  );

  async function loadProducts(searchValue = query) {
    const requestId = searchRequestRef.current + 1;
    searchRequestRef.current = requestId;
    setLoadingProducts(true);
    setError("");
    try {
      const params = new URLSearchParams({
        q: searchValue.trim(),
        page: "1",
        pageSize: "30",
      });
      const response = await fetch(
        `${API_BASE}/pharmacy-sales/products/search?${params}`,
        { headers: { Authorization: `Bearer ${getToken()}` } },
      );
      if (!response.ok) {
        throw new Error(
          await readError(response, "No se pudieron buscar productos."),
        );
      }
      const result = (await response.json()) as SearchResponse;
      if (requestId !== searchRequestRef.current) return;
      setProducts(result.items || []);
      setScopeCompanyId(result.scope?.companyId || "");
    } catch (reason: any) {
      if (requestId === searchRequestRef.current) {
        setError(reason?.message || "Error al buscar productos.");
      }
    } finally {
      if (requestId === searchRequestRef.current) {
        setLoadingProducts(false);
      }
    }
  }

  function search(event: FormEvent) {
    event.preventDefault();
    void loadProducts();
  }

  function resetReview() {
    setReviewOpen(false);
    setIdempotencyKey("");
    setSuccess(null);
    setFefoAuthorizations({});
  }

  function addProduct(product: SaleProduct) {
    if (!product.saleAllowed) return;
    setError("");
    setCart((current) => {
      const existing = current.find((item) => item.product.id === product.id);
      if (existing) {
        if (existing.quantity + 1 > Number(product.availableStock)) {
          setError("La cantidad supera el stock disponible.");
          return current;
        }
        return current.map((item) =>
          item.product.id === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
                subtotal: (item.quantity + 1) * item.unitPrice,
                allocations: [],
              }
            : item,
        );
      }
      const unitPrice = Number(product.salePrice || 0);
      return [
        ...current,
        {
          product,
          quantity: 1,
          unitPrice,
          subtotal: unitPrice,
          allocations: [],
        },
      ];
    });
    setReceivedAmount("");
    resetReview();
    setQuery("");
    window.setTimeout(() => searchInputRef.current?.focus(), 0);
  }

  function updateQuantity(productId: string, rawValue: string) {
    const quantity = Number(rawValue);
    setCart((current) =>
      current.map((item) => {
        if (item.product.id !== productId) return item;
        if (
          !Number.isFinite(quantity) ||
          quantity <= 0 ||
          quantity > Number(item.product.availableStock)
        ) {
          return item;
        }
        return {
          ...item,
          quantity,
          subtotal: quantity * item.unitPrice,
          allocations: [],
        };
      }),
    );
    setReceivedAmount("");
    resetReview();
  }

  function removeItem(productId: string) {
    setCart((current) =>
      current.filter((item) => item.product.id !== productId),
    );
    setReceivedAmount("");
    resetReview();
  }

  function authorizationKey(medicationId: string, lotId: string) {
    return medicationId + ":" + lotId;
  }

  function updateFefoAuthorization(
    key: string,
    patch: Partial<FefoAuthorizationEntry>,
  ) {
    setFefoAuthorizations((current) => ({
      ...current,
      [key]: {
        ...(current[key] || {
          authorizationId: "",
          token: "",
        }),
        ...patch,
      },
    }));
  }

  async function requestFefoAuthorization(
    item: CartItem,
    allocation: FefoAllocation,
  ) {
    const key = authorizationKey(item.product.id, allocation.lotId);
    const reason = authorizationReason.trim();

    if (reason.length < 10) {
      updateFefoAuthorization(key, {
        error: "El motivo debe contener al menos 10 caracteres.",
      });
      return;
    }

    updateFefoAuthorization(key, {
      requesting: true,
      valid: false,
      error: "",
    });

    try {
      const response = await fetch(`${API_BASE}/pharmacy-fefo/authorizations`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          medicationId: item.product.id,
          lotId: allocation.lotId,
          quantity: Number(allocation.allocatedQuantity),
          reason,
        }),
      });

      if (!response.ok) {
        throw new Error(
          await readError(
            response,
            "No se pudo solicitar la autorización FEFO.",
          ),
        );
      }

      const result = await response.json();
      const authorization = result.authorization;

      updateFefoAuthorization(key, {
        authorizationId: authorization?.id || "",
        status: authorization?.status || "PENDING",
        requesting: false,
        valid: false,
        error: "",
      });
    } catch (reason: any) {
      updateFefoAuthorization(key, {
        requesting: false,
        valid: false,
        error: reason?.message || "No se pudo solicitar la autorización FEFO.",
      });
    }
  }

  async function validateFefoAuthorization(
    item: CartItem,
    allocation: FefoAllocation,
  ) {
    const key = authorizationKey(item.product.id, allocation.lotId);
    const entry = fefoAuthorizations[key];

    if (!entry?.authorizationId.trim() || !entry?.token.trim()) {
      updateFefoAuthorization(key, {
        valid: false,
        error: "Ingrese el identificador y el token de autorización.",
      });
      return;
    }

    updateFefoAuthorization(key, {
      validating: true,
      valid: false,
      error: "",
    });

    try {
      const response = await fetch(
        `${API_BASE}/pharmacy-fefo/authorizations/validate/token`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${getToken()}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            authorizationId: entry.authorizationId.trim(),
            token: entry.token.trim(),
            medicationId: item.product.id,
            lotId: allocation.lotId,
            quantity: Number(allocation.allocatedQuantity),
          }),
        },
      );

      if (!response.ok) {
        throw new Error(
          await readError(response, "La autorización FEFO no es válida."),
        );
      }

      const result = await response.json();

      updateFefoAuthorization(key, {
        validating: false,
        valid: result?.valid === true,
        status: result?.authorization?.status || "APPROVED",
        error: "",
      });
    } catch (reason: any) {
      updateFefoAuthorization(key, {
        validating: false,
        valid: false,
        error: reason?.message || "La autorización FEFO no es válida.",
      });
    }
  }

  async function prepareReview() {
    if (!cart.length) {
      setError("Agregue al menos un producto al carrito.");
      return;
    }
    if (
      paymentMethod !== "CASH" &&
      paymentMethod !== "OTHER" &&
      !paymentReference.trim()
    ) {
      setError("Ingrese el número de operación del medio de pago.");
      return;
    }
    setReviewing(true);
    setError("");
    try {
      const reviewed: CartItem[] = [];
      for (const item of cart) {
        const params = new URLSearchParams({
          quantity: String(item.quantity),
        });
        const response = await fetch(
          `${API_BASE}/medication-catalog/catalog/${item.product.id}/fefo-preview?${params}`,
          { headers: { Authorization: `Bearer ${getToken()}` } },
        );
        if (!response.ok) {
          throw new Error(
            await readError(response, "No se pudo validar FEFO."),
          );
        }
        const preview = (await response.json()) as FefoResponse;

        if (!preview.sufficientStock) {
          throw new Error(
            `${item.product.genericName}: stock insuficiente. Disponible ${preview.availableQuantity}.`,
          );
        }

        if (preview.blocked && !preview.requiresAuthorization) {
          const reason =
            preview.blockedReasons?.filter(Boolean).join(" ") ||
            "La revisión FEFO bloqueó este producto.";
          throw new Error(`${item.product.genericName}: ${reason}`);
        }

        const originalSubtotal = Number(preview.originalTotal || 0);
        const discountAmount = Number(preview.discountTotal || 0);
        const subtotal = Number(preview.finalTotal || 0);

        if (!Number.isFinite(subtotal) || subtotal <= 0) {
          throw new Error(
            `${item.product.genericName}: el servidor no devolvió un total FEFO válido.`,
          );
        }

        reviewed.push({
          ...item,
          unitPrice: subtotal / item.quantity,
          subtotal,
          originalSubtotal,
          discountAmount,
          allocations: preview.allocations,
        });
      }
      setCart(reviewed);

      const nextAuthorizations: Record<string, FefoAuthorizationEntry> = {};

      reviewed.forEach((reviewedItem) => {
        reviewedItem.allocations
          .filter((allocation) => allocation.requiresAuthorization === true)
          .forEach((allocation) => {
            const key = authorizationKey(
              reviewedItem.product.id,
              allocation.lotId,
            );

            nextAuthorizations[key] = {
              authorizationId: "",
              token: "",
              status: "NOT_REQUESTED",
              valid: false,
            };
          });
      });

      setFefoAuthorizations(nextAuthorizations);

      const reviewedTotal = reviewed.reduce(
        (sum, item) => sum + item.subtotal,
        0,
      );
      if (
        paymentMethod === "CASH" &&
        receivedAmount &&
        Number(receivedAmount) < reviewedTotal
      ) {
        throw new Error("El efectivo recibido es menor que el total validado.");
      }
      if (paymentMethod === "CASH" && !receivedAmount) {
        setReceivedAmount(reviewedTotal.toFixed(2));
      }
      setIdempotencyKey(`WEB-OTC-${crypto.randomUUID()}`);
      setReviewOpen(true);
    } catch (reason: any) {
      setError(reason?.message || "No se pudo preparar la venta.");
    } finally {
      setReviewing(false);
    }
  }

  async function confirmSale() {
    if (!idempotencyKey || submitting) return;

    if (!allCriticalAuthorizationsValid) {
      setError(
        "Debe validar todas las autorizaciones FEFO críticas antes de cobrar.",
      );
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const payment: Record<string, string | number> = {
        method: paymentMethod,
      };
      if (paymentReference.trim()) payment.reference = paymentReference.trim();
      if (paymentMethod === "CASH" && receivedAmount) {
        payment.receivedAmount = Number(receivedAmount);
      }
      const response = await fetch(`${API_BASE}/pharmacy-sales`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          idempotencyKey,
          customerName: customerName.trim() || undefined,
          customerDocumentType: customerDocumentNumber.trim()
            ? customerDocumentType
            : undefined,
          customerDocumentNumber: customerDocumentNumber.trim() || undefined,
          notes: "Venta OTC registrada desde el POS de HCELM.",
          items: cart.map((item) => {
            const itemAuthorizations = item.allocations
              .filter((allocation) => allocation.requiresAuthorization === true)
              .map((allocation) => {
                const key = authorizationKey(item.product.id, allocation.lotId);
                const authorization = fefoAuthorizations[key];

                return {
                  authorizationId: authorization.authorizationId.trim(),
                  lotId: allocation.lotId,
                  token: authorization.token.trim(),
                };
              });

            return {
              medicationId: item.product.id,
              quantity: item.quantity,
              ...(itemAuthorizations.length
                ? { fefoAuthorizations: itemAuthorizations }
                : {}),
            };
          }),
          payment,
        }),
      });
      if (!response.ok) {
        throw new Error(
          await readError(response, "No se pudo completar la venta."),
        );
      }
      const result = await response.json();
      const completedSale = result.sale as CompletedSale;
      setSuccess(completedSale);
      setReviewOpen(false);
      setCart([]);
      setCustomerName("");
      setCustomerDocumentNumber("");
      setPaymentReference("");
      setReceivedAmount("");
      setIdempotencyKey("");
      setQuery("");
      window.setTimeout(() => redirectToBillingAfterSale(completedSale), 150);
    } catch (reason: any) {
      setError(reason?.message || "Error al completar la venta.");
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    window.setTimeout(() => searchInputRef.current?.focus(), 0);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadProducts(query);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [query]);

  return (
    <div className="min-h-screen bg-slate-100 px-3 py-4 sm:px-4 md:px-6 md:py-6">
      <div className="mx-auto w-full max-w-[1800px] space-y-5">
        <header className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="overflow-x-auto border-b border-slate-200 px-4 py-3 sm:px-5">
            <nav
              aria-label="Ruta de navegación"
              className="flex min-w-max items-center gap-2 text-sm font-semibold text-slate-500"
            >
              <Link
                to="/home"
                className="rounded-md px-2 py-1 hover:bg-slate-100 hover:text-emerald-700"
              >
                Plataforma
              </Link>
              <span aria-hidden="true">›</span>
              <Link
                to="/pharmacy"
                className="rounded-md px-2 py-1 hover:bg-slate-100 hover:text-emerald-700"
              >
                Botica Premium
              </Link>
              <span aria-hidden="true">›</span>
              <span className="px-2 py-1 text-slate-900">Ventas</span>
            </nav>
          </div>

          <div className="p-4 sm:p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
                  Punto de venta
                </p>
                <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
                  Nueva venta
                </h1>
                <p className="mt-2 text-sm text-slate-600">
                  {OPERATING_COMPANY}
                  <span className="mx-1.5 text-slate-300">/</span>
                  {OPERATING_UNIT}
                  <span className="mx-1.5 text-slate-300">/</span>
                  {OPERATING_WAREHOUSE}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                <Link
                  to="/pharmacy"
                  className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-center text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  ← Farmacia
                </Link>
                <a
                  href="#buscar-productos"
                  className="inline-flex min-h-11 items-center justify-center rounded-lg bg-emerald-700 px-4 py-2 text-center text-sm font-bold text-white hover:bg-emerald-800"
                >
                  Continuar venta ↓
                </a>
                <Link
                  to="/pharmacy/inventory"
                  className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-center text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  Inventario
                </Link>
                <Link
                  to="/pharmacy/catalogs"
                  className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-center text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  Catálogo
                </Link>
                <Link
                  to="/pharmacy/authorizations/fefo"
                  className="col-span-2 inline-flex min-h-11 items-center justify-center rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2 text-center text-sm font-bold text-emerald-900 hover:bg-emerald-100 sm:col-span-1"
                >
                  Autorizaciones FEFO
                </Link>
                <Link
                  to="/pharmacy/settings/fefo"
                  className="col-span-2 inline-flex min-h-11 items-center justify-center rounded-lg border border-orange-300 bg-orange-50 px-4 py-2 text-center text-sm font-bold text-orange-900 hover:bg-orange-100 sm:col-span-1"
                >
                  Configurar FEFO
                </Link>
                <Link
                  to="/billing"
                  className="col-span-2 inline-flex min-h-11 items-center justify-center rounded-lg border border-cyan-200 bg-cyan-50 px-4 py-2 text-center text-sm font-bold text-cyan-800 hover:bg-cyan-100 sm:col-span-1"
                >
                  Facturación
                </Link>
              </div>
            </div>
          </div>
        </header>

        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="text-sm font-bold uppercase text-emerald-700">
            Como registrar una venta
          </h2>
          <div className="mt-3 grid gap-3 md:grid-cols-5">
            {SALE_STEPS.map((step, index) => (
              <div key={step} className="rounded-xl border bg-slate-50 p-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-700 text-sm font-bold text-white">
                  {index + 1}
                </div>
                <p className="mt-2 text-sm font-semibold text-slate-800">
                  {step}
                </p>
              </div>
            ))}
          </div>
        </section>

        {error && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800"
          >
            {error}
          </div>
        )}

        {success && (
          <section className="rounded-lg border border-emerald-300 bg-emerald-50 p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900">
                  Productos con receta no se desbloquean manualmente. Para la
                  prueba de facturación, busque o registre un producto de venta
                  libre con stock y precio.
                </p>
                <p className="text-sm font-bold uppercase text-emerald-700">
                  Venta completada
                </p>
                <h2 className="text-2xl font-bold text-emerald-950">
                  {success.saleNumber}
                </h2>
                <p className="mt-1 text-sm text-emerald-900">
                  Total cobrado: <strong>{formatMoney(success.total)}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSuccess(null);
                  searchInputRef.current?.focus();
                }}
                className="rounded-lg bg-emerald-700 px-5 py-2 font-bold text-white hover:bg-emerald-800"
              >
                Nueva venta
              </button>
            </div>
          </section>
        )}

        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px] 2xl:grid-cols-[minmax(0,1fr)_420px]">
          <main className="space-y-5">
            <section
              id="buscar-productos"
              className="scroll-mt-4 overflow-hidden rounded-2xl bg-white shadow-sm"
            >
              <form
                onSubmit={search}
                className="flex flex-col gap-3 border-b p-4 sm:flex-row"
              >
                <input
                  ref={searchInputRef}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Escriba o escanee: SKU, nombre, fabricante, laboratorio o registro"
                  className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2.5"
                  aria-label="Buscar producto para venta"
                />
                <button
                  type="submit"
                  disabled={loadingProducts}
                  className="rounded-lg bg-cyan-700 px-5 py-2.5 font-bold text-white hover:bg-cyan-800 disabled:opacity-60"
                >
                  {loadingProducts ? "Buscando..." : "Buscar"}
                </button>
              </form>

              <div className="max-h-[34rem] overflow-auto">
                <table className="min-w-full divide-y text-sm">
                  <thead className="sticky top-0 bg-slate-50 text-left">
                    <tr>
                      <th className="px-4 py-3">Producto</th>
                      <th className="px-4 py-3">Stock / FEFO</th>
                      <th className="px-4 py-3 text-right">Precio</th>
                      <th className="px-4 py-3">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {!loadingProducts && products.length === 0 && (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-4 py-10 text-center text-slate-500"
                        >
                          <div className="space-y-3">
                            <p className="font-semibold">
                              No se encontraron productos con stock en Botica
                              Premium.
                            </p>
                            <p className="text-sm">
                              Para hacer una venta de prueba, primero registre
                              un producto, lote, precio y stock en el inventario
                              de Botica Premium.
                            </p>
                            <div className="flex flex-wrap justify-center gap-2">
                              <Link
                                to="/pharmacy/inventory"
                                className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-800"
                              >
                                Ir a inventario
                              </Link>
                              <Link
                                to="/pharmacy/catalogs"
                                className="rounded-lg border px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                              >
                                Ir a catálogo
                              </Link>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                    {products.map((product) => (
                      <tr key={product.id} className="align-top">
                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-900">
                            {product.commercialName || product.genericName}
                          </div>
                          {product.commercialName && (
                            <div className="text-sm font-semibold text-slate-700">
                              {product.genericName}
                            </div>
                          )}
                          <div className="text-xs text-slate-600">
                            {[
                              product.concentration,
                              product.pharmaceuticalForm,
                              product.presentation,
                            ]
                              .filter(Boolean)
                              .join(" / ")}
                          </div>

                          <dl className="mt-2 grid gap-x-3 gap-y-1 text-xs text-slate-600 sm:grid-cols-2">
                            <div>
                              <dt className="inline font-bold text-slate-700">
                                Fabricante:{" "}
                              </dt>
                              <dd className="inline">
                                {product.manufacturer || "No registrado"}
                              </dd>
                            </div>
                            <div>
                              <dt className="inline font-bold text-slate-700">
                                Laboratorio:{" "}
                              </dt>
                              <dd className="inline">
                                {product.laboratory || "No registrado"}
                              </dd>
                            </div>
                            <div>
                              <dt className="inline font-bold text-slate-700">
                                Registro:{" "}
                              </dt>
                              <dd className="inline">
                                {product.sanitaryRegistration ||
                                  "No registrado"}
                              </dd>
                            </div>
                            <div>
                              <dt className="inline font-bold text-slate-700">
                                Tipo:{" "}
                              </dt>
                              <dd className="inline">
                                {product.productType.replaceAll("_", " ")}
                              </dd>
                            </div>
                          </dl>

                          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold text-cyan-800">
                            <span>SKU: {product.companySku || "-"}</span>
                            <span>Maestro: {product.masterCode || "-"}</span>
                            {product.barcode && (
                              <span>Codigo: {product.barcode}</span>
                            )}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {product.requiresPrescription && (
                              <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-bold text-amber-800">
                                Requiere receta
                              </span>
                            )}
                            {product.controlled && (
                              <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-bold text-red-800">
                                Controlado
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-900">
                            {product.availableStock}
                          </div>
                          {product.fefoLot ? (
                            <>
                              <div className="text-xs font-semibold text-slate-600">
                                Lote {product.fefoLot.lotNumber}
                              </div>
                              <div className="mt-0.5 text-xs text-slate-500">
                                Vence:{" "}
                                {formatDate(product.fefoLot.expirationDate)}
                              </div>
                              <FefoStatusBadge
                                expirationDate={product.fefoLot.expirationDate}
                                rules={fefoRules}
                              />
                            </>
                          ) : (
                            <div className="mt-2 rounded-xl border-2 border-red-700 bg-red-100 p-3 text-xs font-black text-red-950 ring-2 ring-red-300">
                              ⛔ Sin lote disponible
                            </div>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right font-bold">
                          {product.salePrice
                            ? formatMoney(product.salePrice)
                            : "Sin precio"}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => addProduct(product)}
                            disabled={!product.saleAllowed}
                            title={
                              product.saleAllowed
                                ? "Agregar al carrito"
                                : BLOCK_LABELS[product.blockReason || ""] ||
                                  "Producto no disponible"
                            }
                            className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                          >
                            {product.saleAllowed
                              ? "Agregar"
                              : product.blockReason === "REQUIRES_PRESCRIPTION"
                                ? "Receta"
                                : "Bloqueado"}
                          </button>
                          {!product.saleAllowed && (
                            <ProductBlockHelp product={product} />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="rounded-lg bg-white p-4 shadow-sm">
              <h2 className="font-bold text-slate-900">Cliente opcional</h2>
              <div className="mt-3 grid gap-3 md:grid-cols-[1fr_120px_180px]">
                <input
                  value={customerName}
                  onChange={(event) => setCustomerName(event.target.value)}
                  placeholder="Nombre o razón social"
                  className="rounded-lg border px-3 py-2"
                />
                <select
                  value={customerDocumentType}
                  onChange={(event) =>
                    setCustomerDocumentType(event.target.value)
                  }
                  className="rounded-lg border px-3 py-2"
                >
                  <option value="DNI">DNI</option>
                  <option value="CE">CE</option>
                  <option value="RUC">RUC</option>
                  <option value="OTRO">Otro</option>
                </select>
                <input
                  value={customerDocumentNumber}
                  onChange={(event) =>
                    setCustomerDocumentNumber(event.target.value)
                  }
                  placeholder="Número de documento"
                  className="rounded-lg border px-3 py-2"
                />
              </div>
            </section>
          </main>

          <aside className="self-start rounded-2xl bg-white shadow-sm lg:sticky lg:top-4">
            <div className="border-b p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase text-emerald-700">
                    Carrito
                  </p>
                  <h2 className="text-xl font-bold text-slate-900">
                    {cart.length} producto(s)
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Los productos se acumulan para una sola venta.
                  </p>
                </div>
                {cart.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setCart([]);
                      setReceivedAmount("");
                      resetReview();
                    }}
                    className="text-sm font-bold text-red-700 hover:text-red-800"
                  >
                    Vaciar
                  </button>
                )}
              </div>
            </div>

            <div className="max-h-80 divide-y overflow-auto">
              {cart.length === 0 && (
                <p className="p-8 text-center text-sm text-slate-500">
                  Busque un producto y agréguelo al carrito.
                </p>
              )}
              {cart.map((item) => (
                <div key={item.product.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900">
                        {item.product.genericName}{" "}
                        {item.product.concentration || ""}
                      </p>
                      <p className="text-xs text-slate-500">
                        {item.product.companySku} /{" "}
                        {formatMoney(item.unitPrice)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(item.product.id)}
                      className="text-sm font-bold text-red-700"
                      aria-label={`Retirar ${item.product.genericName}`}
                    >
                      Retirar
                    </button>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <label className="text-xs font-semibold text-slate-600">
                      Cantidad
                      <input
                        type="number"
                        min="1"
                        max={Math.floor(Number(item.product.availableStock))}
                        step="1"
                        inputMode="numeric"
                        value={item.quantity}
                        onFocus={(event) => event.currentTarget.select()}
                        onClick={(event) => event.currentTarget.select()}
                        onChange={(event) =>
                          updateQuantity(item.product.id, event.target.value)
                        }
                        className="ml-2 w-24 rounded-lg border px-2 py-1.5 text-right"
                      />
                    </label>
                    <div className="text-right">
                      {Number(item.discountAmount || 0) > 0 ? (
                        <>
                          <div className="text-xs text-slate-500 line-through">
                            {formatMoney(
                              item.originalSubtotal || item.subtotal,
                            )}
                          </div>
                          <div className="text-xs font-bold text-emerald-700">
                            Descuento FEFO: -
                            {formatMoney(item.discountAmount || 0)}
                          </div>
                        </>
                      ) : null}
                      <strong>{formatMoney(item.subtotal)}</strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-4 border-t p-4">
              <div>
                <label className="text-xs font-bold uppercase text-slate-600">
                  Medio de pago
                </label>
                <select
                  value={paymentMethod}
                  onChange={(event) => {
                    setPaymentMethod(event.target.value as PaymentMethod);
                    setPaymentReference("");
                    setReceivedAmount("");
                    resetReview();
                  }}
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                >
                  {Object.entries(PAYMENT_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              {paymentMethod === "CASH" ? (
                <div>
                  <label className="text-xs font-bold uppercase text-slate-600">
                    Efectivo recibido
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={receivedAmount}
                    onChange={(event) => {
                      setReceivedAmount(event.target.value);
                      resetReview();
                    }}
                    placeholder={cartTotal.toFixed(2)}
                    className="mt-1 w-full rounded-lg border px-3 py-2 text-right"
                  />
                  <p className="mt-1 text-right text-sm text-slate-600">
                    Vuelto: <strong>{formatMoney(changeAmount)}</strong>
                  </p>
                </div>
              ) : (
                <div>
                  <label className="text-xs font-bold uppercase text-slate-600">
                    Número de operación
                  </label>
                  <p className="mb-1 text-xs text-slate-500">
                    Para Yape, Plin, tarjeta o transferencia/depósito, registre
                    el número de operación o referencia.
                  </p>
                  <input
                    value={paymentReference}
                    onChange={(event) => {
                      setPaymentReference(event.target.value);
                      resetReview();
                    }}
                    className="mt-1 w-full rounded-lg border px-3 py-2"
                  />
                </div>
              )}

              {cart.some((item) => Number(item.discountAmount || 0) > 0) ? (
                <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900">
                  <div className="flex justify-between">
                    <span>Precio normal</span>
                    <strong>
                      {formatMoney(
                        cart.reduce(
                          (sum, item) =>
                            sum +
                            Number(item.originalSubtotal || item.subtotal),
                          0,
                        ),
                      )}
                    </strong>
                  </div>
                  <div className="mt-1 flex justify-between">
                    <span>Descuento FEFO</span>
                    <strong>
                      -
                      {formatMoney(
                        cart.reduce(
                          (sum, item) => sum + Number(item.discountAmount || 0),
                          0,
                        ),
                      )}
                    </strong>
                  </div>
                </div>
              ) : null}

              <div className="flex items-end justify-between border-t pt-4">
                <span className="font-semibold text-slate-600">Total</span>
                <strong className="text-2xl text-slate-950">
                  {formatMoney(cartTotal)}
                </strong>
              </div>
              <p className="text-xs text-slate-500">
                El precio y los lotes se validan nuevamente con FEFO antes de
                confirmar.
              </p>
              <button
                type="button"
                onClick={prepareReview}
                disabled={!cart.length || reviewing}
                className="w-full rounded-lg bg-emerald-700 px-4 py-3 font-bold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {reviewing ? "Validando FEFO..." : "Revisar y cobrar"}
              </button>
              {scopeCompanyId && (
                <p className="truncate text-center text-xs text-slate-400">
                  Contexto validado: Botica Premium / PRINCIPAL
                </p>
              )}
            </div>
          </aside>
        </div>
      </div>

      {reviewOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="sale-review-title"
        >
          <div className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-lg bg-white shadow-2xl">
            <div className="border-b p-5">
              <p className="text-xs font-bold uppercase text-emerald-700">
                Confirmación final
              </p>
              <h2
                id="sale-review-title"
                className="text-2xl font-bold text-slate-900"
              >
                Revisar venta OTC
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Los lotes y precios mostrados fueron validados en este momento.
              </p>

              {criticalAllocations.length > 0 && (
                <div className="mt-4 rounded-xl border-2 border-red-300 bg-red-50 p-4">
                  <p className="font-black text-red-950">
                    Esta venta contiene lotes críticos
                  </p>
                  <p className="mt-1 text-sm text-red-900">
                    Cada lote crítico necesita autorización de un segundo
                    usuario antes de cobrar.
                  </p>

                  <label className="mt-3 block text-sm font-bold text-red-950">
                    Motivo de la solicitud
                  </label>
                  <textarea
                    value={authorizationReason}
                    onChange={(event) =>
                      setAuthorizationReason(event.target.value)
                    }
                    rows={3}
                    maxLength={1000}
                    className="mt-1 w-full rounded-lg border border-red-300 bg-white px-3 py-2 text-sm text-slate-900"
                    placeholder="Explique por qué se solicita vender el lote crítico."
                  />
                </div>
              )}
            </div>
            <div className="divide-y">
              {cart.map((item) => (
                <div key={item.product.id} className="p-4">
                  <div className="flex justify-between gap-4">
                    <div>
                      <p className="font-bold text-slate-900">
                        {item.product.genericName}{" "}
                        {item.product.concentration || ""}
                      </p>
                      <p className="text-sm text-slate-600">
                        {item.quantity} x {formatMoney(item.unitPrice)}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        FEFO:{" "}
                        {item.allocations
                          .map((lot) => lot.lotNumber)
                          .join(", ")}
                      </p>

                      {item.allocations
                        .filter(
                          (allocation) =>
                            allocation.requiresAuthorization === true,
                        )
                        .map((allocation) => {
                          const key = authorizationKey(
                            item.product.id,
                            allocation.lotId,
                          );
                          const authorization = fefoAuthorizations[key] || {
                            authorizationId: "",
                            token: "",
                          };

                          return (
                            <div
                              key={allocation.lotId}
                              className="mt-3 rounded-xl border-2 border-red-300 bg-red-50 p-3"
                            >
                              <p className="font-black text-red-950">
                                Autorización obligatoria — lote{" "}
                                {allocation.lotNumber}
                              </p>
                              <p className="mt-1 text-xs text-red-900">
                                Cantidad asignada:{" "}
                                {Number(allocation.allocatedQuantity)}
                              </p>

                              <button
                                type="button"
                                disabled={authorization.requesting}
                                onClick={() =>
                                  void requestFefoAuthorization(
                                    item,
                                    allocation,
                                  )
                                }
                                className="mt-3 rounded-lg bg-red-700 px-3 py-2 text-xs font-bold text-white hover:bg-red-800 disabled:opacity-60"
                              >
                                {authorization.requesting
                                  ? "Solicitando..."
                                  : authorization.authorizationId
                                    ? "Volver a solicitar"
                                    : "Solicitar autorización"}
                              </button>

                              {authorization.authorizationId && (
                                <div className="mt-3 space-y-2">
                                  <div className="rounded-lg bg-white p-2 text-xs text-slate-700">
                                    <span className="font-bold">
                                      Identificador:
                                    </span>{" "}
                                    {authorization.authorizationId}
                                  </div>

                                  <label className="block text-xs font-bold text-slate-700">
                                    Identificador de autorización
                                  </label>
                                  <input
                                    value={authorization.authorizationId}
                                    onChange={(event) =>
                                      updateFefoAuthorization(key, {
                                        authorizationId: event.target.value,
                                        valid: false,
                                      })
                                    }
                                    className="w-full rounded-lg border px-3 py-2 text-xs"
                                  />

                                  <label className="block text-xs font-bold text-slate-700">
                                    Token entregado por el autorizador
                                  </label>
                                  <input
                                    type="password"
                                    value={authorization.token}
                                    onChange={(event) =>
                                      updateFefoAuthorization(key, {
                                        token: event.target.value,
                                        valid: false,
                                      })
                                    }
                                    autoComplete="off"
                                    className="w-full rounded-lg border px-3 py-2 text-xs"
                                    placeholder="Pegue aquí el token de un solo uso"
                                  />

                                  <button
                                    type="button"
                                    disabled={authorization.validating}
                                    onClick={() =>
                                      void validateFefoAuthorization(
                                        item,
                                        allocation,
                                      )
                                    }
                                    className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-60"
                                  >
                                    {authorization.validating
                                      ? "Validando..."
                                      : "Validar autorización"}
                                  </button>
                                </div>
                              )}

                              {authorization.valid && (
                                <p className="mt-2 rounded-lg bg-emerald-100 p-2 text-xs font-black text-emerald-900">
                                  Autorización válida y lista para usar
                                </p>
                              )}

                              {authorization.error && (
                                <p className="mt-2 rounded-lg bg-white p-2 text-xs font-bold text-red-800">
                                  {authorization.error}
                                </p>
                              )}
                            </div>
                          );
                        })}
                    </div>
                    <div className="text-right">
                      {Number(item.discountAmount || 0) > 0 ? (
                        <>
                          <div className="text-xs text-slate-500 line-through">
                            {formatMoney(
                              item.originalSubtotal || item.subtotal,
                            )}
                          </div>
                          <div className="text-xs font-bold text-emerald-700">
                            Descuento FEFO: -
                            {formatMoney(item.discountAmount || 0)}
                          </div>
                        </>
                      ) : null}
                      <strong>{formatMoney(item.subtotal)}</strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="space-y-3 border-t bg-slate-50 p-5">
              <div className="flex justify-between text-sm">
                <span>Pago</span>
                <strong>{PAYMENT_LABELS[paymentMethod]}</strong>
              </div>
              <div className="flex items-end justify-between">
                <span className="font-semibold">Total a cobrar</span>
                <strong className="text-3xl">{formatMoney(cartTotal)}</strong>
              </div>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setReviewOpen(false)}
                  disabled={submitting}
                  className="rounded-lg border px-5 py-2.5 font-bold text-slate-700"
                >
                  Volver al carrito
                </button>
                <button
                  type="button"
                  onClick={confirmSale}
                  disabled={submitting || !allCriticalAuthorizationsValid}
                  className="rounded-lg bg-emerald-700 px-5 py-2.5 font-bold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting
                    ? "Procesando..."
                    : !allCriticalAuthorizationsValid
                      ? "Faltan autorizaciones FEFO"
                      : "Confirmar y descontar stock"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
