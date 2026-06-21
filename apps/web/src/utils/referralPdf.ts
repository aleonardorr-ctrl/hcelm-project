// HCELM - utils/referralPdf.ts
// Generador PDF de hoja de referencia clínica.
import { cleanPrefix } from './recipePdf';

export function generateReferralPdf({
  institution,
  patient,
  formData,
  destinationDetails,
}: {
  institution: any;
  patient: any;
  formData: any;
  destinationDetails: any;
}) {
  if (!patient) {
    alert('Seleccione un paciente antes de generar la hoja de referencia.');
    return;
  }

  const professionalName =
    localStorage.getItem('hcelm_professional_name') || institution?.directorName || '';

  const professionalDni = localStorage.getItem('hcelm_professional_dni') || '';

  const professionalCmpRaw =
    localStorage.getItem('hcelm_professional_cmp') || institution?.directorCmp || '';

  const professionalRneRaw =
    localStorage.getItem('hcelm_professional_rne') || institution?.directorRne || '';

  const professionalCmp = cleanPrefix(professionalCmpRaw, 'CMP');
  const professionalRne = cleanPrefix(professionalRneRaw, 'RNE');

  const primaryColor = institution?.primaryColor || '#0f766e';

  const hceNumber = patient?.hceNumber || 'HCE pendiente de generar';

  const logoWidth = Number(institution?.logoWidth || 70);
  const logoHeight = Number(institution?.logoHeight || 70);

  const sealSize = Number(institution?.sealWidth || 200);
  const signatureWidth = Math.round(sealSize * 0.62);
  const signatureHeight = Math.round(sealSize * 0.32);

  const fechaHora = new Date().toLocaleString('es-PE', {
    dateStyle: 'short',
    timeStyle: 'short',
  });

  const secondaryDiagnoses = Array.isArray(formData?.diagnosticosSecundarios)
    ? formData.diagnosticosSecundarios
    : [];

  const html = `
  <html>
    <head>
      <title>Hoja de Referencia</title>

      <style>
        @page {
          size: A4;
          margin: 15mm;
        }

        body {
          font-family: Arial, sans-serif;
          color: #111827;
          margin: 0;
          padding: 0;
          font-size: 12px;
        }

        .header {
          border-bottom: 3px solid ${primaryColor};
          padding-bottom: 10px;
          margin-bottom: 12px;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .logo {
          width: ${logoWidth}px;
          height: ${logoHeight}px;
          object-fit: contain;
          border: 1px solid #e5e7eb;
          padding: 3px;
        }

        .institution-name {
          font-size: 18px;
          font-weight: bold;
          color: ${primaryColor};
          margin: 0 0 4px 0;
          text-transform: uppercase;
        }

        .hce-banner {
          border: 2px solid ${primaryColor};
          background: #ecfeff;
          color: #0f172a;
          text-align: center;
          font-weight: bold;
          padding: 7px 10px;
          border-radius: 7px;
          margin: 8px 0 12px 0;
          font-size: 13px;
        }

        .small {
          font-size: 11px;
          margin: 2px 0;
          color: #374151;
        }

        .title {
          text-align: center;
          font-size: 18px;
          font-weight: bold;
          color: ${primaryColor};
          margin: 14px 0;
          text-transform: uppercase;
        }

        .section {
          border: 1px solid #d1d5db;
          border-radius: 6px;
          padding: 8px;
          margin-bottom: 9px;
        }

        .section-title {
          font-weight: bold;
          color: ${primaryColor};
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 4px;
          margin-bottom: 7px;
        }

        .grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 5px 12px;
        }

        .field {
          margin: 3px 0;
        }

        .label {
          font-weight: bold;
        }

        .text-block {
          white-space: pre-wrap;
          line-height: 1.45;
          min-height: 34px;
        }

        .diagnosis-item {
          margin: 2px 0;
        }

        .signatures {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 28px;
          margin-top: 20px;
          align-items: end;
        }

        .receiver-signature {
          text-align: center;
          padding-top: 80px;
        }

        .signature-line {
          border-top: 1px solid #111827;
          padding-top: 5px;
          font-size: 11px;
          line-height: 1.35;
        }

        .signature-area {
          text-align: center;
        }

        .signature-box {
          position: relative;
          width: ${sealSize}px;
          height: ${sealSize}px;
          margin: 0 auto 4px auto;
        }

        .seal-img {
          position: absolute;
          left: 50%;
          top: 0;
          transform: translateX(-50%);
          width: ${sealSize}px;
          height: ${sealSize}px;
          object-fit: contain;
          opacity: 0.96;
        }

        .signature-img {
          position: absolute;
          left: 50%;
          bottom: ${Math.round(sealSize * 0.25)}px;
          transform: translateX(-50%);
          width: ${signatureWidth}px;
          height: ${signatureHeight}px;
          object-fit: contain;
          z-index: 10;
        }

        .note {
          font-size: 10px;
          color: #4b5563;
          margin-top: 12px;
          border-left: 3px solid ${primaryColor};
          padding-left: 8px;
        }

        .print-actions {
          margin-top: 18px;
          text-align: center;
        }

        @media print {
          .print-actions {
            display: none;
          }
        }
      </style>
    </head>

    <body>
      <div class="header">
        ${
          institution?.logoUrl
            ? `<img class="logo" src="${institution.logoUrl}" />`
            : `<div class="logo" style="display:flex;align-items:center;justify-content:center;color:#6b7280;font-size:10px;">LOGO</div>`
        }

        <div>
          <p class="institution-name">${institution?.name || 'ESTABLECIMIENTO DE SALUD'}</p>
          <p class="small"><b>Razón social:</b> ${institution?.legalName || 'AME HEALTH SAC'}</p>
          <p class="small"><b>RUC:</b> ${institution?.ruc || '-'}</p>
          <p class="small"><b>Dirección:</b> ${institution?.address || '-'}</p>
          <p class="small"><b>Teléfono:</b> ${institution?.phone || '-'} ${
            institution?.email ? `| <b>Email:</b> ${institution.email}` : ''
          }</p>
        </div>
      </div>

      <div class="title">Hoja de Referencia</div>

      <div class="hce-banner">N.° HCE Digital: ${hceNumber}</div>

      <div class="section">
        <div class="section-title">Datos generales de la referencia</div>
        <div class="grid">
          <p class="field"><span class="label">Fecha y hora:</span> ${fechaHora}</p>
          <p class="field"><span class="label">Establecimiento origen:</span> ${
            institution?.name || ''
          }</p>
          <p class="field"><span class="label">Servicio origen:</span> ${
            destinationDetails?.referenciaServicioOrigen || 'Consultorio / Tópico'
          }</p>
          <p class="field"><span class="label">Establecimiento destino:</span> ${
            destinationDetails?.referenciaDestino || ''
          }</p>
          <p class="field"><span class="label">Servicio destino:</span> ${
            destinationDetails?.referenciaServicioDestino || ''
          }</p>
          <p class="field"><span class="label">Especialidad receptora:</span> ${
            destinationDetails?.referenciaEspecialidad || ''
          }</p>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Datos del paciente</div>
        <div class="grid">
          <p class="field"><span class="label">Paciente:</span> ${patient?.fullName || ''}</p>
          <p class="field"><span class="label">N.° HCE Digital:</span> ${hceNumber}</p>
          <p class="field"><span class="label">Documento:</span> ${
            patient?.documentNumber || ''
          }</p>
          <p class="field"><span class="label">Tipo documento:</span> ${
            patient?.documentType || 'DNI'
          }</p>
          <p class="field"><span class="label">Teléfono:</span> ${patient?.phone || '-'}</p>
          <p class="field"><span class="label">Dirección:</span> ${
            patient?.address || '-'
          }</p>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Diagnósticos</div>
        <p class="diagnosis-item">
          <span class="label">Principal:</span>
          ${formData?.diagnosticoPrincipal?.codigo || ''}
          ${
            formData?.diagnosticoPrincipal?.descripcion
              ? ` - ${formData.diagnosticoPrincipal.descripcion}`
              : ''
          }
          ${
            formData?.diagnosticoPrincipal?.tipo
              ? ` (${formData.diagnosticoPrincipal.tipo})`
              : ''
          }
        </p>

        ${
          secondaryDiagnoses.length
            ? secondaryDiagnoses
                .map(
                  (d: any, index: number) => `
                    <p class="diagnosis-item">
                      <span class="label">Secundario ${index + 1}:</span>
                      ${d.codigo || ''} ${d.descripcion ? ` - ${d.descripcion}` : ''}
                      ${d.tipo ? ` (${d.tipo})` : ''}
                    </p>
                  `,
                )
                .join('')
            : '<p class="diagnosis-item"><span class="label">Secundarios:</span> -</p>'
        }
      </div>

      <div class="section">
        <div class="section-title">Resumen clínico</div>
        <div class="text-block">
          ${
            destinationDetails?.referenciaResumenClinico ||
            formData?.anamnesisActual ||
            ''
          }
        </div>
      </div>

      <div class="section">
        <div class="section-title">Motivo de referencia</div>
        <div class="text-block">
          ${destinationDetails?.referenciaMotivo || ''}
        </div>
      </div>

      <div class="section">
        <div class="section-title">Condición actual y traslado</div>
        <div class="grid">
          <p class="field"><span class="label">Condición actual:</span> ${
            destinationDetails?.referenciaCondicion || ''
          }</p>
          <p class="field"><span class="label">Medio de transporte:</span> ${
            destinationDetails?.referenciaTransporte || ''
          }</p>
          <p class="field"><span class="label">Acompañante:</span> ${
            destinationDetails?.referenciaAcompanante || ''
          }</p>
          <p class="field"><span class="label">Médico receptor:</span> ${
            destinationDetails?.referenciaMedicoReceptor || ''
          }</p>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Profesional que refiere</div>
        <div class="grid">
          <p class="field"><span class="label">Nombre:</span> ${professionalName}</p>
          <p class="field"><span class="label">DNI:</span> ${professionalDni || '-'}</p>
          <p class="field"><span class="label">CMP:</span> ${
            professionalCmp || '-'
          }</p>
          <p class="field"><span class="label">RNE:</span> ${
            professionalRne || '-'
          }</p>
        </div>
      </div>

      <div class="signatures">
        <div class="receiver-signature">
          <div class="signature-line">
            Recepción / establecimiento destino<br/>
            Firma y sello
          </div>
        </div>

        <div class="signature-area">
          <div class="signature-box">
            ${
              institution?.sealUrl
                ? `<img class="seal-img" src="${institution.sealUrl}" />`
                : ''
            }
            ${
              institution?.signatureUrl
                ? `<img class="signature-img" src="${institution.signatureUrl}" />`
                : ''
            }
          </div>

          <div class="signature-line">
            ${professionalName || 'Profesional responsable'}<br/>
            ${professionalCmp ? `CMP ${professionalCmp}<br/>` : ''}
            ${professionalRne ? `RNE ${professionalRne}` : ''}
          </div>
        </div>
      </div>

      <div class="note">
        Documento institucional generado desde HCELM, alineado a la lógica de referencia/contrarreferencia utilizada en servicios de salud. Debe conservarse en la historia clínica.
      </div>

      <div class="print-actions">
        <button onclick="window.print()" style="padding:8px 18px;background:${primaryColor};color:white;border:none;border-radius:6px;cursor:pointer;">
          Imprimir / Guardar PDF
        </button>
      </div>
    </body>
  </html>
  `;

  const win = window.open('', '_blank');

  if (win) {
    win.document.write(html);
    win.document.close();
  }
}