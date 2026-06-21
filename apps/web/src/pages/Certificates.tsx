// HCELM - pages/Certificates.tsx
// Gestión institucional de constancias, certificados, CMP y pase SINADEF.
import React, { useEffect, useMemo, useState } from "react";

const API_URL = "http://localhost:3000/api";

const CMP_DIGITAL_URL = "https://www.cmp.org.pe/certificado-medico-digital/";
const CMP_AYNI_URL = "https://ayni.cmp.org.pe/";
const SINADEF_URL = "https://www.minsa.gob.pe/defunciones/";

type CertificateType =
  | "ATTENDANCE_CERTIFICATE"
  | "INSTITUTIONAL_MEDICAL_CERTIFICATE"
  | "CMP_PHYSICAL_MEDICAL_CERTIFICATE"
  | "CMP_DIGITAL_MEDICAL_CERTIFICATE_DRAFT"
  | "DEATH_CLINICAL_PASS"
  | "HISTORY";

type Patient = {
  id: string;
  fullName: string;
  documentNumber?: string;
  documentType?: string;
  birthDate?: string;
  gender?: string;
  phone?: string;
  tenantId?: string;
};

type CertificateRecord = {
  id: string;
  patientId: string;
  certificateType: string;
  diagnoses?: string[];
  restDays?: number | null;
  observations?: string | null;
  place?: string | null;
  issueDate?: string;
  createdAt?: string;
  patient?: Patient;
};

type AnamnesisRecord = {
  id?: string;
  fechaAtencion?: string;
  motivoConsulta?: string;
  diagnosticoPrincipal?: any;
  diagnosticosSecundarios?: any;
  destinoFinal?: string;
};

type EncounterRecord = {
  id: string;
  reason?: string | null;
  createdAt?: string;
  updatedAt?: string;
  anamnesis?: AnamnesisRecord[] | AnamnesisRecord | null;
};

type DiagnosisSearchResult = {
  id: string;
  code: string;
  description: string;
  desc?: string;
  synonyms?: string[];
};

const tabs: { id: CertificateType; label: string; description: string }[] = [
  {
    id: "ATTENDANCE_CERTIFICATE",
    label: "Constancia de atención",
    description:
      "Documento institucional para acreditar que el paciente fue atendido.",
  },
  {
    id: "INSTITUTIONAL_MEDICAL_CERTIFICATE",
    label: "Certificado institucional",
    description:
      "Certificado médico propio de la institución, sin reemplazar formatos oficiales.",
  },
  {
    id: "CMP_PHYSICAL_MEDICAL_CERTIFICATE",
    label: "CMP físico",
    description:
      "Guía y trazabilidad para llenar correctamente el certificado médico físico CMP.",
  },
  {
    id: "CMP_DIGITAL_MEDICAL_CERTIFICATE_DRAFT",
    label: "CMP digital",
    description:
      "Borrador interno y acceso a la plataforma oficial del Certificado Médico Digital CMP.",
  },
  {
    id: "DEATH_CLINICAL_PASS",
    label: "SINADEF / defunción",
    description:
      "Pase clínico interno para certificación de defunción en SINADEF.",
  },
  {
    id: "HISTORY",
    label: "Historial",
    description: "Documentos emitidos o registrados en HCELM.",
  },
];

const typeLabels: Record<string, string> = {
  ATTENDANCE_CERTIFICATE: "Constancia de atención",
  INSTITUTIONAL_MEDICAL_CERTIFICATE: "Certificado médico institucional",
  CMP_PHYSICAL_MEDICAL_CERTIFICATE: "Certificado médico físico CMP",
  CMP_DIGITAL_MEDICAL_CERTIFICATE_DRAFT:
    "Borrador certificado médico digital CMP",
  DEATH_CLINICAL_PASS: "Pase clínico para SINADEF",
  REST_CERTIFICATE: "Certificado de descanso médico",
};

function todayDate() {
  return new Date().toISOString().split("T")[0];
}

function addDays(dateText: string, daysText: string) {
  const days = Number(daysText || 0);
  if (!dateText || !days || Number.isNaN(days)) return dateText;

  const date = new Date(`${dateText}T00:00:00`);
  date.setDate(date.getDate() + Math.max(days - 1, 0));

  return date.toISOString().split("T")[0];
}

function formatDate(date?: string | null) {
  if (!date) return "—";

  try {
    return new Date(date).toLocaleDateString("es-PE");
  } catch {
    return date;
  }
}

function openExternal(url: string) {
  window.open(url, "_blank", "noopener,noreferrer");
}

function normalizeDiagnosis(diagnosis: any) {
  if (!diagnosis) {
    return { code: "", description: "" };
  }

  if (typeof diagnosis === "string") {
    return { code: "", description: diagnosis };
  }

  return {
    code: diagnosis.codigo || diagnosis.code || "",
    description:
      diagnosis.descripcion ||
      diagnosis.description ||
      diagnosis.desc ||
      diagnosis.name ||
      "",
  };
}

function getLatestAnamnesisFromEncounter(
  encounter: EncounterRecord,
): AnamnesisRecord | null {
  const relation = encounter.anamnesis;

  if (!relation) return null;

  if (Array.isArray(relation)) {
    if (relation.length === 0) return null;

    return [...relation].sort((a, b) => {
      const dateA = new Date(a.fechaAtencion || 0).getTime();
      const dateB = new Date(b.fechaAtencion || 0).getTime();
      return dateB - dateA;
    })[0];
  }

  return relation;
}

export default function Certificates() {
  const [activeTab, setActiveTab] = useState<CertificateType>(
    "ATTENDANCE_CERTIFICATE",
  );
  const [patients, setPatients] = useState<Patient[]>([]);
  const [certificates, setCertificates] = useState<CertificateRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingClinicalData, setLoadingClinicalData] = useState(false);
  const [latestClinicalSource, setLatestClinicalSource] = useState("");
  const [diagnosisSearch, setDiagnosisSearch] = useState("");
  const [diagnosisResults, setDiagnosisResults] = useState<
    DiagnosisSearchResult[]
  >([]);
  const [diagnosisSearchLoading, setDiagnosisSearchLoading] = useState(false);
  const [showDiagnosisDropdown, setShowDiagnosisDropdown] = useState(false);

  const [formData, setFormData] = useState({
    patientId: "",
    issueDate: todayDate(),
    place: "Arequipa",
    service: "Consulta médica",
    attentionDate: todayDate(),
    attentionTime: "",
    permanenceTime: "",
    diagnosisCode: "",
    diagnosisDescription: "",
    restDays: "",
    restFrom: todayDate(),
    restTo: todayDate(),
    purpose: "",
    conclusion: "",
    restrictions: "",
    observations: "",
    officialCode: "",
    physicalCertificateNumber: "",
    sinadefCode: "",
    deathDateTime: "",
    deathPlace: "",
    probableCause: "",
    clinicalSummary: "",
  });

  const selectedPatient = useMemo(
    () => patients.find((p) => String(p.id) === String(formData.patientId)),
    [patients, formData.patientId],
  );

  useEffect(() => {
    const token = localStorage.getItem("ame_token");
    const selectedPatientRaw = localStorage.getItem("selectedPatient");

    setLoading(true);

    fetch(`${API_URL}/patients`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        const patientList = Array.isArray(data) ? data : [];
        setPatients(patientList);

        if (selectedPatientRaw) {
          try {
            const selected = JSON.parse(selectedPatientRaw);
            if (selected?.id) {
              setFormData((prev) => ({ ...prev, patientId: selected.id }));
            }
          } catch {
            // No hacer nada si localStorage está mal formado.
          }
        }
      })
      .catch(() => setPatients([]))
      .finally(() => setLoading(false));

    loadCertificates();
  }, []);

  useEffect(() => {
    if (!formData.patientId) {
      setLatestClinicalSource("");
      return;
    }

    const token = localStorage.getItem("ame_token");

    if (!token) return;

    setLoadingClinicalData(true);

    fetch(
      `${API_URL}/encounters?patientId=${encodeURIComponent(formData.patientId)}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    )
      .then((res) => {
        if (!res.ok)
          throw new Error("No se pudo cargar atenciones del paciente.");
        return res.json();
      })
      .then((data: EncounterRecord[]) => {
        const encounters = Array.isArray(data) ? data : [];

        if (encounters.length === 0) {
          setLatestClinicalSource(
            "Paciente sin atenciones previas registradas.",
          );
          return;
        }

        const sortedEncounters = [...encounters].sort((a, b) => {
          const dateA = new Date(a.createdAt || a.updatedAt || 0).getTime();
          const dateB = new Date(b.createdAt || b.updatedAt || 0).getTime();
          return dateB - dateA;
        });

        const encounterWithAnamnesis =
          sortedEncounters.find((encounter) =>
            getLatestAnamnesisFromEncounter(encounter),
          ) || sortedEncounters[0];

        const latestAnamnesis = getLatestAnamnesisFromEncounter(
          encounterWithAnamnesis,
        );
        const diagnosis = normalizeDiagnosis(
          latestAnamnesis?.diagnosticoPrincipal,
        );
        const attentionDate =
          latestAnamnesis?.fechaAtencion ||
          encounterWithAnamnesis.createdAt ||
          "";
        const attentionDateText = attentionDate
          ? new Date(attentionDate).toISOString().split("T")[0]
          : todayDate();

        setFormData((prev) => ({
          ...prev,
          diagnosisCode: diagnosis.code || prev.diagnosisCode,
          diagnosisDescription:
            diagnosis.description || prev.diagnosisDescription,
          attentionDate: attentionDateText || prev.attentionDate,
          restFrom: prev.restFrom || attentionDateText || prev.attentionDate,
          service: prev.service || "Consulta médica",
          observations:
            prev.observations ||
            latestAnamnesis?.motivoConsulta ||
            encounterWithAnamnesis.reason ||
            prev.observations,
        }));

        if (diagnosis.code || diagnosis.description) {
          setLatestClinicalSource(
            `Diagnóstico cargado desde la última HCE: ${[
              diagnosis.code,
              diagnosis.description,
            ]
              .filter(Boolean)
              .join(" - ")}`,
          );
        } else {
          setLatestClinicalSource(
            "Se encontró atención previa, pero sin diagnóstico principal registrado.",
          );
        }
      })
      .catch(() => {
        setLatestClinicalSource(
          "No se pudo cargar el diagnóstico desde la HCE. Puede ingresarlo manualmente.",
        );
      })
      .finally(() => {
        setLoadingClinicalData(false);
      });
  }, [formData.patientId]);

  useEffect(() => {
    const query = diagnosisSearch.trim();

    if (query.length < 2) {
      setDiagnosisResults([]);
      setDiagnosisSearchLoading(false);
      setShowDiagnosisDropdown(false);
      return;
    }

    const token = localStorage.getItem("ame_token");
    if (!token) return;

    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      setDiagnosisSearchLoading(true);

      fetch(
        `${API_URL}/diagnoses/search?q=${encodeURIComponent(query)}&system=CIE10`,
        {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        },
      )
        .then((response) => {
          if (!response.ok) throw new Error("No se pudo buscar CIE-10.");
          return response.json();
        })
        .then((data) => {
          const results = Array.isArray(data) ? data : [];
          setDiagnosisResults(results);
          setShowDiagnosisDropdown(true);
        })
        .catch((error) => {
          if (error?.name === "AbortError") return;
          console.warn("Error buscando diagnósticos:", error);
          setDiagnosisResults([]);
          setShowDiagnosisDropdown(false);
        })
        .finally(() => {
          if (!controller.signal.aborted) setDiagnosisSearchLoading(false);
        });
    }, 350);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [diagnosisSearch]);

  useEffect(() => {
    if (!formData.restDays) return;

    setFormData((prev) => ({
      ...prev,
      restTo: addDays(prev.restFrom || prev.issueDate, prev.restDays),
    }));
  }, [formData.restDays, formData.restFrom, formData.issueDate]);

  const loadCertificates = async () => {
    const token = localStorage.getItem("ame_token");

    try {
      const res = await fetch(`${API_URL}/certificates`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("No se pudo cargar historial.");

      const data = await res.json();
      setCertificates(Array.isArray(data) ? data : []);
    } catch {
      setCertificates([]);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const selectDiagnosis = (diagnosis: DiagnosisSearchResult) => {
    setFormData((prev) => ({
      ...prev,
      diagnosisCode: diagnosis.code,
      diagnosisDescription: diagnosis.description || diagnosis.desc || "",
    }));
    setDiagnosisSearch("");
    setDiagnosisResults([]);
    setShowDiagnosisDropdown(false);
    setLatestClinicalSource("Diagnóstico seleccionado desde el catálogo CIE-10.");
  };

  const getDiagnosisText = () => {
    const code = formData.diagnosisCode.trim();
    const desc = formData.diagnosisDescription.trim();

    if (code && desc) return `${code} - ${desc}`;
    return desc || code || "";
  };

  const buildObservationsText = () => {
    const patientName = selectedPatient?.fullName || "";
    const diagnosis = getDiagnosisText();

    const sections: string[] = [];

    sections.push(`Paciente: ${patientName}`);
    sections.push(
      `Documento: ${selectedPatient?.documentType || "DNI"} ${selectedPatient?.documentNumber || ""}`,
    );
    sections.push(`Servicio: ${formData.service || "—"}`);
    sections.push(
      `Fecha de atención: ${formData.attentionDate || formData.issueDate}`,
    );

    if (formData.attentionTime)
      sections.push(`Hora de atención: ${formData.attentionTime}`);
    if (formData.permanenceTime)
      sections.push(`Tiempo de permanencia: ${formData.permanenceTime}`);
    if (diagnosis) sections.push(`Diagnóstico: ${diagnosis}`);

    if (
      activeTab === "INSTITUTIONAL_MEDICAL_CERTIFICATE" ||
      activeTab === "CMP_PHYSICAL_MEDICAL_CERTIFICATE" ||
      activeTab === "CMP_DIGITAL_MEDICAL_CERTIFICATE_DRAFT"
    ) {
      if (formData.restDays)
        sections.push(`Días de descanso médico: ${formData.restDays}`);
      if (formData.restFrom)
        sections.push(`Descanso desde: ${formData.restFrom}`);
      if (formData.restTo) sections.push(`Descanso hasta: ${formData.restTo}`);
      if (formData.purpose) sections.push(`Finalidad: ${formData.purpose}`);
      if (formData.conclusion)
        sections.push(`Conclusión: ${formData.conclusion}`);
      if (formData.restrictions)
        sections.push(`Restricciones: ${formData.restrictions}`);
    }

    if (
      activeTab === "CMP_PHYSICAL_MEDICAL_CERTIFICATE" &&
      formData.physicalCertificateNumber
    ) {
      sections.push(
        `N° certificado físico CMP: ${formData.physicalCertificateNumber}`,
      );
    }

    if (
      activeTab === "CMP_DIGITAL_MEDICAL_CERTIFICATE_DRAFT" &&
      formData.officialCode
    ) {
      sections.push(
        `Código certificado digital CMP emitido: ${formData.officialCode}`,
      );
    }

    if (activeTab === "DEATH_CLINICAL_PASS") {
      if (formData.deathDateTime)
        sections.push(
          `Fecha y hora de fallecimiento: ${formData.deathDateTime}`,
        );
      if (formData.deathPlace)
        sections.push(`Lugar de fallecimiento: ${formData.deathPlace}`);
      if (formData.probableCause)
        sections.push(`Causa probable: ${formData.probableCause}`);
      if (formData.clinicalSummary)
        sections.push(`Resumen clínico: ${formData.clinicalSummary}`);
      if (formData.sinadefCode)
        sections.push(`Código/certificado SINADEF: ${formData.sinadefCode}`);
    }

    if (formData.observations)
      sections.push(`Observaciones: ${formData.observations}`);

    return sections.filter(Boolean).join("\n");
  };

  const validateForm = () => {
    if (!formData.patientId) {
      alert("Seleccione un paciente.");
      return false;
    }

    if (activeTab === "HISTORY") return true;

    if (activeTab === "ATTENDANCE_CERTIFICATE") {
      if (!formData.service.trim()) {
        alert("Ingrese el servicio brindado.");
        return false;
      }
    }

    if (
      activeTab === "INSTITUTIONAL_MEDICAL_CERTIFICATE" ||
      activeTab === "CMP_PHYSICAL_MEDICAL_CERTIFICATE" ||
      activeTab === "CMP_DIGITAL_MEDICAL_CERTIFICATE_DRAFT"
    ) {
      if (!getDiagnosisText()) {
        alert("Ingrese diagnóstico y, de preferencia, código CIE-10.");
        return false;
      }

      if (!formData.restDays) {
        alert("Ingrese el número de días de descanso médico.");
        return false;
      }

      if (formData.restFrom !== formData.attentionDate) {
        const ok = window.confirm(
          "En el certificado físico CMP, el descanso médico debe iniciar en la misma fecha de atención. ¿Desea continuar de todas maneras?",
        );

        if (!ok) return false;
      }
    }

    if (activeTab === "DEATH_CLINICAL_PASS") {
      if (!formData.deathDateTime || !formData.probableCause) {
        alert("Ingrese fecha/hora de fallecimiento y causa probable.");
        return false;
      }
    }

    return true;
  };

  const saveCertificate = async () => {
    if (!validateForm()) return;

    const token = localStorage.getItem("ame_token");
    const diagnosis = getDiagnosisText();

    setSaving(true);

    try {
      const res = await fetch(`${API_URL}/certificates`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          patientId: formData.patientId,
          certificateType: activeTab,
          diagnoses: diagnosis ? [diagnosis] : [],
          restDays: formData.restDays ? Number(formData.restDays) : null,
          observations: buildObservationsText(),
          place: formData.place,
          issueDate: formData.issueDate,
          service: formData.service,
          attentionDate: formData.attentionDate,
          attentionTime: formData.attentionTime,
          permanenceTime: formData.permanenceTime,
          purpose: formData.purpose,
          conclusion: formData.conclusion,
          restrictions: formData.restrictions,
          officialCode: formData.officialCode,
          physicalCertificateNumber: formData.physicalCertificateNumber,
          sinadefCode: formData.sinadefCode,
          deathDetails: {
            deathDateTime: formData.deathDateTime,
            deathPlace: formData.deathPlace,
            probableCause: formData.probableCause,
            clinicalSummary: formData.clinicalSummary,
          },
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.message || "No se pudo guardar el certificado.");
      }

      await loadCertificates();
      alert(
        "Documento registrado correctamente en el historial. Puede continuar generando el PDF interno o editar el formulario.",
      );
    } catch (error: any) {
      alert(error?.message || "Error al guardar el certificado.");
    } finally {
      setSaving(false);
    }
  };

  const downloadPdfBlob = (blob: Blob) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const safeName =
      selectedPatient?.fullName?.replace(/\s+/g, "_") || "paciente";
    const safeType = (typeLabels[activeTab] || "certificado")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "");

    link.href = url;
    link.download = `${safeType}_${safeName}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const generatePdf = async () => {
    if (!validateForm()) return;

    const token = localStorage.getItem("ame_token");
    const diagnosis = getDiagnosisText();

    const payload = {
      patient: selectedPatient,
      patientName: selectedPatient?.fullName,
      patientDoc: selectedPatient?.documentNumber,
      certificateType: activeTab,
      diagnoses: diagnosis ? [diagnosis] : [],
      restDays: formData.restDays ? Number(formData.restDays) : null,
      observations: buildObservationsText(),
      place: formData.place,
      issueDate: formData.issueDate,
      service: formData.service,
      attentionDate: formData.attentionDate,
      attentionTime: formData.attentionTime,
      permanenceTime: formData.permanenceTime,
      diagnosisCode: formData.diagnosisCode,
      diagnosisDescription: formData.diagnosisDescription,
      restFrom: formData.restFrom,
      restTo: formData.restTo,
      purpose: formData.purpose,
      conclusion: formData.conclusion,
      restrictions: formData.restrictions,
      officialCode: formData.officialCode,
      physicalCertificateNumber: formData.physicalCertificateNumber,
      sinadefCode: formData.sinadefCode,
      deathDateTime: formData.deathDateTime,
      deathPlace: formData.deathPlace,
      probableCause: formData.probableCause,
      clinicalSummary: formData.clinicalSummary,
    };

    setSaving(true);

    try {
      let res = await fetch(`${API_URL}/certificates/pdf`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      // Compatibilidad temporal: si el backend antiguo todavía no tiene /certificates/pdf,
      // intentamos el endpoint anterior POST /certificates, que devolvía PDF directamente.
      if (res.status === 404) {
        res = await fetch(`${API_URL}/certificates`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        let message = "No se pudo generar el PDF interno.";

        try {
          const errorData = await res.json();
          message = errorData?.message || message;
        } catch {
          // Si no vino JSON, mantenemos el mensaje por defecto.
        }

        throw new Error(message);
      }

      const contentType = res.headers.get("Content-Type") || "";

      if (!contentType.toLowerCase().includes("pdf")) {
        throw new Error(
          "El servidor respondió correctamente, pero no devolvió un PDF. Revise si el backend ya fue reemplazado y reiniciado.",
        );
      }

      const blob = await res.blob();
      downloadPdfBlob(blob);
    } catch (error: any) {
      alert(error?.message || "Error generando PDF interno.");
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    localStorage.removeItem("selectedPatient");
    setLatestClinicalSource("");
    setLoadingClinicalData(false);

    setFormData({
      patientId: "",
      issueDate: todayDate(),
      place: "Arequipa",
      service: "Consulta médica",
      attentionDate: todayDate(),
      attentionTime: "",
      permanenceTime: "",
      diagnosisCode: "",
      diagnosisDescription: "",
      restDays: "",
      restFrom: todayDate(),
      restTo: todayDate(),
      purpose: "",
      conclusion: "",
      restrictions: "",
      observations: "",
      officialCode: "",
      physicalCertificateNumber: "",
      sinadefCode: "",
      deathDateTime: "",
      deathPlace: "",
      probableCause: "",
      clinicalSummary: "",
    });
  };

  const renderCommonPatientFields = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="md:col-span-2">
        <label className="block font-semibold text-slate-700 mb-1">
          Paciente *
        </label>
        <select
          name="patientId"
          value={formData.patientId}
          onChange={(e) => {
            const patientId = e.target.value;
            setFormData((prev) => ({ ...prev, patientId }));

            if (!patientId) {
              localStorage.removeItem("selectedPatient");
              setLatestClinicalSource("");
              return;
            }

            const patient = patients.find(
              (p) => String(p.id) === String(patientId),
            );
            if (patient) {
              localStorage.setItem("selectedPatient", JSON.stringify(patient));
            }
          }}
          className="w-full border p-2 rounded bg-white"
        >
          <option value="">-- Seleccione paciente --</option>
          {patients.map((p) => (
            <option key={p.id} value={p.id}>
              {p.fullName} ({p.documentNumber || "sin documento"})
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block font-semibold text-slate-700 mb-1">Lugar</label>
        <input
          name="place"
          value={formData.place}
          onChange={handleChange}
          className="w-full border p-2 rounded"
        />
      </div>

      {selectedPatient && (
        <div className="md:col-span-3 rounded-lg border bg-emerald-50 p-3 text-sm text-emerald-900">
          <b>Paciente seleccionado:</b> {selectedPatient.fullName} |{" "}
          {selectedPatient.documentType || "DNI"}:{" "}
          {selectedPatient.documentNumber || "—"} | Teléfono:{" "}
          {selectedPatient.phone || "—"}
        </div>
      )}
    </div>
  );

  const renderAttentionFields = () => (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div>
        <label className="block font-semibold text-slate-700 mb-1">
          Fecha emisión
        </label>
        <input
          type="date"
          name="issueDate"
          value={formData.issueDate}
          onChange={handleChange}
          className="w-full border p-2 rounded"
        />
      </div>

      <div>
        <label className="block font-semibold text-slate-700 mb-1">
          Fecha atención
        </label>
        <input
          type="date"
          name="attentionDate"
          value={formData.attentionDate}
          onChange={handleChange}
          className="w-full border p-2 rounded"
        />
      </div>

      <div>
        <label className="block font-semibold text-slate-700 mb-1">
          Hora atención
        </label>
        <input
          type="time"
          name="attentionTime"
          value={formData.attentionTime}
          onChange={handleChange}
          className="w-full border p-2 rounded"
        />
      </div>

      <div>
        <label className="block font-semibold text-slate-700 mb-1">
          Servicio *
        </label>
        <input
          name="service"
          value={formData.service}
          onChange={handleChange}
          className="w-full border p-2 rounded"
          placeholder="Consulta médica, tópico, procedimiento..."
        />
      </div>
    </div>
  );

  const renderDiagnosisFields = () => (
    <div className="space-y-3">
      {(loadingClinicalData || latestClinicalSource) && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
          {loadingClinicalData
            ? "Cargando último diagnóstico del paciente..."
            : latestClinicalSource}
        </div>
      )}

      <div className="relative">
        <label className="block font-semibold text-slate-700 mb-1">
          Buscar en catálogo CIE-10
        </label>
        <input
          type="text"
          value={diagnosisSearch}
          onChange={(event) => {
            setDiagnosisSearch(event.target.value);
            setShowDiagnosisDropdown(event.target.value.trim().length >= 2);
          }}
          onFocus={() => {
            if (diagnosisSearch.trim().length >= 2) {
              setShowDiagnosisDropdown(true);
            }
          }}
          onBlur={() => {
            window.setTimeout(() => setShowDiagnosisDropdown(false), 150);
          }}
          placeholder="Código, diagnóstico o sinónimo..."
          className="w-full rounded-lg border border-cyan-300 p-3 pr-24 focus:outline-none focus:ring-2 focus:ring-cyan-500"
        />
        <span className="absolute right-3 top-10 text-xs font-semibold text-slate-500">
          {diagnosisSearchLoading ? "Buscando..." : "CIE-10"}
        </span>

        {showDiagnosisDropdown && !diagnosisSearchLoading && (
          <div className="absolute z-40 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-xl">
            {diagnosisResults.length > 0 ? (
              diagnosisResults.map((diagnosis) => (
                <button
                  key={diagnosis.id}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectDiagnosis(diagnosis)}
                  className="block w-full border-b border-slate-100 px-4 py-3 text-left hover:bg-cyan-50 last:border-b-0"
                >
                  <span className="font-extrabold text-cyan-800">
                    {diagnosis.code}
                  </span>
                  <span className="ml-2 font-semibold text-slate-800">
                    {diagnosis.description || diagnosis.desc}
                  </span>
                  {diagnosis.synonyms && diagnosis.synonyms.length > 0 && (
                    <span className="mt-1 block text-xs text-slate-500">
                      Sinónimos: {diagnosis.synonyms.join("; ")}
                    </span>
                  )}
                </button>
              ))
            ) : (
              <p className="px-4 py-3 text-sm text-slate-500">
                No se encontraron coincidencias en el catálogo activo.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block font-semibold text-slate-700 mb-1">
            CIE-10
          </label>
          <input
            name="diagnosisCode"
            value={formData.diagnosisCode}
            onChange={handleChange}
            className="w-full border p-2 rounded"
            placeholder="Ej. J06.9"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block font-semibold text-slate-700 mb-1">
            Diagnóstico / condición clínica
          </label>
          <input
            name="diagnosisDescription"
            value={formData.diagnosisDescription}
            onChange={handleChange}
            className="w-full border p-2 rounded"
            placeholder="Ej. Infección respiratoria aguda"
          />
        </div>
      </div>
    </div>
  );

  const renderRestFields = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <label className="block font-semibold text-slate-700 mb-1">
          Días de descanso
        </label>
        <input
          type="number"
          min="0"
          name="restDays"
          value={formData.restDays}
          onChange={handleChange}
          className="w-full border p-2 rounded"
        />
      </div>

      <div>
        <label className="block font-semibold text-slate-700 mb-1">Desde</label>
        <input
          type="date"
          name="restFrom"
          value={formData.restFrom}
          onChange={handleChange}
          className="w-full border p-2 rounded"
        />
      </div>

      <div>
        <label className="block font-semibold text-slate-700 mb-1">Hasta</label>
        <input
          type="date"
          name="restTo"
          value={formData.restTo}
          onChange={handleChange}
          className="w-full border p-2 rounded bg-slate-50"
        />
      </div>

      {formData.restFrom !== formData.attentionDate && (
        <div className="md:col-span-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          Advertencia CMP físico: el descanso médico debe iniciar en la misma
          fecha de la atención médica.
        </div>
      )}
    </div>
  );

  const renderActionButtons = () => (
    <div className="flex flex-col md:flex-row gap-3 pt-2">
      <button
        type="button"
        onClick={saveCertificate}
        disabled={saving || activeTab === "HISTORY"}
        className="bg-emerald-600 text-white px-5 py-3 rounded-lg font-semibold hover:bg-emerald-700 disabled:opacity-50"
      >
        {saving ? "Guardando..." : "Guardar en historial"}
      </button>

      <button
        type="button"
        onClick={generatePdf}
        disabled={saving || activeTab === "HISTORY"}
        className="bg-slate-700 text-white px-5 py-3 rounded-lg font-semibold hover:bg-slate-800 disabled:opacity-50"
      >
        Generar PDF interno
      </button>

      <button
        type="button"
        onClick={resetForm}
        className="bg-gray-100 text-slate-700 px-5 py-3 rounded-lg font-semibold hover:bg-gray-200"
      >
        Limpiar formulario
      </button>
    </div>
  );

  const renderAttendanceCertificate = () => (
    <div className="space-y-5">
      <InfoBox title="Constancia institucional" color="emerald">
        Este documento acredita que el paciente fue atendido en la institución.
        Puede usarse para trabajo, colegio, universidad o justificación de
        asistencia.
      </InfoBox>

      {renderCommonPatientFields()}
      {renderAttentionFields()}

      <div>
        <label className="block font-semibold text-slate-700 mb-1">
          Tiempo de permanencia
        </label>
        <input
          name="permanenceTime"
          value={formData.permanenceTime}
          onChange={handleChange}
          className="w-full border p-2 rounded"
          placeholder="Ej. 08:30 a 09:15 / 45 minutos"
        />
      </div>

      {renderDiagnosisFields()}

      <TextAreaField
        label="Observaciones / procedimiento realizado"
        name="observations"
        value={formData.observations}
        onChange={handleChange}
        placeholder="Ej. Se brindó evaluación clínica, indicaciones y tratamiento correspondiente."
      />

      {renderActionButtons()}
    </div>
  );

  const renderInstitutionalCertificate = () => (
    <div className="space-y-5">
      <InfoBox title="Certificado médico institucional" color="blue">
        Este certificado es propio de la institución. No reemplaza al
        certificado físico CMP ni al Certificado Médico Digital CMP.
      </InfoBox>

      {renderCommonPatientFields()}
      {renderAttentionFields()}
      {renderDiagnosisFields()}
      {renderRestFields()}

      <TextAreaField
        label="Conclusión médica"
        name="conclusion"
        value={formData.conclusion}
        onChange={handleChange}
        placeholder="Ej. Paciente clínicamente estable al momento de la evaluación..."
      />

      <TextAreaField
        label="Restricciones / recomendaciones"
        name="restrictions"
        value={formData.restrictions}
        onChange={handleChange}
      />

      {renderActionButtons()}
    </div>
  );

  const renderCmpPhysical = () => (
    <div className="space-y-5">
      <InfoBox title="Guía para certificado físico CMP" color="amber">
        HCELM no reemplaza el formato físico CMP. Esta sección prepara los datos
        obligatorios para llenar el formato físico y registrar su trazabilidad
        interna.
      </InfoBox>

      {renderCommonPatientFields()}
      {renderAttentionFields()}
      {renderDiagnosisFields()}
      {renderRestFields()}

      <div>
        <label className="block font-semibold text-slate-700 mb-1">
          N° de certificado físico CMP
        </label>
        <input
          name="physicalCertificateNumber"
          value={formData.physicalCertificateNumber}
          onChange={handleChange}
          className="w-full border p-2 rounded"
          placeholder="Ej. 0023301"
        />
      </div>

      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900">
        <p className="font-bold mb-2">
          Campos obligatorios para el formato físico CMP:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Nombres y apellidos completos tal como figura en el DNI.</li>
          <li>DNI del paciente.</li>
          <li>Servicio brindado.</li>
          <li>Diagnóstico + CIE-10.</li>
          <li>Número de días de descanso.</li>
          <li>Fecha desde y hasta.</li>
          <li>Fecha de emisión, firma y sello legibles.</li>
        </ul>
      </div>

      {renderActionButtons()}
    </div>
  );

  const renderCmpDigital = () => (
    <div className="space-y-5">
      <InfoBox
        title="Borrador para Certificado Médico Digital CMP"
        color="indigo"
      >
        Esta sección prepara el borrador interno. La emisión oficial debe
        realizarse en la plataforma CMP por el médico habilitado con el
        mecanismo de autenticación correspondiente.
      </InfoBox>

      {renderCommonPatientFields()}
      {renderAttentionFields()}
      {renderDiagnosisFields()}
      {renderRestFields()}

      <div>
        <label className="block font-semibold text-slate-700 mb-1">
          Código del certificado digital emitido
        </label>
        <input
          name="officialCode"
          value={formData.officialCode}
          onChange={handleChange}
          className="w-full border p-2 rounded"
          placeholder="Registrar aquí el código oficial luego de emitirlo en CMP"
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => openExternal(CMP_DIGITAL_URL)}
          className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 font-semibold"
        >
          Ver información CMD CMP
        </button>

        <button
          type="button"
          onClick={() => openExternal(CMP_AYNI_URL)}
          className="bg-slate-700 text-white px-4 py-2 rounded hover:bg-slate-800 font-semibold"
        >
          Abrir plataforma AYNI CMP
        </button>
      </div>

      {renderActionButtons()}
    </div>
  );

  const renderSinadef = () => (
    <div className="space-y-5">
      <InfoBox title="Pase clínico para SINADEF" color="red">
        HCELM prepara el resumen clínico y registra trazabilidad. El certificado
        oficial de defunción se emite en SINADEF. Esta sección también debe
        conectarse con Anamnesis → Destino final → Fallecido.
      </InfoBox>

      {renderCommonPatientFields()}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block font-semibold text-slate-700 mb-1">
            Fecha y hora de fallecimiento *
          </label>
          <input
            type="datetime-local"
            name="deathDateTime"
            value={formData.deathDateTime}
            onChange={handleChange}
            className="w-full border p-2 rounded"
          />
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">
            Lugar de fallecimiento
          </label>
          <input
            name="deathPlace"
            value={formData.deathPlace}
            onChange={handleChange}
            className="w-full border p-2 rounded"
            placeholder="Consultorio, domicilio, traslado, etc."
          />
        </div>
      </div>

      <TextAreaField
        label="Causa probable *"
        name="probableCause"
        value={formData.probableCause}
        onChange={handleChange}
      />

      <TextAreaField
        label="Resumen clínico"
        name="clinicalSummary"
        value={formData.clinicalSummary}
        onChange={handleChange}
      />

      <div>
        <label className="block font-semibold text-slate-700 mb-1">
          Código/certificado SINADEF emitido
        </label>
        <input
          name="sinadefCode"
          value={formData.sinadefCode}
          onChange={handleChange}
          className="w-full border p-2 rounded"
          placeholder="Registrar aquí el código oficial si ya fue emitido"
        />
      </div>

      <button
        type="button"
        onClick={() => openExternal(SINADEF_URL)}
        className="bg-red-700 text-white px-4 py-2 rounded hover:bg-red-800 font-semibold"
      >
        Abrir plataforma SINADEF
      </button>

      {renderActionButtons()}
    </div>
  );

  const renderHistory = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800">
            Historial de certificados y documentos
          </h2>
          <p className="text-sm text-slate-600">
            Documentos guardados en HCELM.
          </p>
        </div>

        <button
          type="button"
          onClick={loadCertificates}
          className="bg-slate-700 text-white px-4 py-2 rounded hover:bg-slate-800"
        >
          Actualizar
        </button>
      </div>

      {certificates.length === 0 ? (
        <div className="rounded-lg border bg-white p-5 text-slate-500">
          Aún no hay certificados registrados.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100 text-slate-700">
              <tr>
                <th className="p-3 text-left">Fecha</th>
                <th className="p-3 text-left">Paciente</th>
                <th className="p-3 text-left">Tipo</th>
                <th className="p-3 text-left">Diagnóstico</th>
                <th className="p-3 text-left">Días</th>
                <th className="p-3 text-left">Observaciones</th>
              </tr>
            </thead>
            <tbody>
              {certificates.map((cert) => (
                <tr key={cert.id} className="border-t hover:bg-slate-50">
                  <td className="p-3 whitespace-nowrap">
                    {formatDate(cert.issueDate || cert.createdAt)}
                  </td>
                  <td className="p-3">
                    {cert.patient?.fullName || cert.patientId}
                  </td>
                  <td className="p-3 font-semibold">
                    {typeLabels[cert.certificateType] || cert.certificateType}
                  </td>
                  <td className="p-3">{cert.diagnoses?.join(", ") || "—"}</td>
                  <td className="p-3">{cert.restDays ?? "—"}</td>
                  <td className="p-3 max-w-sm whitespace-pre-wrap text-xs text-slate-600">
                    {cert.observations || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const renderActiveContent = () => {
    if (activeTab === "ATTENDANCE_CERTIFICATE")
      return renderAttendanceCertificate();
    if (activeTab === "INSTITUTIONAL_MEDICAL_CERTIFICATE")
      return renderInstitutionalCertificate();
    if (activeTab === "CMP_PHYSICAL_MEDICAL_CERTIFICATE")
      return renderCmpPhysical();
    if (activeTab === "CMP_DIGITAL_MEDICAL_CERTIFICATE_DRAFT")
      return renderCmpDigital();
    if (activeTab === "DEATH_CLINICAL_PASS") return renderSinadef();
    return renderHistory();
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">
          Módulo de certificados
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Constancias institucionales, certificados médicos, guía CMP físico,
          borrador CMP digital y pase clínico para SINADEF.
        </p>
      </div>

      <div className="mb-4 rounded-lg border bg-white p-3 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-2 rounded-lg text-sm font-semibold transition ${
                activeTab === tab.id
                  ? "bg-teal-700 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <p className="text-xs text-slate-500 mt-3">
          {tabs.find((tab) => tab.id === activeTab)?.description}
        </p>
      </div>

      {loading ? (
        <div className="rounded-lg border bg-white p-6 text-slate-600">
          Cargando módulo...
        </div>
      ) : (
        <div className="rounded-lg border bg-white p-5 shadow-sm">
          {renderActiveContent()}
        </div>
      )}
    </div>
  );
}

function InfoBox({
  title,
  color,
  children,
}: {
  title: string;
  color: "emerald" | "blue" | "amber" | "indigo" | "red";
  children: React.ReactNode;
}) {
  const styles: Record<string, string> = {
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-900",
    blue: "border-blue-200 bg-blue-50 text-blue-900",
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    indigo: "border-indigo-200 bg-indigo-50 text-indigo-900",
    red: "border-red-200 bg-red-50 text-red-900",
  };

  return (
    <div className={`rounded-lg border p-4 text-sm ${styles[color]}`}>
      <p className="font-bold mb-1">{title}</p>
      <div>{children}</div>
    </div>
  );
}

function TextAreaField({
  label,
  name,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block font-semibold text-slate-700 mb-1">{label}</label>
      <textarea
        name={name}
        value={value}
        onChange={onChange}
        className="w-full border p-2 rounded h-24"
        placeholder={placeholder}
      />
    </div>
  );
}
