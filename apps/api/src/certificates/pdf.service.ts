import PDFDocument from "pdfkit";
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class PdfService {
  constructor(private readonly prisma: PrismaService) {}

  async generateCertificate(data: any) {
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const buffers: Buffer[] = [];

    doc.on("data", buffers.push.bind(buffers));

    try {
      const establishment = await this.getEstablishment(data);
      const certificateType = String(
        data?.certificateType || "REST_CERTIFICATE",
      );

      this.drawHeader(doc, establishment);
      this.drawTitle(doc, certificateType);
      this.drawBody(doc, certificateType, data, establishment);
      this.drawSignature(doc, establishment);

      doc.end();
    } catch (error) {
      console.error("ERROR CRÍTICO EN PDF:", error);
      doc.fontSize(12).fillColor("#000").text("Error generando el documento.");
      doc.end();
    }

    return new Promise<Buffer>((resolve) => {
      doc.on("end", () => resolve(Buffer.concat(buffers)));
    });
  }

  private async getEstablishment(data: any) {
    let establishment: any = {};

    try {
      const tenantId = data?.patient?.tenantId || data?.tenantId;

      if (tenantId) {
        establishment =
          (await (this.prisma as any).establishment.findUnique({
            where: { tenantId },
          })) || {};
      }
    } catch (dbError) {
      console.warn("Error cargando establecimiento:", dbError);
    }

    return establishment || {};
  }

  private drawHeader(doc: any, establishment: any) {
    if (
      establishment.logoUrl &&
      typeof establishment.logoUrl === "string" &&
      establishment.logoUrl.startsWith("data:image")
    ) {
      try {
        doc.image(establishment.logoUrl, 50, 40, { width: 80, height: 80 });
      } catch {
        // Si el logo no carga, se continúa sin interrumpir el PDF.
      }
    }

    doc
      .fontSize(16)
      .font("Helvetica-Bold")
      .fillColor("#0f766e")
      .text(
        establishment.name || "CONSULTORIO MÉDICO Y TÓPICO LAS MERCEDES",
        145,
        50,
        {
          align: "left",
        },
      );

    doc
      .fontSize(10)
      .font("Helvetica")
      .fillColor("#333")
      .text(establishment.address || "Arequipa, Perú", 145, 72, {
        align: "left",
      });

    if (establishment.phone) {
      doc.fontSize(10).text(`Teléfono: ${establishment.phone}`, 145, 88);
    }

    doc
      .moveTo(50, 110)
      .lineTo(550, 110)
      .strokeColor("#0f766e")
      .lineWidth(2)
      .stroke();
    doc.y = 135;
  }

  private drawTitle(doc: any, certificateType: string) {
    const title = this.getTitle(certificateType);

    doc
      .fontSize(17)
      .font("Helvetica-Bold")
      .fillColor("#000")
      .text(title, 50, doc.y, { align: "center", width: 500 });

    doc.moveDown(1.5);

    if (
      certificateType === "CMP_PHYSICAL_MEDICAL_CERTIFICATE" ||
      certificateType === "CMP_DIGITAL_MEDICAL_CERTIFICATE_DRAFT" ||
      certificateType === "DEATH_CLINICAL_PASS"
    ) {
      doc
        .fontSize(9)
        .font("Helvetica-Oblique")
        .fillColor("#7f1d1d")
        .text(this.getOfficialPlatformWarning(certificateType), {
          align: "center",
        });
      doc.moveDown(1.2);
    }
  }

  private drawBody(
    doc: any,
    certificateType: string,
    data: any,
    establishment: any,
  ) {
    const issueDate = data.issueDate ? new Date(data.issueDate) : new Date();
    const issueDateText = this.formatDate(issueDate);
    const place = data.place || "Arequipa";
    const patientName =
      data.patientName || data.patient?.fullName || "PACIENTE NO ESPECIFICADO";
    const patientDoc = data.patientDoc || data.patient?.documentNumber || "S/N";
    const patientDocumentType = data.patient?.documentType || "DNI";
    const service = data.service || "Consulta médica";
    const attentionDate =
      data.attentionDate || data.issueDate || this.toInputDate(issueDate);
    const attentionTime = data.attentionTime || "";
    const diagnosis = this.getDiagnosisText(data);

    doc.fontSize(11).font("Helvetica").fillColor("#000");
    doc.text(`Lugar y fecha de emisión: ${place}, ${issueDateText}`, {
      align: "justify",
    });
    doc.moveDown(0.8);

    this.drawPatientBox(doc, patientName, patientDocumentType, patientDoc);

    switch (certificateType) {
      case "ATTENDANCE_CERTIFICATE":
        this.drawAttendanceCertificate(
          doc,
          data,
          service,
          attentionDate,
          attentionTime,
          diagnosis,
        );
        break;
      case "INSTITUTIONAL_MEDICAL_CERTIFICATE":
        this.drawInstitutionalMedicalCertificate(
          doc,
          data,
          service,
          attentionDate,
          diagnosis,
        );
        break;
      case "CMP_PHYSICAL_MEDICAL_CERTIFICATE":
        this.drawCmpPhysicalGuide(doc, data, service, attentionDate, diagnosis);
        break;
      case "CMP_DIGITAL_MEDICAL_CERTIFICATE_DRAFT":
        this.drawCmpDigitalDraft(doc, data, service, attentionDate, diagnosis);
        break;
      case "DEATH_CLINICAL_PASS":
        this.drawDeathClinicalPass(
          doc,
          data,
          patientName,
          patientDocumentType,
          patientDoc,
        );
        break;
      case "REST_CERTIFICATE":
      default:
        this.drawRestCertificate(doc, data, service, attentionDate, diagnosis);
        break;
    }

    if (data.observations) {
      doc.moveDown(1);
      doc
        .font("Helvetica-Bold")
        .text("OBSERVACIONES / DETALLE REGISTRADO:", { underline: true });
      doc.moveDown(0.4);
      doc
        .font("Helvetica")
        .fontSize(10)
        .text(String(data.observations), { align: "justify" });
    }
  }

  private drawPatientBox(
    doc: any,
    patientName: string,
    documentType: string,
    patientDoc: string,
  ) {
    const boxY = doc.y;
    const boxHeight = 56;

    doc.rect(50, boxY, 500, boxHeight).strokeColor("#cccccc").stroke();
    doc
      .font("Helvetica-Bold")
      .fontSize(11)
      .fillColor("#000")
      .text("DATOS DEL PACIENTE", 60, boxY + 8);
    doc
      .font("Helvetica")
      .fontSize(11)
      .text(`Nombres y apellidos: ${patientName}`, 60, boxY + 25);
    doc.text(`${documentType}: ${patientDoc}`, 60, boxY + 40);
    doc.y = boxY + boxHeight + 15;
  }

  private drawAttendanceCertificate(
    doc: any,
    data: any,
    service: string,
    attentionDate: string,
    attentionTime: string,
    diagnosis: string,
  ) {
    doc
      .font("Helvetica")
      .fontSize(12)
      .text(
        `Se deja constancia que el paciente antes mencionado fue atendido en nuestra institución en el servicio de ${service}, el día ${this.formatInputDate(attentionDate)}${attentionTime ? ` a horas ${attentionTime}` : ""}.`,
        { align: "justify" },
      );
    doc.moveDown(1);

    if (data.permanenceTime) {
      doc.text(`Tiempo de permanencia aproximado: ${data.permanenceTime}.`, {
        align: "justify",
      });
      doc.moveDown(0.8);
    }

    if (diagnosis) {
      doc
        .font("Helvetica-Bold")
        .text("Diagnóstico / motivo clínico:", { underline: true });
      doc.font("Helvetica").text(diagnosis, { indent: 20 });
      doc.moveDown(0.8);
    }

    doc.text(
      "Se expide la presente constancia a solicitud del interesado para los fines que estime conveniente.",
      { align: "justify" },
    );
  }

  private drawInstitutionalMedicalCertificate(
    doc: any,
    data: any,
    service: string,
    attentionDate: string,
    diagnosis: string,
  ) {
    doc
      .font("Helvetica")
      .fontSize(12)
      .text(
        `El médico que suscribe certifica haber evaluado al paciente antes mencionado en el servicio de ${service}, con fecha ${this.formatInputDate(attentionDate)}.`,
        { align: "justify" },
      );
    doc.moveDown(1);
    this.drawDiagnosisAndRest(doc, data, diagnosis);

    if (data.conclusion) {
      doc.font("Helvetica-Bold").text("CONCLUSIÓN:", { underline: true });
      doc.font("Helvetica").text(data.conclusion, { align: "justify" });
      doc.moveDown(0.8);
    }

    if (data.restrictions) {
      doc
        .font("Helvetica-Bold")
        .text("RESTRICCIONES / RECOMENDACIONES:", { underline: true });
      doc.font("Helvetica").text(data.restrictions, { align: "justify" });
      doc.moveDown(0.8);
    }
  }

  private drawCmpPhysicalGuide(
    doc: any,
    data: any,
    service: string,
    attentionDate: string,
    diagnosis: string,
  ) {
    doc
      .font("Helvetica")
      .fontSize(12)
      .text(
        "El presente documento es una guía interna para el llenado del Certificado Médico Físico del Colegio Médico del Perú. No reemplaza al formato oficial físico.",
        { align: "justify" },
      );
    doc.moveDown(1);
    this.drawKeyValue(doc, "Servicio", service);
    this.drawKeyValue(
      doc,
      "Fecha de atención",
      this.formatInputDate(attentionDate),
    );
    this.drawKeyValue(
      doc,
      "N° certificado físico CMP",
      data.physicalCertificateNumber || "Pendiente de registrar",
    );
    this.drawDiagnosisAndRest(doc, data, diagnosis);
  }

  private drawCmpDigitalDraft(
    doc: any,
    data: any,
    service: string,
    attentionDate: string,
    diagnosis: string,
  ) {
    doc
      .font("Helvetica")
      .fontSize(12)
      .text(
        "Borrador interno para completar el Certificado Médico Digital CMP en la plataforma oficial del Colegio Médico del Perú.",
        { align: "justify" },
      );
    doc.moveDown(1);
    this.drawKeyValue(doc, "Servicio", service);
    this.drawKeyValue(
      doc,
      "Fecha de atención",
      this.formatInputDate(attentionDate),
    );
    this.drawKeyValue(
      doc,
      "Código CMD emitido",
      data.officialCode || "Pendiente de registrar",
    );
    this.drawDiagnosisAndRest(doc, data, diagnosis);
  }

  private drawDeathClinicalPass(
    doc: any,
    data: any,
    patientName: string,
    documentType: string,
    patientDoc: string,
  ) {
    doc
      .font("Helvetica")
      .fontSize(12)
      .text(
        "Pase clínico interno para apoyar la certificación de defunción en la plataforma SINADEF. Este documento no reemplaza el certificado oficial emitido en SINADEF.",
        { align: "justify" },
      );
    doc.moveDown(1);
    this.drawKeyValue(doc, "Paciente fallecido", patientName);
    this.drawKeyValue(doc, "Documento", `${documentType} ${patientDoc}`);
    this.drawKeyValue(
      doc,
      "Fecha y hora de fallecimiento",
      data.deathDateTime || "No registrada",
    );
    this.drawKeyValue(
      doc,
      "Lugar de fallecimiento",
      data.deathPlace || "No registrado",
    );
    this.drawKeyValue(
      doc,
      "Causa probable",
      data.probableCause || "No registrada",
    );
    this.drawKeyValue(
      doc,
      "Código / certificado SINADEF",
      data.sinadefCode || "Pendiente de registrar",
    );

    if (data.clinicalSummary) {
      doc.moveDown(0.6);
      doc.font("Helvetica-Bold").text("RESUMEN CLÍNICO:", { underline: true });
      doc.font("Helvetica").text(data.clinicalSummary, { align: "justify" });
    }
  }

  private drawRestCertificate(
    doc: any,
    data: any,
    service: string,
    attentionDate: string,
    diagnosis: string,
  ) {
    doc
      .font("Helvetica")
      .fontSize(12)
      .text(
        `El médico que suscribe certifica haber atendido al paciente antes mencionado en el servicio de ${service}, con fecha ${this.formatInputDate(attentionDate)}.`,
        { align: "justify" },
      );
    doc.moveDown(1);
    this.drawDiagnosisAndRest(doc, data, diagnosis);
  }

  private drawDiagnosisAndRest(doc: any, data: any, diagnosis: string) {
    if (diagnosis) {
      doc.font("Helvetica-Bold").text("DIAGNÓSTICO:", { underline: true });
      doc.font("Helvetica").text(diagnosis, { indent: 20 });
      doc.moveDown(0.8);
    }

    const restDays = data.restDays ? Number(data.restDays) : 0;

    if (restDays > 0) {
      doc.font("Helvetica-Bold").text("DESCANSO MÉDICO:", { underline: true });
      doc
        .font("Helvetica")
        .text(
          `Se indica descanso médico por ${restDays} día(s), desde el ${this.formatInputDate(data.restFrom || data.issueDate)} hasta el ${this.formatInputDate(data.restTo || data.issueDate)} inclusive.`,
          { align: "justify" },
        );
      doc.moveDown(0.8);
    }

    if (data.purpose) {
      this.drawKeyValue(doc, "Finalidad", data.purpose);
    }
  }

  private drawKeyValue(doc: any, key: string, value: string) {
    doc
      .font("Helvetica-Bold")
      .fontSize(11)
      .text(`${key}: `, { continued: true });
    doc
      .font("Helvetica")
      .fontSize(11)
      .text(value || "—");
    doc.moveDown(0.35);
  }

  private drawSignature(doc: any, establishment: any) {
    const firmY = 700;
    const directorName =
      establishment.directorName || "Dr. Alfonso Rodríguez Rojas";
    const directorCmp = establishment.directorCmp || "CMP 43992";
    const directorRne = establishment.directorRne || "";

    doc
      .moveTo(190, firmY)
      .lineTo(410, firmY)
      .strokeColor("#000")
      .lineWidth(1)
      .stroke();
    doc
      .font("Helvetica-Bold")
      .fontSize(11)
      .fillColor("#000")
      .text(directorName, 180, firmY + 10, {
        width: 240,
        align: "center",
      });
    doc
      .font("Helvetica")
      .fontSize(10)
      .text(directorCmp, 180, firmY + 25, {
        width: 240,
        align: "center",
      });

    if (directorRne) {
      doc
        .font("Helvetica")
        .fontSize(10)
        .text(directorRne, 180, firmY + 39, {
          width: 240,
          align: "center",
        });
    }

    doc
      .font("Helvetica-Oblique")
      .fontSize(9)
      .text("Médico Cirujano", 180, firmY + 53, {
        width: 240,
        align: "center",
      });
  }

  private getTitle(certificateType: string) {
    switch (certificateType) {
      case "ATTENDANCE_CERTIFICATE":
        return "CONSTANCIA DE ATENCIÓN";
      case "INSTITUTIONAL_MEDICAL_CERTIFICATE":
        return "CERTIFICADO MÉDICO INSTITUCIONAL";
      case "CMP_PHYSICAL_MEDICAL_CERTIFICATE":
        return "GUÍA PARA CERTIFICADO MÉDICO FÍSICO CMP";
      case "CMP_DIGITAL_MEDICAL_CERTIFICATE_DRAFT":
        return "BORRADOR PARA CERTIFICADO MÉDICO DIGITAL CMP";
      case "DEATH_CLINICAL_PASS":
        return "PASE CLÍNICO PARA SINADEF";
      case "REST_CERTIFICATE":
      default:
        return "CERTIFICADO DE DESCANSO MÉDICO";
    }
  }

  private getOfficialPlatformWarning(certificateType: string) {
    switch (certificateType) {
      case "CMP_PHYSICAL_MEDICAL_CERTIFICATE":
        return "Documento interno de apoyo. El formato oficial físico CMP debe llenarse y conservarse según corresponda.";
      case "CMP_DIGITAL_MEDICAL_CERTIFICATE_DRAFT":
        return "Documento interno de apoyo. El certificado oficial se emite en la plataforma digital del CMP.";
      case "DEATH_CLINICAL_PASS":
        return "Documento interno de apoyo. El certificado oficial de defunción se emite en SINADEF.";
      default:
        return "";
    }
  }

  private getDiagnosisText(data: any) {
    if (Array.isArray(data?.diagnoses) && data.diagnoses.length > 0) {
      return data.diagnoses.filter(Boolean).join("\n");
    }

    const code = String(data?.diagnosisCode || "").trim();
    const desc = String(data?.diagnosisDescription || "").trim();

    if (code && desc) return `${code} - ${desc}`;
    return desc || code || "";
  }

  private formatDate(date: Date) {
    return date.toLocaleDateString("es-PE", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  }

  private formatInputDate(value?: string) {
    if (!value) return "—";

    try {
      return new Date(`${value}T00:00:00`).toLocaleDateString("es-PE");
    } catch {
      return value;
    }
  }

  private toInputDate(date: Date) {
    return date.toISOString().split("T")[0];
  }
}
