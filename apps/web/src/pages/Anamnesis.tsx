// HCELM - pages/Anamnesis.tsx
// Módulo de anamnesis/HCE: diagnósticos, receta, órdenes, PDF y destino final.
import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { generateRecipePdf } from "../utils/recipePdf";
import { generateVoluntaryDischargePdf } from "../utils/voluntaryDischargePdf";
import { generateReferralPdf } from "../utils/referralPdf";
import { generateObservationPdf } from "../utils/observationPdf";
import { generateSinadefReferralPdf } from "../utils/sinadefReferralPdf";
import { generateHcePdf } from "../utils/hcePdf";
import { generateLabOrderPdf } from "../utils/labOrderPdf";
import LaboratorySelector from "../components/LaboratorySelector";
import ImagingSelector from "../components/ImagingSelector";
import { generateImagingOrderPdf } from "../utils/imagingOrderPdf";
import ClinicalAlertsPanel from "../components/clinical-alerts/ClinicalAlertsPanel";

const API_URL = "http://localhost:3000/api";
function getSelectedEncounter() {
  const raw = localStorage.getItem("selectedEncounter");

  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

const CIE10_CODES = [
  { code: "J06.9", desc: "Infección aguda de vías respiratorias" },
  { code: "J00", desc: "Nasofaringitis aguda (Resfriado común)" },
  { code: "R51", desc: "Cefalea (Dolor de cabeza)" },
  { code: "M54.5", desc: "Dolor lumbar bajo" },
  { code: "E11.9", desc: "Diabetes mellitus tipo 2" },
  { code: "I10", desc: "Hipertensión esencial" },
  { code: "K21.0", desc: "Enfermedad por reflujo gastroesofágico" },
  { code: "N39.0", desc: "Infección de vías urinarias" },
  { code: "A09", desc: "Diarrea y gastroenteritis" },
  { code: "B34.9", desc: "Infección viral no especificada" },
  { code: "J18.9", desc: "Neumonía no especificada" },
  { code: "R10.4", desc: "Dolor abdominal" },
  { code: "F41.1", desc: "Trastorno de ansiedad generalizada" },
];

const CollapsibleSection = ({
  id,
  title,
  subtitle,
  isOpen,
  onToggle,
  children,
}: {
  id?: string;
  title: string;
  subtitle?: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) => {
  return (
    <section id={id} className="border rounded-lg bg-white shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-100 hover:bg-slate-200 rounded-t-lg text-left"
      >
        <div>
          <h2 className="text-lg font-bold text-slate-800">{title}</h2>
          {subtitle && (
            <p className="text-sm text-slate-600 mt-1">{subtitle}</p>
          )}
        </div>

        <span className="text-xl font-bold text-slate-700">
          {isOpen ? "−" : "+"}
        </span>
      </button>

      {isOpen && <div className="p-4">{children}</div>}
    </section>
  );
};

export default function Anamnesis() {
  const [searchParams] = useSearchParams();

  const encounterIdFromUrl = searchParams.get("encounterId");
  const sectionFromUrl = searchParams.get("section");
  const navigate = useNavigate();
  const didScrollToDiagnosticsRef = useRef(false);

  const [patients, setPatients] = useState<any[]>([]);
  const [institution, setInstitution] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [nextDiagId, setNextDiagId] = useState(1);

  const [medSearch, setMedSearch] = useState("");
  const [medResults, setMedResults] = useState<any[]>([]);
  const [selectedMed, setSelectedMed] = useState<any | null>(null);
  const [recipeItems, setRecipeItems] = useState<any[]>([]);
  const [medSearchLoading, setMedSearchLoading] = useState(false);
  const [showMedDropdown, setShowMedDropdown] = useState(false);

  const [openSections, setOpenSections] = useState({
    anamnesis: true,
    examenFisico: true,
    diagnosticos: true,
    receta: false,
    laboratorio: false,
    imagenes: false,
    destino: false,
  });

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const [recipeForm, setRecipeForm] = useState({
    quantity: "",
    presentation: "",
    route: "",
    dose: "",
    frequency: "",
    durationDays: "",
    indications: "",
  });
  const [labOrder, setLabOrder] = useState({
    priority: "Rutina",
    clinicalInfo: "",
    tests: "",
    observations: "",
  });
  const [imagingOrder, setImagingOrder] = useState({
    priority: "Rutina",
    clinicalInfo: "",
    studies: "",
    observations: "",
  });
  const [selectedDiagnosis, setSelectedDiagnosis] = useState<Diagnosis>({
    codigo: "",
    descripcion: "",
    tipo: "presuntivo",
  });

  const [destinationDetails, setDestinationDetails] = useState({
    altaIndicaciones: "",
    altaSignosAlarma: "",
    altaControl: "",
    voluntariaMotivo: "",
    voluntariaRiesgos: "",
    voluntariaResumenClinico: "",
    voluntariaResponsable: "",
    voluntariaDniResponsable: "",
    voluntariaParentesco: "",
    voluntariaTelefono: "",
    referenciaDestino: "",
    referenciaMotivo: "",
    referenciaEspecialidad: "",
    referenciaMedicoReceptor: "",
    referenciaTransporte: "",
    referenciaServicioOrigen: "",
    referenciaServicioDestino: "",
    referenciaCondicion: "",
    referenciaAcompanante: "",
    referenciaResumenClinico: "",
    observacionMotivo: "",
    observacionTiempoEstimado: "",
    observacionPlan: "",
    observacionIndicaciones: "",
    fallecidoFechaHora: "",
    fallecidoCausaProbable: "",
    fallecidoObservaciones: "",
    fallecidoGenerarCertificado: false,
  });

  const [formData, setFormData] = useState({
    patientId: "",
    encounterId: "",
    fechaAtencion: new Date().toISOString().split("T")[0],
    motivoConsulta: "",
    tiempoEnfermedad: "",
    anamnesisActual: "",
    funcionesBiologicas: "",
    antecedentesPersonales: "",
    antecedentesFamiliares: "",
    signosVitales: {
      ta: "",
      fc: "",
      fr: "",
      temp: "",
      spo2: "",
      ingresadoPor: "Médico",
    },
    examenFisico: "",
    diagnosticoPrincipal: {
      codigo: "",
      descripcion: "",
      tipo: "presuntivo",
    },
    diagnosticosSecundarios: [] as {
      id: number;
      codigo: string;
      descripcion: string;
      tipo: string;
    }[],
    examenesAuxiliares: "",
    prescripcionesFarmacia: "",
    destinoFinal: "alta_medica",
  });

  useEffect(() => {
    const token = localStorage.getItem("ame_token");

    const selectedPatientRaw = localStorage.getItem("selectedPatient");
    const selectedEncounter = getSelectedEncounter();
    const selectedPatient = selectedPatientRaw
      ? JSON.parse(selectedPatientRaw)
      : null;

    fetch(`${API_URL}/patients`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        const patientList = Array.isArray(data) ? data : [];
        setPatients(patientList);

        if (selectedPatient?.id) {
          setFormData((prev) => ({
            ...prev,
            patientId: selectedPatient.id,
            encounterId:
              encounterIdFromUrl || selectedEncounter?.id || prev.encounterId,
            motivoConsulta:
              prev.motivoConsulta || selectedEncounter?.reason || "",
            signosVitales: selectedEncounter?.vitalSigns
              ? {
                  ...prev.signosVitales,
                  ta:
                    selectedEncounter.vitalSigns.systolicBP &&
                    selectedEncounter.vitalSigns.diastolicBP
                      ? `${selectedEncounter.vitalSigns.systolicBP}/${selectedEncounter.vitalSigns.diastolicBP}`
                      : prev.signosVitales.ta,
                  fc:
                    selectedEncounter.vitalSigns.heartRate ||
                    prev.signosVitales.fc,
                  fr:
                    selectedEncounter.vitalSigns.respiratoryRate ||
                    prev.signosVitales.fr,
                  temp:
                    selectedEncounter.vitalSigns.temperature ||
                    prev.signosVitales.temp,
                  spo2:
                    selectedEncounter.vitalSigns.oxygenSat ||
                    prev.signosVitales.spo2,
                }
              : prev.signosVitales,
          }));
        }
      })
      .catch(() => setPatients([]));

    fetch(`${API_URL}/institution`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setInstitution(data))
      .catch(() => setInstitution(null));
  }, [encounterIdFromUrl]);

  useEffect(() => {
    if (!encounterIdFromUrl) return;

    const token = localStorage.getItem("ame_token");

    fetch(`${API_URL}/anamnesis/by-encounter/${encounterIdFromUrl}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((data) => {
        if (!data) return;

        setFormData((prev) => ({
          ...prev,
          patientId: data.patientId || prev.patientId,
          encounterId: data.encounterId || encounterIdFromUrl,
          fechaAtencion: data.fechaAtencion
            ? new Date(data.fechaAtencion).toISOString().split("T")[0]
            : prev.fechaAtencion,
          motivoConsulta: data.motivoConsulta || prev.motivoConsulta,
          tiempoEnfermedad: data.tiempoEnfermedad || "",
          anamnesisActual: data.anamnesisActual || "",
          funcionesBiologicas: data.funcionesBiologicas || "",
          antecedentesPersonales: data.antecedentesPersonales || "",
          antecedentesFamiliares: data.antecedentesFamiliares || "",
          signosVitales: data.signosVitales || prev.signosVitales,
          examenFisico: data.examenFisico || "",
          diagnosticoPrincipal:
            data.diagnosticoPrincipal || prev.diagnosticoPrincipal,
          diagnosticosSecundarios: Array.isArray(data.diagnosticosSecundarios)
            ? data.diagnosticosSecundarios
            : [],
          examenesAuxiliares: data.examenesAuxiliares || "",
          prescripcionesFarmacia: data.prescripcionesFarmacia || "",
          destinoFinal: data.destinoFinal || prev.destinoFinal,
        }));

        if (
          data.destinationDetails &&
          typeof data.destinationDetails === "object"
        ) {
          setDestinationDetails((prev) => ({
            ...prev,
            ...data.destinationDetails,
          }));
        }

        if (Array.isArray(data.recipeItems)) {
          setRecipeItems(data.recipeItems);
          updatePrescriptionText(data.recipeItems);
        }

        if (Array.isArray(data.diagnosticosSecundarios)) {
          const maxDiagId = data.diagnosticosSecundarios.reduce(
            (max: number, diag: any) => Math.max(max, Number(diag.id) || 0),
            0,
          );

          setNextDiagId(maxDiagId + 1);
        }

        console.log("✅ Anamnesis existente cargada:", data.id);
      })
      .catch((error) => {
        console.warn("No se pudo cargar la anamnesis existente:", error);
      });
  }, [encounterIdFromUrl]);

  useEffect(() => {
    if (sectionFromUrl !== "diagnosticos") return;

    setOpenSections((prev) => ({
      ...prev,
      diagnosticos: true,
    }));

    if (didScrollToDiagnosticsRef.current) return;
    didScrollToDiagnosticsRef.current = true;

    const timeout = window.setTimeout(() => {
      const diagnosticsSection = document.getElementById(
        "diagnosticos-section",
      );

      if (diagnosticsSection) {
        diagnosticsSection.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [sectionFromUrl]);

  useEffect(() => {
    const query = medSearch.trim();

    if (query.length < 2) {
      setMedResults([]);
      setShowMedDropdown(false);
      return;
    }

    const token = localStorage.getItem("ame_token");

    if (!token) {
      setMedResults([]);
      setShowMedDropdown(false);
      return;
    }

    const timeout = window.setTimeout(() => {
      setMedSearchLoading(true);

      fetch(`${API_URL}/medications/search?q=${encodeURIComponent(query)}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
        .then((res) => {
          if (!res.ok) {
            throw new Error("No se pudo buscar medicamentos.");
          }

          return res.json();
        })
        .then((data) => {
          const results = Array.isArray(data) ? data : [];
          setMedResults(results);
          setShowMedDropdown(results.length > 0);
        })
        .catch((error) => {
          console.warn("Error buscando medicamentos:", error);
          setMedResults([]);
          setShowMedDropdown(false);
        })
        .finally(() => {
          setMedSearchLoading(false);
        });
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [medSearch]);

  const updatePrescriptionText = (items: any[]) => {
    setFormData((prev) => ({
      ...prev,
      prescripcionesFarmacia: items
        .map(
          (m, i) =>
            `${i + 1}. ${m.medicationName} ${m.concentration} ${m.presentation} - Cantidad: ${m.quantity} - Vía: ${m.route} - Dosis: ${m.dose} - Frecuencia: ${m.frequency} - Duración: ${m.durationDays || ""} días. ${m.indications}`,
        )
        .join("\n")
    }));
  };

  const getMedicationDisplayName = (medication: any) => {
    const genericName = medication.genericName || medication.generic || "";
    const commercialName =
      medication.commercialName || medication.brandName || medication.name || "";

    if (genericName && commercialName && genericName !== commercialName) {
      return `${genericName} (${commercialName})`;
    }

    return genericName || commercialName || "Medicamento sin nombre";
  };

  const getMedicationStockText = (medication: any) => {
    const possibleStock =
      medication.stock ??
      medication.currentStock ??
      medication.availableStock ??
      medication.quantity ??
      medication.unitsAvailable ??
      null;

    if (
      possibleStock === null ||
      possibleStock === undefined ||
      possibleStock === ""
    ) {
      return "Stock no registrado";
    }

    return `Stock: ${possibleStock}`;
  };

  const selectMedicationFromDropdown = (medication: any) => {
    setSelectedMed(medication);
    setMedSearch(getMedicationDisplayName(medication));

    setRecipeForm((prev) => ({
      ...prev,
      presentation: medication.presentation || prev.presentation || "",
      route: medication.route || prev.route || "",
    }));

    setShowMedDropdown(false);
  };

  const searchMedication = async () => {
    if (!medSearch.trim()) return alert("Ingrese un medicamento para buscar");

    const token = localStorage.getItem("ame_token");

    if (!token) {
      alert("No hay token de sesión. Vuelva a iniciar sesión.");
      return;
    }

    setMedSearchLoading(true);

    try {
      const res = await fetch(
        `${API_URL}/medications/search?q=${encodeURIComponent(medSearch)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (res.status === 401) {
        alert("Sesión no autorizada. Ingrese nuevamente.");
        return;
      }

      const data = await res.json();
      const results = Array.isArray(data) ? data : [];

      setMedResults(results);
      setShowMedDropdown(results.length > 0);

      if (results.length === 0) {
        alert("No se encontraron medicamentos con ese nombre.");
      }
    } catch {
      alert("Error al buscar medicamentos.");
    } finally {
      setMedSearchLoading(false);
    }
  };

  const addMedicationToRecipe = () => {
    if (!selectedMed) return alert("Seleccione un medicamento");
    if (!recipeForm.quantity)
      return alert("Ingrese cantidad o número de medicamentos");
    if (!recipeForm.presentation) return alert("Ingrese presentación");
    if (!recipeForm.route) return alert("Ingrese vía de administración");
    if (!recipeForm.dose) return alert("Ingrese dosis");
    if (!recipeForm.frequency) return alert("Ingrese frecuencia");
    if (!recipeForm.durationDays)
      return alert("Ingrese número de días de tratamiento");

    const item = {
      medicationId: selectedMed.id,
      medicationName: `${selectedMed.genericName}${selectedMed.commercialName ? ` (${selectedMed.commercialName})` : ""}`,
      concentration: selectedMed.concentration || "",
      presentation: recipeForm.presentation,
      quantity: Number(recipeForm.quantity),
      route: recipeForm.route,
      dose: recipeForm.dose,
      frequency: recipeForm.frequency,
      durationDays: Number(recipeForm.durationDays),
      indications: recipeForm.indications,
    };

    const newItems = [...recipeItems, item];
    setRecipeItems(newItems);
    updatePrescriptionText(newItems);

    setSelectedMed(null);
    setMedSearch("");
    setMedResults([]);
    setRecipeForm({
      quantity: "",
      presentation: "",
      route: "",
      dose: "",
      frequency: "",
      durationDays: "",
      indications: "",
    });
  };

  const removeMedication = (index: number) => {
    const newItems = recipeItems.filter((_, i) => i !== index);
    setRecipeItems(newItems);
    updatePrescriptionText(newItems);
  };

  const printRecipe = () => {
    const patient = patients.find((p) => p.id === formData.patientId);

    generateRecipePdf({
      institution,
      patient,
      formData,
      recipeItems,
    });
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;

    if (name.startsWith("sv.")) {
      const key = name.replace("sv.", "");
      setFormData((prev) => ({
        ...prev,
        signosVitales: { ...prev.signosVitales, [key]: value },
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const updateSelectedDiagnosisByCode = (value: string) => {
    const found = CIE10_CODES.find(
      (c) => c.code.toLowerCase() === value.toLowerCase(),
    );

    setSelectedDiagnosis((prev) => ({
      ...prev,
      codigo: value,
      descripcion: found ? found.desc : prev.descripcion,
    }));
  };

  const updateSelectedDiagnosisByDescription = (value: string) => {
    const found = CIE10_CODES.find(
      (c) => c.desc.toLowerCase() === value.toLowerCase(),
    );

    setSelectedDiagnosis((prev) => ({
      ...prev,
      descripcion: value,
      codigo: found ? found.code : prev.codigo,
    }));
  };

  const addDiagnosisAsPrincipal = () => {
    if (!selectedDiagnosis.codigo.trim()) {
      alert("Seleccione o ingrese el código CIE-10.");
      return;
    }

    if (!selectedDiagnosis.descripcion.trim()) {
      alert("Ingrese la descripción del diagnóstico.");
      return;
    }

    setFormData((prev) => ({
      ...prev,
      diagnosticoPrincipal: {
        codigo: selectedDiagnosis.codigo,
        descripcion: selectedDiagnosis.descripcion,
        tipo: selectedDiagnosis.tipo || "presuntivo",
      },
    }));

    setSelectedDiagnosis({
      codigo: "",
      descripcion: "",
      tipo: "presuntivo",
    });
  };

  const addDiagnosisAsSecondary = () => {
    if (!selectedDiagnosis.codigo.trim()) {
      alert("Seleccione o ingrese el código CIE-10.");
      return;
    }

    if (!selectedDiagnosis.descripcion.trim()) {
      alert("Ingrese la descripción del diagnóstico.");
      return;
    }

    const newDiag = {
      id: nextDiagId,
      codigo: selectedDiagnosis.codigo,
      descripcion: selectedDiagnosis.descripcion,
      tipo: selectedDiagnosis.tipo || "presuntivo",
    };

    setFormData((prev) => ({
      ...prev,
      diagnosticosSecundarios: [...prev.diagnosticosSecundarios, newDiag],
    }));

    setNextDiagId((prev) => prev + 1);

    setSelectedDiagnosis({
      codigo: "",
      descripcion: "",
      tipo: "presuntivo",
    });
  };

  const clearSelectedDiagnosis = () => {
    setSelectedDiagnosis({
      codigo: "",
      descripcion: "",
      tipo: "presuntivo",
    });
  };

  const removeSecondaryDiag = (id: number) => {
    setFormData((prev) => ({
      ...prev,
      diagnosticosSecundarios: prev.diagnosticosSecundarios.filter(
        (d) => d.id !== id,
      ),
    }));
  };

  const handleChangePatient = () => {
    localStorage.removeItem("selectedPatient");

    setFormData((prev) => ({
      ...prev,
      patientId: "",
    }));

    navigate("/patients");
  };

  const handleDestinationDetailChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value, type } = e.target;

    setDestinationDetails((prev) => ({
      ...prev,
      [name]:
        type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const saveAnamnesis = async () => {
    if (!formData.patientId) {
      alert("Seleccione un paciente");
      return false;
    }

    if (!formData.diagnosticoPrincipal.codigo.trim()) {
      alert("Ingrese diagnóstico principal");
      return false;
    }

    setSaving(true);

    try {
      const token = localStorage.getItem("ame_token");

      const res = await fetch(`${API_URL}/anamnesis`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          encounterId: formData.encounterId || encounterIdFromUrl || null,
          destinationDetails,
          recipeItems,
        }),
      });

      if (res.ok) {
        return true;
      }

      const err = await res.json();
      alert(`Error: ${err.message || "No se pudo guardar"}`);
      return false;
    } catch {
      alert("Error de conexión con el servidor");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleSaveChanges = async () => {
    const ok = await saveAnamnesis();

    if (ok) {
      alert("Cambios guardados. Puede continuar editando la atención.");
    }
  };

  const handleFinishAttention = async () => {
    const confirmFinish = window.confirm(
      "¿Desea finalizar esta atención? Se guardará la historia clínica y volverá a Pacientes.",
    );

    if (!confirmFinish) return;

    const ok = await saveAnamnesis();

    if (ok) {
      alert("Atención finalizada correctamente.");
      window.location.href = "/patients";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleSaveChanges();
  };

  return (
    <div className="min-h-screen w-full bg-slate-100 p-4 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
            <h1 className="text-2xl font-bold text-slate-800">
              Anamnesis y Historia Clínica Electrónica
            </h1>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  const selectedPatient = patients.find(
                    (p) => String(p.id) === String(formData.patientId),
                  );

                  if (selectedPatient) {
                    localStorage.setItem(
                      "selectedPatient",
                      JSON.stringify(selectedPatient),
                    );
                  }

                  localStorage.setItem(
                    "selectedEncounter",
                    JSON.stringify({
                      id: formData.encounterId || encounterIdFromUrl || "",
                      patientId: formData.patientId,
                      reason: formData.motivoConsulta,
                      vitalSigns: {
                        systolicBP: formData.signosVitales.ta?.includes("/")
                          ? formData.signosVitales.ta.split("/")[0]
                          : "",
                        diastolicBP: formData.signosVitales.ta?.includes("/")
                          ? formData.signosVitales.ta.split("/")[1]
                          : "",
                        heartRate: formData.signosVitales.fc,
                        respiratoryRate: formData.signosVitales.fr,
                        temperature: formData.signosVitales.temp,
                        oxygenSat: formData.signosVitales.spo2,
                      },
                    }),
                  );

                  navigate("/new-encounter?mode=edit-vitals");
                }}
                className="px-4 py-2 rounded bg-amber-600 text-white font-semibold hover:bg-amber-700"
              >
                ← Corregir funciones vitales
              </button>

              <button
                type="button"
                onClick={handleChangePatient}
                className="px-4 py-2 rounded bg-gray-700 text-white font-semibold hover:bg-gray-800"
              >
                ← Cambiar paciente
              </button>
            </div>
          </div>

          <div className="mb-4 border rounded-lg p-4 bg-green-50 border-green-200">
            <h2 className="font-bold text-green-800 mb-2">
              Funciones vitales registradas
            </h2>

            <p className="text-sm text-green-900">
              PA: {formData.signosVitales.ta || "—"} mmHg | FC:{" "}
              {formData.signosVitales.fc || "—"} lpm | FR:{" "}
              {formData.signosVitales.fr || "—"} rpm | T°:{" "}
              {formData.signosVitales.temp || "—"} °C | SpO₂:{" "}
              {formData.signosVitales.spo2 || "—"}%
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-6 bg-white p-6 rounded-lg shadow"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Paciente *
                </label>
                <select
                  value={formData.patientId}
                  onChange={(e) =>
                    setFormData({ ...formData, patientId: e.target.value })
                  }
                  className="w-full border p-2 rounded"
                  required
                >
                  <option value="">-- Seleccione un paciente --</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.fullName} ({p.documentNumber})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Fecha de atención
                </label>
                <input
                  type="date"
                  name="fechaAtencion"
                  value={formData.fechaAtencion}
                  onChange={handleChange}
                  className="w-full border p-2 rounded bg-gray-50"
                />
              </div>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Motivo de consulta *
              </label>
              <input
                name="motivoConsulta"
                value={formData.motivoConsulta}
                onChange={handleChange}
                className="w-full border p-2 rounded"
                placeholder="Ejemplo: dolor abdominal, fiebre, cefalea"
                required
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Tiempo de enfermedad
              </label>
              <input
                name="tiempoEnfermedad"
                value={formData.tiempoEnfermedad}
                onChange={handleChange}
                className="w-full border p-2 rounded"
                placeholder="Ejemplo: 3 días"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Anamnesis de enfermedad actual
              </label>
              <textarea
                name="anamnesisActual"
                value={formData.anamnesisActual}
                onChange={handleChange}
                className="w-full border p-2 rounded h-24"
              />
            </div>

            <div className="md:col-span-2 border rounded-lg p-4 bg-slate-50">
              <h2 className="text-lg font-bold text-slate-700 mb-4">
                Antecedentes
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Antecedentes personales
                  </label>
                  <textarea
                    name="antecedentesPersonales"
                    value={formData.antecedentesPersonales}
                    onChange={handleChange}
                    className="w-full border p-2 rounded h-28"
                    placeholder="Ej. HTA, diabetes, asma, alergias, cirugías, hospitalizaciones, medicación habitual..."
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Antecedentes familiares
                  </label>
                  <textarea
                    name="antecedentesFamiliares"
                    value={formData.antecedentesFamiliares}
                    onChange={handleChange}
                    className="w-full border p-2 rounded h-28"
                    placeholder="Ej. diabetes, hipertensión, cardiopatía, cáncer, enfermedad renal, tuberculosis..."
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Examen físico
              </label>
              <textarea
                name="examenFisico"
                value={formData.examenFisico}
                onChange={handleChange}
                className="w-full border p-2 rounded h-28"
              />
            </div>

            <CollapsibleSection
              id="diagnosticos-section"
              title="Diagnósticos CIE-10"
              subtitle="Busque o ingrese un diagnóstico y luego agréguelo como principal o secundario."
              isOpen={openSections.diagnosticos}
              onToggle={() => toggleSection("diagnosticos")}
            >
              <div className="border rounded-lg p-4 bg-yellow-50">
                <div className="flex justify-between items-start gap-4 mb-3">
                  <div>
                    <h2 className="text-lg font-bold text-slate-700">
                      Diagnósticos CIE-10
                    </h2>
                    <p className="text-sm text-slate-600">
                      Busque o ingrese un diagnóstico y luego agréguelo como
                      principal o secundario.
                    </p>
                  </div>
                </div>

                <div className="border rounded-lg p-3 bg-white mb-4">
                  <label className="block font-semibold text-slate-700 mb-2">
                    Diagnóstico seleccionado
                  </label>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <input
                      list="cie-codes"
                      placeholder="Código CIE-10"
                      value={selectedDiagnosis.codigo}
                      onChange={(e) =>
                        updateSelectedDiagnosisByCode(e.target.value)
                      }
                      className="border p-2 rounded"
                    />

                    <input
                      list="cie-descs"
                      placeholder="Descripción del diagnóstico"
                      value={selectedDiagnosis.descripcion}
                      onChange={(e) =>
                        updateSelectedDiagnosisByDescription(e.target.value)
                      }
                      className="md:col-span-2 border p-2 rounded"
                    />

                    <select
                      value={selectedDiagnosis.tipo}
                      onChange={(e) =>
                        setSelectedDiagnosis((prev) => ({
                          ...prev,
                          tipo: e.target.value,
                        }))
                      }
                      className="border p-2 rounded"
                    >
                      <option value="presuntivo">Presuntivo</option>
                      <option value="definitivo">Definitivo</option>
                      <option value="repetitivo">Repetitivo</option>
                    </select>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-3">
                    <button
                      type="button"
                      onClick={addDiagnosisAsPrincipal}
                      className="bg-emerald-600 text-white px-4 py-2 rounded hover:bg-emerald-700"
                    >
                      Agregar como diagnóstico principal
                    </button>

                    <button
                      type="button"
                      onClick={addDiagnosisAsSecondary}
                      className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                    >
                      Agregar como diagnóstico secundario
                    </button>

                    <button
                      type="button"
                      onClick={clearSelectedDiagnosis}
                      className="bg-gray-100 text-slate-700 px-4 py-2 rounded hover:bg-gray-200"
                    >
                      Limpiar selección
                    </button>
                  </div>
                </div>

                <div className="border rounded-lg p-3 bg-white mb-4">
                  <h3 className="font-bold text-slate-700 mb-2">
                    Diagnóstico principal
                  </h3>

                  {formData.diagnosticoPrincipal.codigo ? (
                    <div className="flex justify-between gap-3 items-start">
                      <div>
                        <p className="font-semibold text-slate-800">
                          {formData.diagnosticoPrincipal.codigo} -{" "}
                          {formData.diagnosticoPrincipal.descripcion}
                        </p>
                        <p className="text-sm text-slate-500">
                          Tipo: {formData.diagnosticoPrincipal.tipo}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            diagnosticoPrincipal: {
                              codigo: "",
                              descripcion: "",
                              tipo: "presuntivo",
                            },
                          }))
                        }
                        className="text-red-600 font-bold"
                      >
                        Quitar
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">
                      Aún no se ha agregado diagnóstico principal.
                    </p>
                  )}
                </div>

                <div className="border rounded-lg p-3 bg-white">
                  <h3 className="font-bold text-slate-700 mb-2">
                    Diagnósticos secundarios
                  </h3>

                  {formData.diagnosticosSecundarios.length > 0 ? (
                    <div className="space-y-2">
                      {formData.diagnosticosSecundarios.map((diag) => (
                        <div
                          key={diag.id}
                          className="border rounded p-2 flex justify-between gap-3"
                        >
                          <div>
                            <p className="font-semibold text-slate-800">
                              {diag.codigo} - {diag.descripcion}
                            </p>
                            <p className="text-sm text-slate-500">
                              Tipo: {diag.tipo}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => removeSecondaryDiag(diag.id)}
                            className="text-red-600 font-bold"
                          >
                            Quitar
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">
                      No hay diagnósticos secundarios agregados.
                    </p>
                  )}
                </div>

                <datalist id="cie-codes">
                  {CIE10_CODES.map((c) => (
                    <option key={c.code} value={c.code} />
                  ))}
                </datalist>

                <datalist id="cie-descs">
                  {CIE10_CODES.map((c) => (
                    <option key={c.desc} value={c.desc} />
                  ))}
                </datalist>
              </div>
            </CollapsibleSection>

            <CollapsibleSection
              title="Farmacia / Receta"
              subtitle="Prescripción médica, indicaciones farmacológicas y generación de receta institucional."
              isOpen={openSections.receta}
              onToggle={() => toggleSection("receta")}
            >
              <div className="border rounded-lg p-4 bg-emerald-50">
                <h2 className="text-lg font-bold text-slate-700 mb-3">
                  Farmacia / Receta
                </h2>

                <div className="relative mb-4">
                  <label className="block font-semibold text-slate-700 mb-1">
                    Buscar medicamento
                  </label>

                  <div className="flex gap-2">
                    <input
                      value={medSearch}
                      onChange={(e) => {
                        setMedSearch(e.target.value);
                        setSelectedMed(null);
                        setShowMedDropdown(true);
                      }}
                      onFocus={() => {
                        if (medResults.length > 0) {
                          setShowMedDropdown(true);
                        }
                      }}
                      className="flex-1 border p-2 rounded"
                      placeholder="Escriba nombre genérico, comercial o concentración"
                      autoComplete="off"
                    />

                    <button
                      type="button"
                      onClick={searchMedication}
                      className="bg-blue-600 text-white px-4 rounded hover:bg-blue-700"
                    >
                      {medSearchLoading ? "Buscando..." : "Buscar"}
                    </button>
                  </div>

                  {showMedDropdown && medResults.length > 0 && (
                    <div className="absolute left-0 right-0 z-40 mt-1 max-h-80 overflow-y-auto rounded-lg border bg-white shadow-2xl">
                      {medResults.map((m) => (
                        <button
                          type="button"
                          key={m.id}
                          onClick={() => selectMedicationFromDropdown(m)}
                          className="block w-full border-b p-3 text-left hover:bg-blue-50"
                        >
                          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2">
                            <div>
                              <p className="font-bold text-slate-800">
                                {getMedicationDisplayName(m)}
                              </p>

                              <p className="text-sm text-slate-600">
                                Genérico: {m.genericName || "—"}
                                {m.commercialName
                                  ? ` | Comercial: ${m.commercialName}`
                                  : ""}
                              </p>

                              <p className="text-sm text-slate-600">
                                Concentración: {m.concentration || "—"} |
                                Presentación: {m.presentation || "—"} | Vía:{" "}
                                {m.route || "—"}
                              </p>
                            </div>

                            <div className="rounded bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                              {getMedicationStockText(m)}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {medSearch.trim().length >= 2 &&
                    !medSearchLoading &&
                    showMedDropdown &&
                    medResults.length === 0 && (
                      <div className="absolute left-0 right-0 z-40 mt-1 rounded-lg border bg-white p-3 text-sm text-slate-500 shadow">
                        No se encontraron medicamentos.
                      </div>
                    )}

                  {selectedMed && (
                    <div className="mt-3 rounded-lg border border-emerald-300 bg-emerald-50 p-3">
                      <p className="font-bold text-emerald-800">
                        Medicamento seleccionado:{" "}
                        {getMedicationDisplayName(selectedMed)}
                      </p>

                      <p className="text-sm text-emerald-900">
                        Concentración: {selectedMed.concentration || "—"} |
                        Presentación: {selectedMed.presentation || "—"} | Vía:{" "}
                        {selectedMed.route || "—"} |{" "}
                        {getMedicationStockText(selectedMed)}
                      </p>
                    </div>
                  )}
                </div>

                {selectedMed && (
                  <div className="border rounded p-3 bg-white mb-4">
                    <p className="font-semibold mb-2">Datos para la receta</p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <input
                        placeholder="Número / cantidad"
                        value={recipeForm.quantity}
                        onChange={(e) =>
                          setRecipeForm({
                            ...recipeForm,
                            quantity: e.target.value,
                          })
                        }
                        className="border p-2 rounded"
                      />

                      <input
                        placeholder="Presentación"
                        value={recipeForm.presentation}
                        onChange={(e) =>
                          setRecipeForm({
                            ...recipeForm,
                            presentation: e.target.value,
                          })
                        }
                        className="border p-2 rounded"
                      />

                      <input
                        placeholder="Vía de administración"
                        value={recipeForm.route}
                        onChange={(e) =>
                          setRecipeForm({
                            ...recipeForm,
                            route: e.target.value,
                          })
                        }
                        className="border p-2 rounded"
                      />

                      <input
                        placeholder="Dosis"
                        value={recipeForm.dose}
                        onChange={(e) =>
                          setRecipeForm({ ...recipeForm, dose: e.target.value })
                        }
                        className="border p-2 rounded"
                      />

                      <input
                        placeholder="Frecuencia"
                        value={recipeForm.frequency}
                        onChange={(e) =>
                          setRecipeForm({
                            ...recipeForm,
                            frequency: e.target.value,
                          })
                        }
                        className="border p-2 rounded"
                      />

                      <input
                        placeholder="Días de tratamiento"
                        value={recipeForm.durationDays}
                        onChange={(e) =>
                          setRecipeForm({
                            ...recipeForm,
                            durationDays: e.target.value,
                          })
                        }
                        className="border p-2 rounded"
                      />

                      <input
                        placeholder="Indicaciones adicionales"
                        value={recipeForm.indications}
                        onChange={(e) =>
                          setRecipeForm({
                            ...recipeForm,
                            indications: e.target.value,
                          })
                        }
                        className="border p-2 rounded md:col-span-3"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={addMedicationToRecipe}
                      className="mt-3 bg-emerald-600 text-white px-4 py-2 rounded"
                    >
                      Agregar a receta
                    </button>
                  </div>
                )}

                {recipeItems.length > 0 && (
                  <div className="bg-white border rounded p-3">
                    <h3 className="font-bold mb-2">Medicamentos indicados</h3>

                    {recipeItems.map((m, index) => (
                      <div
                        key={index}
                        className="border-b py-2 flex justify-between gap-2"
                      >
                        <div>
                          <b>{m.medicationName}</b> {m.concentration}
                          <br />
                          Presentación: {m.presentation} | Cantidad:{" "}
                          {m.quantity} | Vía: {m.route}
                          <br />
                          Dosis: {m.dose} | Frecuencia: {m.frequency} |
                          Duración: {m.durationDays} días
                          <br />
                          <span className="text-sm text-slate-600">
                            {m.indications}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeMedication(index)}
                          className="text-red-600 font-bold"
                        >
                          Quitar
                        </button>
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={printRecipe}
                      className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded"
                    >
                      Generar receta institucional / PDF
                    </button>
                  </div>
                )}
              </div>
            </CollapsibleSection>

            <CollapsibleSection
              title="Exámenes auxiliares / Laboratorio"
              subtitle="Solicitud de análisis clínicos y generación de orden de laboratorio."
              isOpen={openSections.laboratorio}
              onToggle={() => toggleSection("laboratorio")}
            >
              <div className="border rounded-lg p-4 bg-blue-50">
                <h2 className="text-lg font-bold text-blue-700 mb-3">
                  Exámenes auxiliares
                </h2>

                <p className="text-sm text-slate-600 mb-4">
                  Seleccione los exámenes desde el catálogo. Esta será la única
                  fuente para la orden de laboratorio y para el plan de ayuda
                  diagnóstica de la HCE.
                </p>

                <div className="border rounded-lg p-4 bg-white">
                  <h3 className="font-bold text-blue-700 mb-3">
                    Orden de laboratorio
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">
                        Prioridad
                      </label>
                      <select
                        value={labOrder.priority}
                        onChange={(e) =>
                          setLabOrder({ ...labOrder, priority: e.target.value })
                        }
                        className="w-full border p-2 rounded"
                      >
                        <option value="Rutina">Rutina</option>
                        <option value="Urgente">Urgente</option>
                        <option value="Emergencia">Emergencia</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-medium text-slate-700 mb-1">
                        Información clínica relevante
                      </label>
                      <textarea
                        value={labOrder.clinicalInfo}
                        onChange={(e) =>
                          setLabOrder({
                            ...labOrder,
                            clinicalInfo: e.target.value,
                          })
                        }
                        className="w-full border p-2 rounded"
                        rows={4}
                        placeholder="Ejemplo: fiebre de 5 días, sospecha de dengue, control de diabetes, dolor abdominal, etc."
                      />
                    </div>
                  </div>

                  <LaboratorySelector
                    selectedExams={labOrder.tests
                      .split("\n")
                      .map((exam) => exam.trim())
                      .filter(Boolean)}
                    onChange={(exams) => {
                      const examsText = exams.join("\n");

                      setLabOrder({
                        ...labOrder,
                        tests: examsText,
                      });

                      setFormData({
                        ...formData,
                        examenesAuxiliares: examsText,
                      });
                    }}
                  />

                  <div className="mt-4 border rounded-lg p-3 bg-slate-50">
                    <p className="font-semibold text-slate-700 mb-2">
                      Exámenes que se imprimirán en la orden
                    </p>

                    {labOrder.tests.trim() ? (
                      <ul className="list-disc pl-6 text-sm text-slate-700 space-y-1">
                        {labOrder.tests
                          .split("\n")
                          .map((exam) => exam.trim())
                          .filter(Boolean)
                          .map((exam) => (
                            <li key={exam}>{exam}</li>
                          ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-slate-500">
                        Aún no se han seleccionado exámenes.
                      </p>
                    )}

                    <p className="text-xs text-slate-500 mt-2">
                      Esta lista se genera automáticamente desde el selector.
                      Para exámenes no listados, use la categoría “Otros
                      Exámenes”.
                    </p>
                  </div>

                  <div className="mt-4">
                    <label className="block font-medium text-slate-700 mb-1">
                      Observaciones / indicaciones para laboratorio
                    </label>
                    <textarea
                      value={labOrder.observations}
                      onChange={(e) =>
                        setLabOrder({
                          ...labOrder,
                          observations: e.target.value,
                        })
                      }
                      className="w-full border p-2 rounded"
                      rows={4}
                      placeholder="Ejemplo: paciente en ayunas, muestra urgente, tomar muestra antes de antibiótico, etc."
                    />
                  </div>

                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={() => {
                        const patient = patients.find(
                          (p) => p.id === formData.patientId,
                        );

                        generateLabOrderPdf({
                          institution,
                          patient,
                          formData,
                          labOrder,
                        });
                      }}
                      className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                    >
                      Generar orden de laboratorio PDF
                    </button>
                  </div>
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection
              title="Imágenes y estudios auxiliares"
              subtitle="Solicitud de ecografía, radiografía, tomografía u otros estudios."
              isOpen={openSections.imagenes}
              onToggle={() => toggleSection("imagenes")}
            >
              <div className="mt-6 border rounded-lg p-4 bg-white">
                <h3 className="font-bold text-purple-700 mb-4">
                  Orden de imágenes y estudios auxiliares
                </h3>

                <ImagingSelector
                  selectedStudies={imagingOrder.studies
                    .split("\n")
                    .map((study) => study.trim())
                    .filter(Boolean)}
                  onChange={(studies) => {
                    setImagingOrder({
                      ...imagingOrder,
                      studies: studies.join("\n"),
                    });
                  }}
                />

                <div className="mt-4 border rounded-lg p-3 bg-purple-50">
                  <p className="font-semibold text-purple-800 mb-2">
                    Imágenes y estudios que se imprimirán en la orden
                  </p>

                  {imagingOrder.studies
                    .split("\n")
                    .map((study) => study.trim())
                    .filter(Boolean).length === 0 ? (
                    <p className="text-sm text-slate-500">
                      Aún no se han seleccionado estudios.
                    </p>
                  ) : (
                    <ol className="list-decimal pl-5 text-sm text-slate-700 space-y-1">
                      {imagingOrder.studies
                        .split("\n")
                        .map((study) => study.trim())
                        .filter(Boolean)
                        .map((study, index) => (
                          <li key={`${study}-${index}`}>{study}</li>
                        ))}
                    </ol>
                  )}
                </div>

                <div className="mt-4">
                  <label className="block font-medium mb-1">
                    Información clínica relevante
                  </label>

                  <textarea
                    value={imagingOrder.clinicalInfo}
                    onChange={(e) =>
                      setImagingOrder({
                        ...imagingOrder,
                        clinicalInfo: e.target.value,
                      })
                    }
                    className="w-full border p-2 rounded"
                    rows={4}
                    placeholder="Información clínica para el radiólogo"
                  />
                </div>

                <div className="mt-4">
                  <label className="block font-medium mb-1">
                    Observaciones
                  </label>

                  <textarea
                    value={imagingOrder.observations}
                    onChange={(e) =>
                      setImagingOrder({
                        ...imagingOrder,
                        observations: e.target.value,
                      })
                    }
                    className="w-full border p-2 rounded"
                    rows={3}
                    placeholder="Indicaciones especiales"
                  />
                </div>

                <button
                  type="button"
                  className="mt-4 bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
                  onClick={() => {
                    const patient = patients.find(
                      (p) => String(p.id) === String(formData.patientId),
                    );

                    generateImagingOrderPdf({
                      institution,
                      patient,
                      formData,
                      imagingOrder: {
                        ...imagingOrder,
                        studies: imagingOrder.studies
                          .split("\n")
                          .map((s) => s.trim())
                          .filter(Boolean),
                      },
                    });
                  }}
                >
                  Generar orden de imágenes PDF
                </button>
              </div>
            </CollapsibleSection>

            <CollapsibleSection
              title="Destino final del paciente"
              subtitle="Alta, referencia, observación, fallecimiento y documentos clínicos asociados."
              isOpen={openSections.destino}
              onToggle={() => toggleSection("destino")}
            >
              <div className="border rounded-lg p-4 bg-slate-50">
                <label className="block font-bold text-slate-700 mb-2">
                  Destino final del paciente
                </label>

                <select
                  name="destinoFinal"
                  value={formData.destinoFinal}
                  onChange={handleChange}
                  className="w-full md:w-1/2 border p-2 rounded"
                >
                  <option value="alta_medica">Alta médica</option>
                  <option value="alta_voluntaria">Alta voluntaria</option>
                  <option value="referencia">Referencia</option>
                  <option value="observacion">Observación</option>
                  <option value="fallecido">Fallecido</option>
                </select>

                {formData.destinoFinal === "alta_medica" && (
                  <div className="mt-4 border rounded-lg p-4 bg-white">
                    <h3 className="font-bold text-emerald-700 mb-3">
                      Alta médica
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <TextArea
                        label="Indicaciones finales"
                        name="altaIndicaciones"
                        value={destinationDetails.altaIndicaciones}
                        onChange={handleDestinationDetailChange}
                      />

                      <TextArea
                        label="Signos de alarma"
                        name="altaSignosAlarma"
                        value={destinationDetails.altaSignosAlarma}
                        onChange={handleDestinationDetailChange}
                      />

                      <TextArea
                        label="Control / seguimiento"
                        name="altaControl"
                        value={destinationDetails.altaControl}
                        onChange={handleDestinationDetailChange}
                      />
                    </div>
                  </div>
                )}

                {formData.destinoFinal === "alta_voluntaria" && (
                  <div className="mt-4 border rounded-lg p-4 bg-white">
                    <h3 className="font-bold text-orange-700 mb-3">
                      Alta voluntaria
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <TextArea
                        label="Motivo de alta voluntaria"
                        name="voluntariaMotivo"
                        value={destinationDetails.voluntariaMotivo}
                        onChange={handleDestinationDetailChange}
                      />

                      <TextArea
                        label="Riesgos explicados al paciente/familiar"
                        name="voluntariaRiesgos"
                        value={destinationDetails.voluntariaRiesgos}
                        onChange={handleDestinationDetailChange}
                      />

                      <TextArea
                        label="Resumen clínico para alta voluntaria"
                        name="voluntariaResumenClinico"
                        value={destinationDetails.voluntariaResumenClinico}
                        onChange={handleDestinationDetailChange}
                      />

                      <InputText
                        label="Responsable / familiar"
                        name="voluntariaResponsable"
                        value={destinationDetails.voluntariaResponsable}
                        onChange={handleDestinationDetailChange}
                      />

                      <InputText
                        label="DNI del responsable"
                        name="voluntariaDniResponsable"
                        value={destinationDetails.voluntariaDniResponsable}
                        onChange={handleDestinationDetailChange}
                      />

                      <InputText
                        label="Parentesco"
                        name="voluntariaParentesco"
                        value={destinationDetails.voluntariaParentesco}
                        onChange={handleDestinationDetailChange}
                      />

                      <InputText
                        label="Teléfono"
                        name="voluntariaTelefono"
                        value={destinationDetails.voluntariaTelefono}
                        onChange={handleDestinationDetailChange}
                      />
                    </div>

                    <div className="mt-4">
                      <button
                        type="button"
                        onClick={() => {
                          const patient = patients.find(
                            (p) => p.id === formData.patientId,
                          );

                          generateVoluntaryDischargePdf({
                            institution,
                            patient,
                            formData,
                            destinationDetails,
                          });
                        }}
                        className="bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700"
                      >
                        Generar PDF de alta voluntaria
                      </button>
                    </div>
                  </div>
                )}

                {formData.destinoFinal === "referencia" && (
                  <div className="mt-4 border rounded-lg p-4 bg-white">
                    <h3 className="font-bold text-blue-700 mb-3">Referencia</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <InputText
                        label="Establecimiento destino"
                        name="referenciaDestino"
                        value={destinationDetails.referenciaDestino}
                        onChange={handleDestinationDetailChange}
                      />

                      <InputText
                        label="Especialidad receptora"
                        name="referenciaEspecialidad"
                        value={destinationDetails.referenciaEspecialidad}
                        onChange={handleDestinationDetailChange}
                      />

                      <InputText
                        label="Médico receptor"
                        name="referenciaMedicoReceptor"
                        value={destinationDetails.referenciaMedicoReceptor}
                        onChange={handleDestinationDetailChange}
                      />

                      <InputText
                        label="Medio de transporte"
                        name="referenciaTransporte"
                        value={destinationDetails.referenciaTransporte}
                        onChange={handleDestinationDetailChange}
                      />

                      <InputText
                        label="Servicio origen"
                        name="referenciaServicioOrigen"
                        value={destinationDetails.referenciaServicioOrigen}
                        onChange={handleDestinationDetailChange}
                      />

                      <InputText
                        label="Servicio destino"
                        name="referenciaServicioDestino"
                        value={destinationDetails.referenciaServicioDestino}
                        onChange={handleDestinationDetailChange}
                      />

                      <InputText
                        label="Condición actual del paciente"
                        name="referenciaCondicion"
                        value={destinationDetails.referenciaCondicion}
                        onChange={handleDestinationDetailChange}
                      />

                      <InputText
                        label="Acompañante"
                        name="referenciaAcompanante"
                        value={destinationDetails.referenciaAcompanante}
                        onChange={handleDestinationDetailChange}
                      />

                      <TextArea
                        label="Motivo de referencia"
                        name="referenciaMotivo"
                        value={destinationDetails.referenciaMotivo}
                        onChange={handleDestinationDetailChange}
                      />

                      <TextArea
                        label="Resumen clínico para referencia"
                        name="referenciaResumenClinico"
                        value={destinationDetails.referenciaResumenClinico}
                        onChange={handleDestinationDetailChange}
                      />
                    </div>

                    <div className="mt-4">
                      <button
                        type="button"
                        onClick={() => {
                          const patient = patients.find(
                            (p) => p.id === formData.patientId,
                          );

                          generateReferralPdf({
                            institution,
                            patient,
                            formData,
                            destinationDetails,
                          });
                        }}
                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                      >
                        Generar hoja de referencia PDF
                      </button>
                    </div>
                  </div>
                )}

                {formData.destinoFinal === "observacion" && (
                  <div className="mt-4 border rounded-lg p-4 bg-white">
                    <h3 className="font-bold text-purple-700 mb-3">
                      Observación
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <TextArea
                        label="Motivo de observación"
                        name="observacionMotivo"
                        value={destinationDetails.observacionMotivo}
                        onChange={handleDestinationDetailChange}
                      />

                      <InputText
                        label="Tiempo estimado"
                        name="observacionTiempoEstimado"
                        value={destinationDetails.observacionTiempoEstimado}
                        onChange={handleDestinationDetailChange}
                      />

                      <TextArea
                        label="Plan de monitoreo"
                        name="observacionPlan"
                        value={destinationDetails.observacionPlan}
                        onChange={handleDestinationDetailChange}
                      />

                      <TextArea
                        label="Indicaciones"
                        name="observacionIndicaciones"
                        value={destinationDetails.observacionIndicaciones}
                        onChange={handleDestinationDetailChange}
                      />
                    </div>

                    <div className="mt-4">
                      <button
                        type="button"
                        onClick={() => {
                          const patient = patients.find(
                            (p) => p.id === formData.patientId,
                          );

                          generateObservationPdf({
                            institution,
                            patient,
                            formData,
                            destinationDetails,
                          });
                        }}
                        className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
                      >
                        Generar orden de observación PDF
                      </button>
                    </div>
                  </div>
                )}

                {formData.destinoFinal === "fallecido" && (
                  <div className="mt-4 border rounded-lg p-4 bg-white">
                    <h3 className="font-bold text-red-700 mb-3">
                      Fallecido / pase clínico para SINADEF
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <InputText
                        label="Fecha y hora de fallecimiento"
                        name="fallecidoFechaHora"
                        value={destinationDetails.fallecidoFechaHora}
                        onChange={handleDestinationDetailChange}
                      />

                      <InputText
                        label="Lugar de fallecimiento"
                        name="fallecidoLugar"
                        value={destinationDetails.fallecidoLugar}
                        onChange={handleDestinationDetailChange}
                      />

                      <InputText
                        label="Causa probable"
                        name="fallecidoCausaProbable"
                        value={destinationDetails.fallecidoCausaProbable}
                        onChange={handleDestinationDetailChange}
                      />

                      <TextArea
                        label="Resumen clínico relevante"
                        name="fallecidoResumenClinico"
                        value={destinationDetails.fallecidoResumenClinico}
                        onChange={handleDestinationDetailChange}
                      />

                      <TextArea
                        label="Observaciones clínicas"
                        name="fallecidoObservaciones"
                        value={destinationDetails.fallecidoObservaciones}
                        onChange={handleDestinationDetailChange}
                      />

                      <label className="flex items-center gap-2 border rounded p-3 bg-red-50">
                        <input
                          type="checkbox"
                          name="fallecidoGenerarCertificado"
                          checked={
                            destinationDetails.fallecidoGenerarCertificado
                          }
                          onChange={handleDestinationDetailChange}
                        />
                        <span className="text-red-700 font-medium">
                          Registrar pase clínico para certificación SINADEF
                        </span>
                      </label>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          const patient = patients.find(
                            (p) => p.id === formData.patientId,
                          );

                          generateSinadefReferralPdf({
                            institution,
                            patient,
                            formData,
                            destinationDetails,
                          });
                        }}
                        className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                      >
                        Generar pase clínico PDF
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          window.open(
                            "https://www.minsa.gob.pe/defunciones/",
                            "_blank",
                          );
                        }}
                        className="bg-slate-700 text-white px-4 py-2 rounded hover:bg-slate-800"
                      >
                        Abrir plataforma SINADEF
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          alert(
                            "Próxima fase: adjuntar PDF oficial emitido por SINADEF a la historia clínica.",
                          );
                        }}
                        className="bg-gray-100 text-gray-700 px-4 py-2 rounded hover:bg-gray-200"
                      >
                        Adjuntar certificado SINADEF
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </CollapsibleSection>

            <div className="flex flex-col md:flex-row gap-3">
              <button
                type="button"
                onClick={handleSaveChanges}
                disabled={saving}
                className="md:w-1/3 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium disabled:opacity-60"
              >
                {saving ? "Guardando..." : "Guardar cambios"}
              </button>

              <button
                type="button"
                onClick={() => {
                  const patient = patients.find(
                    (p) => p.id === formData.patientId,
                  );

                  generateHcePdf({
                    institution,
                    patient,
                    formData,
                    destinationDetails,
                    recipeItems,
                  });
                }}
                className="md:w-1/3 bg-slate-700 text-white px-6 py-3 rounded-lg hover:bg-slate-800 font-medium"
              >
                Generar HCE PDF completa
              </button>

              <button
                type="button"
                onClick={handleFinishAttention}
                disabled={saving}
                className="md:w-1/3 bg-emerald-600 text-white px-6 py-3 rounded-lg hover:bg-emerald-700 font-medium disabled:opacity-60"
              >
                {saving ? "Guardando..." : "Finalizar atención"}
              </button>
            </div>
          </form>

      <ClinicalAlertsPanel
        patientId={formData.patientId}
        encounterId={formData.encounterId}
      />
    </div>
  );
}

function InputText({
  label,
  name,
  value,
  onChange,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div>
      <label className="block font-medium text-slate-700 mb-1">{label}</label>
      <input
        name={name}
        value={value || ""}
        onChange={onChange}
        className="w-full border p-2 rounded"
      />
    </div>
  );
}

function TextArea({
  label,
  name,
  value,
  onChange,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
}) {
  return (
    <div className="md:col-span-2">
      <label className="block font-medium text-slate-700 mb-1">{label}</label>
      <textarea
        name={name}
        value={value || ""}
        onChange={onChange}
        className="w-full border p-2 rounded h-24"
      />
    </div>
  );
}
