import { cleanPrefix } from './recipePdf';

function safeText(value: any) {
  return String(value ?? '').trim();
}

function formatStudies(studies: string[]) {
  if (!Array.isArray(studies) || studies.length === 0) {
    return '<p class="field">No se registraron estudios de imágenes.</p>';
  }

  return `
    <ol class="study-list">
      ${studies.map((study) => `<li>${safeText(study)}</li>`).join('')}
    </ol>
  `;
}

export function generateImagingOrderPdf({
  institution,
  patient,
  formData,
  imagingOrder,
}: {
  institution: any;
  patient: any;
  formData: any;
  imagingOrder: {
    priority?: string;
    clinicalInfo?: string;
    studies?: string[];
    observations?: string;
  };
}) {
  if (!patient) {
    alert('Seleccione un paciente antes de generar la orden de imágenes.');
    return;
  }

  const studies = Array.isArray(imagingOrder?.studies) ? imagingOrder.studies : [];

  if (studies.length === 0) {
    alert('Seleccione al menos un estudio de imágenes.');
    return;
  }

  const professionalName =
    localStorage.getItem('hcelm_professional_name') || institution?.directorName || '';

  const professionalDni = localStorage.getItem('hcelm_professional_dni') || '';

  const professionalCmpRaw =
    localStorage.getItem('hcelm_professional_cmp') || institution?.directorCmp || '';

  const professionalRneRaw =
    localStorage.getItem('hcelm_professional_rne') || institution?.directorRne || '';

  const professionalLicense = localStorage.getItem('hcelm_professional_license') || '';

  const professionalCmp = cleanPrefix(professionalCmpRaw, 'CMP');
  const professionalRne = cleanPrefix(professionalRneRaw, 'RNE');

  const primaryColor = institution?.primaryColor || '#0f766e';

  const logoWidth = Number(institution?.logoWidth || 70);
  const logoHeight = Number(institution?.logoHeight || 70);

  const sealSize = Number(institution?.sealWidth || 200);
  const signatureWidth = Math.round(sealSize * 0.62);
  const signatureHeight = Math.round(sealSize * 0.32);

  const fechaEmision = new Date().toLocaleString('es-PE', {
    dateStyle: 'short',
    timeStyle: 'short',
  });

  const html = `
  <html>
    <head>
      <title>Orden de Imágenes</title>

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
          page-break-inside: avoid;
        }

        .section-title {
          font-weight: bold;
          color: ${primaryColor};
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 4px;
          margin-bottom: 7px;
          text-transform: uppercase;
          font-size: 12px;
        }

        .grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 5px 12px;
        }

        .field {
          margin: 3px 0;
          line-height: 1.4;
        }

        .label {
          font-weight: bold;
        }

        .text-block {
          white-space: pre-wrap;
          line-height: 1.45;
          min-height: 35px;
        }

        .study-list {
          margin-top: 6px;
          padding-left: 22px;
          line-height: 1.65;
          font-size: 13px;
        }

        .signature-area {
          text-align: center;
          width: 50%;
          margin-left: auto;
          margin-top: 24px;
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

        .signature-line {
          border-top: 1px solid #111827;
          padding-top: 5px;
          font-size: 11px;
          line-height: 1.35;
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

      <div class="title">Orden de Imágenes y Estudios Auxiliares</div>

      <div class="section">
        <div class="section-title">Datos del paciente</div>

        <div class="grid">
          <p class="field"><span class="label">Paciente:</span> ${safeText(patient?.fullName)}</p>
          <p class="field"><span class="label">Documento:</span> ${safeText(patient?.documentNumber)}</p>
          <p class="field"><span class="label">Tipo documento:</span> ${safeText(patient?.documentType || 'DNI')}</p>
          <p class="field"><span class="label">Fecha y hora:</span> ${fechaEmision}</p>
          <p class="field"><span class="label">Teléfono:</span> ${safeText(patient?.phone)}</p>
          <p class="field"><span class="label">Dirección:</span> ${safeText(patient?.address)}</p>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Diagnóstico / impresión diagnóstica</div>

        <p class="field">
          <span class="label">${safeText(formData?.diagnosticoPrincipal?.codigo)}</span>
          ${
            formData?.diagnosticoPrincipal?.descripcion
              ? ` - ${safeText(formData.diagnosticoPrincipal.descripcion)}`
              : ''
          }
          ${
            formData?.diagnosticoPrincipal?.tipo
              ? ` (${safeText(formData.diagnosticoPrincipal.tipo)})`
              : ''
          }
        </p>
      </div>

      <div class="section">
        <div class="section-title">Prioridad</div>

        <p class="field">
          <span class="label">Prioridad:</span> ${safeText(imagingOrder?.priority || 'Rutina')}
        </p>
      </div>

      <div class="section">
        <div class="section-title">Información clínica relevante</div>

        <div class="text-block">
          ${safeText(imagingOrder?.clinicalInfo || formData?.anamnesisActual)}
        </div>
      </div>

      <div class="section">
        <div class="section-title">Estudios solicitados</div>
        ${formatStudies(studies)}
      </div>

      <div class="section">
        <div class="section-title">Observaciones / indicaciones para imágenes</div>

        <div class="text-block">
          ${safeText(imagingOrder?.observations)}
        </div>
      </div>

      <div class="section">
        <div class="section-title">Profesional solicitante</div>

        <div class="grid">
          <p class="field"><span class="label">Nombre:</span> ${professionalName}</p>
          <p class="field"><span class="label">DNI:</span> ${professionalDni || '-'}</p>
          <p class="field"><span class="label">CMP:</span> ${professionalCmp || '-'}</p>
          <p class="field"><span class="label">RNE:</span> ${professionalRne || '-'}</p>
          <p class="field"><span class="label">Registro/Colegiatura:</span> ${professionalLicense || '-'}</p>
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
          ${professionalName || 'Profesional solicitante'}<br/>
          ${professionalCmp ? `CMP ${professionalCmp}<br/>` : ''}
          ${professionalRne ? `RNE ${professionalRne}<br/>` : ''}
          ${professionalLicense ? `${professionalLicense}` : ''}
        </div>
      </div>

      <div class="note">
        Orden generada desde HCELM. El resultado deberá adjuntarse posteriormente a la historia clínica del paciente.
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