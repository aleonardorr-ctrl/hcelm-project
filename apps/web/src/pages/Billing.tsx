import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";

type FiscalProfile = {
  fiscalAddress?: string | null;
  ubigeo?: string | null;
  department?: string | null;
  province?: string | null;
  district?: string | null;
  countryCode?: string | null;
  provider?: string | null;
  environment?: string | null;
  certificateExpiresAt?: string | null;
  active?: boolean;
  credentialConfigured?: boolean;
  certificateConfigured?: boolean;
};

type Sequence = {
  documentType: "BOLETA" | "FACTURA" | string;
  series: string;
  currentNumber: number;
  active: boolean;
};

type DraftDocument = {
  id: string;
  documentType: "BOLETA" | "FACTURA" | string;
  status: string;
  fullNumber: string;
  issueDate: string;
  customerName?: string | null;
  customerDocumentType?: string | null;
  customerDocumentNumber?: string | null;
  currency?: string | null;
  taxableAmount: string | number;
  igvTotal: string | number;
  total: string | number;
  createdAt: string;
  sale?: { id: string; saleNumber: string } | null;
  _count?: { lines: number };
};

type PendingSale = {
  id: string;
  saleNumber: string;
  createdAt: string;
  customerName?: string | null;
  customerDocumentType?: string | null;
  customerDocumentNumber?: string | null;
  currency?: string | null;
  total: string | number;
  items?: Array<{
    id: string;
    productName: string;
    quantity: string | number;
    total: string | number;
  }>;
};

type CommercialCustomer = {
  id: string;
  customerType: "NATURAL_PERSON" | "LEGAL_ENTITY" | "FOREIGN_CUSTOMER" | string;
  documentType: "DNI" | "RUC" | "CE" | "PASSPORT" | "OTHER" | string;
  documentNumber: string;
  displayName: string;
  legalName?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
};

type CustomerForm = {
  customerType: "NATURAL_PERSON" | "LEGAL_ENTITY";
  documentType: "DNI" | "RUC";
  documentNumber: string;
  displayName: string;
  legalName: string;
  email: string;
  phone: string;
  address: string;
  electronicDeliveryConsent: boolean;
};

type ReadinessResponse = {
  company?: {
    code?: string;
    legalName?: string;
    tradeName?: string | null;
    ruc?: string;
  };
  businessUnit?: { code?: string; name?: string };
  warehouse?: { code?: string; name?: string };
  fiscalProfile?: FiscalProfile | null;
  sequences?: Sequence[];
  catalog?: {
    activeProducts?: number;
    missingFiscalConfiguration?: number;
    ready?: boolean;
  };
  readiness?: {
    profileReady?: boolean;
    boletaSeriesReady?: boolean;
    facturaSeriesReady?: boolean;
    providerReady?: boolean;
    certificateReady?: boolean;
    draftBaseReady?: boolean;
    submissionReady?: boolean;
  };
  rules?: Record<string, unknown>;
};

type IdentityDocumentType = "DNI" | "RUC" | "CE" | "PASSPORT" | "OTHER";

type IdentityCheckResult = {
  status: "idle" | "valid-local" | "invalid" | "provider-pending";
  title: string;
  detail: string;
};

type FiscalProfileForm = {
  fiscalAddress: string;
  ubigeo: string;
  department: string;
  province: string;
  district: string;
  countryCode: string;
  provider: "NONE" | "SUNAT_DIRECT" | "PSE" | "OSE";
  environment: "BETA" | "PRODUCTION";
  credentialSecretRef: string;
  certificateSecretRef: string;
  certificateExpiresAt: string;
  active: boolean;
};

const PERU_DEPARTMENTS: Record<string, string[]> = {
  AMAZONAS: [
    "BAGUA",
    "BONGARA",
    "CHACHAPOYAS",
    "CONDORCANQUI",
    "LUYA",
    "RODRIGUEZ DE MENDOZA",
    "UTCUBAMBA",
  ],
  ANCASH: [
    "AIJA",
    "ANTONIO RAYMONDI",
    "ASUNCION",
    "BOLOGNESI",
    "CARHUAZ",
    "CARLOS FERMIN FITZCARRALD",
    "CASMA",
    "CORONGO",
    "HUARAZ",
    "HUARI",
    "HUARMEY",
    "HUAYLAS",
    "MARISCAL LUZURIAGA",
    "OCROS",
    "PALLASCA",
    "POMABAMBA",
    "RECUAY",
    "SANTA",
    "SIHUAS",
    "YUNGAY",
  ],
  APURIMAC: [
    "ABANCAY",
    "ANDAHUAYLAS",
    "ANTABAMBA",
    "AYMARAES",
    "CHINCHEROS",
    "COTABAMBAS",
    "GRAU",
  ],
  AREQUIPA: [
    "AREQUIPA",
    "CAMANA",
    "CARAVELI",
    "CASTILLA",
    "CAYLLOMA",
    "CONDESUYOS",
    "ISLAY",
    "LA UNION",
  ],
  AYACUCHO: [
    "CANGALLO",
    "HUAMANGA",
    "HUANCA SANCOS",
    "HUANTA",
    "LA MAR",
    "LUCANAS",
    "PARINACOCHAS",
    "PAUCAR DEL SARA SARA",
    "SUCRE",
    "VICTOR FAJARDO",
    "VILCAS HUAMAN",
  ],
  CAJAMARCA: [
    "CAJABAMBA",
    "CAJAMARCA",
    "CELENDIN",
    "CHOTA",
    "CONTUMAZA",
    "CUTERVO",
    "HUALGAYOC",
    "JAEN",
    "SAN IGNACIO",
    "SAN MARCOS",
    "SAN MIGUEL",
    "SAN PABLO",
    "SANTA CRUZ",
  ],
  CALLAO: ["CALLAO"],
  CUSCO: [
    "ACOMAYO",
    "ANTA",
    "CALCA",
    "CANAS",
    "CANCHIS",
    "CHUMBIVILCAS",
    "CUSCO",
    "ESPINAR",
    "LA CONVENCION",
    "PARURO",
    "PAUCARTAMBO",
    "QUISPICANCHI",
    "URUBAMBA",
  ],
  HUANCAVELICA: [
    "ACOBAMBA",
    "ANGARAES",
    "CASTROVIRREYNA",
    "CHURCAMPA",
    "HUANCAVELICA",
    "HUAYTARA",
    "TAYACAJA",
  ],
  HUANUCO: [
    "AMBO",
    "DOS DE MAYO",
    "HUACAYBAMBA",
    "HUAMALIES",
    "HUANUCO",
    "LAURICOCHA",
    "LEONCIO PRADO",
    "MARAÑON",
    "PACHITEA",
    "PUERTO INCA",
    "YAROWILCA",
  ],
  ICA: ["CHINCHA", "ICA", "NASCA", "PALPA", "PISCO"],
  JUNIN: [
    "CHANCHAMAYO",
    "CHUPACA",
    "CONCEPCION",
    "HUANCAYO",
    "JAUJA",
    "JUNIN",
    "SATIPO",
    "TARMA",
    "YAULI",
  ],
  LA_LIBERTAD: [
    "ASCOPE",
    "BOLIVAR",
    "CHEPEN",
    "GRAN CHIMU",
    "JULCAN",
    "OTUZCO",
    "PACASMAYO",
    "PATAZ",
    "SANCHEZ CARRION",
    "SANTIAGO DE CHUCO",
    "TRUJILLO",
    "VIRU",
  ],
  LAMBAYEQUE: ["CHICLAYO", "FERREÑAFE", "LAMBAYEQUE"],
  LIMA: [
    "BARRANCA",
    "CAJATAMBO",
    "CANTA",
    "CAÑETE",
    "HUARAL",
    "HUAROCHIRI",
    "HUAURA",
    "LIMA",
    "OYON",
    "YAUYOS",
  ],
  LORETO: [
    "ALTO AMAZONAS",
    "DATEM DEL MARAÑON",
    "LORETO",
    "MARISCAL RAMON CASTILLA",
    "MAYNAS",
    "PUTUMAYO",
    "REQUENA",
    "UCAYALI",
  ],
  MADRE_DE_DIOS: ["MANU", "TAHUAMANU", "TAMBOPATA"],
  MOQUEGUA: ["GENERAL SANCHEZ CERRO", "ILO", "MARISCAL NIETO"],
  PASCO: ["DANIEL ALCIDES CARRION", "OXAPAMPA", "PASCO"],
  PIURA: [
    "AYABACA",
    "HUANCABAMBA",
    "MORROPON",
    "PAITA",
    "PIURA",
    "SECHURA",
    "SULLANA",
    "TALARA",
  ],
  PUNO: [
    "AZANGARO",
    "CARABAYA",
    "CHUCUITO",
    "EL COLLAO",
    "HUANCANE",
    "LAMPA",
    "MELGAR",
    "MOHO",
    "PUNO",
    "SAN ANTONIO DE PUTINA",
    "SAN ROMAN",
    "SANDIA",
    "YUNGUYO",
  ],
  SAN_MARTIN: [
    "BELLAVISTA",
    "EL DORADO",
    "HUALLAGA",
    "LAMAS",
    "MARISCAL CACERES",
    "MOYOBAMBA",
    "PICOTA",
    "RIOJA",
    "SAN MARTIN",
    "TOCACHE",
  ],
  TACNA: ["CANDARAVE", "JORGE BASADRE", "TACNA", "TARATA"],
  TUMBES: ["CONTRALMIRANTE VILLAR", "TUMBES", "ZARUMILLA"],
  UCAYALI: ["ATALAYA", "CORONEL PORTILLO", "PADRE ABAD", "PURUS"],
};

const COUNTRIES = [
  { code: "PE", name: "PERU" },
  { code: "BO", name: "BOLIVIA" },
  { code: "CL", name: "CHILE" },
  { code: "CO", name: "COLOMBIA" },
  { code: "EC", name: "ECUADOR" },
  { code: "AR", name: "ARGENTINA" },
  { code: "BR", name: "BRASIL" },
  { code: "US", name: "ESTADOS UNIDOS" },
  { code: "ES", name: "ESPAÑA" },
];

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
const BUSINESS_UNIT = "BOTICA";
const WAREHOUSE = "PRINCIPAL";

function emptyForm(): FiscalProfileForm {
  return {
    fiscalAddress: "",
    ubigeo: "",
    department: "",
    province: "",
    district: "",
    countryCode: "PE",
    provider: "NONE",
    environment: "BETA",
    credentialSecretRef: "",
    certificateSecretRef: "",
    certificateExpiresAt: "",
    active: false,
  };
}

function emptyCustomerForm(): CustomerForm {
  return {
    customerType: "NATURAL_PERSON",
    documentType: "DNI",
    documentNumber: "",
    displayName: "",
    legalName: "",
    email: "",
    phone: "",
    address: "",
    electronicDeliveryConsent: false,
  };
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

function statusText(value?: boolean) {
  return value ? "Listo" : "Pendiente";
}

function formatDate(value?: string | null) {
  if (!value) return "No registrado";
  return new Date(value).toLocaleDateString("es-PE");
}

function validateIdentityDocument(
  documentType: IdentityDocumentType,
  documentNumber: string,
): IdentityCheckResult {
  const clean = documentNumber.trim();

  if (!clean) {
    return {
      status: "invalid",
      title: "Documento pendiente",
      detail: "Ingrese el numero de documento del comprador.",
    };
  }

  if (documentType === "DNI" && !/^\d{8}$/.test(clean)) {
    return {
      status: "invalid",
      title: "DNI no valido",
      detail: "El DNI debe tener 8 digitos.",
    };
  }

  if (documentType === "RUC" && !/^\d{11}$/.test(clean)) {
    return {
      status: "invalid",
      title: "RUC no valido",
      detail: "El RUC debe tener 11 digitos.",
    };
  }

  if (documentType === "DNI") {
    return {
      status: "provider-pending",
      title: "DNI con formato correcto",
      detail:
        "Falta configurar proveedor RENIEC o proveedor autorizado para confirmar nombres y apellidos.",
    };
  }

  if (documentType === "RUC") {
    return {
      status: "provider-pending",
      title: "RUC con formato correcto",
      detail:
        "Falta configurar consulta SUNAT o proveedor autorizado para confirmar razon social, estado y condicion.",
    };
  }

  return {
    status: "valid-local",
    title: "Documento registrado",
    detail:
      "Documento aceptado localmente. La verificacion externa se configurara por proveedor.",
  };
}

function toDateInput(value?: string | null) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

function profileToForm(profile?: FiscalProfile | null): FiscalProfileForm {
  return {
    fiscalAddress: profile?.fiscalAddress || "",
    ubigeo: profile?.ubigeo || "",
    department: profile?.department || "",
    province: profile?.province || "",
    district: profile?.district || "",
    countryCode: profile?.countryCode || "PE",
    provider: (profile?.provider as FiscalProfileForm["provider"]) || "NONE",
    environment:
      (profile?.environment as FiscalProfileForm["environment"]) || "BETA",
    credentialSecretRef: profile?.credentialConfigured
      ? "__KEEP_EXISTING__"
      : "",
    certificateSecretRef: profile?.certificateConfigured
      ? "__KEEP_EXISTING__"
      : "",
    certificateExpiresAt: toDateInput(profile?.certificateExpiresAt),
    active: Boolean(profile?.active),
  };
}

export default function Billing() {
  const sourceSaleParams = new URLSearchParams(window.location.search);
  const saleFromPos = sourceSaleParams.get("fromSale") === "1";
  const sourceSaleNumber = sourceSaleParams.get("saleNumber") || "";
  const [data, setData] = useState<ReadinessResponse | null>(null);
  const [form, setForm] = useState<FiscalProfileForm>(emptyForm());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sequenceSaving, setSequenceSaving] = useState<
    "" | "BOLETA" | "FACTURA"
  >("");
  const [draftDocuments, setDraftDocuments] = useState<DraftDocument[]>([]);
  const [draftDocumentsTotal, setDraftDocumentsTotal] = useState(0);
  const [pendingSales, setPendingSales] = useState<PendingSale[]>([]);
  const [pendingSalesTotal, setPendingSalesTotal] = useState(0);
  const [documentSaving, setDocumentSaving] = useState("");
  const [customers, setCustomers] = useState<CommercialCustomer[]>([]);
  const [customerQuery, setCustomerQuery] = useState("");
  const [customerForm, setCustomerForm] =
    useState<CustomerForm>(emptyCustomerForm());
  const [customerSaving, setCustomerSaving] = useState(false);
  const [error, setError] = useState("");
  const [identityDocumentType, setIdentityDocumentType] =
    useState<IdentityDocumentType>("DNI");
  const [identityDocumentNumber, setIdentityDocumentNumber] = useState("");
  const [identityName, setIdentityName] = useState("");
  const [identityResult, setIdentityResult] = useState<IdentityCheckResult>({
    status: "idle",
    title: "Verificacion pendiente",
    detail: "Ingrese el documento del comprador.",
  });
  const [identityChecking, setIdentityChecking] = useState(false);
  const [success, setSuccess] = useState("");

  async function loadReadiness() {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        businessUnit: BUSINESS_UNIT,
        warehouse: WAREHOUSE,
      });
      const response = await fetch(
        API_BASE + "/electronic-billing/readiness?" + params.toString(),
        { headers: { Authorization: "Bearer " + getToken() } },
      );
      if (!response.ok) {
        throw new Error(
          await readError(response, "No se pudo cargar la preparacion fiscal."),
        );
      }
      const nextData = (await response.json()) as ReadinessResponse;
      setData(nextData);
      setForm(profileToForm(nextData.fiscalProfile));
    } catch (reason: any) {
      setError(reason?.message || "Error al cargar facturacion.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadReadiness();
    void loadDraftDocuments();
    void loadPendingSales();
    void loadCustomers("");
  }, []);

  async function loadDraftDocuments() {
    try {
      const params = new URLSearchParams({
        businessUnit: BUSINESS_UNIT,
        warehouse: WAREHOUSE,
        pageSize: "20",
      });
      const response = await fetch(
        API_BASE + "/electronic-billing/documents/drafts?" + params.toString(),
        { headers: { Authorization: "Bearer " + getToken() } },
      );
      if (!response.ok) {
        throw new Error(
          await readError(response, "No se pudo cargar comprobantes borrador."),
        );
      }
      const result = await response.json();
      setDraftDocuments(Array.isArray(result?.items) ? result.items : []);
      setDraftDocumentsTotal(Number(result?.total || 0));
    } catch (reason: any) {
      setError(reason?.message || "Error al cargar comprobantes borrador.");
    }
  }

  async function createDraftDocument(
    saleId: string,
    documentType: "BOLETA" | "FACTURA",
  ) {
    const savingKey = saleId + ":" + documentType;
    setDocumentSaving(savingKey);
    setError("");
    setSuccess("");
    try {
      const params = new URLSearchParams({
        businessUnit: BUSINESS_UNIT,
        warehouse: WAREHOUSE,
      });
      const response = await fetch(
        API_BASE + "/electronic-billing/documents/draft?" + params.toString(),
        {
          method: "POST",
          headers: {
            Authorization: "Bearer " + getToken(),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ saleId, documentType }),
        },
      );
      if (!response.ok) {
        throw new Error(
          await readError(
            response,
            "No se pudo preparar el comprobante. Si la venta ya no aparece en pendientes, revise Comprobantes borrador.",
          ),
        );
      }
      const result = await response.json();
      setSuccess(
        result?.alreadyExisted
          ? "El comprobante ya estaba preparado."
          : "Comprobante " +
              (result?.document?.fullNumber || "") +
              " preparado en borrador. La venta salio de pendientes y ahora figura en Comprobantes borrador.",
      );
      await loadDraftDocuments();
      await loadPendingSales();
      await loadReadiness();
    } catch (reason: any) {
      setError(reason?.message || "Error al preparar comprobante.");
    } finally {
      setDocumentSaving("");
    }
  }

  async function loadPendingSales() {
    try {
      const params = new URLSearchParams({
        businessUnit: BUSINESS_UNIT,
        warehouse: WAREHOUSE,
        pageSize: "20",
      });
      const response = await fetch(
        API_BASE + "/electronic-billing/sales/pending?" + params.toString(),
        { headers: { Authorization: "Bearer " + getToken() } },
      );
      if (!response.ok) {
        throw new Error(
          await readError(
            response,
            "No se pudo cargar ventas pendientes de comprobante.",
          ),
        );
      }
      const result = await response.json();
      setPendingSales(Array.isArray(result?.items) ? result.items : []);
      setPendingSalesTotal(Number(result?.total || 0));
    } catch (reason: any) {
      setError(
        reason?.message || "Error al cargar ventas pendientes de comprobante.",
      );
    }
  }

  async function loadCustomers(query = customerQuery) {
    try {
      const params = new URLSearchParams({
        businessUnit: BUSINESS_UNIT,
        warehouse: WAREHOUSE,
        q: query,
        pageSize: "10",
      });
      const response = await fetch(
        API_BASE + "/electronic-billing/customers/search?" + params.toString(),
        { headers: { Authorization: "Bearer " + getToken() } },
      );
      if (!response.ok) {
        throw new Error(
          await readError(response, "No se pudo cargar clientes comerciales."),
        );
      }
      const result = await response.json();
      setCustomers(Array.isArray(result?.items) ? result.items : []);
    } catch (reason: any) {
      setError(reason?.message || "Error al cargar clientes comerciales.");
    }
  }

  async function saveCustomer(event: FormEvent) {
    event.preventDefault();
    setCustomerSaving(true);
    setError("");
    setSuccess("");

    try {
      const isLegal = customerForm.customerType === "LEGAL_ENTITY";
      const payload = {
        customerType: customerForm.customerType,
        documentType: customerForm.documentType,
        documentNumber: customerForm.documentNumber.trim(),
        displayName: customerForm.displayName.trim(),
        legalName: isLegal
          ? customerForm.legalName.trim() || customerForm.displayName.trim()
          : undefined,
        email: customerForm.email.trim() || undefined,
        phone: customerForm.phone.trim() || undefined,
        address: customerForm.address.trim() || undefined,
        countryCode: "PE",
        electronicDeliveryConsent: customerForm.electronicDeliveryConsent,
      };

      const params = new URLSearchParams({
        businessUnit: BUSINESS_UNIT,
        warehouse: WAREHOUSE,
      });
      const response = await fetch(
        API_BASE + "/electronic-billing/customers?" + params.toString(),
        {
          method: "POST",
          headers: {
            Authorization: "Bearer " + getToken(),
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );
      if (!response.ok) {
        throw new Error(
          await readError(response, "No se pudo guardar el cliente comercial."),
        );
      }

      const result = await response.json();
      setSuccess(
        result?.created
          ? "Cliente comercial registrado."
          : "Cliente comercial actualizado.",
      );
      setCustomerForm(emptyCustomerForm());
      setCustomerQuery("");
      await loadCustomers("");
    } catch (reason: any) {
      setError(reason?.message || "Error al guardar cliente comercial.");
    } finally {
      setCustomerSaving(false);
    }
  }

  async function saveFiscalProfile(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        fiscalAddress: form.fiscalAddress.trim(),
        ubigeo: form.ubigeo.trim() || undefined,
        department: form.department.trim() || undefined,
        province: form.province.trim() || undefined,
        district: form.district.trim() || undefined,
        countryCode: form.countryCode.trim().toUpperCase() || "PE",
        provider: form.provider,
        environment: form.environment,
        credentialSecretRef:
          form.credentialSecretRef === "__KEEP_EXISTING__"
            ? undefined
            : form.credentialSecretRef.trim() || undefined,
        certificateSecretRef:
          form.certificateSecretRef === "__KEEP_EXISTING__"
            ? undefined
            : form.certificateSecretRef.trim() || undefined,
        certificateExpiresAt: form.certificateExpiresAt || undefined,
        active: form.active,
      };

      const params = new URLSearchParams({
        businessUnit: BUSINESS_UNIT,
        warehouse: WAREHOUSE,
      });
      const response = await fetch(
        API_BASE + "/electronic-billing/fiscal-profile?" + params.toString(),
        {
          method: "PUT",
          headers: {
            Authorization: "Bearer " + getToken(),
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        throw new Error(
          await readError(response, "No se pudo guardar el perfil fiscal."),
        );
      }

      setSuccess("Perfil fiscal guardado para la empresa emisora.");
      await loadReadiness();
    } catch (reason: any) {
      setError(reason?.message || "Error al guardar perfil fiscal.");
    } finally {
      setSaving(false);
    }
  }

  async function createSequence(documentType: "BOLETA" | "FACTURA") {
    const series = documentType === "BOLETA" ? "B001" : "F001";
    setSequenceSaving(documentType);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(API_BASE + "/electronic-billing/sequences", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + getToken(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          businessUnit: BUSINESS_UNIT,
          warehouse: WAREHOUSE,
          documentType,
          series,
          currentNumber: 0,
        }),
      });

      if (!response.ok) {
        throw new Error(
          await readError(response, "No se pudo crear la serie fiscal."),
        );
      }

      const result = await response.json();
      setSuccess(
        result?.alreadyExisted
          ? "La serie " + series + " ya estaba configurada."
          : "Serie " + series + " creada correctamente.",
      );
      await loadReadiness();
    } catch (reason: any) {
      setError(reason?.message || "Error al crear serie fiscal.");
    } finally {
      setSequenceSaving("");
    }
  }

  async function handleIdentityCheck(event: { preventDefault: () => void }) {
    event.preventDefault();
    const localResult = validateIdentityDocument(
      identityDocumentType,
      identityDocumentNumber,
    );

    if (localResult.status === "invalid") {
      setIdentityResult(localResult);
      return;
    }

    setIdentityChecking(true);
    setIdentityResult({
      status: "provider-pending",
      title: "Consultando verificacion",
      detail: "HCELM esta consultando el adaptador de identidad configurado.",
    });

    try {
      const response = await fetch(API_BASE + "/identity-lookup/verify", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + getToken(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          documentType: identityDocumentType,
          documentNumber: identityDocumentNumber,
          name: identityName,
        }),
      });

      if (!response.ok) {
        throw new Error(
          await readError(response, "No se pudo verificar la identidad."),
        );
      }

      const result = await response.json();
      setIdentityResult({
        status:
          result.status === "INVALID"
            ? "invalid"
            : result.verified
              ? "valid-local"
              : "provider-pending",
        title: result.title || "Verificacion recibida",
        detail:
          result.detail ||
          "El adaptador de identidad respondio sin detalle adicional.",
      });

      const resolvedName =
        result.person?.fullName || result.company?.legalName || "";
      if (resolvedName) setIdentityName(resolvedName);
    } catch (reason: any) {
      setIdentityResult({
        status: "invalid",
        title: "No se pudo consultar identidad",
        detail:
          reason?.message ||
          "Revise que el backend este encendido y vuelva a intentar.",
      });
    } finally {
      setIdentityChecking(false);
    }
  }

  const boletaSequence = useMemo(
    () => data?.sequences?.find((item) => item.documentType === "BOLETA"),
    [data?.sequences],
  );
  const facturaSequence = useMemo(
    () => data?.sequences?.find((item) => item.documentType === "FACTURA"),
    [data?.sequences],
  );

  const selectedDepartmentKey = form.department.replace(/ /g, "_");
  const selectedProvinces = useMemo(
    () => PERU_DEPARTMENTS[selectedDepartmentKey] || [],
    [selectedDepartmentKey],
  );

  const context = data?.company
    ? [
        data.company.legalName || data.company.tradeName || data.company.code,
        "RUC " + (data.company.ruc || "-"),
        data.businessUnit?.name || data.businessUnit?.code || BUSINESS_UNIT,
        data.warehouse?.name || data.warehouse?.code || WAREHOUSE,
      ].join(" / ")
    : "Suministros Criticos EIRL / Botica Premium / Almacen principal";

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-6 md:px-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="rounded-2xl bg-white p-5 shadow-sm">
          <nav className="mb-3 flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-500">
            <Link to="/home" className="hover:text-cyan-700">
              Plataforma
            </Link>
            <span>/</span>
            <span className="text-slate-900">Facturacion SUNAT</span>
          </nav>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase text-cyan-700">
                Configuracion fiscal
              </p>
              <h1 className="text-3xl font-bold text-slate-900">
                Facturacion SUNAT
              </h1>
              <p className="mt-2 text-sm text-slate-600">
                Contexto operativo: {context}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={loadReadiness}
                className="rounded-lg border px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                Actualizar estado
              </button>
              <Link
                to="/pharmacy/sales/new"
                className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-bold text-white hover:bg-slate-900"
              >
                Ir a ventas
              </Link>
            </div>
          </div>
        </header>

        {saleFromPos && (
          <section className="rounded-2xl border border-emerald-300 bg-emerald-50 p-5 text-emerald-950 shadow-sm">
            <p className="text-xs font-bold uppercase text-emerald-700">
              Venta recibida desde caja
            </p>
            <h2 className="mt-1 text-xl font-bold">
              Venta lista para emitir comprobante
            </h2>
            <p className="mt-2 text-sm">
              {sourceSaleNumber ? "Venta " + sourceSaleNumber + ". " : ""}
              Primero verifique la identidad del comprador. Luego use Ventas
              pendientes de comprobante, que esta justo debajo.
            </p>
            <ol className="mt-3 grid gap-2 text-sm font-semibold md:grid-cols-3">
              <li className="rounded-lg bg-white p-3">1. Validar DNI o RUC</li>
              <li className="rounded-lg bg-white p-3">2. Confirmar cliente</li>
              <li className="rounded-lg bg-white p-3">3. Crear comprobante</li>
            </ol>
          </section>
        )}
        <section className="rounded-2xl border border-cyan-300 bg-cyan-50 p-5 shadow-sm">
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase text-cyan-700">
                Paso 1
              </p>
              <h2 className="text-xl font-bold text-slate-900">
                Verificacion de identidad del comprador
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Paso 1. Valide el documento antes de emitir boleta o factura. La
                confirmacion externa con SUNAT/RENIEC requiere proveedor
                configurado en backend. Orden recomendado: verifique comprador,
                registre cliente si falta, luego emita desde ventas pendientes.
                Importante: verificar aqui un RUC no cambia una venta ya creada;
                para factura, la venta debe estar asociada a comprador con RUC.
              </p>
            </div>
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
              Integracion externa pendiente
            </span>
          </div>

          <form
            onSubmit={handleIdentityCheck}
            className="mt-4 grid gap-3 lg:grid-cols-[160px_1fr_1fr_auto]"
          >
            <label className="text-sm font-semibold text-slate-700">
              Documento
              <select
                value={identityDocumentType}
                onChange={(event) =>
                  setIdentityDocumentType(
                    event.target.value as IdentityDocumentType,
                  )
                }
                className="mt-1 w-full rounded-lg border p-2"
              >
                <option value="DNI">DNI</option>
                <option value="RUC">RUC</option>
                <option value="CE">Carnet extranjeria</option>
                <option value="PASSPORT">Pasaporte</option>
                <option value="OTHER">Otro</option>
              </select>
            </label>
            <label className="text-sm font-semibold text-slate-700">
              Numero
              <input
                value={identityDocumentNumber}
                onChange={(event) =>
                  setIdentityDocumentNumber(event.target.value)
                }
                className="mt-1 w-full rounded-lg border p-2"
                placeholder={
                  identityDocumentType === "RUC"
                    ? "11 digitos"
                    : identityDocumentType === "DNI"
                      ? "8 digitos"
                      : "Numero de documento"
                }
              />
            </label>
            <label className="text-sm font-semibold text-slate-700">
              Nombre o razon social
              <input
                value={identityName}
                onChange={(event) => setIdentityName(event.target.value)}
                className="mt-1 w-full rounded-lg border p-2"
                placeholder="Se completara con proveedor oficial"
              />
            </label>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={identityChecking}
                className="w-full rounded-lg bg-cyan-700 px-4 py-2 text-sm font-bold text-white hover:bg-cyan-800 disabled:opacity-60"
              >
                {identityChecking ? "Verificando..." : "Verificar"}
              </button>
            </div>
          </form>

          <div
            className={
              "mt-4 rounded-lg border p-3 text-sm " +
              (identityResult.status === "invalid"
                ? "border-red-200 bg-red-50 text-red-800"
                : identityResult.status === "provider-pending"
                  ? "border-amber-200 bg-amber-50 text-amber-900"
                  : "border-emerald-200 bg-emerald-50 text-emerald-900")
            }
          >
            <p className="font-bold">{identityResult.title}</p>
            <p className="mt-1">{identityResult.detail}</p>
          </div>
        </section>

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

        {loading ? (
          <section className="rounded-2xl bg-white p-6 text-slate-600 shadow-sm">
            Cargando preparacion fiscal...
          </section>
        ) : (
          <>
            <section className="rounded-2xl border border-emerald-300 bg-emerald-50 p-5 shadow-sm">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    Ventas pendientes de comprobante
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Paso 2. Seleccione una venta y prepare boleta o factura. La
                    factura solo se activa si esa venta ya tiene comprador con
                    RUC asociado. Al preparar una boleta o factura, la venta
                    sale de esta lista y aparece en Comprobantes borrador.
                  </p>
                  <div className="mt-3 rounded-lg border border-cyan-100 bg-cyan-50 p-3 text-sm text-cyan-900">
                    <p className="font-bold">Guia rapida de emision</p>
                    <p className="mt-1">
                      Una venta solo puede tener un comprobante preparado. Si ya
                      genero boleta o factura, busquela arriba en Comprobantes
                      borrador.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={loadPendingSales}
                  className="rounded-lg border px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  Actualizar ventas
                </button>
              </div>

              <div className="mt-4 overflow-hidden rounded-xl border">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-bold uppercase text-slate-500">
                    <tr>
                      <th className="px-3 py-2">Venta</th>
                      <th className="px-3 py-2">Cliente</th>
                      <th className="px-3 py-2">Productos</th>
                      <th className="px-3 py-2 text-right">Total</th>
                      <th className="px-3 py-2 text-right">Accion</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {pendingSales.length === 0 ? (
                      <tr>
                        <td className="px-3 py-4 text-slate-500" colSpan={5}>
                          No hay ventas pendientes de comprobante.
                        </td>
                      </tr>
                    ) : (
                      pendingSales.map((sale) => (
                        <tr key={sale.id}>
                          <td className="px-3 py-2">
                            <p className="font-semibold text-slate-800">
                              {sale.saleNumber}
                            </p>
                            <p className="text-xs text-slate-500">
                              {new Date(sale.createdAt).toLocaleString("es-PE")}
                            </p>
                          </td>
                          <td className="px-3 py-2 text-slate-700">
                            <p>
                              {sale.customerName || "Cliente no registrado"}
                            </p>
                            <p className="text-xs text-slate-500">
                              {sale.customerDocumentType
                                ? sale.customerDocumentType +
                                  " " +
                                  (sale.customerDocumentNumber || "")
                                : "Sin documento"}
                            </p>
                          </td>
                          <td className="px-3 py-2 text-slate-600">
                            {(sale.items || []).length === 0
                              ? "-"
                              : (sale.items || [])
                                  .map((item) => item.productName)
                                  .join(", ")}
                          </td>
                          <td className="px-3 py-2 text-right font-bold text-slate-900">
                            {sale.currency || "PEN"}{" "}
                            {Number(sale.total).toFixed(2)}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <div className="flex flex-wrap justify-end gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  createDraftDocument(sale.id, "BOLETA")
                                }
                                disabled={
                                  documentSaving === sale.id + ":BOLETA"
                                }
                                className="rounded-lg border px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                              >
                                {documentSaving === sale.id + ":BOLETA"
                                  ? "Preparando..."
                                  : "Boleta"}
                              </button>
                              <p className="mt-1 text-xs text-slate-500">
                                Boleta: para DNI, cliente varios o venta menor.
                              </p>
                              <button
                                type="button"
                                onClick={() =>
                                  createDraftDocument(sale.id, "FACTURA")
                                }
                                disabled={
                                  sale.customerDocumentType !== "RUC" ||
                                  !sale.customerDocumentNumber ||
                                  documentSaving === sale.id + ":FACTURA"
                                }
                                title={
                                  sale.customerDocumentType === "RUC" &&
                                  sale.customerDocumentNumber
                                    ? "Preparar factura"
                                    : "Factura requiere cliente con RUC"
                                }
                                className={
                                  "rounded-lg px-3 py-1.5 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-60 " +
                                  (sale.customerDocumentType === "RUC" &&
                                  sale.customerDocumentNumber
                                    ? "bg-slate-900 hover:bg-slate-800"
                                    : "bg-slate-300")
                                }
                              >
                                {documentSaving === sale.id + ":FACTURA"
                                  ? "Preparando..."
                                  : "Factura"}
                              </button>
                              {sale.customerDocumentType !== "RUC" && (
                                <p className="mt-1 text-xs font-semibold text-amber-700">
                                  Factura requiere que esta venta tenga RUC
                                  asociado. Use Boleta para DNI o cliente sin
                                  RUC.
                                </p>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <p className="mt-4 rounded-lg bg-cyan-50 p-3 text-sm font-semibold text-cyan-900">
                Total pendientes: {pendingSalesTotal}. En esta fase solo se
                listan ventas; preparar boleta/factura interna sera el siguiente
                paso.
              </p>
            </section>

            <section className="rounded-2xl border border-violet-300 bg-violet-50 p-5 shadow-sm">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    Comprobantes borrador
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Paso 3. Revise aqui las boletas y facturas DRAFT preparadas
                    antes de generar XML, firma digital o envio SUNAT. DRAFT
                    significa borrador interno: aun no fue enviado ni aceptado
                    por SUNAT.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={loadDraftDocuments}
                  className="rounded-lg border px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  Actualizar borradores
                </button>
              </div>

              <div className="mt-4 overflow-hidden rounded-xl border">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-bold uppercase text-slate-500">
                    <tr>
                      <th className="px-3 py-2">Comprobante</th>
                      <th className="px-3 py-2">Venta</th>
                      <th className="px-3 py-2">Cliente</th>
                      <th className="px-3 py-2 text-right">IGV</th>
                      <th className="px-3 py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {draftDocuments.length === 0 ? (
                      <tr>
                        <td className="px-3 py-4 text-slate-500" colSpan={5}>
                          No hay comprobantes borrador.
                        </td>
                      </tr>
                    ) : (
                      draftDocuments.map((document) => (
                        <tr key={document.id}>
                          <td className="px-3 py-2">
                            <p className="font-semibold text-slate-800">
                              {document.fullNumber}
                            </p>
                            <p className="text-xs text-slate-500">
                              {document.documentType} / {document.status}
                            </p>
                          </td>
                          <td className="px-3 py-2 text-slate-700">
                            {document.sale?.saleNumber || "-"}
                          </td>
                          <td className="px-3 py-2 text-slate-700">
                            <p>
                              {document.customerName || "Cliente no registrado"}
                            </p>
                            <p className="text-xs text-slate-500">
                              {document.customerDocumentType
                                ? document.customerDocumentType +
                                  " " +
                                  (document.customerDocumentNumber || "")
                                : "Sin documento"}
                            </p>
                          </td>
                          <td className="px-3 py-2 text-right text-slate-700">
                            {Number(document.igvTotal).toFixed(2)}
                          </td>
                          <td className="px-3 py-2 text-right font-bold text-slate-900">
                            {document.currency || "PEN"}{" "}
                            {Number(document.total).toFixed(2)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm font-semibold text-amber-900">
                Total borradores: {draftDocumentsTotal}. Estos documentos aun no
                son comprobantes SUNAT aceptados.
              </p>
            </section>

            <section className="rounded-2xl border border-amber-300 bg-amber-50 p-5 shadow-sm">
              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    Clientes comerciales
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Registra clientes para boletas y facturas. Para factura, el
                    cliente debe ser empresa con RUC valido.
                  </p>
                </div>
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    void loadCustomers(customerQuery);
                  }}
                  className="flex gap-2"
                >
                  <input
                    value={customerQuery}
                    onChange={(event) => setCustomerQuery(event.target.value)}
                    className="h-10 w-56 rounded-lg border px-3 text-sm"
                    placeholder="Buscar DNI, RUC o nombre"
                  />
                  <button
                    type="submit"
                    className="rounded-lg border px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                  >
                    Buscar
                  </button>
                </form>
              </div>

              <form
                onSubmit={saveCustomer}
                className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4"
              >
                <Field label="Tipo de cliente">
                  <select
                    value={customerForm.customerType}
                    onChange={(event) => {
                      const value = event.target
                        .value as CustomerForm["customerType"];
                      setCustomerForm({
                        ...customerForm,
                        customerType: value,
                        documentType: value === "LEGAL_ENTITY" ? "RUC" : "DNI",
                      });
                    }}
                    className="h-10 w-full rounded-lg border px-3 text-sm"
                  >
                    <option value="NATURAL_PERSON">Persona natural</option>
                    <option value="LEGAL_ENTITY">Empresa</option>
                  </select>
                </Field>
                <Field label="Documento">
                  <select
                    value={customerForm.documentType}
                    onChange={(event) =>
                      setCustomerForm({
                        ...customerForm,
                        documentType: event.target
                          .value as CustomerForm["documentType"],
                      })
                    }
                    className="h-10 w-full rounded-lg border px-3 text-sm"
                  >
                    <option value="DNI">DNI</option>
                    <option value="RUC">RUC</option>
                  </select>
                </Field>
                <Field label="Numero">
                  <input
                    required
                    value={customerForm.documentNumber}
                    onChange={(event) =>
                      setCustomerForm({
                        ...customerForm,
                        documentNumber: event.target.value,
                      })
                    }
                    maxLength={20}
                    className="h-10 w-full rounded-lg border px-3 text-sm"
                    placeholder="DNI o RUC"
                  />
                </Field>
                <Field label="Nombre visible">
                  <input
                    required
                    value={customerForm.displayName}
                    onChange={(event) =>
                      setCustomerForm({
                        ...customerForm,
                        displayName: event.target.value,
                      })
                    }
                    maxLength={200}
                    className="h-10 w-full rounded-lg border px-3 text-sm"
                    placeholder="Nombre o razon social"
                  />
                </Field>
                <Field label="Razon social">
                  <input
                    value={customerForm.legalName}
                    onChange={(event) =>
                      setCustomerForm({
                        ...customerForm,
                        legalName: event.target.value,
                      })
                    }
                    maxLength={200}
                    className="h-10 w-full rounded-lg border px-3 text-sm"
                    placeholder="Obligatoria para RUC"
                  />
                </Field>
                <Field label="Correo">
                  <input
                    type="email"
                    value={customerForm.email}
                    onChange={(event) =>
                      setCustomerForm({
                        ...customerForm,
                        email: event.target.value,
                      })
                    }
                    maxLength={180}
                    className="h-10 w-full rounded-lg border px-3 text-sm"
                    placeholder="cliente@correo.com"
                  />
                </Field>
                <Field label="Telefono">
                  <input
                    value={customerForm.phone}
                    onChange={(event) =>
                      setCustomerForm({
                        ...customerForm,
                        phone: event.target.value,
                      })
                    }
                    maxLength={30}
                    className="h-10 w-full rounded-lg border px-3 text-sm"
                    placeholder="Celular o telefono"
                  />
                </Field>
                <Field label="Direccion">
                  <input
                    value={customerForm.address}
                    onChange={(event) =>
                      setCustomerForm({
                        ...customerForm,
                        address: event.target.value,
                      })
                    }
                    maxLength={255}
                    className="h-10 w-full rounded-lg border px-3 text-sm"
                    placeholder="Direccion fiscal o de contacto"
                  />
                </Field>
                <label className="flex items-center gap-3 rounded-lg border bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-800 xl:col-span-2">
                  <input
                    type="checkbox"
                    checked={customerForm.electronicDeliveryConsent}
                    onChange={(event) =>
                      setCustomerForm({
                        ...customerForm,
                        electronicDeliveryConsent: event.target.checked,
                      })
                    }
                    className="h-4 w-4"
                  />
                  Autoriza envio electronico por correo o mensajeria
                </label>
                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={customerSaving}
                    className="h-10 rounded-lg bg-cyan-700 px-4 text-sm font-bold text-white hover:bg-cyan-800 disabled:opacity-60"
                  >
                    {customerSaving ? "Guardando..." : "Guardar cliente"}
                  </button>
                </div>
              </form>

              <div className="mt-5 overflow-hidden rounded-xl border">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-bold uppercase text-slate-500">
                    <tr>
                      <th className="px-3 py-2">Documento</th>
                      <th className="px-3 py-2">Cliente</th>
                      <th className="px-3 py-2">Contacto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {customers.length === 0 ? (
                      <tr>
                        <td className="px-3 py-4 text-slate-500" colSpan={3}>
                          Sin clientes comerciales registrados.
                        </td>
                      </tr>
                    ) : (
                      customers.map((customer) => (
                        <tr key={customer.id}>
                          <td className="px-3 py-2 font-semibold text-slate-800">
                            {customer.documentType} {customer.documentNumber}
                          </td>
                          <td className="px-3 py-2 text-slate-700">
                            {customer.displayName}
                          </td>
                          <td className="px-3 py-2 text-slate-600">
                            {customer.email || customer.phone || "-"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm font-semibold text-amber-900">
                Advertencia: para emitir factura se usara cliente con RUC
                valido. Para boletas de montos altos, el sistema pedira
                identificacion del cliente segun reglas SUNAT.
              </p>
            </section>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatusCard
                title="Perfil fiscal"
                value={statusText(data?.readiness?.profileReady)}
                detail={
                  data?.fiscalProfile?.fiscalAddress ||
                  "Direccion fiscal pendiente"
                }
                ready={data?.readiness?.profileReady}
              />
              <StatusCard
                title="Serie boleta"
                value={boletaSequence ? boletaSequence.series : "Pendiente"}
                detail={
                  boletaSequence
                    ? "Correlativo actual: " + boletaSequence.currentNumber
                    : "Crear serie B001"
                }
                ready={Boolean(boletaSequence)}
              />
              <StatusCard
                title="Serie factura"
                value={facturaSequence ? facturaSequence.series : "Pendiente"}
                detail={
                  facturaSequence
                    ? "Correlativo actual: " + facturaSequence.currentNumber
                    : "Crear serie F001"
                }
                ready={Boolean(facturaSequence)}
              />
              <StatusCard
                title="Catalogo fiscal"
                value={statusText(data?.catalog?.ready)}
                detail={
                  (data?.catalog?.missingFiscalConfiguration || 0) +
                  " producto(s) sin configuracion fiscal"
                }
                ready={data?.catalog?.ready}
              />
            </section>

            <section className="rounded-2xl bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    Series fiscales
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Configura las series iniciales para emitir boletas y
                    facturas desde ventas cuando el modulo de comprobantes este
                    listo.
                  </p>
                </div>
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <SequencePanel
                  title="Boleta electronica"
                  expectedSeries="B001"
                  sequence={boletaSequence}
                  saving={sequenceSaving === "BOLETA"}
                  onCreate={() => createSequence("BOLETA")}
                />
                <SequencePanel
                  title="Factura electronica"
                  expectedSeries="F001"
                  sequence={facturaSequence}
                  saving={sequenceSaving === "FACTURA"}
                  onCreate={() => createSequence("FACTURA")}
                />
              </div>
              <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm font-semibold text-amber-900">
                Advertencia: una vez usada una serie, su numeracion no debe
                reiniciarse ni modificarse sin control administrativo y
                auditoria.
              </p>
            </section>

            <section className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <h2 className="text-xl font-bold text-slate-900">
                  Datos fiscales de la empresa emisora
                </h2>
                <dl className="mt-4 grid gap-3 text-sm md:grid-cols-2">
                  <Info
                    label="Empresa"
                    value={data?.company?.legalName || "-"}
                  />
                  <Info label="RUC" value={data?.company?.ruc || "-"} />
                  <Info
                    label="Unidad"
                    value={data?.businessUnit?.name || BUSINESS_UNIT}
                  />
                  <Info
                    label="Almacen"
                    value={data?.warehouse?.name || WAREHOUSE}
                  />
                  <Info
                    label="Proveedor"
                    value={data?.fiscalProfile?.provider || "NONE"}
                  />
                  <Info
                    label="Ambiente"
                    value={data?.fiscalProfile?.environment || "BETA"}
                  />
                  <Info
                    label="Credenciales"
                    value={
                      data?.fiscalProfile?.credentialConfigured
                        ? "Referencia registrada"
                        : "Pendiente"
                    }
                  />
                  <Info
                    label="Certificado"
                    value={
                      data?.fiscalProfile?.certificateConfigured
                        ? "Referencia registrada"
                        : "Pendiente"
                    }
                  />
                  <Info
                    label="Vence certificado"
                    value={formatDate(
                      data?.fiscalProfile?.certificateExpiresAt,
                    )}
                  />
                  <Info
                    label="Perfil activo"
                    value={data?.fiscalProfile?.active ? "Si" : "No"}
                  />
                </dl>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                <h2 className="text-xl font-bold text-amber-950">
                  Reglas para evitar errores
                </h2>
                <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-amber-950">
                  <li>No emitir factura si el cliente no tiene RUC valido.</li>
                  <li>Crear serie B001 para boletas y F001 para facturas.</li>
                  <li>No activar produccion sin validar primero en beta.</li>
                  <li>No escribir claves SOL reales en este formulario.</li>
                  <li>
                    Completar unidad SUNAT, afectacion IGV y tasa en productos.
                  </li>
                </ul>
              </div>
            </section>

            <form
              onSubmit={saveFiscalProfile}
              className="rounded-2xl bg-white p-5 shadow-sm"
            >
              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    Editar perfil fiscal
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Guarda los datos fiscales de la empresa emisora. Esta fase
                    no envia a SUNAT ni firma comprobantes.
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-cyan-700 px-4 py-2 text-sm font-bold text-white hover:bg-cyan-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Guardando..." : "Guardar perfil fiscal"}
                </button>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <Field label="Direccion fiscal" className="xl:col-span-2">
                  <input
                    required
                    minLength={3}
                    maxLength={255}
                    value={form.fiscalAddress}
                    onChange={(event) =>
                      setForm({ ...form, fiscalAddress: event.target.value })
                    }
                    className="h-10 w-full rounded-lg border px-3 text-sm"
                    placeholder="Direccion fiscal segun ficha RUC"
                  />
                </Field>

                <Field label="Ubigeo">
                  <input
                    value={form.ubigeo}
                    onChange={(event) =>
                      setForm({ ...form, ubigeo: event.target.value })
                    }
                    pattern="\d{6}"
                    maxLength={6}
                    className="h-10 w-full rounded-lg border px-3 text-sm"
                    placeholder="040101"
                  />
                </Field>

                <Field label="Departamento">
                  <select
                    value={form.department}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        department: event.target.value,
                        province: "",
                      })
                    }
                    className="h-10 w-full rounded-lg border px-3 text-sm"
                  >
                    <option value="">Seleccionar departamento</option>
                    {Object.keys(PERU_DEPARTMENTS).map((department) => (
                      <option
                        key={department}
                        value={department.replace(/_/g, " ")}
                      >
                        {department.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Provincia">
                  <select
                    value={form.province}
                    onChange={(event) =>
                      setForm({ ...form, province: event.target.value })
                    }
                    className="h-10 w-full rounded-lg border px-3 text-sm"
                    disabled={!form.department}
                  >
                    <option value="">
                      {form.department
                        ? "Seleccionar provincia"
                        : "Seleccione primero departamento"}
                    </option>
                    {selectedProvinces.map((province) => (
                      <option key={province} value={province}>
                        {province}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Distrito">
                  <input
                    value={form.district}
                    onChange={(event) =>
                      setForm({ ...form, district: event.target.value })
                    }
                    maxLength={100}
                    className="h-10 w-full rounded-lg border px-3 text-sm"
                    placeholder="JOSE LUIS BUSTAMANTE Y RIVERO"
                  />
                </Field>

                <Field label="Pais">
                  <input
                    list="billing-country-options"
                    value={form.countryCode}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        countryCode: event.target.value.toUpperCase(),
                      })
                    }
                    maxLength={2}
                    className="h-10 w-full rounded-lg border px-3 text-sm"
                    placeholder="PE"
                  />
                  <datalist id="billing-country-options">
                    {COUNTRIES.map((country) => (
                      <option
                        key={country.code}
                        value={country.code}
                        label={country.name}
                      />
                    ))}
                  </datalist>
                </Field>

                <Field label="Proveedor electronico">
                  <select
                    value={form.provider}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        provider: event.target
                          .value as FiscalProfileForm["provider"],
                      })
                    }
                    className="h-10 w-full rounded-lg border px-3 text-sm"
                  >
                    <option value="NONE">Ninguno por ahora</option>
                    <option value="SUNAT_DIRECT">SUNAT directo</option>
                    <option value="PSE">PSE</option>
                    <option value="OSE">OSE</option>
                  </select>
                </Field>

                <Field label="Ambiente">
                  <select
                    value={form.environment}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        environment: event.target
                          .value as FiscalProfileForm["environment"],
                      })
                    }
                    className="h-10 w-full rounded-lg border px-3 text-sm"
                  >
                    <option value="BETA">Beta / pruebas</option>
                    <option value="PRODUCTION">Produccion</option>
                  </select>
                </Field>

                <Field label="Referencia de credenciales">
                  <input
                    value={form.credentialSecretRef}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        credentialSecretRef: event.target.value,
                      })
                    }
                    maxLength={255}
                    className="h-10 w-full rounded-lg border px-3 text-sm"
                    placeholder="Ej. vault/sunat/botica/sol"
                  />
                </Field>

                <Field label="Referencia de certificado">
                  <input
                    value={form.certificateSecretRef}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        certificateSecretRef: event.target.value,
                      })
                    }
                    maxLength={255}
                    className="h-10 w-full rounded-lg border px-3 text-sm"
                    placeholder="Ej. vault/sunat/botica/certificado"
                  />
                </Field>

                <Field label="Vencimiento de certificado">
                  <input
                    type="date"
                    value={form.certificateExpiresAt}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        certificateExpiresAt: event.target.value,
                      })
                    }
                    className="h-10 w-full rounded-lg border px-3 text-sm"
                  />
                </Field>

                <label className="flex items-center gap-3 rounded-lg border bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-800">
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(event) =>
                      setForm({ ...form, active: event.target.checked })
                    }
                    className="h-4 w-4"
                  />
                  Perfil fiscal activo
                </label>
              </div>

              <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                Para manual/video: primero verificar RUC y direccion fiscal,
                luego guardar el perfil inactivo, despues configurar series y
                finalmente activar credenciales/certificado cuando exista el
                modulo de envio real.
              </p>
            </form>

            <section className="rounded-2xl bg-white p-5 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900">
                Flujo de capacitacion
              </h2>
              <div className="mt-4 grid gap-3 md:grid-cols-5">
                <Step number="1" text="Verificar empresa/RUC" />
                <Step number="2" text="Completar perfil fiscal" />
                <Step number="3" text="Crear series" />
                <Step number="4" text="Revisar catalogo" />
                <Step number="5" text="Emitir desde venta" />
              </div>
              <p className="mt-4 rounded-lg bg-cyan-50 p-3 text-sm font-semibold text-cyan-900">
                En esta etapa HCELM solo prepara la base fiscal. El envio real,
                XML, firma y CDR se implementaran despues.
              </p>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

function SequencePanel({
  title,
  expectedSeries,
  sequence,
  saving,
  onCreate,
}: {
  title: string;
  expectedSeries: string;
  sequence?: Sequence;
  saving: boolean;
  onCreate: () => void;
}) {
  const configured = Boolean(sequence);
  return (
    <div className="rounded-xl border bg-slate-50 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-bold text-slate-900">{title}</p>
          <p className="mt-1 text-sm text-slate-600">
            Serie esperada: <span className="font-bold">{expectedSeries}</span>
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Estado:{" "}
            <span
              className={
                configured
                  ? "font-bold text-emerald-700"
                  : "font-bold text-amber-700"
              }
            >
              {configured ? "Configurada" : "Pendiente"}
            </span>
          </p>
          {sequence && (
            <p className="mt-1 text-sm text-slate-600">
              Correlativo actual: {sequence.currentNumber}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onCreate}
          disabled={configured || saving}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {configured
            ? "Creada"
            : saving
              ? "Creando..."
              : "Crear " + expectedSeries}
        </button>
      </div>
    </div>
  );
}

function StatusCard({
  title,
  value,
  detail,
  ready,
}: {
  title: string;
  value: string;
  detail: string;
  ready?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold text-slate-500">{title}</p>
      <p
        className={
          "mt-2 text-2xl font-bold " +
          (ready ? "text-emerald-700" : "text-amber-700")
        }
      >
        {value}
      </p>
      <p className="mt-2 text-sm text-slate-600">{detail}</p>
    </div>
  );
}

function Field({
  label,
  className = "",
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={"block text-sm " + className}>
      <span className="mb-1 block font-bold text-slate-700">{label}</span>
      {children}
    </label>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-slate-50 p-3">
      <dt className="text-xs font-bold uppercase text-slate-500">{label}</dt>
      <dd className="mt-1 font-semibold text-slate-900">{value}</dd>
    </div>
  );
}

function Step({ number, text }: { number: string; text: string }) {
  return (
    <div className="rounded-xl border bg-slate-50 p-4 text-sm">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 font-bold text-white">
        {number}
      </div>
      <p className="mt-3 font-bold text-slate-800">{text}</p>
    </div>
  );
}
