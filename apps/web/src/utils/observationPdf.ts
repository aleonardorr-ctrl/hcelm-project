import { cleanPrefix } from './recipePdf';

export function generateObservationPdf({
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
    alert('Seleccione un paciente antes de generar la orden de observación.');
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

  const logoWidth = Number(institution?.logoWidth || 70);
  const logoHeight = Number(institution?.logoHeight || 70);

  const sealSize = Number(institution?.sealWidth || 200);
  const signatureWidth = Math.round(sealSize * 0.62);
  const signatureHeight = Math.round(sealSize * 0.32);

  const fechaHora = new Date().toLocaleString('es-PE', {
    dateStyle: 'short',
    timeStyle: 'short',
  });

  const html = `
  <html>
    <head>
      <title>Orden de Observación</title>

      <style>
        @page {
          size: A4;
          margin: 16mm;
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
          margin-bottom: 14px;
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
          margin: 16px 0;
          text-transform: uppercase;
        }

        .section {
          border: 1px solid #d1d5db;
          border-radius: 6px;
          padding: 9px;
          margin-bottom: 10px;
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
          min-height: 35px;
        }

        .monitoring-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 8px;
        }

        .monitoring-table th,
        .monitoring-table td {
          border: 1px solid #d1d5db;
          padding: 6px;
          font-size: 11px;
          text-align: left;
        }

        .monitoring-table th {
          background: #f3f4f6;
          font-weight: bold;
        }

        .signatures {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 28px;
          margin-top: 26px;
          align-items: end;
        }

        .nursing-signature {
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
          margin-top: 14px;
          border-left: 3px solid ${primaryColor};
          padding-left: 8px;
        }

        .print-actions {
          margin-top: 20px;
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

      <div class="title">Orden de Observación Clínica</div>

      <div class="section">
        <div class="section-title">Datos del paciente</div>

        <div class="grid">
          <p class="field"><span class="label">Paciente:</span> ${patient?.fullName || ''}</p>
          <p class="field"><span class="label">Documento:</span> ${patient?.documentNumber || ''}</p>
          <p class="field"><span class="label">Tipo documento:</span> ${patient?.documentType || 'DNI'}</p>
          <p class="field"><span class="label">Fecha y hora:</span> ${fechaHora}</p>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Diagnóstico principal</div>

        <p class="field">
          <span class="label">${formData?.diagnosticoPrincipal?.codigo || ''}</span>
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
      </div>

      <div class="section">
        <div class="section-title">Motivo de observación</div>
        <div class="text-block">
          ${destinationDetails?.observacionMotivo || ''}
        </div>
      </div>

      <div class="section">
        <div class="section-title">Tiempo estimado y plan de monitoreo</div>

        <div class="grid">
          <p class="field"><span class="label">Tiempo estimado:</span> ${
            destinationDetails?.observacionTiempoEstimado || ''
          }</p>
          <p class="field"><span class="label">Responsable inicial:</span> ${professionalName}</p>
        </div>

        <div class="text-block">
          ${destinationDetails?.observacionPlan || ''}
        </div>
      </div>

      <div class="section">
        <div class="section-title">Indicaciones durante observación</div>
        <div class="text-block">
          ${destinationDetails?.observacionIndicaciones || ''}
        </div>
      </div>

      <div class="section">
        <div class="section-title">Controles sugeridos durante observación</div>

        <table class="monitoring-table">
          <thead>
            <tr>
              <th>Hora</th>
              <th>PA</th>
              <th>FC</th>
              <th>FR</th>
              <th>SatO₂</th>
              <th>T°</th>
              <th>Dolor / Glasgow / Observaciones</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
            <tr><td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
            <tr><td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
            <tr><td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
          </tbody>
        </table>
      </div>

      <div class="section">
        <div class="section-title">Profesional responsable</div>

        <div class="grid">
          <p class="field"><span class="label">Nombre:</span> ${professionalName}</p>
          <p class="field"><span class="label">DNI:</span> ${professionalDni || '-'}</p>
          <p class="field"><span class="label">CMP:</span> ${professionalCmp || '-'}</p>
          <p class="field"><span class="label">RNE:</span> ${professionalRne || '-'}</p>
        </div>
      </div>

      <div class="signatures">
        <div class="nursing-signature">
          <div class="signature-line">
            Responsable de observación / Enfermería<br/>
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
        Documento institucional generado desde HCELM para control de observación clínica. Debe conservarse en la historia clínica.
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