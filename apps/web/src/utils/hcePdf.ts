// HCELM - utils/hcePdf.ts
// Generador PDF de Historia Clínica Electrónica completa.

import { cleanPrefix } from './recipePdf';

function safeText(value: any) {
  return String(value ?? '').trim();
}

function getPatientHceNumber(patient: any) {
  return safeText(patient?.hceNumber) || 'HCE pendiente de generar';
}

function formatVitalSigns(signosVitales: any) {
  if (!signosVitales) return '-';

  const items = [
    ['PA', signosVitales.pa || signosVitales.ta],
    ['FC', signosVitales.fc],
    ['FR', signosVitales.fr],
    ['SatO₂', signosVitales.sato2 || signosVitales.spo2],
    ['T°', signosVitales.temperatura || signosVitales.temp],
    ['Peso', signosVitales.peso],
    ['Talla', signosVitales.talla],
    ['IMC', signosVitales.imc],
  ];

  const filtered = items.filter(
    ([, value]) => value !== undefined && value !== null && value !== '',
  );

  if (!filtered.length) return '-';

  return filtered
    .map(([label, value]) => `<span><b>${label}:</b> ${value}</span>`)
    .join(' &nbsp; | &nbsp; ');
}

function formatDiagnosis(d: any) {
  if (!d) return '-';

  const codigo = safeText(d.codigo);
  const descripcion = safeText(d.descripcion);
  const tipo = safeText(d.tipo);

  if (!codigo && !descripcion) return '-';

  return `
    ${codigo ? `<b>${codigo}</b>` : ''}
    ${descripcion ? ` - ${descripcion}` : ''}
    ${tipo ? ` <span class="muted">(${tipo})</span>` : ''}
  `;
}

function formatSecondaryDiagnoses(diagnoses: any[]) {
  if (!Array.isArray(diagnoses) || diagnoses.length === 0) {
    return '<p class="field">-</p>';
  }

  return diagnoses
    .map(
      (d, index) => `
        <p class="field">
          <span class="label">${index + 1}.</span>
          ${formatDiagnosis(d)}
        </p>
      `,
    )
    .join('');
}

function formatRecipeItems(recipeItems: any[]) {
  if (!Array.isArray(recipeItems) || recipeItems.length === 0) {
    return '<p class="field">No se registraron medicamentos.</p>';
  }

  return `
    <table>
      <thead>
        <tr>
          <th>Medicamento</th>
          <th>Cantidad</th>
          <th>Vía</th>
          <th>Dosis</th>
          <th>Frecuencia</th>
          <th>Días</th>
          <th>Indicaciones</th>
        </tr>
      </thead>
      <tbody>
        ${recipeItems
          .map(
            (m) => `
              <tr>
                <td>
                  <b>${safeText(m.medicationName)}</b><br/>
                  ${safeText(m.concentration)}<br/>
                  ${safeText(m.presentation)}
                </td>
                <td>${safeText(m.quantity)}</td>
                <td>${safeText(m.route)}</td>
                <td>${safeText(m.dose)}</td>
                <td>${safeText(m.frequency)}</td>
                <td>${safeText(m.durationDays)}</td>
                <td>${safeText(m.indications)}</td>
              </tr>
            `,
          )
          .join('')}
      </tbody>
    </table>
  `;
}

function formatRequestedItems(value?: string | null) {
  const items = safeText(value)
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);

  if (!items.length) return '<span class="muted">No solicitado.</span>';

  return `<ul class="compact-list">${items
    .map((item) => `<li>${item}</li>`)
    .join('')}</ul>`;
}

function formatAuxiliaryOrder(
  title: string,
  itemsLabel: string,
  items: string | null | undefined,
  order: any,
) {
  if (!safeText(items)) return '';

  return `
    <div class="section">
      <div class="section-title">${title}</div>
      <div class="order-grid">
        <div><span class="label">${itemsLabel}:</span>${formatRequestedItems(items)}</div>
        <div>
          <p class="field"><span class="label">Prioridad:</span> ${safeText(order?.priority) || 'Rutina'}</p>
          ${safeText(order?.clinicalInfo) ? `<p class="field"><span class="label">Información clínica:</span> ${safeText(order.clinicalInfo)}</p>` : ''}
          ${safeText(order?.observations) ? `<p class="field"><span class="label">Observaciones:</span> ${safeText(order.observations)}</p>` : ''}
        </div>
      </div>
    </div>
  `;
}

function formatDestinoFinal(destinoFinal: string, destinationDetails: any) {
  const destino = safeText(destinoFinal);

  if (destino === 'alta_medica') {
    return `
      <p class="field"><span class="label">Destino:</span> Alta médica</p>
      <p class="field"><span class="label">Indicaciones finales:</span></p>
      <div class="text-block">${safeText(destinationDetails?.altaIndicaciones)}</div>
      <p class="field"><span class="label">Signos de alarma:</span></p>
      <div class="text-block">${safeText(destinationDetails?.altaSignosAlarma)}</div>
      <p class="field"><span class="label">Control / seguimiento:</span></p>
      <div class="text-block">${safeText(destinationDetails?.altaControl)}</div>
    `;
  }

  if (destino === 'alta_voluntaria') {
    return `
      <p class="field"><span class="label">Destino:</span> Alta voluntaria</p>
      <p class="field"><span class="label">Motivo:</span></p>
      <div class="text-block">${safeText(destinationDetails?.voluntariaMotivo)}</div>
      <p class="field"><span class="label">Riesgos explicados:</span></p>
      <div class="text-block">${safeText(destinationDetails?.voluntariaRiesgos)}</div>
      <p class="field"><span class="label">Responsable:</span> ${safeText(destinationDetails?.voluntariaResponsable)}</p>
      <p class="field"><span class="label">DNI responsable:</span> ${safeText(destinationDetails?.voluntariaDniResponsable)}</p>
    `;
  }

  if (destino === 'referencia') {
    return `
      <p class="field"><span class="label">Destino:</span> Referencia</p>
      <p class="field"><span class="label">Establecimiento destino:</span> ${safeText(destinationDetails?.referenciaDestino)}</p>
      <p class="field"><span class="label">Especialidad receptora:</span> ${safeText(destinationDetails?.referenciaEspecialidad)}</p>
      <p class="field"><span class="label">Médico receptor:</span> ${safeText(destinationDetails?.referenciaMedicoReceptor)}</p>
      <p class="field"><span class="label">Transporte:</span> ${safeText(destinationDetails?.referenciaTransporte)}</p>
      <p class="field"><span class="label">Motivo de referencia:</span></p>
      <div class="text-block">${safeText(destinationDetails?.referenciaMotivo)}</div>
    `;
  }

  if (destino === 'observacion') {
    return `
      <p class="field"><span class="label">Destino:</span> Observación</p>
      <p class="field"><span class="label">Tiempo estimado:</span> ${safeText(destinationDetails?.observacionTiempoEstimado)}</p>
      <p class="field"><span class="label">Motivo:</span></p>
      <div class="text-block">${safeText(destinationDetails?.observacionMotivo)}</div>
      <p class="field"><span class="label">Plan de monitoreo:</span></p>
      <div class="text-block">${safeText(destinationDetails?.observacionPlan)}</div>
      <p class="field"><span class="label">Indicaciones:</span></p>
      <div class="text-block">${safeText(destinationDetails?.observacionIndicaciones)}</div>
    `;
  }

  if (destino === 'fallecido') {
    return `
      <p class="field"><span class="label">Destino:</span> Fallecido / pase SINADEF</p>
      <p class="field"><span class="label">Fecha y hora de fallecimiento:</span> ${safeText(destinationDetails?.fallecidoFechaHora)}</p>
      <p class="field"><span class="label">Lugar:</span> ${safeText(destinationDetails?.fallecidoLugar)}</p>
      <p class="field"><span class="label">Causa probable:</span> ${safeText(destinationDetails?.fallecidoCausaProbable)}</p>
      <p class="field"><span class="label">Observaciones:</span></p>
      <div class="text-block">${safeText(destinationDetails?.fallecidoObservaciones)}</div>
    `;
  }

  return `<p class="field"><span class="label">Destino:</span> ${destino || '-'}</p>`;
}

export function generateHcePdf({
  institution,
  patient,
  formData,
  destinationDetails,
  recipeItems,
  labOrder,
  imagingOrder,
}: {
  institution: any;
  patient: any;
  formData: any;
  destinationDetails: any;
  recipeItems: any[];
  labOrder?: any;
  imagingOrder?: any;
}) {
  if (!patient) {
    alert('Seleccione un paciente antes de generar la Historia Clínica PDF.');
    return;
  }

  const professionalName =
    localStorage.getItem('hcelm_professional_name') || institution?.directorName || '';

  const professionalDni = localStorage.getItem('hcelm_professional_dni') || '';

  const professionalType = localStorage.getItem('hcelm_professional_type') || '';

  const professionalCmpRaw =
    localStorage.getItem('hcelm_professional_cmp') || institution?.directorCmp || '';

  const professionalRneRaw =
    localStorage.getItem('hcelm_professional_rne') || institution?.directorRne || '';

  const professionalLicense = localStorage.getItem('hcelm_professional_license') || '';

  const professionalCmp = cleanPrefix(professionalCmpRaw, 'CMP');
  const professionalRne = cleanPrefix(professionalRneRaw, 'RNE');
  const hceNumber = getPatientHceNumber(patient);

  const primaryColor = institution?.primaryColor || '#0f766e';

  const logoWidth = Math.min(Number(institution?.logoWidth || 54), 60);
  const logoHeight = Math.min(Number(institution?.logoHeight || 54), 60);

  const sealSize = Math.min(Number(institution?.sealWidth || 86), 95);
  const signatureWidth = Math.round(sealSize * 0.62);
  const signatureHeight = Math.round(sealSize * 0.32);

  const fechaEmision = new Date().toLocaleString('es-PE', {
    dateStyle: 'short',
    timeStyle: 'short',
  });

  const html = `
  <html>
    <head>
      <title>Historia Clínica Electrónica</title>

      <style>
        @page {
          size: A4;
          margin: 8mm 9mm;
        }

        body {
          font-family: Arial, sans-serif;
          color: #111827;
          margin: 0;
          padding: 0;
          font-size: 9px;
        }

        .header {
          border-bottom: 3px solid ${primaryColor};
          padding-bottom: 5px;
          margin-bottom: 5px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .logo {
          width: ${logoWidth}px;
          height: ${logoHeight}px;
          object-fit: contain;
          border: 1px solid #e5e7eb;
          padding: 3px;
        }

        .institution-name {
          font-size: 14px;
          font-weight: bold;
          color: ${primaryColor};
          margin: 0 0 4px 0;
          text-transform: uppercase;
        }

        .small {
          font-size: 8.5px;
          margin: 1px 0;
          color: #374151;
        }

        .title {
          text-align: center;
          font-size: 14px;
          font-weight: bold;
          color: ${primaryColor};
          margin: 5px 0;
          text-transform: uppercase;
        }

        .subtitle {
          text-align: center;
          font-size: 8px;
          color: #4b5563;
          margin-top: -3px;
          margin-bottom: 4px;
        }

        .hce-banner {
          border: 2px solid ${primaryColor};
          background: #ecfeff;
          color: #0f172a;
          border-radius: 4px;
          padding: 4px 8px;
          margin: 4px 0 5px 0;
          text-align: center;
          font-size: 11px;
          font-weight: bold;
          letter-spacing: 0.3px;
        }

        .hce-banner span {
          color: ${primaryColor};
          font-size: 11px;
        }

        .section {
          border: 1px solid #d1d5db;
          border-radius: 4px;
          padding: 4px 5px;
          margin-bottom: 4px;
          page-break-inside: avoid;
        }

        .section-title {
          font-weight: bold;
          color: ${primaryColor};
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 2px;
          margin-bottom: 3px;
          text-transform: uppercase;
          font-size: 9px;
        }

        .grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2px 8px;
        }

        .field {
          margin: 1px 0;
          line-height: 1.25;
        }

        .label {
          font-weight: bold;
        }

        .muted {
          color: #6b7280;
        }

        .text-block {
          white-space: pre-wrap;
          line-height: 1.3;
          min-height: 0;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 3px;
        }

        th {
          background: #f3f4f6;
          border: 1px solid #d1d5db;
          padding: 2px 3px;
          font-size: 8px;
          text-align: left;
        }

        td {
          border: 1px solid #d1d5db;
          padding: 2px 3px;
          font-size: 8px;
          vertical-align: top;
        }

        .signature-area {
          text-align: center;
          width: 50%;
          margin-left: auto;
          margin-top: 5px;
          page-break-inside: avoid;
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
          padding-top: 2px;
          font-size: 8px;
          line-height: 1.2;
        }

        .note {
          font-size: 7.5px;
          color: #4b5563;
          margin-top: 4px;
          border-left: 3px solid ${primaryColor};
          padding-left: 8px;
        }

        .print-actions {
          margin-top: 18px;
          text-align: center;
        }

        .order-grid {
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          gap: 6px;
        }

        .compact-list {
          margin: 2px 0 0 14px;
          padding: 0;
          columns: 2;
          column-gap: 14px;
        }

        .compact-list li {
          margin: 0 0 1px 0;
          break-inside: avoid;
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

      <div class="title">Historia Clínica Electrónica</div>
      <div class="subtitle">Documento generado desde HCELM · ${fechaEmision}</div>
      <div class="hce-banner">N.° HCE Digital: <span>${hceNumber}</span></div>

      <div class="section">
        <div class="section-title">Datos del paciente</div>
        <div class="grid">
          <p class="field"><span class="label">N.° HCE Digital:</span> ${hceNumber}</p>
          <p class="field"><span class="label">Paciente:</span> ${safeText(patient?.fullName)}</p>
          <p class="field"><span class="label">Documento:</span> ${safeText(patient?.documentNumber)}</p>
          <p class="field"><span class="label">Tipo documento:</span> ${safeText(patient?.documentType || 'DNI')}</p>
          <p class="field"><span class="label">Sexo:</span> ${safeText(patient?.gender)}</p>
          <p class="field"><span class="label">Fecha nacimiento:</span> ${safeText(patient?.birthDate)}</p>
          <p class="field"><span class="label">Teléfono:</span> ${safeText(patient?.phone)}</p>
          <p class="field"><span class="label">Dirección:</span> ${safeText(patient?.address)}</p>
          <p class="field"><span class="label">Correo:</span> ${safeText(patient?.email)}</p>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Datos de atención</div>
        <div class="grid">
          <p class="field"><span class="label">Fecha de atención:</span> ${safeText(formData?.fechaAtencion)}</p>
          <p class="field"><span class="label">Destino final:</span> ${safeText(formData?.destinoFinal)}</p>
          <p class="field"><span class="label">Profesional:</span> ${professionalName}</p>
          <p class="field"><span class="label">Tipo profesional:</span> ${professionalType || '-'}</p>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Motivo de consulta</div>
        <div class="text-block">${safeText(formData?.motivoConsulta)}</div>
      </div>

      <div class="section">
        <div class="section-title">Tiempo de enfermedad</div>
        <div class="text-block">${safeText(formData?.tiempoEnfermedad)}</div>
      </div>

      <div class="section">
        <div class="section-title">Anamnesis actual</div>
        <div class="text-block">${safeText(formData?.anamnesisActual)}</div>
      </div>

      <div class="section">
        <div class="section-title">Funciones biológicas</div>
        <div class="text-block">${safeText(formData?.funcionesBiologicas)}</div>
      </div>

      <div class="section">
        <div class="section-title">Antecedentes personales</div>
        <div class="text-block">${safeText(formData?.antecedentesPersonales)}</div>
      </div>

      <div class="section">
        <div class="section-title">Antecedentes familiares</div>
        <div class="text-block">${safeText(formData?.antecedentesFamiliares)}</div>
      </div>

      <div class="section">
        <div class="section-title">Signos vitales</div>
        <p class="field">${formatVitalSigns(formData?.signosVitales)}</p>
      </div>

      <div class="section">
        <div class="section-title">Examen físico</div>
        <div class="text-block">${safeText(formData?.examenFisico)}</div>
      </div>

      <div class="section">
        <div class="section-title">Diagnóstico principal</div>
        <p class="field">${formatDiagnosis(formData?.diagnosticoPrincipal)}</p>
      </div>

      <div class="section">
        <div class="section-title">Diagnósticos secundarios</div>
        ${formatSecondaryDiagnoses(formData?.diagnosticosSecundarios)}
      </div>

      <div class="section">
        <div class="section-title">Exámenes auxiliares</div>
        <div class="text-block">${safeText(formData?.examenesAuxiliares)}</div>
      </div>

      ${formatAuxiliaryOrder(
        'Solicitud de laboratorio',
        'Exámenes solicitados',
        labOrder?.tests,
        labOrder,
      )}

      ${formatAuxiliaryOrder(
        'Solicitud de imágenes',
        'Estudios solicitados',
        imagingOrder?.studies,
        imagingOrder,
      )}

      <div class="section">
        <div class="section-title">Prescripción / tratamiento</div>
        ${formatRecipeItems(recipeItems)}
      </div>

      <div class="section">
        <div class="section-title">Destino final</div>
        ${formatDestinoFinal(formData?.destinoFinal, destinationDetails)}
      </div>

      <div class="section">
        <div class="section-title">Profesional responsable</div>
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
          ${professionalName || 'Profesional responsable'}<br/>
          ${professionalCmp ? `CMP ${professionalCmp}<br/>` : ''}
          ${professionalRne ? `RNE ${professionalRne}<br/>` : ''}
          ${professionalLicense ? `${professionalLicense}` : ''}
        </div>
      </div>

      <div class="note">
        Documento generado desde HCELM. Debe conservarse como parte de la historia clínica del paciente.
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
