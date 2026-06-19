import { ClinicalReferenceRange } from './clinical-alert.types';

export const CLINICAL_REFERENCE_RANGES: ClinicalReferenceRange[] = [
  {
    key: 'spo2',
    title: 'Saturación de oxígeno SpO₂',
    unit: '%',
    description:
      'Clasificación inicial para detección de hipoxemia y deterioro respiratorio. Debe interpretarse según contexto clínico, EPOC, altura, oxigenoterapia y perfusión periférica.',
    ranges: [
      {
        color: 'green',
        severity: 'normal',
        label: 'Normal',
        criteria: '≥ 95 %',
      },
      {
        color: 'yellow',
        severity: 'warning',
        label: 'Precaución',
        criteria: '93–94 %',
      },
      {
        color: 'orange',
        severity: 'high',
        label: 'Alto riesgo',
        criteria: '90–92 %',
      },
      {
        color: 'red',
        severity: 'critical',
        label: 'Crítico',
        criteria: '< 90 %',
      },
    ],
    bibliography: [
      {
        title: 'National Early Warning Score NEWS2',
        institution: 'Royal College of Physicians',
        year: 2017,
        url: 'https://www.rcp.ac.uk/improving-care/resources/national-early-warning-score-news-2/',
        note: 'NEWS2 integra SpO₂, FR, PA sistólica, pulso, temperatura, conciencia y oxígeno suplementario para detección de deterioro clínico.',
      },
    ],
  },
  {
    key: 'respiratory_rate',
    title: 'Frecuencia respiratoria',
    unit: 'rpm',
    description:
      'La frecuencia respiratoria es un marcador sensible de deterioro clínico. Debe correlacionarse con trabajo respiratorio, SpO₂, oxígeno suplementario y estado neurológico.',
    ranges: [
      {
        color: 'green',
        severity: 'normal',
        label: 'Normal',
        criteria: '12–20 rpm',
      },
      {
        color: 'yellow',
        severity: 'warning',
        label: 'Precaución',
        criteria: '21–24 rpm',
      },
      {
        color: 'orange',
        severity: 'high',
        label: 'Alto riesgo',
        criteria: '25–30 rpm',
      },
      {
        color: 'red',
        severity: 'critical',
        label: 'Crítico',
        criteria: '< 8 rpm o > 30 rpm',
      },
    ],
    bibliography: [
      {
        title: 'National Early Warning Score NEWS2',
        institution: 'Royal College of Physicians',
        year: 2017,
        url: 'https://www.rcp.ac.uk/improving-care/resources/national-early-warning-score-news-2/',
      },
    ],
  },
  {
    key: 'systolic_bp',
    title: 'Presión arterial sistólica',
    unit: 'mmHg',
    description:
      'Clasificación operativa para alertas clínicas. La PA elevada debe interpretarse con síntomas, daño de órgano blanco, embarazo, dolor, ansiedad y comorbilidades.',
    ranges: [
      {
        color: 'green',
        severity: 'normal',
        label: 'Sin alerta inmediata',
        criteria: '100–179 mmHg',
      },
      {
        color: 'yellow',
        severity: 'warning',
        label: 'Precaución',
        criteria: '90–99 mmHg o PA elevada persistente',
      },
      {
        color: 'orange',
        severity: 'high',
        label: 'Alto riesgo',
        criteria: 'PAS ≥ 180 mmHg o PAD ≥ 110 mmHg sin datos claros de daño de órgano blanco',
      },
      {
        color: 'red',
        severity: 'critical',
        label: 'Crítico',
        criteria: 'PAS < 90 mmHg o PA ≥ 180/110 mmHg con síntomas o sospecha de daño de órgano blanco',
      },
    ],
    bibliography: [
      {
        title: '2024 ESC Guidelines for the management of elevated blood pressure and hypertension',
        institution: 'European Society of Cardiology',
        year: 2024,
        url: 'https://www.escardio.org/Guidelines/Clinical-Practice-Guidelines/Elevated-Blood-Pressure-and-Hypertension',
        note: 'La PA ≥180/110 mmHg exige descartar emergencia hipertensiva y daño de órgano blanco.',
      },
    ],
  },
  {
    key: 'heart_rate',
    title: 'Frecuencia cardíaca',
    unit: 'lpm',
    description:
      'La taquicardia o bradicardia deben interpretarse con presión arterial, fiebre, dolor, hipoxia, fármacos y estado hemodinámico.',
    ranges: [
      {
        color: 'green',
        severity: 'normal',
        label: 'Normal',
        criteria: '51–100 lpm',
      },
      {
        color: 'yellow',
        severity: 'warning',
        label: 'Precaución',
        criteria: '101–109 lpm',
      },
      {
        color: 'orange',
        severity: 'high',
        label: 'Alto riesgo',
        criteria: '40–50 lpm o 110–130 lpm',
      },
      {
        color: 'red',
        severity: 'critical',
        label: 'Crítico',
        criteria: '< 40 lpm o > 130 lpm',
      },
    ],
    bibliography: [
      {
        title: 'National Early Warning Score NEWS2',
        institution: 'Royal College of Physicians',
        year: 2017,
        url: 'https://www.rcp.ac.uk/improving-care/resources/national-early-warning-score-news-2/',
      },
    ],
  },
  {
    key: 'temperature',
    title: 'Temperatura corporal',
    unit: '°C',
    description:
      'La fiebre o hipotermia pueden indicar infección, inflamación, exposición ambiental u otras causas sistémicas.',
    ranges: [
      {
        color: 'green',
        severity: 'normal',
        label: 'Normal',
        criteria: '36.0–37.9 °C',
      },
      {
        color: 'yellow',
        severity: 'warning',
        label: 'Precaución',
        criteria: '38.0–38.9 °C',
      },
      {
        color: 'orange',
        severity: 'high',
        label: 'Alto riesgo',
        criteria: '39.0–39.9 °C',
      },
      {
        color: 'red',
        severity: 'critical',
        label: 'Crítico',
        criteria: '< 35.0 °C o ≥ 40.0 °C',
      },
    ],
    bibliography: [
      {
        title: 'National Early Warning Score NEWS2',
        institution: 'Royal College of Physicians',
        year: 2017,
        url: 'https://www.rcp.ac.uk/improving-care/resources/national-early-warning-score-news-2/',
      },
    ],
  },
  {
    key: 'capillary_glucose',
    title: 'Glicemia capilar',
    unit: 'mg/dL',
    description:
      'Clasificación operativa para alertas de hipoglicemia e hiperglicemia. Debe interpretarse con síntomas, cetonas, hidratación, diabetes conocida y contexto clínico.',
    ranges: [
      {
        color: 'green',
        severity: 'normal',
        label: 'Sin alerta inmediata',
        criteria: '70–179 mg/dL',
      },
      {
        color: 'yellow',
        severity: 'warning',
        label: 'Precaución',
        criteria: '180–249 mg/dL',
      },
      {
        color: 'orange',
        severity: 'high',
        label: 'Alto riesgo',
        criteria: '250–300 mg/dL',
      },
      {
        color: 'red',
        severity: 'critical',
        label: 'Crítico',
        criteria: '< 54 mg/dL o > 300 mg/dL con síntomas/cetonas',
      },
    ],
    bibliography: [
      {
        title: 'Standards of Care in Diabetes',
        institution: 'American Diabetes Association',
        year: 2026,
        url: 'https://diabetesjournals.org/care/issue/49/Supplement_1',
        note: 'La hipoglicemia nivel 2 se define con glucosa <54 mg/dL.',
      },
    ],
  },
  {
    key: 'glasgow',
    title: 'Escala de Glasgow',
    unit: 'puntos',
    description:
      'Evalúa respuesta ocular, verbal y motora. Un puntaje bajo sugiere compromiso neurológico y requiere reevaluación clínica urgente.',
    ranges: [
      {
        color: 'green',
        severity: 'normal',
        label: 'Normal',
        criteria: '15 puntos',
      },
      {
        color: 'yellow',
        severity: 'warning',
        label: 'Precaución',
        criteria: '14 puntos',
      },
      {
        color: 'orange',
        severity: 'high',
        label: 'Alto riesgo',
        criteria: '13 puntos',
      },
      {
        color: 'red',
        severity: 'critical',
        label: 'Crítico',
        criteria: '≤ 12 puntos',
      },
    ],
    bibliography: [
      {
        title: 'Glasgow Coma Scale',
        institution: 'Teasdale and Jennett / Glasgow Coma Scale resources',
        year: 1974,
        url: 'https://www.glasgowcomascale.org/',
      },
    ],
  },
  {
    key: 'pain_scale',
    title: 'Escala visual análoga del dolor EVA',
    unit: '0–10',
    description:
      'Clasificación operativa de intensidad del dolor. Debe interpretarse con diagnóstico, signos vitales y contexto clínico.',
    ranges: [
      {
        color: 'green',
        severity: 'normal',
        label: 'Dolor leve o ausente',
        criteria: '0–4',
      },
      {
        color: 'yellow',
        severity: 'warning',
        label: 'Dolor moderado',
        criteria: '5–7',
      },
      {
        color: 'orange',
        severity: 'high',
        label: 'Dolor severo',
        criteria: '8',
      },
      {
        color: 'red',
        severity: 'critical',
        label: 'Dolor muy severo',
        criteria: '9–10',
      },
    ],
    bibliography: [
      {
        title: 'Pain intensity scales in clinical practice',
        institution: 'Uso clínico habitual de escalas EVA/NRS',
        year: 'Referencia clínica general',
      },
    ],
  },
  {
    key: 'allergy',
    title: 'Alergias registradas',
    description:
      'Toda alergia registrada debe ser visible durante la atención y especialmente antes de prescribir medicamentos.',
    ranges: [
      {
        color: 'green',
        severity: 'normal',
        label: 'Sin alergias registradas',
        criteria: 'No hay alergias documentadas',
      },
      {
        color: 'yellow',
        severity: 'warning',
        label: 'Alergia documentada',
        criteria: 'Existe alergia registrada; verificar antes de prescribir',
      },
      {
        color: 'orange',
        severity: 'high',
        label: 'Alergia relevante',
        criteria: 'Alergia medicamentosa o antecedente de reacción importante',
      },
      {
        color: 'red',
        severity: 'critical',
        label: 'Riesgo crítico',
        criteria: 'Alergia grave relacionada con medicamento indicado o antecedente de anafilaxia',
      },
    ],
    bibliography: [
      {
        title: 'Medication safety and allergy documentation',
        institution: 'Buenas prácticas de seguridad del paciente',
        year: 'Referencia clínica general',
      },
    ],
  },
];