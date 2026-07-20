import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  BadgeCheck,
  Bell,
  BookOpenCheck,
  Boxes,
  Building2,
  ChevronRight,
  CircleUserRound,
  ClipboardList,
  CreditCard,
  DatabaseBackup,
  Download,
  Eye,
  Fingerprint,
  Info,
  Gauge,
  Headphones,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  PackageCheck,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  ShieldCheck,
  Timer,
  Settings,
  Users,
  X,
} from "lucide-react";
import {
  clearAuthSession,
  getSessionItem,
  preservePlatformToken,
  setAuthToken,
  setSessionItem,
} from "../../lib/auth";

type PlatformMetrics = {
  registeredTenants: number;
  activeCompanies: number;
  inactiveCompanies: number;
  activeUsers: number;
  inactiveUsers: number;
  platformSuperadmins: number;
  activeModuleInstallations: number;
  inactiveModuleInstallations: number;
};

type PlatformAlert = {
  id: string;
  level: "INFO" | "WARNING" | "CRITICAL";
  title: string;
  message: string;
};

type PlatformCompanyOverview = {
  id: string;
  code: string;
  legalName: string;
  tradeName: string | null;
  ruc: string;
  active: boolean;
  isDefault: boolean;
  businessUnitCount: number;
  membershipCount: number;
  createdAt: string;
  updatedAt: string;
};

type CompanyContextResponse = {
  access_token?: string;
  token?: string;
  accessMode?: string;
  contextSource?: string;
  tenant?: {
    id?: string;
    name?: string;
    ruc?: string;
  };
  company?: {
    id?: string;
    code?: string;
    legalName?: string;
    tradeName?: string | null;
    ruc?: string;
  };
  businessUnit?: {
    id?: string;
    code?: string;
    name?: string;
    type?: string;
  };
  warehouse?: {
    id?: string;
    code?: string;
    name?: string;
  } | null;
  user?: {
    id?: string;
    email?: string;
    fullName?: string | null;
    role?: string;
    platformRole?: string | null;
  };

  audit?: {
    id?: string;
    reason?: string;
    status?: string;
    enteredAt?: string;
  };
};

type PlatformTenantOverview = {
  id: string;
  name: string;
  ruc: string;
  active: boolean;
  companyCount: number;
  userCount: number;
  createdAt: string;
  updatedAt: string;
  companies: PlatformCompanyOverview[];
};

type PlatformSummary = {
  metrics: PlatformMetrics;
  overview: {
    tenants: PlatformTenantOverview[];
  };
  security: {
    platformAccessProtected: boolean;
    requiredPlatformRole: string;
    mfaEnabled: boolean;
    dniePrepared: boolean;
    digitalSignaturePrepared: boolean;
  };
  alerts: PlatformAlert[];
  generatedAt: string;
  currentUser: {
    id: string | null;
    email: string | null;
    fullName: string | null;
    platformRole: string | null;
  };
};

type PlatformAccessAuditItem = {
  id: string;
  reason: string;
  accessMode: string;
  status: "ACTIVE" | "CLOSED" | "ABANDONED" | string;
  enteredAt: string;
  exitedAt: string | null;
  durationSeconds: number;
  ipAddress: string | null;
  userAgent: string | null;
  browser: string;
  user: {
    id: string;
    fullName: string;
    email: string | null;
    platformRole: string | null;
  };
  tenant: {
    id: string;
    name: string;
    ruc: string | null;
  };
  company: {
    id: string;
    code: string | null;
    legalName: string;
    tradeName: string | null;
    ruc: string | null;
  };
  businessUnit: {
    id: string;
    code: string | null;
    name: string;
    type: string | null;
  };
  warehouse: {
    id: string;
    code: string | null;
    name: string;
  } | null;
};

type PlatformAccessAuditResponse = {
  items: PlatformAccessAuditItem[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
  };
  summary: {
    total: number;
    active: number;
    closed: number;
    abandoned: number;
  };
  appliedFilters: {
    status: string | null;
    companyId: string | null;
    dateFrom: string | null;
    dateTo: string | null;
    search: string | null;
  };
  generatedAt: string;
};

type NavigationItem = {
  label: string;
  description: string;
  icon: typeof LayoutDashboard;
  href?: string;
  status?: "available" | "planned";
};

const navigationItems: NavigationItem[] = [
  {
    label: "Vista general",
    description: "Indicadores globales y actividad de la plataforma.",
    icon: LayoutDashboard,
    href: "/platform",
    status: "available",
  },
  {
    label: "Grupos y tenants",
    description: "Clientes, grupos empresariales y organizaciones.",
    icon: Building2,
    status: "planned",
  },
  {
    label: "Empresas",
    description: "RUC, razón social, sedes y unidades de negocio.",
    icon: Boxes,
    status: "planned",
  },
  {
    label: "Usuarios y accesos",
    description: "Administradores, trabajadores, roles y permisos.",
    icon: Users,
    status: "planned",
  },
  {
    label: "Módulos",
    description: "Activación de HCE, farmacia, SUNAT y otros módulos.",
    icon: PackageCheck,
    status: "planned",
  },
  {
    label: "Suscripciones",
    description: "Planes, pagos, vencimientos y límites contratados.",
    icon: CreditCard,
    status: "planned",
  },
  {
    label: "Seguridad",
    description: "Sesiones, MFA, DNI electrónico e identidad digital.",
    icon: ShieldCheck,
    status: "planned",
  },
  {
    label: "Auditoría",
    description: "Trazabilidad de acciones administrativas y soporte.",
    icon: ClipboardList,
    status: "planned",
  },
  {
    label: "Respaldos",
    description: "Copias, recuperación y estado de infraestructura.",
    icon: DatabaseBackup,
    status: "planned",
  },
  {
    label: "Soporte",
    description: "Asistencia técnica y acceso auditado.",
    icon: Headphones,
    status: "planned",
  },
  {
    label: "Configuración",
    description: "Parámetros generales de HCELM.",
    icon: Settings,
    status: "planned",
  },
];

const quickActions = [
  {
    title: "Crear tenant",
    description: "Registrar un nuevo grupo o cliente de HCELM.",
    icon: Building2,
  },
  {
    title: "Crear empresa",
    description: "Registrar RUC, razón social y nombre comercial.",
    icon: Boxes,
  },
  {
    title: "Crear administrador",
    description: "Asignar un administrador inicial a un cliente.",
    icon: CircleUserRound,
  },
  {
    title: "Asignar módulos",
    description: "Habilitar únicamente los módulos contratados.",
    icon: PackageCheck,
  },
];

function normalizeSearchValue(value: string | null | undefined) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function initials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function formatAccessDuration(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds || 0));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  if (hours > 0) {
    return `${hours} h ${minutes} min`;
  }

  if (minutes > 0) {
    return `${minutes} min ${seconds} s`;
  }

  return `${seconds} s`;
}

function isProlongedActiveAccess(audit: PlatformAccessAuditItem) {
  return audit.status === "ACTIVE" && audit.durationSeconds >= 30 * 60;
}

function csvCell(value: unknown) {
  const normalized = String(value ?? "").replace(/"/g, '""');
  return `"${normalized}"`;
}

function formatCsvDate(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("es-PE");
}

function accessStatusLabel(status: string) {
  if (status === "ACTIVE") {
    return "Activo";
  }

  if (status === "CLOSED") {
    return "Cerrado";
  }

  if (status === "ABANDONED") {
    return "Abandonado";
  }

  return status || "No definido";
}

function accessStatusClass(status: string) {
  if (status === "ACTIVE") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  if (status === "CLOSED") {
    return "border-cyan-200 bg-cyan-50 text-cyan-800";
  }

  if (status === "ABANDONED") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  return "border-slate-200 bg-slate-100 text-slate-700";
}

export default function PlatformDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCompany, setSelectedCompany] =
    useState<PlatformCompanyOverview | null>(null);
  const [contextLoading, setContextLoading] = useState(false);
  const [contextError, setContextError] = useState<string | null>(null);
  const [contextReason, setContextReason] = useState("");
  const [summary, setSummary] = useState<PlatformSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [accessAuditData, setAccessAuditData] =
    useState<PlatformAccessAuditResponse | null>(null);
  const [accessAuditLoading, setAccessAuditLoading] = useState(true);
  const [accessAuditError, setAccessAuditError] = useState<string | null>(null);
  const [accessAuditStatus, setAccessAuditStatus] = useState("");
  const [accessAuditCompanyId, setAccessAuditCompanyId] = useState("");
  const [accessAuditDateFrom, setAccessAuditDateFrom] = useState("");
  const [accessAuditDateTo, setAccessAuditDateTo] = useState("");
  const [accessAuditSearch, setAccessAuditSearch] = useState("");
  const [accessAuditPage, setAccessAuditPage] = useState(1);
  const [accessAuditExporting, setAccessAuditExporting] = useState(false);
  const [selectedAccessAudit, setSelectedAccessAudit] =
    useState<PlatformAccessAuditItem | null>(null);
  const [expandedTenantIds, setExpandedTenantIds] = useState<Set<string>>(
    new Set(),
  );
  const organizationSectionRef = useRef<HTMLElement | null>(null);

  const userName = getSessionItem("hcelm_user_name") || "Dr. Alfonso Rodríguez";

  const userRole =
    getSessionItem("hcelm_user_role") || "Superusuario de plataforma";

  const userInitials = useMemo(() => initials(userName) || "AR", [userName]);

  const alerts = summary?.alerts ?? [];
  const criticalAlertCount = alerts.filter(
    (alert) => alert.level === "CRITICAL",
  ).length;
  const warningAlertCount = alerts.filter(
    (alert) => alert.level === "WARNING",
  ).length;

  const normalizedSearchTerm = normalizeSearchValue(searchTerm);

  const accessAuditCompanies = useMemo(
    () =>
      (summary?.overview.tenants ?? []).flatMap((tenant) =>
        tenant.companies.map((company) => ({
          id: company.id,
          label:
            company.tradeName && company.tradeName !== company.legalName
              ? `${company.tradeName} — ${company.legalName}`
              : company.legalName,
          ruc: company.ruc,
        })),
      ),
    [summary],
  );

  const filteredTenants = useMemo(() => {
    const tenants = summary?.overview.tenants ?? [];

    if (!normalizedSearchTerm) {
      return tenants;
    }

    return tenants
      .map((tenant) => {
        const tenantMatches = [
          tenant.name,
          tenant.ruc,
          tenant.active ? "activo" : "inactivo",
        ].some((value) =>
          normalizeSearchValue(value).includes(normalizedSearchTerm),
        );

        const matchingCompanies = tenant.companies.filter((company) =>
          [
            company.code,
            company.legalName,
            company.tradeName,
            company.ruc,
            company.active ? "activa activo" : "inactiva inactivo",
          ].some((value) =>
            normalizeSearchValue(value).includes(normalizedSearchTerm),
          ),
        );

        if (!tenantMatches && matchingCompanies.length === 0) {
          return null;
        }

        return {
          ...tenant,
          companies: tenantMatches ? tenant.companies : matchingCompanies,
        };
      })
      .filter((tenant): tenant is PlatformTenantOverview => tenant !== null);
  }, [normalizedSearchTerm, summary]);

  const filteredCompanyCount = useMemo(
    () =>
      filteredTenants.reduce(
        (total, tenant) => total + tenant.companies.length,
        0,
      ),
    [filteredTenants],
  );

  useEffect(() => {
    if (!normalizedSearchTerm) {
      return;
    }

    setExpandedTenantIds(new Set(filteredTenants.map((tenant) => tenant.id)));

    const timeoutId = window.setTimeout(() => {
      organizationSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 250);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [filteredTenants, normalizedSearchTerm]);

  useEffect(() => {
    let cancelled = false;

    async function loadSummary() {
      setSummaryLoading(true);
      setSummaryError(null);

      try {
        const token =
          sessionStorage.getItem("ame_token") ||
          localStorage.getItem("ame_token");

        if (!token) {
          throw new Error("No se encontró una sesión autenticada.");
        }

        const response = await fetch(
          "http://localhost:3000/api/platform/dashboard/summary",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        const body = await response.json().catch(() => null);

        if (!response.ok) {
          const message =
            body?.message || "No se pudo cargar el resumen de la plataforma.";

          throw new Error(
            Array.isArray(message) ? message.join(". ") : String(message),
          );
        }

        if (!cancelled) {
          const platformSummary = body as PlatformSummary;

          setSummary(platformSummary);
          setExpandedTenantIds(
            new Set(
              platformSummary.overview.tenants.map((tenant) => tenant.id),
            ),
          );
        }
      } catch (error) {
        if (!cancelled) {
          setSummaryError(
            error instanceof Error
              ? error.message
              : "No se pudo cargar el resumen de la plataforma.",
          );
        }
      } finally {
        if (!cancelled) {
          setSummaryLoading(false);
        }
      }
    }

    void loadSummary();

    return () => {
      cancelled = true;
    };
  }, []);
  async function loadAccessAudits(page = accessAuditPage) {
    setAccessAuditLoading(true);
    setAccessAuditError(null);

    try {
      const token =
        sessionStorage.getItem("ame_token") ||
        localStorage.getItem("ame_token");

      if (!token) {
        throw new Error("No se encontró una sesión autenticada.");
      }

      const params = new URLSearchParams({
        page: String(page),
        pageSize: "10",
      });

      if (accessAuditStatus) {
        params.set("status", accessAuditStatus);
      }

      if (accessAuditCompanyId) {
        params.set("companyId", accessAuditCompanyId);
      }

      if (accessAuditDateFrom) {
        params.set("dateFrom", accessAuditDateFrom);
      }

      if (accessAuditDateTo) {
        params.set("dateTo", accessAuditDateTo);
      }

      if (accessAuditSearch.trim()) {
        params.set("search", accessAuditSearch.trim());
      }

      const response = await fetch(
        `http://localhost:3000/api/platform/access-audits?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const body = await response.json().catch(() => null);

      if (!response.ok || !body) {
        const message =
          body?.message || "No se pudo cargar el historial de accesos.";

        throw new Error(
          Array.isArray(message) ? message.join(". ") : String(message),
        );
      }

      setAccessAuditData(body as PlatformAccessAuditResponse);
      setAccessAuditPage((body as PlatformAccessAuditResponse).pagination.page);
    } catch (error) {
      setAccessAuditError(
        error instanceof Error
          ? error.message
          : "No se pudo cargar el historial de accesos.",
      );
    } finally {
      setAccessAuditLoading(false);
    }
  }

  async function exportAccessAuditsCsv() {
    setAccessAuditExporting(true);
    setAccessAuditError(null);

    try {
      const token =
        sessionStorage.getItem("ame_token") ||
        localStorage.getItem("ame_token");

      if (!token) {
        throw new Error("No se encontró una sesión autenticada.");
      }

      const allItems: PlatformAccessAuditItem[] = [];
      let currentPage = 1;
      let totalPages = 1;

      do {
        const params = new URLSearchParams({
          page: String(currentPage),
          pageSize: "100",
        });

        if (accessAuditStatus) {
          params.set("status", accessAuditStatus);
        }

        if (accessAuditCompanyId) {
          params.set("companyId", accessAuditCompanyId);
        }

        if (accessAuditDateFrom) {
          params.set("dateFrom", accessAuditDateFrom);
        }

        if (accessAuditDateTo) {
          params.set("dateTo", accessAuditDateTo);
        }

        if (accessAuditSearch.trim()) {
          params.set("search", accessAuditSearch.trim());
        }

        const response = await fetch(
          `http://localhost:3000/api/platform/access-audits?${params.toString()}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        const body = await response.json().catch(() => null);

        if (!response.ok || !body) {
          const message =
            body?.message || "No se pudo preparar la exportación.";

          throw new Error(
            Array.isArray(message) ? message.join(". ") : String(message),
          );
        }

        const pageData = body as PlatformAccessAuditResponse;

        allItems.push(...pageData.items);
        totalPages = pageData.pagination.totalPages;
        currentPage += 1;
      } while (currentPage <= totalPages);

      const headers = [
        "ID auditoría",
        "Estado",
        "Usuario",
        "Correo",
        "Grupo",
        "Empresa",
        "Razón social",
        "RUC",
        "Unidad de negocio",
        "Almacén",
        "Motivo",
        "Entrada",
        "Salida",
        "Duración",
        "IP",
        "Navegador",
      ];

      const rows = allItems.map((audit) => [
        audit.id,
        accessStatusLabel(audit.status),
        audit.user.fullName,
        audit.user.email || "",
        audit.tenant.name,
        audit.company.tradeName || audit.company.legalName,
        audit.company.legalName,
        audit.company.ruc || "",
        audit.businessUnit.name,
        audit.warehouse?.name || "",
        audit.reason,
        formatCsvDate(audit.enteredAt),
        formatCsvDate(audit.exitedAt),
        formatAccessDuration(audit.durationSeconds),
        audit.ipAddress || "",
        audit.browser,
      ]);

      const csv = [
        headers.map(csvCell).join(";"),
        ...rows.map((row) => row.map(csvCell).join(";")),
      ].join("\r\n");

      const blob = new Blob(["\uFEFF", csv], {
        type: "text/csv;charset=utf-8",
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = `historial_accesos_hcelm_${new Date()
        .toISOString()
        .replace(/[:.]/g, "-")}.csv`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      URL.revokeObjectURL(url);
    } catch (error) {
      setAccessAuditError(
        error instanceof Error
          ? error.message
          : "No se pudo exportar el historial.",
      );
    } finally {
      setAccessAuditExporting(false);
    }
  }

  useEffect(() => {
    void loadAccessAudits(1);
    // La carga inicial se realiza una sola vez.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const summaryCards = useMemo(
    () => [
      {
        label: "Tenants registrados",
        value: summaryLoading
          ? "..."
          : String(summary?.metrics.registeredTenants ?? "—"),
        caption: "Grupos, organizaciones o clientes SaaS registrados",
        icon: Building2,
      },
      {
        label: "Empresas activas",
        value: summaryLoading
          ? "..."
          : String(summary?.metrics.activeCompanies ?? "—"),
        caption: "Empresas habilitadas para operar en HCELM",
        icon: Boxes,
      },
      {
        label: "Usuarios activos",
        value: summaryLoading
          ? "..."
          : String(summary?.metrics.activeUsers ?? "—"),
        caption: "Usuarios habilitados en toda la plataforma",
        icon: Users,
      },
      {
        label: "Módulos instalados",
        value: summaryLoading
          ? "..."
          : String(summary?.metrics.activeModuleInstallations ?? "—"),
        caption: "Instalaciones activas por empresa y unidad de negocio",
        icon: PackageCheck,
      },
    ],
    [summary, summaryLoading],
  );

  function toggleTenant(tenantId: string) {
    setExpandedTenantIds((current) => {
      const next = new Set(current);

      if (next.has(tenantId)) {
        next.delete(tenantId);
      } else {
        next.add(tenantId);
      }

      return next;
    });
  }

  async function enterCompanyContext() {
    if (!selectedCompany || contextLoading) {
      return;
    }

    const normalizedReason = contextReason.trim();

    if (normalizedReason.length < 5) {
      setContextError("Registre un motivo de acceso de al menos 5 caracteres.");
      return;
    }

    if (normalizedReason.length > 500) {
      setContextError(
        "El motivo de acceso no puede superar los 500 caracteres.",
      );
      return;
    }

    setContextLoading(true);
    setContextError(null);

    try {
      const token =
        sessionStorage.getItem("ame_token") ||
        localStorage.getItem("ame_token");

      if (!token) {
        throw new Error("No existe una sesión global activa.");
      }

      const response = await fetch(
        "http://localhost:3000/api/platform/context/company",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            companyId: selectedCompany.id,
            reason: normalizedReason,
          }),
        },
      );

      const body = (await response
        .json()
        .catch(() => null)) as CompanyContextResponse | null;

      if (!response.ok || !body) {
        const message =
          body && "message" in body
            ? String((body as { message?: unknown }).message || "")
            : "";

        throw new Error(
          message || "No se pudo ingresar a la empresa seleccionada.",
        );
      }

      const operationalToken = body.access_token || body.token || "";

      if (!operationalToken) {
        throw new Error(
          "El servidor no devolvió el token operativo de la empresa.",
        );
      }

      if (!preservePlatformToken()) {
        throw new Error("No se pudo conservar la sesión global de plataforma.");
      }

      setAuthToken(operationalToken);

      setSessionItem(
        "hcelm_tenant_name",
        body.tenant?.name?.trim() || "Tenant activo",
      );

      setSessionItem("hcelm_company_id", body.company?.id?.trim() || "");

      setSessionItem("hcelm_company_code", body.company?.code?.trim() || "");

      setSessionItem(
        "hcelm_company_name",
        body.company?.tradeName?.trim() ||
          body.company?.legalName?.trim() ||
          selectedCompany.tradeName ||
          selectedCompany.legalName,
      );

      setSessionItem(
        "hcelm_company_legal_name",
        body.company?.legalName?.trim() || selectedCompany.legalName,
      );

      setSessionItem(
        "hcelm_company_ruc",
        body.company?.ruc?.trim() || selectedCompany.ruc,
      );

      setSessionItem(
        "hcelm_business_unit_id",
        body.businessUnit?.id?.trim() || "",
      );

      setSessionItem(
        "hcelm_business_unit_code",
        body.businessUnit?.code?.trim() || "",
      );

      setSessionItem(
        "hcelm_business_unit_name",
        body.businessUnit?.name?.trim() || "",
      );

      setSessionItem("hcelm_warehouse_id", body.warehouse?.id?.trim() || "");

      setSessionItem(
        "hcelm_warehouse_code",
        body.warehouse?.code?.trim() || "",
      );

      setSessionItem(
        "hcelm_warehouse_name",
        body.warehouse?.name?.trim() || "",
      );

      setSessionItem(
        "hcelm_access_mode",
        body.accessMode || "COMPANY_OPERATION",
      );

      setSessionItem(
        "hcelm_platform_access_audit_id",
        body.audit?.id?.trim() || "",
      );

      setSessionItem(
        "hcelm_platform_access_reason",
        body.audit?.reason?.trim() || normalizedReason,
      );

      setSessionItem(
        "hcelm_platform_access_entered_at",
        body.audit?.enteredAt?.trim() || "",
      );

      setSessionItem(
        "hcelm_context_source",
        body.contextSource || "PLATFORM_SUPERADMIN",
      );

      setSessionItem(
        "hcelm_user_name",
        body.user?.fullName?.trim() || userName,
      );

      setSessionItem("hcelm_user_role", body.user?.role?.trim() || userRole);

      setSessionItem("hcelm_professional_verified", "false");
      setSessionItem("hcelm_require_professional_verification", "true");

      window.location.href = "/professional-verification";
    } catch (error) {
      setContextError(
        error instanceof Error
          ? error.message
          : "No se pudo cambiar el contexto empresarial.",
      );
    } finally {
      setContextLoading(false);
    }
  }

  function logout() {
    clearAuthSession();
    window.location.href = "/login";
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      {sidebarOpen ? (
        <button
          type="button"
          aria-label="Cerrar menú"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/60 lg:hidden"
        />
      ) : null}

      <aside
        className={[
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-slate-800 bg-slate-950 text-white transition-all duration-200",
          sidebarCollapsed ? "lg:w-24" : "lg:w-80",
          sidebarOpen
            ? "w-80 translate-x-0"
            : "w-80 -translate-x-full lg:translate-x-0",
        ].join(" ")}
      >
        <div className="flex min-h-20 items-center justify-between border-b border-slate-800 px-5">
          <Link to="/platform" className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-cyan-400 font-black text-slate-950">
              H
            </div>

            {!sidebarCollapsed ? (
              <div className="min-w-0">
                <p className="truncate text-lg font-black">HCELM</p>
                <p className="truncate text-xs text-slate-400">
                  Administración de plataforma
                </p>
              </div>
            ) : null}
          </Link>

          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const content = (
              <>
                <Icon className="h-5 w-5 shrink-0" />

                {!sidebarCollapsed ? (
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{item.label}</p>
                    <p className="mt-0.5 line-clamp-1 text-xs text-slate-400">
                      {item.description}
                    </p>
                  </div>
                ) : null}

                {!sidebarCollapsed && item.status === "planned" ? (
                  <span className="rounded-full border border-slate-700 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-400">
                    Próximo
                  </span>
                ) : null}
              </>
            );

            if (item.href) {
              return (
                <Link
                  key={item.label}
                  to={item.href}
                  className="flex min-h-14 items-center gap-3 rounded-xl bg-cyan-400 px-3 text-slate-950"
                >
                  {content}
                </Link>
              );
            }

            return (
              <button
                key={item.label}
                type="button"
                disabled
                className="flex min-h-14 w-full items-center gap-3 rounded-xl px-3 text-left text-slate-300 opacity-75"
              >
                {content}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-slate-800 p-3">
          <button
            type="button"
            onClick={() => setSidebarCollapsed((value) => !value)}
            className="hidden w-full items-center justify-center gap-2 rounded-xl border border-slate-800 px-3 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-900 lg:flex"
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen className="h-5 w-5" />
            ) : (
              <>
                <PanelLeftClose className="h-5 w-5" />
                Contraer menú
              </>
            )}
          </button>
        </div>
      </aside>

      {selectedAccessAudit ? (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="access-audit-detail-title"
            className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl"
          >
            <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white p-5 sm:p-6">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-cyan-700">
                  Registro permanente de auditoría
                </p>

                <h2
                  id="access-audit-detail-title"
                  className="mt-1 text-2xl font-black text-slate-950"
                >
                  Detalle del acceso temporal
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setSelectedAccessAudit(null)}
                className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"
                aria-label="Cerrar detalle del acceso"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="space-y-5 p-5 sm:p-6">
              {isProlongedActiveAccess(selectedAccessAudit) ? (
                <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />

                    <div>
                      <p className="font-black text-amber-950">
                        Acceso temporal prolongado
                      </p>

                      <p className="mt-1 text-sm leading-6 text-amber-900">
                        Esta sesión lleva activa 30 minutos o más. Verifique que
                        el acceso administrativo continúe siendo necesario.
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="flex flex-wrap items-center gap-3">
                <span
                  className={[
                    "inline-flex rounded-full border px-3 py-1.5 text-sm font-black",
                    accessStatusClass(selectedAccessAudit.status),
                  ].join(" ")}
                >
                  {accessStatusLabel(selectedAccessAudit.status)}
                </span>

                <span className="break-all text-sm font-semibold text-slate-600">
                  ID: {selectedAccessAudit.id}
                </span>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <AuditDetailBlock
                  title="Usuario"
                  lines={[
                    selectedAccessAudit.user.fullName,
                    selectedAccessAudit.user.email || "Correo no disponible",
                    selectedAccessAudit.user.platformRole ||
                      "Rol de plataforma no disponible",
                  ]}
                />

                <AuditDetailBlock
                  title="Grupo y empresa"
                  lines={[
                    selectedAccessAudit.tenant.name,
                    selectedAccessAudit.company.tradeName ||
                      selectedAccessAudit.company.legalName,
                    selectedAccessAudit.company.legalName,
                    `RUC ${selectedAccessAudit.company.ruc || "No disponible"}`,
                  ]}
                />

                <AuditDetailBlock
                  title="Contexto operativo"
                  lines={[
                    selectedAccessAudit.businessUnit.name,
                    selectedAccessAudit.warehouse?.name ||
                      "Sin almacén asignado",
                    `Modo de acceso: ${selectedAccessAudit.accessMode}`,
                  ]}
                />

                <AuditDetailBlock
                  title="Origen técnico"
                  lines={[
                    selectedAccessAudit.ipAddress || "IP no registrada",
                    selectedAccessAudit.browser,
                    selectedAccessAudit.userAgent ||
                      "Agente de usuario no registrado",
                  ]}
                />
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                  Motivo registrado
                </p>

                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-800">
                  {selectedAccessAudit.reason}
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <AuditDetailBlock
                  title="Entrada"
                  lines={[
                    new Date(selectedAccessAudit.enteredAt).toLocaleString(
                      "es-PE",
                    ),
                  ]}
                />

                <AuditDetailBlock
                  title="Salida"
                  lines={[
                    selectedAccessAudit.exitedAt
                      ? new Date(selectedAccessAudit.exitedAt).toLocaleString(
                          "es-PE",
                        )
                      : "Sesión aún activa",
                  ]}
                />

                <AuditDetailBlock
                  title="Duración"
                  lines={[
                    formatAccessDuration(selectedAccessAudit.durationSeconds),
                  ]}
                />
              </div>
            </div>

            <footer className="sticky bottom-0 flex justify-end border-t border-slate-200 bg-slate-50 p-4 sm:p-5">
              <button
                type="button"
                onClick={() => setSelectedAccessAudit(null)}
                className="rounded-xl bg-slate-950 px-5 py-2.5 font-black text-white hover:bg-slate-800"
              >
                Cerrar
              </button>
            </footer>
          </section>
        </div>
      ) : null}

      {selectedCompany ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="company-context-title"
            className="w-full max-w-xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
          >
            <div className="border-b border-slate-200 bg-slate-50 p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-cyan-700">
                    Cambio de contexto
                  </p>

                  <h2
                    id="company-context-title"
                    className="mt-1 text-2xl font-black text-slate-950"
                  >
                    Entrar a empresa
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (!contextLoading) {
                      setSelectedCompany(null);
                      setContextError(null);
                      setContextReason("");
                    }
                  }}
                  className="rounded-xl p-2 text-slate-500 hover:bg-slate-200"
                  aria-label="Cerrar"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="space-y-5 p-5 sm:p-6">
              <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-xl bg-cyan-100 p-3 text-cyan-800">
                    <Boxes className="h-6 w-6" />
                  </div>

                  <div>
                    <p className="font-black text-slate-950">
                      {selectedCompany.legalName}
                    </p>

                    {selectedCompany.tradeName &&
                    selectedCompany.tradeName !== selectedCompany.legalName ? (
                      <p className="mt-1 font-semibold text-cyan-800">
                        {selectedCompany.tradeName}
                      </p>
                    ) : null}

                    <p className="mt-1 text-sm text-slate-600">
                      RUC {selectedCompany.ruc}
                    </p>

                    <p className="mt-1 text-sm text-slate-600">
                      Código {selectedCompany.code}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <div className="flex gap-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />

                  <div>
                    <p className="font-black text-amber-950">
                      Acceso operativo temporal
                    </p>

                    <p className="mt-1 text-sm leading-6 text-amber-900">
                      Saldrá temporalmente de la administración global e
                      ingresará al entorno operativo de esta empresa. Su
                      privilegio de superadministrador se conservará para poder
                      volver al panel global.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label
                  htmlFor="platform-access-reason"
                  className="block text-sm font-black text-slate-800"
                >
                  Motivo del ingreso
                  <span className="ml-1 text-red-600">*</span>
                </label>

                <select
                  value=""
                  disabled={contextLoading}
                  onChange={(event) => {
                    if (event.target.value) {
                      setContextReason(event.target.value);
                      setContextError(null);
                    }
                  }}
                  className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 disabled:opacity-60"
                  aria-label="Seleccionar motivo sugerido"
                >
                  <option value="">Seleccionar un motivo sugerido...</option>
                  <option value="Soporte técnico">Soporte técnico</option>
                  <option value="Verificación de configuración">
                    Verificación de configuración
                  </option>
                  <option value="Supervisión administrativa">
                    Supervisión administrativa
                  </option>
                  <option value="Auditoría operativa">
                    Auditoría operativa
                  </option>
                  <option value="Resolución de incidencia">
                    Resolución de incidencia
                  </option>
                </select>

                <textarea
                  id="platform-access-reason"
                  value={contextReason}
                  disabled={contextLoading}
                  onChange={(event) => {
                    setContextReason(event.target.value);
                    setContextError(null);
                  }}
                  rows={3}
                  maxLength={500}
                  placeholder="Explique brevemente por qué necesita ingresar a esta empresa."
                  className="mt-3 w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 disabled:opacity-60"
                />

                <div className="mt-1 flex items-center justify-between gap-3 text-xs">
                  <p className="text-slate-500">
                    El motivo quedará registrado en la auditoría permanente.
                  </p>

                  <p className="text-slate-500">{contextReason.length}/500</p>
                </div>
              </div>

              {contextError ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">
                  {contextError}
                </div>
              ) : null}
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 p-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={contextLoading}
                onClick={() => {
                  setSelectedCompany(null);
                  setContextError(null);
                  setContextReason("");
                }}
                className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-black text-slate-700 hover:bg-slate-100 disabled:opacity-60"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={contextLoading || contextReason.trim().length < 5}
                onClick={() => void enterCompanyContext()}
                className="rounded-xl bg-slate-950 px-5 py-3 font-black text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {contextLoading
                  ? "Preparando acceso..."
                  : "Confirmar e ingresar"}
              </button>
            </div>
          </section>
        </div>
      ) : null}

      <div
        className={
          sidebarCollapsed
            ? "transition-all lg:pl-24"
            : "transition-all lg:pl-80"
        }
      >
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="mx-auto flex min-h-20 w-full max-w-[1920px] items-center gap-4 px-4 sm:px-6 lg:px-8 2xl:px-10">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="rounded-xl border border-slate-200 p-2.5 text-slate-700 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="relative hidden max-w-xl flex-1 md:block xl:max-w-2xl 2xl:max-w-3xl">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Buscar tenant, empresa, código o RUC..."
                aria-label="Buscar en la plataforma"
                className="min-h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-12 pr-12 outline-none focus:border-cyan-500 focus:bg-white focus:ring-2 focus:ring-cyan-100"
              />

              {searchTerm ? (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  aria-label="Limpiar búsqueda"
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}

              {normalizedSearchTerm ? (
                <span className="absolute left-0 top-full mt-1 text-xs font-semibold text-cyan-800">
                  {filteredCompanyCount} empresa(s) encontrada(s). Mostrando
                  resultados…
                </span>
              ) : null}
            </div>

            <div className="relative ml-auto flex items-center gap-3">
              <button
                type="button"
                onClick={() => setAlertsOpen((value) => !value)}
                aria-expanded={alertsOpen}
                aria-label="Abrir centro de alertas"
                className={[
                  "relative rounded-xl border p-3 transition",
                  alertsOpen
                    ? "border-cyan-300 bg-cyan-50 text-cyan-800"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50",
                ].join(" ")}
              >
                <Bell className="h-5 w-5" />

                {alerts.length > 0 ? (
                  <span
                    className={[
                      "absolute -right-1.5 -top-1.5 flex min-h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-black text-white",
                      criticalAlertCount > 0
                        ? "bg-red-600"
                        : warningAlertCount > 0
                          ? "bg-amber-500"
                          : "bg-cyan-600",
                    ].join(" ")}
                  >
                    {alerts.length > 9 ? "9+" : alerts.length}
                  </span>
                ) : null}
              </button>

              {alertsOpen ? (
                <>
                  <button
                    type="button"
                    aria-label="Cerrar centro de alertas"
                    onClick={() => setAlertsOpen(false)}
                    className="fixed inset-0 z-30 cursor-default bg-transparent"
                  />

                  <section className="fixed inset-x-4 top-24 z-40 max-h-[70vh] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-16 sm:w-[430px]">
                    <div className="flex items-center justify-between border-b border-slate-200 p-4">
                      <div>
                        <p className="font-black text-slate-950">
                          Centro de alertas
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          Avisos administrativos y de seguridad
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setAlertsOpen(false)}
                        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                        aria-label="Cerrar alertas"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>

                    <div className="max-h-[55vh] overflow-y-auto p-3">
                      {summaryLoading ? (
                        <div className="space-y-3">
                          <div className="h-24 animate-pulse rounded-xl bg-slate-100" />
                          <div className="h-24 animate-pulse rounded-xl bg-slate-100" />
                        </div>
                      ) : null}

                      {!summaryLoading && alerts.length === 0 ? (
                        <div className="p-6 text-center">
                          <BadgeCheck className="mx-auto h-10 w-10 text-emerald-500" />
                          <p className="mt-3 font-black text-slate-900">
                            No existen alertas pendientes
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            La plataforma no reporta incidencias
                            administrativas.
                          </p>
                        </div>
                      ) : null}

                      {!summaryLoading && alerts.length > 0 ? (
                        <div className="space-y-3">
                          {alerts.map((alert) => (
                            <PlatformAlertCard key={alert.id} alert={alert} />
                          ))}
                        </div>
                      ) : null}
                    </div>

                    {summary?.generatedAt ? (
                      <div className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
                        Actualizado:{" "}
                        {new Date(summary.generatedAt).toLocaleString("es-PE")}
                      </div>
                    ) : null}
                  </section>
                </>
              ) : null}

              <div className="hidden items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 sm:flex">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 font-black text-white">
                  {userInitials}
                </div>

                <div className="max-w-56">
                  <p className="truncate text-sm font-bold">{userName}</p>
                  <p className="truncate text-xs text-slate-500">{userRole}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={logout}
                className="rounded-xl border border-red-200 p-3 text-red-700 hover:bg-red-50"
                title="Cerrar sesión"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1920px] space-y-7 p-4 sm:p-6 lg:p-8 2xl:space-y-8 2xl:p-10">
          <div className="relative md:hidden">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar empresa, código o RUC..."
              aria-label="Buscar en la plataforma"
              className="min-h-12 w-full rounded-xl border border-slate-200 bg-white pl-12 pr-12 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
            />

            {searchTerm ? (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                aria-label="Limpiar búsqueda"
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
          <section className="overflow-hidden rounded-3xl bg-slate-950 text-white shadow-xl">
            <div className="grid gap-8 p-6 sm:p-8 xl:grid-cols-[minmax(0,1fr)_360px] 2xl:grid-cols-[minmax(0,1fr)_420px] 2xl:p-10">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-cyan-300">
                  <ShieldCheck className="h-4 w-4" />
                  Control global de HCELM
                </div>

                <h1 className="mt-5 max-w-3xl text-3xl font-black tracking-tight sm:text-4xl">
                  Administración integral de la plataforma SaaS
                </h1>

                <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-300 sm:text-base">
                  Desde este panel podrá crear clientes, empresas,
                  administradores, módulos, suscripciones y políticas de
                  seguridad sin mezclarlos con la operación clínica o
                  farmacéutica.
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  <span className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm">
                    <BadgeCheck className="h-4 w-4 text-cyan-300" />
                    Superusuario verificado
                  </span>

                  <span className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm">
                    <Gauge className="h-4 w-4 text-emerald-300" />
                    Entorno de desarrollo
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Estado de la plataforma
                </p>

                <div className="mt-4 space-y-4">
                  <StatusRow
                    icon={Activity}
                    label="API y plataforma"
                    value={summaryError ? "Con alerta" : "Operativas"}
                  />
                  <StatusRow
                    icon={ShieldCheck}
                    label="Control multiempresa"
                    value={
                      summary?.security.platformAccessProtected
                        ? "Activo"
                        : "Revisión"
                    }
                  />
                  <StatusRow
                    icon={Fingerprint}
                    label="DNI electrónico"
                    value={
                      summary?.security.dniePrepared
                        ? "Preparado"
                        : "Preparación"
                    }
                  />
                </div>
              </div>
            </div>
          </section>

          <section>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-bold uppercase tracking-wide text-cyan-700">
                  Resumen general
                </p>
                <h2 className="mt-1 text-2xl font-black text-slate-950">
                  Indicadores de plataforma
                </h2>
              </div>

              <p className="text-sm text-slate-500">
                Datos reales de PostgreSQL actualizados desde la API.
              </p>
            </div>

            {summaryError ? (
              <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                <p className="font-black">No se pudieron cargar las métricas</p>
                <p className="mt-1">{summaryError}</p>
              </div>
            ) : null}

            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:gap-5">
              {summaryCards.map((card) => {
                const Icon = card.icon;

                return (
                  <article
                    key={card.label}
                    className="min-h-44 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm 2xl:min-h-48 2xl:p-6"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-slate-500">
                          {card.label}
                        </p>
                        <p className="mt-2 text-4xl font-black text-slate-950">
                          {card.value}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-cyan-50 p-3 text-cyan-700">
                        <Icon className="h-6 w-6" />
                      </div>
                    </div>

                    <p className="mt-4 text-xs leading-5 text-slate-500">
                      {card.caption}
                    </p>
                  </article>
                );
              })}
            </div>

            {summary?.generatedAt ? (
              <p className="mt-3 text-right text-xs text-slate-500">
                Última actualización:{" "}
                {new Date(summary.generatedAt).toLocaleString("es-PE")}
              </p>
            ) : null}
          </section>

          <section
            ref={organizationSectionRef}
            className="scroll-mt-24 rounded-3xl border border-slate-200 bg-white shadow-sm"
          >
            <div className="flex flex-col gap-4 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
              <div>
                <p className="text-sm font-bold uppercase tracking-wide text-cyan-700">
                  Estructura organizacional
                </p>
                <h2 className="mt-1 text-2xl font-black text-slate-950">
                  Tenants y empresas
                </h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                  {normalizedSearchTerm
                    ? `Resultados para “${searchTerm.trim()}”.`
                    : "Vista global de los clientes SaaS, empresas, unidades de negocio y usuarios vinculados a HCELM."}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-cyan-50 px-3 py-1.5 text-xs font-bold text-cyan-800">
                  {summary?.overview.tenants.length ?? 0} tenant(s)
                </span>

                <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700">
                  {summary?.metrics.activeCompanies ?? 0} empresa(s) activa(s)
                </span>

                {normalizedSearchTerm ? (
                  <span className="rounded-full bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-800">
                    {filteredTenants.length} tenant(s) y {filteredCompanyCount}{" "}
                    empresa(s) encontrados
                  </span>
                ) : null}
              </div>
            </div>

            {summaryLoading ? (
              <div className="p-6">
                <div className="h-32 animate-pulse rounded-2xl bg-slate-100" />
              </div>
            ) : null}

            {!summaryLoading &&
            !summaryError &&
            normalizedSearchTerm &&
            filteredTenants.length === 0 ? (
              <div className="p-8 text-center">
                <Search className="mx-auto h-10 w-10 text-slate-300" />
                <p className="mt-3 font-black text-slate-800">
                  No encontramos coincidencias
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Revisa el nombre, código o RUC ingresado.
                </p>

                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="mt-4 rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-2 text-sm font-black text-cyan-800 hover:bg-cyan-100"
                >
                  Limpiar búsqueda
                </button>
              </div>
            ) : null}

            {!summaryLoading &&
            !summaryError &&
            !normalizedSearchTerm &&
            summary?.overview.tenants.length === 0 ? (
              <div className="p-8 text-center">
                <Building2 className="mx-auto h-10 w-10 text-slate-300" />
                <p className="mt-3 font-black text-slate-800">
                  No existen tenants registrados
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  El primer cliente podrá crearse desde este centro de control.
                </p>
              </div>
            ) : null}

            {!summaryLoading && filteredTenants.length ? (
              <div className="space-y-4 p-4 sm:p-6">
                {filteredTenants.map((tenant) => {
                  const expanded = expandedTenantIds.has(tenant.id);

                  return (
                    <article
                      key={tenant.id}
                      className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"
                    >
                      <button
                        type="button"
                        onClick={() => toggleTenant(tenant.id)}
                        className="flex w-full flex-col gap-4 p-4 text-left transition hover:bg-slate-100 sm:flex-row sm:items-center sm:justify-between sm:p-5"
                      >
                        <div className="flex min-w-0 items-start gap-4">
                          <div className="rounded-2xl bg-slate-950 p-3 text-white">
                            <Building2 className="h-6 w-6" />
                          </div>

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate text-lg font-black text-slate-950">
                                {tenant.name}
                              </p>

                              <span
                                className={[
                                  "rounded-full px-2.5 py-1 text-xs font-bold",
                                  tenant.active
                                    ? "bg-emerald-100 text-emerald-800"
                                    : "bg-slate-200 text-slate-600",
                                ].join(" ")}
                              >
                                {tenant.active ? "Activo" : "Inactivo"}
                              </span>
                            </div>

                            <p className="mt-1 text-sm text-slate-500">
                              Grupo empresarial HCELM
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 sm:justify-end">
                          <div className="rounded-xl bg-white px-3 py-2 text-center shadow-sm">
                            <p className="text-lg font-black text-slate-950">
                              {tenant.companyCount}
                            </p>
                            <p className="text-[11px] font-semibold uppercase text-slate-500">
                              Empresas
                            </p>
                          </div>

                          <div className="rounded-xl bg-white px-3 py-2 text-center shadow-sm">
                            <p className="text-lg font-black text-slate-950">
                              {tenant.userCount}
                            </p>
                            <p className="text-[11px] font-semibold uppercase text-slate-500">
                              Usuarios
                            </p>
                          </div>

                          <ChevronRight
                            className={[
                              "h-5 w-5 text-slate-500 transition-transform",
                              expanded ? "rotate-90" : "",
                            ].join(" ")}
                          />
                        </div>
                      </button>

                      {expanded ? (
                        <div className="border-t border-slate-200 bg-white">
                          <div className="overflow-x-auto">
                            <table className="min-w-[1050px] w-full text-left">
                              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                                <tr>
                                  <th className="px-5 py-3 font-bold">
                                    Empresa
                                  </th>
                                  <th className="px-5 py-3 font-bold">
                                    Código
                                  </th>
                                  <th className="px-5 py-3 font-bold">RUC</th>
                                  <th className="px-5 py-3 font-bold">
                                    Unidades
                                  </th>
                                  <th className="px-5 py-3 font-bold">
                                    Membresías
                                  </th>
                                  <th className="px-5 py-3 font-bold">
                                    Estado
                                  </th>
                                  <th className="px-5 py-3 text-right font-bold">
                                    Acciones
                                  </th>
                                </tr>
                              </thead>

                              <tbody className="divide-y divide-slate-100">
                                {tenant.companies.map((company) => (
                                  <tr
                                    key={company.id}
                                    className="hover:bg-slate-50"
                                  >
                                    <td className="px-5 py-4">
                                      <div className="flex items-center gap-3">
                                        <div className="rounded-xl bg-cyan-50 p-2.5 text-cyan-700">
                                          <Boxes className="h-5 w-5" />
                                        </div>

                                        <div>
                                          <p className="font-black text-slate-900">
                                            {company.legalName}
                                          </p>

                                          {company.tradeName &&
                                          company.tradeName !==
                                            company.legalName ? (
                                            <p className="mt-0.5 text-sm text-slate-500">
                                              {company.tradeName}
                                            </p>
                                          ) : null}
                                        </div>
                                      </div>
                                    </td>

                                    <td className="px-5 py-4">
                                      <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-xs font-bold text-slate-700">
                                        {company.code}
                                      </span>
                                    </td>

                                    <td className="px-5 py-4 text-sm font-semibold text-slate-700">
                                      {company.ruc}
                                    </td>

                                    <td className="px-5 py-4">
                                      <span className="inline-flex items-center gap-2 text-sm font-bold text-slate-700">
                                        <Boxes className="h-4 w-4 text-slate-400" />
                                        {company.businessUnitCount}
                                      </span>
                                    </td>

                                    <td className="px-5 py-4">
                                      <span className="inline-flex items-center gap-2 text-sm font-bold text-slate-700">
                                        <Users className="h-4 w-4 text-slate-400" />
                                        {company.membershipCount}
                                      </span>
                                    </td>

                                    <td className="px-5 py-4">
                                      <span
                                        className={[
                                          "rounded-full px-2.5 py-1 text-xs font-bold",
                                          company.active
                                            ? "bg-emerald-100 text-emerald-800"
                                            : "bg-slate-200 text-slate-600",
                                        ].join(" ")}
                                      >
                                        {company.active ? "Activa" : "Inactiva"}
                                      </span>
                                    </td>

                                    <td className="px-5 py-4 text-right">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setContextError(null);
                                          setContextReason("");
                                          setSelectedCompany(company);
                                        }}
                                        className="rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs font-black text-cyan-800 transition hover:border-cyan-300 hover:bg-cyan-100"
                                      >
                                        Entrar a empresa
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            ) : null}
          </section>
          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-5 sm:p-6">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div>
                  <p className="text-sm font-bold uppercase tracking-wide text-cyan-700">
                    Seguridad y trazabilidad
                  </p>

                  <h2 className="mt-1 text-2xl font-black text-slate-950">
                    Historial de accesos a empresas
                  </h2>

                  <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                    Registro permanente de los ingresos temporales realizados
                    por superadministradores de plataforma.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={
                      accessAuditLoading ||
                      accessAuditExporting ||
                      !accessAuditData?.pagination.totalItems
                    }
                    onClick={() => void exportAccessAuditsCsv()}
                    className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-black text-emerald-800 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Download className="h-4 w-4" />

                    {accessAuditExporting
                      ? "Preparando CSV..."
                      : "Exportar CSV"}
                  </button>

                  <button
                    type="button"
                    disabled={accessAuditLoading}
                    onClick={() => void loadAccessAudits(accessAuditPage)}
                    className="rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-2.5 text-sm font-black text-cyan-800 hover:bg-cyan-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {accessAuditLoading
                      ? "Actualizando..."
                      : "Actualizar historial"}
                  </button>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                <div>
                  <label className="text-xs font-black uppercase tracking-wide text-slate-500">
                    Buscar
                  </label>

                  <input
                    type="search"
                    value={accessAuditSearch}
                    onChange={(event) =>
                      setAccessAuditSearch(event.target.value)
                    }
                    placeholder="Usuario, empresa, motivo..."
                    className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                  />
                </div>

                <div>
                  <label className="text-xs font-black uppercase tracking-wide text-slate-500">
                    Estado
                  </label>

                  <select
                    value={accessAuditStatus}
                    onChange={(event) =>
                      setAccessAuditStatus(event.target.value)
                    }
                    className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                  >
                    <option value="">Todos</option>
                    <option value="ACTIVE">Activos</option>
                    <option value="CLOSED">Cerrados</option>
                    <option value="ABANDONED">Abandonados</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-black uppercase tracking-wide text-slate-500">
                    Empresa
                  </label>

                  <select
                    value={accessAuditCompanyId}
                    onChange={(event) =>
                      setAccessAuditCompanyId(event.target.value)
                    }
                    className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                  >
                    <option value="">Todas las empresas</option>

                    {accessAuditCompanies.map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.label} — RUC {company.ruc}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-black uppercase tracking-wide text-slate-500">
                    Desde
                  </label>

                  <input
                    type="date"
                    value={accessAuditDateFrom}
                    onChange={(event) =>
                      setAccessAuditDateFrom(event.target.value)
                    }
                    className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                  />
                </div>

                <div>
                  <label className="text-xs font-black uppercase tracking-wide text-slate-500">
                    Hasta
                  </label>

                  <input
                    type="date"
                    value={accessAuditDateTo}
                    onChange={(event) =>
                      setAccessAuditDateTo(event.target.value)
                    }
                    className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                  />
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={accessAuditLoading}
                  onClick={() => {
                    setAccessAuditPage(1);
                    void loadAccessAudits(1);
                  }}
                  className="rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-black text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  Aplicar filtros
                </button>

                <button
                  type="button"
                  disabled={accessAuditLoading}
                  onClick={() => {
                    setAccessAuditSearch("");
                    setAccessAuditStatus("");
                    setAccessAuditCompanyId("");
                    setAccessAuditDateFrom("");
                    setAccessAuditDateTo("");
                    setAccessAuditPage(1);

                    window.setTimeout(() => {
                      window.location.reload();
                    }, 0);
                  }}
                  className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-black text-slate-700 hover:bg-slate-100 disabled:opacity-60"
                >
                  Limpiar filtros
                </button>
              </div>
            </div>

            {accessAuditData ? (
              <div className="grid gap-3 border-b border-slate-200 bg-slate-50 p-4 sm:grid-cols-2 lg:grid-cols-4 sm:p-5">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-bold uppercase text-slate-500">
                    Total
                  </p>
                  <p className="mt-1 text-2xl font-black text-slate-950">
                    {accessAuditData.summary.total}
                  </p>
                </div>

                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-xs font-bold uppercase text-emerald-700">
                    Activos
                  </p>
                  <p className="mt-1 text-2xl font-black text-emerald-950">
                    {accessAuditData.summary.active}
                  </p>
                </div>

                <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-4">
                  <p className="text-xs font-bold uppercase text-cyan-700">
                    Cerrados
                  </p>
                  <p className="mt-1 text-2xl font-black text-cyan-950">
                    {accessAuditData.summary.closed}
                  </p>
                </div>

                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-xs font-bold uppercase text-amber-700">
                    Abandonados
                  </p>
                  <p className="mt-1 text-2xl font-black text-amber-950">
                    {accessAuditData.summary.abandoned}
                  </p>
                </div>
              </div>
            ) : null}

            {accessAuditData?.items.some(isProlongedActiveAccess) ? (
              <div className="m-5 rounded-2xl border border-amber-300 bg-amber-50 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />

                  <div>
                    <p className="font-black text-amber-950">
                      Acceso temporal prolongado
                    </p>

                    <p className="mt-1 text-sm leading-6 text-amber-900">
                      Existe al menos una sesión activa durante 30 minutos o
                      más. Revise que el acceso administrativo siga siendo
                      necesario.
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            {accessAuditError ? (
              <div className="m-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                <p className="font-black">No se pudo cargar el historial</p>
                <p className="mt-1">{accessAuditError}</p>
              </div>
            ) : null}

            {accessAuditLoading ? (
              <div className="space-y-3 p-5">
                <div className="h-24 animate-pulse rounded-2xl bg-slate-100" />
                <div className="h-24 animate-pulse rounded-2xl bg-slate-100" />
              </div>
            ) : null}

            {!accessAuditLoading &&
            !accessAuditError &&
            accessAuditData?.items.length === 0 ? (
              <div className="p-10 text-center">
                <ShieldCheck className="mx-auto h-12 w-12 text-slate-300" />
                <p className="mt-3 font-black text-slate-900">
                  No existen accesos con estos filtros
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Cambie los criterios de búsqueda o el rango de fechas.
                </p>
              </div>
            ) : null}

            {!accessAuditLoading &&
            accessAuditData &&
            accessAuditData.items.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-[1250px] w-full text-left">
                  <thead className="bg-slate-950 text-xs uppercase tracking-wide text-white">
                    <tr>
                      <th className="px-4 py-3">Estado</th>
                      <th className="px-4 py-3">Usuario</th>
                      <th className="px-4 py-3">Empresa</th>
                      <th className="px-4 py-3">Motivo</th>
                      <th className="px-4 py-3">Entrada</th>
                      <th className="px-4 py-3">Salida</th>
                      <th className="px-4 py-3">Duración</th>
                      <th className="px-4 py-3">Origen</th>
                      <th className="px-4 py-3">Acciones</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-200">
                    {accessAuditData.items.map((audit) => (
                      <tr
                        key={audit.id}
                        className={[
                          "align-top hover:bg-slate-50",
                          isProlongedActiveAccess(audit)
                            ? "bg-amber-50/70"
                            : "",
                        ].join(" ")}
                      >
                        <td className="px-4 py-4">
                          <span
                            className={[
                              "inline-flex rounded-full border px-2.5 py-1 text-xs font-black",
                              accessStatusClass(audit.status),
                            ].join(" ")}
                          >
                            {accessStatusLabel(audit.status)}
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <p className="font-black text-slate-950">
                            {audit.user.fullName}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {audit.user.email || "Correo no disponible"}
                          </p>
                        </td>

                        <td className="px-4 py-4">
                          <p className="font-black text-slate-950">
                            {audit.company.tradeName || audit.company.legalName}
                          </p>

                          {audit.company.tradeName ? (
                            <p className="mt-1 text-xs text-slate-500">
                              {audit.company.legalName}
                            </p>
                          ) : null}

                          <p className="mt-1 text-xs text-slate-500">
                            RUC {audit.company.ruc || "No disponible"}
                          </p>

                          <p className="mt-2 text-xs font-semibold text-cyan-800">
                            {audit.businessUnit.name}
                            {audit.warehouse
                              ? ` · ${audit.warehouse.name}`
                              : ""}
                          </p>
                        </td>

                        <td className="max-w-sm px-4 py-4">
                          <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
                            {audit.reason}
                          </p>
                        </td>

                        <td className="px-4 py-4 text-sm text-slate-700">
                          {new Date(audit.enteredAt).toLocaleString("es-PE")}
                        </td>

                        <td className="px-4 py-4 text-sm text-slate-700">
                          {audit.exitedAt
                            ? new Date(audit.exitedAt).toLocaleString("es-PE")
                            : "Sesión aún activa"}
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                            <Timer className="h-4 w-4 text-cyan-700" />
                            {formatAccessDuration(audit.durationSeconds)}
                          </div>
                        </td>

                        <td className="px-4 py-4 text-sm text-slate-700">
                          <p>{audit.ipAddress || "IP no registrada"}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {audit.browser}
                          </p>
                        </td>

                        <td className="px-4 py-4">
                          <button
                            type="button"
                            onClick={() => setSelectedAccessAudit(audit)}
                            className="inline-flex items-center gap-2 rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs font-black text-cyan-800 hover:bg-cyan-100"
                          >
                            <Eye className="h-4 w-4" />
                            Ver detalle
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}

            {accessAuditData && accessAuditData.pagination.totalItems > 0 ? (
              <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                <p className="text-sm text-slate-600">
                  Página {accessAuditData.pagination.page} de{" "}
                  {accessAuditData.pagination.totalPages} ·{" "}
                  {accessAuditData.pagination.totalItems} registro(s)
                </p>

                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={
                      accessAuditLoading ||
                      !accessAuditData.pagination.hasPreviousPage
                    }
                    onClick={() => {
                      const previousPage = accessAuditData.pagination.page - 1;

                      setAccessAuditPage(previousPage);
                      void loadAccessAudits(previousPage);
                    }}
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Anterior
                  </button>

                  <button
                    type="button"
                    disabled={
                      accessAuditLoading ||
                      !accessAuditData.pagination.hasNextPage
                    }
                    onClick={() => {
                      const nextPage = accessAuditData.pagination.page + 1;

                      setAccessAuditPage(nextPage);
                      void loadAccessAudits(nextPage);
                    }}
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            ) : null}
          </section>

          <section className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(340px,0.55fr)] 2xl:grid-cols-[minmax(0,1.6fr)_420px] 2xl:gap-8">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div>
                <p className="text-sm font-bold uppercase tracking-wide text-cyan-700">
                  Acciones rápidas
                </p>
                <h2 className="mt-1 text-2xl font-black">
                  Configuración de clientes
                </h2>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
                {quickActions.map((action) => {
                  const Icon = action.icon;

                  return (
                    <button
                      key={action.title}
                      type="button"
                      disabled
                      className="group flex items-start gap-4 rounded-2xl border border-slate-200 p-4 text-left opacity-80 transition hover:border-cyan-300 hover:bg-cyan-50"
                    >
                      <div className="rounded-xl bg-slate-950 p-3 text-white">
                        <Icon className="h-5 w-5" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="font-black text-slate-900">
                          {action.title}
                        </p>
                        <p className="mt-1 text-sm leading-5 text-slate-500">
                          {action.description}
                        </p>
                        <p className="mt-3 text-xs font-bold uppercase text-cyan-700">
                          Próxima implementación
                        </p>
                      </div>

                      <ChevronRight className="mt-1 h-5 w-5 text-slate-400" />
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-6">
              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-violet-50 p-3 text-violet-700">
                    <Fingerprint className="h-6 w-6" />
                  </div>

                  <div>
                    <p className="font-black">Identidad digital</p>
                    <p className="text-sm text-slate-500">
                      Preparación para DNIe y certificados
                    </p>
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  <IdentityRow
                    icon={KeyRound}
                    title="Credenciales y MFA"
                    status="Planificado"
                  />
                  <IdentityRow
                    icon={Fingerprint}
                    title="DNI electrónico"
                    status="Arquitectura"
                  />
                  <IdentityRow
                    icon={BookOpenCheck}
                    title="Firma digital"
                    status="Futuro"
                  />
                </div>
              </section>

              <section
                className={[
                  "rounded-3xl border p-5",
                  criticalAlertCount > 0
                    ? "border-red-200 bg-red-50"
                    : warningAlertCount > 0
                      ? "border-amber-200 bg-amber-50"
                      : "border-emerald-200 bg-emerald-50",
                ].join(" ")}
              >
                <div className="flex gap-3">
                  <div
                    className={[
                      "rounded-xl p-3",
                      criticalAlertCount > 0
                        ? "bg-red-100 text-red-800"
                        : warningAlertCount > 0
                          ? "bg-amber-100 text-amber-800"
                          : "bg-emerald-100 text-emerald-800",
                    ].join(" ")}
                  >
                    {criticalAlertCount > 0 || warningAlertCount > 0 ? (
                      <AlertTriangle className="h-5 w-5" />
                    ) : (
                      <BadgeCheck className="h-5 w-5" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <p className="font-black text-slate-950">
                      Estado administrativo
                    </p>

                    <p className="mt-1 text-sm leading-5 text-slate-700">
                      {alerts.length > 0
                        ? `La plataforma reporta ${alerts.length} aviso(s) que requieren revisión.`
                        : "No existen alertas administrativas pendientes."}
                    </p>

                    <button
                      type="button"
                      onClick={() => setAlertsOpen(true)}
                      className="mt-3 text-xs font-black uppercase tracking-wide text-cyan-800 hover:underline"
                    >
                      Revisar centro de alertas
                    </button>
                  </div>
                </div>
              </section>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

function AuditDetailBlock({
  title,
  lines,
}: {
  title: string;
  lines: string[];
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-black uppercase tracking-wide text-slate-500">
        {title}
      </p>

      <div className="mt-2 space-y-1">
        {lines.map((line, index) => (
          <p
            key={`${title}-${index}`}
            className="break-words text-sm leading-5 text-slate-800"
          >
            {line}
          </p>
        ))}
      </div>
    </div>
  );
}

function PlatformAlertCard({ alert }: { alert: PlatformAlert }) {
  const configuration = {
    CRITICAL: {
      icon: AlertTriangle,
      container: "border-red-200 bg-red-50",
      iconContainer: "bg-red-100 text-red-700",
      title: "text-red-950",
      message: "text-red-800",
      label: "Crítica",
    },
    WARNING: {
      icon: AlertTriangle,
      container: "border-amber-200 bg-amber-50",
      iconContainer: "bg-amber-100 text-amber-700",
      title: "text-amber-950",
      message: "text-amber-800",
      label: "Advertencia",
    },
    INFO: {
      icon: Info,
      container: "border-cyan-200 bg-cyan-50",
      iconContainer: "bg-cyan-100 text-cyan-700",
      title: "text-cyan-950",
      message: "text-cyan-800",
      label: "Información",
    },
  } as const;

  const selected = configuration[alert.level];
  const Icon = selected.icon;

  return (
    <article
      className={["rounded-xl border p-4", selected.container].join(" ")}
    >
      <div className="flex items-start gap-3">
        <div className={["rounded-xl p-2.5", selected.iconContainer].join(" ")}>
          <Icon className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <span className="text-[10px] font-black uppercase tracking-wide text-slate-500">
            {selected.label}
          </span>

          <p className={["mt-1 font-black", selected.title].join(" ")}>
            {alert.title}
          </p>

          <p className={["mt-1 text-sm leading-5", selected.message].join(" ")}>
            {alert.message}
          </p>
        </div>
      </div>
    </article>
  );
}

function StatusRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-white/10 p-2">
          <Icon className="h-4 w-4 text-cyan-300" />
        </div>
        <span className="text-sm text-slate-300">{label}</span>
      </div>

      <span className="text-sm font-bold text-white">{value}</span>
    </div>
  );
}

function IdentityRow({
  icon: Icon,
  title,
  status,
}: {
  icon: typeof KeyRound;
  title: string;
  status: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-center gap-3">
        <Icon className="h-5 w-5 text-slate-600" />
        <span className="text-sm font-bold text-slate-800">{title}</span>
      </div>

      <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-500">
        {status}
      </span>
    </div>
  );
}
