import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { Link } from "react-router-dom";

const API_URL = "http://localhost:3000/api";

type Company = {
  id: string;
  code: string;
  legalName: string;
  tradeName?: string | null;
  ruc: string;
  active: boolean;
  isDefault: boolean;
};
type BusinessUnit = {
  id: string;
  companyId: string;
  code: string;
  name: string;
  type: string;
  active: boolean;
};
type Warehouse = {
  id: string;
  companyId: string;
  businessUnitId: string;
  code: string;
  name: string;
  active: boolean;
};
type Installation = {
  id: string;
  companyId: string;
  businessUnitId: string;
  warehouseId?: string | null;
  moduleKey: string;
  displayName?: string | null;
  active: boolean;
};
type Collaboration = {
  id: string;
  ownerCompanyId: string;
  partnerCompanyId: string;
  sourceBusinessUnitId?: string | null;
  targetBusinessUnitId?: string | null;
  resource: string;
  direction: string;
  status: string;
  requiresPatientConsent: boolean;
  shareMinimumClinicalData: boolean;
};
type CollaborationDraft = Omit<Collaboration, "id">;
type Structure = {
  companies: Company[];
  businessUnits: BusinessUnit[];
  warehouses: Warehouse[];
  installations: Installation[];
  collaborations: Collaboration[];
};

const MODULES = [
  "CLINICAL",
  "PHARMACY",
  "DRUGSTORE",
  "BILLING",
  "CASHBOX",
  "MANAGEMENT",
  "LABORATORY",
  "IMAGING",
];
const RESOURCES = [
  "PRESCRIPTION_REFERRAL",
  "DISPENSING",
  "STOCK_VISIBILITY",
  "RESERVATION",
  "PURCHASE_TRANSFER",
  "REPORTING",
];
const MODULE_LABELS: Record<string, string> = {
  CLINICAL: "Atención clínica",
  PHARMACY: "Botica / Farmacia",
  DRUGSTORE: "Droguería",
  BILLING: "Facturación",
  CASHBOX: "Caja",
  MANAGEMENT: "Gerencia",
  LABORATORY: "Laboratorio",
  IMAGING: "Imágenes",
};
const RESOURCE_LABELS: Record<string, string> = {
  PRESCRIPTION_REFERRAL: "Derivación de recetas",
  DISPENSING: "Dispensación",
  STOCK_VISIBILITY: "Consulta de disponibilidad",
  RESERVATION: "Reserva de productos",
  PURCHASE_TRANSFER: "Compra o transferencia",
  REPORTING: "Reportes autorizados",
};
const DIRECTION_LABELS: Record<string, string> = {
  ONE_WAY: "Una vía",
  TWO_WAY: "Ambas vías",
};
const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Borrador",
  ACTIVE: "Activo",
  SUSPENDED: "Suspendido",
  REVOKED: "Revocado",
  EXPIRED: "Vencido",
};
const UNIT_TYPE_LABELS: Record<string, string> = {
  CONSULTORIO: "Consultorio",
  CLINICAL: "Consultorio",
  BOTICA: "Botica",
  FARMACIA: "Farmacia",
  PHARMACY: "Botica / Farmacia",
  DROGUERIA: "Droguería",
  DRUGSTORE: "Droguería",
  LABORATORIO: "Laboratorio",
  CENTRO_IMAGENES: "Centro de imágenes",
  OTRO: "Otro",
};
const OPTION_LABELS: Record<string, string> = {
  ...MODULE_LABELS,
  ...RESOURCE_LABELS,
  ...DIRECTION_LABELS,
  ...STATUS_LABELS,
  ...UNIT_TYPE_LABELS,
};
const EMPTY_STRUCTURE: Structure = {
  companies: [],
  businessUnits: [],
  warehouses: [],
  installations: [],
  collaborations: [],
};

function authHeaders() {
  return {
    Authorization: "Bearer " + (sessionStorage.getItem("ame_token") || ""),
    "Content-Type": "application/json",
  };
}
async function readError(response: Response) {
  const data = await response.json().catch(() => null);
  const message = data?.message;
  return Array.isArray(message)
    ? message.join(" ")
    : message || "No se pudo completar la operación.";
}
function companyLabel(company?: Company) {
  return company ? company.legalName : "Empresa no encontrada";
}
function unitLabel(unit?: BusinessUnit) {
  return unit ? unit.name : "Unidad no encontrada";
}
function warehouseLabel(warehouse?: Warehouse | null) {
  return warehouse ? warehouse.name : "Sin almacén predeterminado";
}
function activeText(active: boolean) {
  return active ? "Activa" : "Inactiva";
}

export default function OrganizationAdministration() {
  const [data, setData] = useState<Structure>(EMPTY_STRUCTURE);
  const [tab, setTab] = useState("map");
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [selectedUnitId, setSelectedUnitId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [editingCompanyId, setEditingCompanyId] = useState("");
  const [editingUnitId, setEditingUnitId] = useState("");
  const [editingWarehouseId, setEditingWarehouseId] = useState("");
  const [editingModuleId, setEditingModuleId] = useState("");
  const [editingCollaborationId, setEditingCollaborationId] = useState("");

  const emptyCompany = { code: "", legalName: "", tradeName: "", ruc: "" };
  const emptyUnit = { code: "", name: "", type: "BOTICA" };
  const emptyWarehouse = { code: "PRINCIPAL", name: "Almacén principal" };
  const emptyModule = {
    moduleKey: "PHARMACY",
    displayName: "",
    warehouseId: "",
  };
  const emptyCollaboration: CollaborationDraft = {
    ownerCompanyId: "",
    partnerCompanyId: "",
    sourceBusinessUnitId: "",
    targetBusinessUnitId: "",
    resource: "PRESCRIPTION_REFERRAL",
    direction: "ONE_WAY",
    status: "DRAFT",
    requiresPatientConsent: true,
    shareMinimumClinicalData: true,
  };

  const [companyForm, setCompanyForm] = useState(emptyCompany);
  const [unitForm, setUnitForm] = useState(emptyUnit);
  const [warehouseForm, setWarehouseForm] = useState(emptyWarehouse);
  const [moduleForm, setModuleForm] = useState(emptyModule);
  const [collaborationForm, setCollaborationForm] =
    useState<CollaborationDraft>(emptyCollaboration);

  const selectedCompany = useMemo(
    () => data.companies.find((company) => company.id === selectedCompanyId),
    [data.companies, selectedCompanyId],
  );
  const selectedUnit = useMemo(
    () => data.businessUnits.find((unit) => unit.id === selectedUnitId),
    [data.businessUnits, selectedUnitId],
  );
  const companyUnits = useMemo(
    () =>
      data.businessUnits.filter((unit) => unit.companyId === selectedCompanyId),
    [data.businessUnits, selectedCompanyId],
  );
  const unitWarehouses = useMemo(
    () =>
      data.warehouses.filter(
        (warehouse) => warehouse.businessUnitId === selectedUnitId,
      ),
    [data.warehouses, selectedUnitId],
  );
  const selectedWarehouse = useMemo(
    () =>
      data.warehouses.find(
        (warehouse) => warehouse.id === moduleForm.warehouseId,
      ),
    [data.warehouses, moduleForm.warehouseId],
  );

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(API_URL + "/organization", {
        headers: authHeaders(),
      });
      if (!response.ok) throw new Error(await readError(response));
      const next = (await response.json()) as Structure;
      setData(next);
      const nextCompanyId = next.companies.some(
        (company) => company.id === selectedCompanyId,
      )
        ? selectedCompanyId
        : next.companies[0]?.id || "";
      setSelectedCompanyId(nextCompanyId);
      const nextUnits = next.businessUnits.filter(
        (unit) => unit.companyId === nextCompanyId,
      );
      setSelectedUnitId((current) =>
        nextUnits.some((unit) => unit.id === current)
          ? current
          : nextUnits[0]?.id || "",
      );
      setCollaborationForm((current) => {
        const ownerCompanyId = next.companies.some(
          (company) => company.id === current.ownerCompanyId,
        )
          ? current.ownerCompanyId
          : next.companies[0]?.id || "";
        const partnerCompanyId = next.companies.some(
          (company) =>
            company.id === current.partnerCompanyId &&
            company.id !== ownerCompanyId,
        )
          ? current.partnerCompanyId
          : next.companies.find((company) => company.id !== ownerCompanyId)
              ?.id || "";
        return { ...current, ownerCompanyId, partnerCompanyId };
      });
    } catch (reason: any) {
      setError(reason?.message || "No se pudo cargar la organización.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    const units = data.businessUnits.filter(
      (unit) => unit.companyId === selectedCompanyId,
    );
    setSelectedUnitId((current) =>
      units.some((unit) => unit.id === current) ? current : units[0]?.id || "",
    );
  }, [data.businessUnits, selectedCompanyId]);

  useEffect(() => {
    const warehouses = data.warehouses.filter(
      (warehouse) => warehouse.businessUnitId === selectedUnitId,
    );
    setModuleForm((current) => ({
      ...current,
      warehouseId: warehouses.some(
        (warehouse) => warehouse.id === current.warehouseId,
      )
        ? current.warehouseId
        : warehouses[0]?.id || "",
    }));
  }, [data.warehouses, selectedUnitId]);

  async function send(
    url: string,
    method: string,
    body: unknown,
    message: string,
  ) {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch(API_URL + url, {
        method,
        headers: authHeaders(),
        body: method === "DELETE" ? undefined : JSON.stringify(body),
      });
      if (!response.ok) throw new Error(await readError(response));
      setSuccess(message);
      await load();
      return true;
    } catch (reason: any) {
      setError(reason?.message || "No se pudo guardar.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function saveCompany(event: FormEvent) {
    event.preventDefault();
    const saved = editingCompanyId
      ? await send(
          "/organization/companies/" + editingCompanyId,
          "PATCH",
          companyForm,
          "Empresa actualizada correctamente.",
        )
      : await send(
          "/organization/companies",
          "POST",
          companyForm,
          "Empresa registrada correctamente.",
        );
    if (saved) cancelCompanyEdit();
  }
  function editCompany(company: Company) {
    setTab("companies");
    setSelectedCompanyId(company.id);
    setEditingCompanyId(company.id);
    setCompanyForm({
      code: company.code,
      legalName: company.legalName,
      tradeName: company.tradeName || "",
      ruc: company.ruc,
    });
  }
  function cancelCompanyEdit() {
    setEditingCompanyId("");
    setCompanyForm(emptyCompany);
  }
  async function toggleCompany(company: Company) {
    await send(
      "/organization/companies/" + company.id,
      "PATCH",
      { active: !company.active },
      company.active ? "Empresa desactivada." : "Empresa reactivada.",
    );
  }
  async function deleteCompany(company: Company) {
    if (
      !window.confirm(
        "¿Eliminar empresa legal sin dependencias? Si tiene datos, el sistema no permitirá borrarla.",
      )
    )
      return;
    await send(
      "/organization/companies/" + company.id,
      "DELETE",
      null,
      "Empresa eliminada.",
    );
  }

  async function saveUnit(event: FormEvent) {
    event.preventDefault();
    if (!selectedCompanyId) return setError("Seleccione una empresa legal.");
    const saved = editingUnitId
      ? await send(
          "/organization/business-units/" + editingUnitId,
          "PATCH",
          unitForm,
          "Establecimiento actualizado correctamente.",
        )
      : await send(
          "/organization/business-units",
          "POST",
          { ...unitForm, companyId: selectedCompanyId },
          "Establecimiento registrado correctamente.",
        );
    if (saved) cancelUnitEdit();
  }
  function editUnit(unit: BusinessUnit) {
    setTab("units");
    setSelectedCompanyId(unit.companyId);
    setSelectedUnitId(unit.id);
    setEditingUnitId(unit.id);
    setUnitForm({ code: unit.code, name: unit.name, type: unit.type });
  }
  function cancelUnitEdit() {
    setEditingUnitId("");
    setUnitForm(emptyUnit);
  }
  async function toggleUnit(unit: BusinessUnit) {
    await send(
      "/organization/business-units/" + unit.id,
      "PATCH",
      { active: !unit.active },
      unit.active
        ? "Establecimiento desactivado."
        : "Establecimiento reactivado.",
    );
  }
  async function deleteUnit(unit: BusinessUnit) {
    if (
      !window.confirm(
        "¿Eliminar establecimiento sin almacenes, módulos ni movimientos?",
      )
    )
      return;
    await send(
      "/organization/business-units/" + unit.id,
      "DELETE",
      null,
      "Establecimiento eliminado.",
    );
  }

  async function saveWarehouse(event: FormEvent) {
    event.preventDefault();
    if (!selectedUnitId)
      return setError("Seleccione un establecimiento o unidad.");
    const saved = editingWarehouseId
      ? await send(
          "/organization/warehouses/" + editingWarehouseId,
          "PATCH",
          warehouseForm,
          "Almacén actualizado correctamente.",
        )
      : await send(
          "/organization/warehouses",
          "POST",
          { ...warehouseForm, businessUnitId: selectedUnitId },
          "Almacén registrado correctamente.",
        );
    if (saved) cancelWarehouseEdit();
  }
  function editWarehouse(warehouse: Warehouse) {
    setTab("warehouses");
    setSelectedCompanyId(warehouse.companyId);
    setSelectedUnitId(warehouse.businessUnitId);
    setEditingWarehouseId(warehouse.id);
    setWarehouseForm({ code: warehouse.code, name: warehouse.name });
  }
  function cancelWarehouseEdit() {
    setEditingWarehouseId("");
    setWarehouseForm(emptyWarehouse);
  }
  async function toggleWarehouse(warehouse: Warehouse) {
    await send(
      "/organization/warehouses/" + warehouse.id,
      "PATCH",
      { active: !warehouse.active },
      warehouse.active ? "Almacén desactivado." : "Almacén reactivado.",
    );
  }
  async function deleteWarehouse(warehouse: Warehouse) {
    if (
      !window.confirm("¿Eliminar almacén sin inventario, ventas ni documentos?")
    )
      return;
    await send(
      "/organization/warehouses/" + warehouse.id,
      "DELETE",
      null,
      "Almacén eliminado.",
    );
  }

  async function saveModule(event: FormEvent) {
    event.preventDefault();
    if (!selectedUnitId)
      return setError("Seleccione un establecimiento o unidad.");
    const payload = {
      ...moduleForm,
      businessUnitId: selectedUnitId,
      warehouseId: moduleForm.warehouseId || undefined,
      active: true,
    };
    const saved = editingModuleId
      ? await send(
          "/organization/module-installations/" + editingModuleId,
          "PATCH",
          payload,
          "Módulo actualizado correctamente.",
        )
      : await send(
          "/organization/module-installations",
          "PUT",
          payload,
          "Módulo asignado correctamente.",
        );
    if (saved) cancelModuleEdit();
  }
  function editModule(item: Installation) {
    setTab("modules");
    setSelectedCompanyId(item.companyId);
    setSelectedUnitId(item.businessUnitId);
    setEditingModuleId(item.id);
    setModuleForm({
      moduleKey: item.moduleKey,
      displayName: item.displayName || "",
      warehouseId: item.warehouseId || "",
    });
  }
  function cancelModuleEdit() {
    setEditingModuleId("");
    setModuleForm(emptyModule);
  }
  async function toggleModule(item: Installation) {
    await send(
      "/organization/module-installations/" + item.id,
      "PATCH",
      { active: !item.active },
      item.active ? "Módulo desactivado." : "Módulo reactivado.",
    );
  }
  async function deleteModule(item: Installation) {
    if (!window.confirm("¿Eliminar esta asignación de módulo?")) return;
    await send(
      "/organization/module-installations/" + item.id,
      "DELETE",
      null,
      "Asignación de módulo eliminada.",
    );
  }

  async function saveCollaboration(event: FormEvent) {
    event.preventDefault();
    if (!collaborationForm.ownerCompanyId)
      return setError("Seleccione la empresa propietaria.");
    if (!collaborationForm.partnerCompanyId)
      return setError("Seleccione una empresa colaboradora diferente.");
    if (collaborationForm.ownerCompanyId === collaborationForm.partnerCompanyId)
      return setError(
        "La empresa colaboradora debe ser diferente de la propietaria.",
      );
    const payload = {
      ...collaborationForm,
      sourceBusinessUnitId: collaborationForm.sourceBusinessUnitId || undefined,
      targetBusinessUnitId: collaborationForm.targetBusinessUnitId || undefined,
    };
    const saved = editingCollaborationId
      ? await send(
          "/organization/collaborations/" + editingCollaborationId,
          "PATCH",
          payload,
          "Colaboración actualizada correctamente.",
        )
      : await send(
          "/organization/collaborations",
          "POST",
          payload,
          "Colaboración registrada correctamente.",
        );
    if (saved) cancelCollaborationEdit();
  }
  function editCollaboration(item: Collaboration) {
    setTab("collaborations");
    setEditingCollaborationId(item.id);
    setCollaborationForm({
      ownerCompanyId: item.ownerCompanyId,
      partnerCompanyId: item.partnerCompanyId,
      sourceBusinessUnitId: item.sourceBusinessUnitId || "",
      targetBusinessUnitId: item.targetBusinessUnitId || "",
      resource: item.resource,
      direction: item.direction,
      status: item.status,
      requiresPatientConsent: item.requiresPatientConsent,
      shareMinimumClinicalData: item.shareMinimumClinicalData,
    });
  }
  function cancelCollaborationEdit() {
    setEditingCollaborationId("");
    setCollaborationForm({
      ...emptyCollaboration,
      ownerCompanyId: data.companies[0]?.id || "",
      partnerCompanyId:
        data.companies.find((company) => company.id !== data.companies[0]?.id)
          ?.id || "",
    });
  }
  async function deleteCollaboration(item: Collaboration) {
    if (
      !window.confirm(
        "¿Eliminar esta colaboración? Solo se permite si está en borrador y sin uso.",
      )
    )
      return;
    await send(
      "/organization/collaborations/" + item.id,
      "DELETE",
      null,
      "Colaboración eliminada.",
    );
  }

  if (loading)
    return <p className="p-6 text-slate-600">Cargando organización...</p>;

  const tabs = [
    ["map", "Mapa organizacional"],
    ["companies", "Empresas"],
    ["units", "Establecimientos"],
    ["warehouses", "Almacenes"],
    ["modules", "Módulos"],
    ["collaborations", "Colaboraciones"],
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-4 py-5">
          <nav className="text-sm text-slate-500">
            <Link to="/home" className="font-semibold text-emerald-700">
              Plataforma
            </Link>
            <span className="mx-2">/</span>
            <Link to="/institution" className="font-semibold text-emerald-700">
              Configuración
            </Link>
            <span className="mx-2">/</span>
            <span>Organización</span>
          </nav>
          <div className="mt-3 flex flex-col justify-between gap-3 md:flex-row md:items-end">
            <div>
              <h1 className="text-2xl font-bold text-slate-950">
                Organización empresarial
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                Primero visualice el mapa; luego registre empresas,
                establecimientos, almacenes, módulos y colaboraciones.
              </p>
            </div>
            <Link
              to="/home"
              className="rounded-lg border bg-white px-4 py-2 text-sm font-bold text-slate-700"
            >
              Volver a Plataforma
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        {error && <Message type="error">{error}</Message>}
        {success && <Message type="success">{success}</Message>}

        <div className="mb-5 flex flex-wrap gap-2 border-b">
          {tabs.map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={
                "border-b-2 px-4 py-3 text-sm font-bold " +
                (tab === id
                  ? "border-emerald-700 text-emerald-800"
                  : "border-transparent text-slate-500")
              }
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "map" && (
          <div className="space-y-6">
            <PrincipleBox />
            <OrganizationMap
              data={data}
              onEditCompany={editCompany}
              onEditUnit={editUnit}
              onEditWarehouse={editWarehouse}
              onEditModule={editModule}
            />
            <CollaborationMap
              data={data}
              onEdit={editCollaboration}
              onDelete={deleteCollaboration}
            />
          </div>
        )}

        {tab === "companies" && (
          <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
            <section>
              <h2 className="text-lg font-bold">
                Empresas legales registradas
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Aquí registre solo razón social, RUC y nombre comercial. Los
                establecimientos se registran en otra pestaña.
              </p>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {data.companies.map((company) => (
                  <div
                    key={company.id}
                    className={
                      "rounded-lg border bg-white p-4 " +
                      (selectedCompanyId === company.id
                        ? "border-emerald-600 ring-1 ring-emerald-600"
                        : "border-slate-200")
                    }
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedCompanyId(company.id)}
                      className="block w-full text-left"
                    >
                      <p className="text-xs font-bold uppercase text-slate-500">
                        Empresa legal
                      </p>
                      <p className="font-bold text-slate-900">
                        {company.legalName}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        Nombre comercial:{" "}
                        {company.tradeName || "Sin nombre comercial"}
                      </p>
                      <p className="mt-3 font-mono text-sm">
                        RUC {company.ruc}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Código {company.code} / {activeText(company.active)}
                      </p>
                    </button>
                    <ActionButtons
                      active={company.active}
                      onEdit={() => editCompany(company)}
                      onToggle={() => void toggleCompany(company)}
                      onDelete={() => void deleteCompany(company)}
                    />
                  </div>
                ))}
              </div>
            </section>
            <FormSection
              title={
                editingCompanyId
                  ? "Editar empresa legal"
                  : "Registrar empresa legal"
              }
            >
              <form onSubmit={saveCompany} className="space-y-3">
                <Field
                  label="Código interno"
                  value={companyForm.code}
                  onChange={(value) =>
                    setCompanyForm({ ...companyForm, code: value })
                  }
                  required
                />
                <Field
                  label="Razón social"
                  value={companyForm.legalName}
                  onChange={(value) =>
                    setCompanyForm({ ...companyForm, legalName: value })
                  }
                  required
                />
                <Field
                  label="Nombre comercial"
                  value={companyForm.tradeName}
                  onChange={(value) =>
                    setCompanyForm({ ...companyForm, tradeName: value })
                  }
                />
                <Field
                  label="RUC"
                  value={companyForm.ruc}
                  onChange={(value) =>
                    setCompanyForm({ ...companyForm, ruc: value })
                  }
                  required
                  maxLength={11}
                />
                {editingCompanyId && (
                  <button
                    type="button"
                    onClick={cancelCompanyEdit}
                    className="w-full rounded-lg border px-4 py-2 font-bold text-slate-700"
                  >
                    Cancelar edición
                  </button>
                )}
                <Submit
                  saving={saving}
                  label={
                    editingCompanyId ? "Guardar cambios" : "Registrar empresa"
                  }
                />
              </form>
            </FormSection>
          </div>
        )}

        {tab === "units" && (
          <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
            <section>
              <ContextSelector
                companies={data.companies}
                businessUnits={data.businessUnits}
                selectedCompanyId={selectedCompanyId}
                selectedUnitId={selectedUnitId}
                onCompanyChange={setSelectedCompanyId}
                onUnitChange={setSelectedUnitId}
              />
              <div className="mt-4 rounded-lg border bg-white p-4">
                <h2 className="font-bold">
                  Establecimientos de {companyLabel(selectedCompany)}
                </h2>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {companyUnits.map((unit) => (
                    <div
                      key={unit.id}
                      className={
                        "rounded-lg border p-3 " +
                        (selectedUnitId === unit.id
                          ? "border-emerald-500 bg-emerald-50"
                          : "bg-white")
                      }
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedUnitId(unit.id)}
                        className="block w-full text-left"
                      >
                        <p className="font-bold">{unit.name}</p>
                        <p className="text-xs text-slate-500">
                          Tipo: {OPTION_LABELS[unit.type] || unit.type} /
                          Código: {unit.code} / {activeText(unit.active)}
                        </p>
                      </button>
                      <ActionButtons
                        active={unit.active}
                        onEdit={() => editUnit(unit)}
                        onToggle={() => void toggleUnit(unit)}
                        onDelete={() => void deleteUnit(unit)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </section>
            <FormSection
              title={
                editingUnitId
                  ? "Editar establecimiento / unidad"
                  : "Nuevo establecimiento / unidad"
              }
            >
              <p className="mb-3 rounded-lg bg-slate-100 p-3 text-sm text-slate-700">
                Se registrará dentro de:{" "}
                <strong>{companyLabel(selectedCompany)}</strong>
              </p>
              <form onSubmit={saveUnit} className="space-y-3">
                <Field
                  label="Código"
                  value={unitForm.code}
                  onChange={(value) =>
                    setUnitForm({ ...unitForm, code: value })
                  }
                  required
                />
                <Field
                  label="Nombre del establecimiento"
                  value={unitForm.name}
                  onChange={(value) =>
                    setUnitForm({ ...unitForm, name: value })
                  }
                  required
                />
                <SelectField
                  label="Tipo"
                  value={unitForm.type}
                  onChange={(value) =>
                    setUnitForm({ ...unitForm, type: value })
                  }
                  options={[
                    "CONSULTORIO",
                    "BOTICA",
                    "DROGUERIA",
                    "LABORATORIO",
                    "CENTRO_IMAGENES",
                    "OTRO",
                  ]}
                />
                {editingUnitId && (
                  <button
                    type="button"
                    onClick={cancelUnitEdit}
                    className="w-full rounded-lg border px-4 py-2 font-bold text-slate-700"
                  >
                    Cancelar edición
                  </button>
                )}
                <Submit
                  saving={saving}
                  label={
                    editingUnitId
                      ? "Guardar cambios"
                      : "Registrar establecimiento"
                  }
                />
              </form>
            </FormSection>
          </div>
        )}

        {tab === "warehouses" && (
          <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
            <section>
              <ContextSelector
                companies={data.companies}
                businessUnits={data.businessUnits}
                selectedCompanyId={selectedCompanyId}
                selectedUnitId={selectedUnitId}
                onCompanyChange={setSelectedCompanyId}
                onUnitChange={setSelectedUnitId}
              />
              <div className="mt-4 rounded-lg border bg-white p-4">
                <h2 className="font-bold">
                  Almacenes de {unitLabel(selectedUnit)}
                </h2>
                <p className="text-sm text-slate-600">
                  Empresa legal: {companyLabel(selectedCompany)}
                </p>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {unitWarehouses.map((warehouse) => (
                    <div
                      key={warehouse.id}
                      className="rounded-lg border bg-slate-50 p-3"
                    >
                      <p className="font-bold">{warehouse.name}</p>
                      <p className="text-xs text-slate-500">
                        Código: {warehouse.code} /{" "}
                        {activeText(warehouse.active)}
                      </p>
                      <ActionButtons
                        active={warehouse.active}
                        onEdit={() => editWarehouse(warehouse)}
                        onToggle={() => void toggleWarehouse(warehouse)}
                        onDelete={() => void deleteWarehouse(warehouse)}
                      />
                    </div>
                  ))}
                  {!unitWarehouses.length && (
                    <p className="text-sm text-slate-500">
                      Este establecimiento todavía no tiene almacenes.
                    </p>
                  )}
                </div>
              </div>
            </section>
            <FormSection
              title={editingWarehouseId ? "Editar almacén" : "Nuevo almacén"}
            >
              <p className="mb-3 rounded-lg bg-slate-100 p-3 text-sm text-slate-700">
                Se registrará en: <strong>{unitLabel(selectedUnit)}</strong>
                <br />
                Empresa: <strong>{companyLabel(selectedCompany)}</strong>
              </p>
              <form onSubmit={saveWarehouse} className="space-y-3">
                <Field
                  label="Código"
                  value={warehouseForm.code}
                  onChange={(value) =>
                    setWarehouseForm({ ...warehouseForm, code: value })
                  }
                  required
                />
                <Field
                  label="Nombre"
                  value={warehouseForm.name}
                  onChange={(value) =>
                    setWarehouseForm({ ...warehouseForm, name: value })
                  }
                  required
                />
                {editingWarehouseId && (
                  <button
                    type="button"
                    onClick={cancelWarehouseEdit}
                    className="w-full rounded-lg border px-4 py-2 font-bold text-slate-700"
                  >
                    Cancelar edición
                  </button>
                )}
                <Submit
                  saving={saving}
                  label={
                    editingWarehouseId ? "Guardar cambios" : "Registrar almacén"
                  }
                />
              </form>
            </FormSection>
          </div>
        )}

        {tab === "modules" && (
          <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
            <section>
              <h2 className="text-lg font-bold">Módulos por establecimiento</h2>
              <p className="mt-1 text-sm text-slate-600">
                Cada módulo pertenece a una empresa legal y a un establecimiento
                específico.
              </p>
              <div className="mt-3 overflow-x-auto rounded-lg border bg-white">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="p-3 text-left">Empresa legal</th>
                      <th className="p-3 text-left">Establecimiento</th>
                      <th className="p-3 text-left">Almacén</th>
                      <th className="p-3 text-left">Módulo</th>
                      <th className="p-3 text-left">Nombre visible</th>
                      <th className="p-3 text-left">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.installations.map((item) => {
                      const company = data.companies.find(
                        (x) => x.id === item.companyId,
                      );
                      const unit = data.businessUnits.find(
                        (x) => x.id === item.businessUnitId,
                      );
                      const warehouse = data.warehouses.find(
                        (x) => x.id === item.warehouseId,
                      );
                      return (
                        <tr key={item.id} className="border-t">
                          <td className="p-3">
                            <strong>{companyLabel(company)}</strong>
                            <br />
                            <span className="text-xs text-slate-500">
                              RUC {company?.ruc || "-"}
                            </span>
                          </td>
                          <td className="p-3">{unitLabel(unit)}</td>
                          <td className="p-3">{warehouseLabel(warehouse)}</td>
                          <td className="p-3 font-bold">
                            {MODULE_LABELS[item.moduleKey] || item.moduleKey}
                          </td>
                          <td className="p-3">
                            {item.displayName || "-"}
                            <br />
                            <span className="text-xs text-slate-500">
                              {activeText(item.active)}
                            </span>
                          </td>
                          <td className="p-3">
                            <ActionButtons
                              active={item.active}
                              onEdit={() => editModule(item)}
                              onToggle={() => void toggleModule(item)}
                              onDelete={() => void deleteModule(item)}
                            />
                          </td>
                        </tr>
                      );
                    })}
                    {!data.installations.length && (
                      <tr>
                        <td
                          colSpan={6}
                          className="p-4 text-center text-slate-500"
                        >
                          No hay módulos instalados.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
            <FormSection
              title={editingModuleId ? "Editar módulo" : "Asignar módulo"}
            >
              <ContextSelector
                companies={data.companies}
                businessUnits={data.businessUnits}
                selectedCompanyId={selectedCompanyId}
                selectedUnitId={selectedUnitId}
                onCompanyChange={setSelectedCompanyId}
                onUnitChange={setSelectedUnitId}
              />
              <form onSubmit={saveModule} className="mt-4 space-y-3">
                <SelectField
                  label="Módulo"
                  value={moduleForm.moduleKey}
                  onChange={(value) =>
                    setModuleForm({ ...moduleForm, moduleKey: value })
                  }
                  options={MODULES}
                />
                <Field
                  label="Nombre visible"
                  value={moduleForm.displayName}
                  onChange={(value) =>
                    setModuleForm({ ...moduleForm, displayName: value })
                  }
                />
                <SelectField
                  label="Almacén predeterminado"
                  value={moduleForm.warehouseId}
                  onChange={(value) =>
                    setModuleForm({ ...moduleForm, warehouseId: value })
                  }
                  options={[
                    "",
                    ...unitWarehouses.map((warehouse) => warehouse.id),
                  ]}
                  labels={{
                    "": "Sin almacén",
                    ...Object.fromEntries(
                      unitWarehouses.map((warehouse) => [
                        warehouse.id,
                        warehouse.name,
                      ]),
                    ),
                  }}
                />
                <ActionSummary
                  title="Resumen antes de guardar"
                  lines={[
                    ["Empresa", companyLabel(selectedCompany)],
                    ["Establecimiento", unitLabel(selectedUnit)],
                    ["Almacén", warehouseLabel(selectedWarehouse)],
                    [
                      "Módulo",
                      MODULE_LABELS[moduleForm.moduleKey] ||
                        moduleForm.moduleKey,
                    ],
                    [
                      "Nombre visible",
                      moduleForm.displayName || "Sin nombre visible",
                    ],
                  ]}
                />
                {editingModuleId && (
                  <button
                    type="button"
                    onClick={cancelModuleEdit}
                    className="w-full rounded-lg border px-4 py-2 font-bold text-slate-700"
                  >
                    Cancelar edición
                  </button>
                )}
                <Submit
                  saving={saving}
                  label={
                    editingModuleId ? "Guardar cambios" : "Guardar asignación"
                  }
                />
              </form>
            </FormSection>
          </div>
        )}

        {tab === "collaborations" && (
          <div className="grid gap-6 lg:grid-cols-[1fr_460px]">
            <section>
              <h2 className="text-lg font-bold">
                Colaboraciones entre empresas
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Las colaboraciones autorizan recursos específicos sin mezclar
                datos fiscales, caja ni inventario.
              </p>
              <div className="mt-3 space-y-3">
                {data.collaborations.map((item) => (
                  <CollaborationCard
                    key={item.id}
                    item={item}
                    data={data}
                    onEdit={() => editCollaboration(item)}
                    onDelete={() => void deleteCollaboration(item)}
                  />
                ))}
                {!data.collaborations.length && (
                  <p className="rounded-lg border bg-white p-4 text-sm text-slate-500">
                    No hay colaboraciones registradas.
                  </p>
                )}
              </div>
            </section>
            <FormSection
              title={
                editingCollaborationId
                  ? "Editar colaboración"
                  : "Nueva colaboración"
              }
            >
              <form onSubmit={saveCollaboration} className="space-y-3">
                <SelectField
                  label="Empresa propietaria"
                  value={collaborationForm.ownerCompanyId}
                  onChange={(value) =>
                    setCollaborationForm({
                      ...collaborationForm,
                      ownerCompanyId: value,
                      sourceBusinessUnitId: "",
                    })
                  }
                  options={data.companies.map((company) => company.id)}
                  labels={Object.fromEntries(
                    data.companies.map((company) => [
                      company.id,
                      company.legalName,
                    ]),
                  )}
                />
                <SelectField
                  label="Establecimiento origen"
                  value={collaborationForm.sourceBusinessUnitId || ""}
                  onChange={(value) =>
                    setCollaborationForm({
                      ...collaborationForm,
                      sourceBusinessUnitId: value,
                    })
                  }
                  options={[
                    "",
                    ...data.businessUnits
                      .filter(
                        (unit) =>
                          unit.companyId === collaborationForm.ownerCompanyId,
                      )
                      .map((unit) => unit.id),
                  ]}
                  labels={{
                    "": "Toda la empresa",
                    ...Object.fromEntries(
                      data.businessUnits.map((unit) => [unit.id, unit.name]),
                    ),
                  }}
                />
                <SelectField
                  label="Empresa colaboradora"
                  value={collaborationForm.partnerCompanyId}
                  onChange={(value) =>
                    setCollaborationForm({
                      ...collaborationForm,
                      partnerCompanyId: value,
                      targetBusinessUnitId: "",
                    })
                  }
                  options={data.companies.map((company) => company.id)}
                  labels={Object.fromEntries(
                    data.companies.map((company) => [
                      company.id,
                      company.legalName,
                    ]),
                  )}
                />
                <SelectField
                  label="Establecimiento destino"
                  value={collaborationForm.targetBusinessUnitId || ""}
                  onChange={(value) =>
                    setCollaborationForm({
                      ...collaborationForm,
                      targetBusinessUnitId: value,
                    })
                  }
                  options={[
                    "",
                    ...data.businessUnits
                      .filter(
                        (unit) =>
                          unit.companyId === collaborationForm.partnerCompanyId,
                      )
                      .map((unit) => unit.id),
                  ]}
                  labels={{
                    "": "Toda la empresa",
                    ...Object.fromEntries(
                      data.businessUnits.map((unit) => [unit.id, unit.name]),
                    ),
                  }}
                />
                <SelectField
                  label="Recurso compartido"
                  value={collaborationForm.resource}
                  onChange={(value) =>
                    setCollaborationForm({
                      ...collaborationForm,
                      resource: value,
                    })
                  }
                  options={RESOURCES}
                />
                <SelectField
                  label="Dirección"
                  value={collaborationForm.direction}
                  onChange={(value) =>
                    setCollaborationForm({
                      ...collaborationForm,
                      direction: value,
                    })
                  }
                  options={["ONE_WAY", "TWO_WAY"]}
                />
                <SelectField
                  label="Estado"
                  value={collaborationForm.status}
                  onChange={(value) =>
                    setCollaborationForm({
                      ...collaborationForm,
                      status: value,
                    })
                  }
                  options={[
                    "DRAFT",
                    "ACTIVE",
                    "SUSPENDED",
                    "REVOKED",
                    "EXPIRED",
                  ]}
                />
                <CheckLine
                  checked={collaborationForm.requiresPatientConsent}
                  onChange={(checked) =>
                    setCollaborationForm({
                      ...collaborationForm,
                      requiresPatientConsent: checked,
                    })
                  }
                  label="Requerir consentimiento del paciente"
                />
                <CheckLine
                  checked={collaborationForm.shareMinimumClinicalData}
                  onChange={(checked) =>
                    setCollaborationForm({
                      ...collaborationForm,
                      shareMinimumClinicalData: checked,
                    })
                  }
                  label="Compartir solo datos clínicos mínimos"
                />
                <CollaborationPreview form={collaborationForm} data={data} />
                {editingCollaborationId && (
                  <button
                    type="button"
                    onClick={cancelCollaborationEdit}
                    className="w-full rounded-lg border px-4 py-2 font-bold text-slate-700"
                  >
                    Cancelar edición
                  </button>
                )}
                <Submit
                  saving={saving}
                  label={
                    editingCollaborationId
                      ? "Guardar cambios"
                      : "Registrar colaboración"
                  }
                />
              </form>
            </FormSection>
          </div>
        )}
      </main>
    </div>
  );
}

function PrincipleBox() {
  return (
    <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
      <p className="font-bold">Principio de uso</p>
      <p className="mt-1">
        Primero entienda el mapa. Luego seleccione empresa, establecimiento,
        almacén y módulo. Nada se guarda sin mostrar el contexto.
      </p>
    </section>
  );
}

function OrganizationMap({
  data,
  onEditCompany,
  onEditUnit,
  onEditWarehouse,
  onEditModule,
}: {
  data: Structure;
  onEditCompany: (company: Company) => void;
  onEditUnit: (unit: BusinessUnit) => void;
  onEditWarehouse: (warehouse: Warehouse) => void;
  onEditModule: (item: Installation) => void;
}) {
  return (
    <section className="rounded-xl border bg-white p-5">
      <h2 className="text-lg font-bold text-slate-900">Mapa organizacional</h2>
      <p className="mt-1 text-sm text-slate-600">
        Empresa legal → Establecimiento / unidad → Almacenes y módulos.
      </p>
      <div className="mt-5 space-y-5">
        {data.companies.map((company) => {
          const units = data.businessUnits.filter(
            (unit) => unit.companyId === company.id,
          );
          return (
            <div
              key={company.id}
              className="rounded-xl border border-slate-200 bg-slate-50 p-4"
            >
              <div className="flex flex-col justify-between gap-2 md:flex-row md:items-start">
                <div>
                  <p className="text-xs font-bold uppercase text-slate-500">
                    Empresa legal
                  </p>
                  <h3 className="text-lg font-black text-slate-950">
                    {company.legalName}
                  </h3>
                  <p className="text-sm text-slate-600">
                    RUC {company.ruc} · Nombre comercial:{" "}
                    {company.tradeName || "-"} · {activeText(company.active)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onEditCompany(company)}
                  className="rounded-lg border bg-white px-3 py-1 text-xs font-bold text-slate-700"
                >
                  Editar empresa
                </button>
              </div>
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                {units.map((unit) => {
                  const warehouses = data.warehouses.filter(
                    (warehouse) => warehouse.businessUnitId === unit.id,
                  );
                  const modules = data.installations.filter(
                    (installation) => installation.businessUnitId === unit.id,
                  );
                  return (
                    <div
                      key={unit.id}
                      className="rounded-lg border bg-white p-4"
                    >
                      <div className="flex justify-between gap-2">
                        <div>
                          <p className="text-xs font-bold uppercase text-emerald-700">
                            Establecimiento / unidad
                          </p>
                          <h4 className="font-bold text-slate-900">
                            {unit.name}
                          </h4>
                          <p className="text-xs text-slate-500">
                            Tipo: {OPTION_LABELS[unit.type] || unit.type} ·
                            Código: {unit.code} · {activeText(unit.active)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => onEditUnit(unit)}
                          className="text-xs font-bold text-blue-700 hover:underline"
                        >
                          Editar
                        </button>
                      </div>
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        <div className="rounded-lg bg-slate-50 p-3">
                          <p className="font-bold text-slate-700">Almacenes</p>
                          <ul className="mt-2 space-y-1 text-sm text-slate-600">
                            {warehouses.map((warehouse) => (
                              <li
                                key={warehouse.id}
                                className="flex justify-between gap-2"
                              >
                                <span>• {warehouse.name}</span>
                                <button
                                  type="button"
                                  onClick={() => onEditWarehouse(warehouse)}
                                  className="text-xs font-bold text-blue-700 hover:underline"
                                >
                                  Editar
                                </button>
                              </li>
                            ))}
                            {!warehouses.length && <li>Sin almacenes</li>}
                          </ul>
                        </div>
                        <div className="rounded-lg bg-slate-50 p-3">
                          <p className="font-bold text-slate-700">Módulos</p>
                          <ul className="mt-2 space-y-1 text-sm text-slate-600">
                            {modules.map((module) => (
                              <li
                                key={module.id}
                                className="flex justify-between gap-2"
                              >
                                <span>
                                  •{" "}
                                  {MODULE_LABELS[module.moduleKey] ||
                                    module.moduleKey}
                                  {module.displayName
                                    ? " — " + module.displayName
                                    : ""}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => onEditModule(module)}
                                  className="text-xs font-bold text-blue-700 hover:underline"
                                >
                                  Editar
                                </button>
                              </li>
                            ))}
                            {!modules.length && <li>Sin módulos asignados</li>}
                          </ul>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {!units.length && (
                  <p className="rounded-lg border bg-white p-4 text-sm text-slate-500">
                    Esta empresa todavía no tiene establecimientos.
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function CollaborationMap({
  data,
  onEdit,
  onDelete,
}: {
  data: Structure;
  onEdit: (item: Collaboration) => void;
  onDelete: (item: Collaboration) => void;
}) {
  return (
    <section className="rounded-xl border bg-white p-5">
      <h2 className="text-lg font-bold text-slate-900">Colaboraciones</h2>
      <p className="mt-1 text-sm text-slate-600">
        Relaciones autorizadas entre empresas o establecimientos.
      </p>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {data.collaborations.map((item) => (
          <CollaborationCard
            key={item.id}
            item={item}
            data={data}
            onEdit={() => onEdit(item)}
            onDelete={() => onDelete(item)}
          />
        ))}
        {!data.collaborations.length && (
          <p className="rounded-lg border bg-slate-50 p-4 text-sm text-slate-500">
            No hay colaboraciones registradas.
          </p>
        )}
      </div>
    </section>
  );
}

function CollaborationCard({
  item,
  data,
  onEdit,
  onDelete,
}: {
  item: Collaboration;
  data: Structure;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const owner = data.companies.find(
    (company) => company.id === item.ownerCompanyId,
  );
  const partner = data.companies.find(
    (company) => company.id === item.partnerCompanyId,
  );
  const sourceUnit = data.businessUnits.find(
    (unit) => unit.id === item.sourceBusinessUnitId,
  );
  const targetUnit = data.businessUnits.find(
    (unit) => unit.id === item.targetBusinessUnitId,
  );
  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <div className="grid gap-3 md:grid-cols-[1fr_auto_1fr] md:items-center">
        <div className="rounded-lg bg-blue-50 p-3">
          <p className="text-xs font-bold uppercase text-blue-700">Origen</p>
          <p className="font-bold">
            {sourceUnit ? unitLabel(sourceUnit) : "Toda la empresa"}
          </p>
          <p className="text-xs text-slate-600">{companyLabel(owner)}</p>
        </div>
        <div className="text-center text-2xl font-black text-emerald-700">
          →
        </div>
        <div className="rounded-lg bg-emerald-50 p-3">
          <p className="text-xs font-bold uppercase text-emerald-700">
            Destino
          </p>
          <p className="font-bold">
            {targetUnit ? unitLabel(targetUnit) : "Toda la empresa"}
          </p>
          <p className="text-xs text-slate-600">{companyLabel(partner)}</p>
        </div>
      </div>
      <p className="mt-3 text-sm text-slate-700">
        <strong>{RESOURCE_LABELS[item.resource] || item.resource}</strong> ·{" "}
        {DIRECTION_LABELS[item.direction] || item.direction} ·{" "}
        {STATUS_LABELS[item.status] || item.status}
      </p>
      <p className="mt-1 text-xs text-slate-500">
        Consentimiento del paciente:{" "}
        {item.requiresPatientConsent ? "Requerido" : "No requerido"} · Datos
        mínimos: {item.shareMinimumClinicalData ? "Sí" : "No"}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onEdit}
          className="rounded-lg border px-3 py-1 text-xs font-bold text-blue-700"
        >
          Editar
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="rounded-lg border border-red-200 px-3 py-1 text-xs font-bold text-red-700"
        >
          Eliminar
        </button>
      </div>
    </div>
  );
}

function CollaborationPreview({
  form,
  data,
}: {
  form: CollaborationDraft;
  data: Structure;
}) {
  const owner = data.companies.find(
    (company) => company.id === form.ownerCompanyId,
  );
  const partner = data.companies.find(
    (company) => company.id === form.partnerCompanyId,
  );
  const sourceUnit = data.businessUnits.find(
    (unit) => unit.id === form.sourceBusinessUnitId,
  );
  const targetUnit = data.businessUnits.find(
    (unit) => unit.id === form.targetBusinessUnitId,
  );
  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-950">
      <p className="font-bold">Resumen antes de guardar</p>
      <p className="mt-1">
        {sourceUnit ? unitLabel(sourceUnit) : "Toda la empresa"} (
        {companyLabel(owner)})
      </p>
      <p className="font-bold">
        ↓ {RESOURCE_LABELS[form.resource] || form.resource}
      </p>
      <p>
        {targetUnit ? unitLabel(targetUnit) : "Toda la empresa"} (
        {companyLabel(partner)})
      </p>
    </div>
  );
}

function ContextSelector({
  companies,
  businessUnits,
  selectedCompanyId,
  selectedUnitId,
  onCompanyChange,
  onUnitChange,
}: {
  companies: Company[];
  businessUnits: BusinessUnit[];
  selectedCompanyId: string;
  selectedUnitId: string;
  onCompanyChange: (value: string) => void;
  onUnitChange: (value: string) => void;
}) {
  const units = businessUnits.filter(
    (unit) => unit.companyId === selectedCompanyId,
  );
  const selectedCompany = companies.find(
    (company) => company.id === selectedCompanyId,
  );
  const selectedUnit = businessUnits.find((unit) => unit.id === selectedUnitId);
  return (
    <div className="rounded-lg border bg-white p-4">
      <p className="mb-3 font-bold text-slate-800">Contexto seleccionado</p>
      <div className="grid gap-3 md:grid-cols-2">
        <CompanySelect
          companies={companies}
          value={selectedCompanyId}
          onChange={onCompanyChange}
        />
        <SelectField
          label="Establecimiento / unidad"
          value={selectedUnitId}
          onChange={onUnitChange}
          options={units.map((unit) => unit.id)}
          labels={Object.fromEntries(units.map((unit) => [unit.id, unit.name]))}
        />
      </div>
      <div className="mt-3 rounded-lg bg-slate-100 p-3 text-sm text-slate-700">
        Empresa: <strong>{companyLabel(selectedCompany)}</strong>
        <br />
        Establecimiento: <strong>{unitLabel(selectedUnit)}</strong>
      </div>
    </div>
  );
}

function ActionButtons({
  active,
  onEdit,
  onToggle,
  onDelete,
}: {
  active: boolean;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <button
        type="button"
        onClick={onEdit}
        className="rounded-lg border px-3 py-1 text-xs font-bold text-blue-700"
      >
        Editar
      </button>
      <button
        type="button"
        onClick={onToggle}
        className="rounded-lg border px-3 py-1 text-xs font-bold text-slate-700"
      >
        {active ? "Desactivar" : "Reactivar"}
      </button>
      <button
        type="button"
        onClick={onDelete}
        className="rounded-lg border border-red-200 px-3 py-1 text-xs font-bold text-red-700"
      >
        Eliminar
      </button>
    </div>
  );
}

function ActionSummary({
  title,
  lines,
}: {
  title: string;
  lines: Array<[string, string]>;
}) {
  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-950">
      <p className="font-bold">{title}</p>
      <dl className="mt-2 space-y-1">
        {lines.map(([label, value]) => (
          <div key={label} className="grid grid-cols-[130px_1fr] gap-2">
            <dt className="font-semibold">{label}:</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function FormSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border bg-white p-5">
      <h2 className="mb-4 text-lg font-bold">{title}</h2>
      {children}
    </section>
  );
}

function Message({
  type,
  children,
}: {
  type: "error" | "success";
  children: ReactNode;
}) {
  const className =
    type === "error"
      ? "mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
      : "mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800";
  return <div className={className}>{children}</div>;
}

function Field({
  label,
  value,
  onChange,
  required = false,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  maxLength?: number;
}) {
  return (
    <label className="block text-sm font-semibold text-slate-700">
      {label}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        maxLength={maxLength}
        className="mt-1 w-full rounded-lg border px-3 py-2 font-normal"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  labels = {},
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  labels?: Record<string, string>;
}) {
  return (
    <label className="block text-sm font-semibold text-slate-700">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-lg border px-3 py-2 font-normal"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {labels[option] || OPTION_LABELS[option] || option}
          </option>
        ))}
      </select>
    </label>
  );
}

function CompanySelect({
  companies,
  value,
  onChange,
}: {
  companies: Company[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <SelectField
      label="Empresa legal"
      value={value}
      onChange={onChange}
      options={companies.map((company) => company.id)}
      labels={Object.fromEntries(
        companies.map((company) => [company.id, company.legalName]),
      )}
    />
  );
}

function CheckLine({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex gap-2 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      {label}
    </label>
  );
}

function Submit({ saving, label }: { saving: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={saving}
      className="w-full rounded-lg bg-emerald-700 px-4 py-2.5 font-bold text-white disabled:opacity-50"
    >
      {saving ? "Guardando..." : label}
    </button>
  );
}
