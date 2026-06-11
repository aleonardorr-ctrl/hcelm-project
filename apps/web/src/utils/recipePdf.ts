export function cleanPrefix(value: string | null | undefined, prefix: string) {
  const v = String(value || '').trim();
  if (!v) return '';
  const normalized = v.toUpperCase();
  const p = prefix.toUpperCase();

  if (normalized.startsWith(p)) {
    return v.replace(new RegExp(`^${prefix}\\s*`, 'i'), '').trim();
  }

  return v;
}

export function generateRecipePdf({
  institution,
  patient,
  formData,
  recipeItems,
}: {
  institution: any;
  patient: any;
  formData: any;
  recipeItems: any[];
}) {
  if (!recipeItems.length) {
    alert('No hay medicamentos en la receta.');
    return;
  }

  if (!patient) {
    alert('Seleccione un paciente antes de imprimir la receta.');
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
  const secondaryColor = institution?.secondaryColor || '#14b8a6';

  const logoWidth = Number(institution?.logoWidth || 70);
  const logoHeight = Number(institution?.logoHeight || 70);

  const sealSize = Number(institution?.sealWidth || 220);
  const signatureWidth = Math.round(sealSize * 0.62);
  const signatureHeight = Math.round(sealSize * 0.32);

  const fechaHora = new Date().toLocaleString('es-PE', {
    dateStyle: 'short',
    timeStyle: 'short',
  });

  const html = `
  <html>
    <head>
      <title>Receta Médica</title>

      <style>
        @page {
          size: A5;
          margin: 12mm;
        }

        body {
          font-family: Arial, sans-serif;
          color: #111827;
          margin: 0;
          padding: 0;
          font-size: 12px;
        }

        .container {
          width: 100%;
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

        .header-text {
          flex: 1;
        }

        .institution-name {
          font-size: 17px;
          font-weight: bold;
          color: ${primaryColor};
          margin: 0 0 3px 0;
          text-transform: uppercase;
        }

        .legal-name {
          font-size: 12px;
          margin: 0;
          font-weight: bold;
        }

        .small {
          font-size: 10.5px;
          margin: 2px 0;
          color: #374151;
        }

        .title {
          text-align: center;
          font-size: 18px;
          font-weight: bold;
          color: ${primaryColor};
          margin: 8px 0 12px 0;
          letter-spacing: 1px;
        }

        .section {
          border: 1px solid #d1d5db;
          border-radius: 6px;
          padding: 8px;
          margin-bottom: 10px;
        }

        .section-title {
          font-weight: bold;
          color: ${primaryColor};
          margin-bottom: 6px;
          font-size: 12px;
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 3px;
        }

        .grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4px 10px;
        }

        .field {
          margin: 2px 0;
        }

        .label {
          font-weight: bold;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 6px;
        }

        th {
          background: ${secondaryColor};
          color: white;
          border: 1px solid #0f766e;
          padding: 5px;
          font-size: 10.5px;
          text-align: left;
        }

        td {
          border: 1px solid #d1d5db;
          padding: 5px;
          font-size: 10.5px;
          vertical-align: top;
        }

        .medicine-name {
          font-weight: bold;
        }

        .footer {
          margin-top: 22px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 18px;
          align-items: end;
        }

        .note {
          font-size: 10px;
          color: #4b5563;
          border-left: 3px solid ${primaryColor};
          padding-left: 6px;
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

        .signature-line {
          border-top: 1px solid #111827;
          padding-top: 4px;
          font-size: 11px;
          line-height: 1.35;
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
      <div class="container">
        <div class="header">
          ${
            institution?.logoUrl
              ? `<img class="logo" src="${institution.logoUrl}" />`
              : `<div class="logo" style="display:flex;align-items:center;justify-content:center;color:#6b7280;font-size:10px;">LOGO</div>`
          }

          <div class="header-text">
            <p class="institution-name">${institution?.name || 'CONSULTORIO MÉDICO'}</p>
            <p class="legal-name">${institution?.legalName || 'AME HEALTH SAC'}</p>
            <p class="small"><b>RUC:</b> ${institution?.ruc || '-'}</p>
            <p class="small"><b>Dirección:</b> ${institution?.address || '-'}</p>
            <p class="small"><b>Teléfono:</b> ${institution?.phone || '-'} ${
              institution?.email ? `| <b>Email:</b> ${institution.email}` : ''
            }</p>
            <p class="small"><b>Ciudad:</b> ${institution?.city || ''} ${
              institution?.country || ''
            }</p>
          </div>
        </div>

        <div class="title">RECETA MÉDICA</div>

        <div class="section">
          <div class="section-title">Datos del paciente</div>
          <div class="grid">
            <p class="field"><span class="label">Paciente:</span> ${
              patient?.fullName || ''
            }</p>
            <p class="field"><span class="label">Documento:</span> ${
              patient?.documentNumber || ''
            }</p>
            <p class="field"><span class="label">Fecha:</span> ${fechaHora}</p>
            <p class="field"><span class="label">Tipo doc.:</span> ${
              patient?.documentType || 'DNI'
            }</p>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Diagnóstico</div>
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
          <div class="section-title">Prescripción farmacológica</div>

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
                        <div class="medicine-name">${m.medicationName || ''}</div>
                        <div>${m.concentration || ''}</div>
                        <div>${m.presentation || ''}</div>
                      </td>
                      <td>${m.quantity || ''}</td>
                      <td>${m.route || ''}</td>
                      <td>${m.dose || ''}</td>
                      <td>${m.frequency || ''}</td>
                      <td>${m.durationDays || ''}</td>
                      <td>${m.indications || ''}</td>
                    </tr>
                  `,
                )
                .join('')}
            </tbody>
          </table>
        </div>

        <div class="section">
          <div class="section-title">Profesional responsable</div>
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

        <div class="footer">
          <div class="note">
            Esta receta forma parte de la Historia Clínica Electrónica HCELM.
            La dispensación debe realizarse conforme a criterio farmacéutico y normativa vigente.
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
              ${professionalName || 'Médico tratante'}<br/>
              ${professionalCmp ? `CMP ${professionalCmp}<br/>` : ''}
              ${professionalRne ? `RNE ${professionalRne}` : ''}
            </div>
          </div>
        </div>

        <div class="print-actions">
          <button onclick="window.print()" style="padding:8px 18px;background:${primaryColor};color:white;border:none;border-radius:6px;cursor:pointer;">
            Imprimir / Guardar PDF
          </button>
        </div>
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