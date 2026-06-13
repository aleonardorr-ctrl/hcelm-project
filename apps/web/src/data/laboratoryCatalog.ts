export type LaboratoryExamItem =
  | string
  | {
      name: string;
      components: string[];
    };

export type LaboratoryCategory = {
  category: string;
  exams: LaboratoryExamItem[];
  allowCustom?: boolean;
};

export const laboratoryCatalog: LaboratoryCategory[] = [
  {
    category: 'Perfiles',
    exams: [
      {
        name: 'Perfil Hepático',
        components: [
          'Bilirrubina total y fraccionada',
          'Proteínas totales y albúmina',
          'Globulinas',
          'Relación albúmina/globulina (A/G)',
          'ALT / TGP',
          'AST / TGO',
          'Fosfatasa alcalina',
          'GGT',
          'Tiempo de protrombina (TP) / INR',
          'Colinesterasa',
          'Amonio',
        ],
      },
      {
        name: 'Perfil Lipídico',
        components: [
          'Colesterol total',
          'Colesterol HDL',
          'Colesterol LDL',
          'Triglicéridos',
          'Colesterol no-HDL',
          'Relación colesterol total/HDL',
          'Apolipoproteína A1',
          'Apolipoproteína B',
          'Lipoproteína(a) - Lp(a)',
        ],
      },
      {
        name: 'Perfil Tiroideo',
        components: [
          'TSH',
          'T4 libre',
          'T3 libre',
          'T4 total',
          'T3 total',
          'Anticuerpos antitiroglobulina',
          'Anticuerpos antiperoxidasa tiroidea',
          'Anticuerpos anti-receptor de TSH',
          'Calcitonina',
          'Tiroglobulina',
        ],
      },
      {
        name: 'Perfil Preoperatorio',
        components: [
          'Hemograma completo',
          'Tiempo de protrombina (TP) / INR',
          'Tiempo parcial de tromboplastina (TTPa)',
          'Grupo sanguíneo y factor Rh',
          'Glucosa en ayunas',
          'Urea',
          'Creatinina',
          'Electrolitos séricos',
          'ALT / TGP',
          'AST / TGO',
          'Bilirrubina total y fraccionada',
          'Examen completo de orina',
          'VIH',
          'Hepatitis B',
          'Hepatitis C',
          'VDRL/RPR',
          'Electrocardiograma',
          'Radiografía de tórax',
        ],
      },
      {
        name: 'Perfil Reumatológico',
        components: [
          'Factor reumatoide',
          'Proteína C reactiva',
          'Velocidad de sedimentación globular',
          'Ácido úrico',
          'Anticuerpos antinucleares',
          'Anti-DNA nativo',
          'Anti-Sm',
          'Anti-RNP',
          'Anti-SSA/Ro',
          'Anti-SSB/La',
          'Anti-CCP',
          'Complemento C3',
          'Complemento C4',
          'Factor antinuclear con patrón y título',
          'HLA-B27',
        ],
      },
      {
        name: 'Perfil Hormonal',
        components: [
          'FSH',
          'LH',
          'Estradiol',
          'Progesterona',
          'Testosterona total y libre',
          'Prolactina',
          'SHBG',
          'DHEA-S',
          '17-hidroxiprogesterona',
          'Hormona del crecimiento',
          'IGF-1',
          'Cortisol',
          'ACTH',
          'Hormona paratiroidea',
          'Vitamina D',
          'Aldosterona y renina',
          'Catecolaminas y metanefrinas',
        ],
      },
      {
        name: 'Perfil Diabético',
        components: [
          'Glucosa en ayunas',
          'Hemoglobina glicosilada (HbA1c)',
          'Glucosa postprandial',
          'Prueba de tolerancia oral a la glucosa',
          'Insulina basal',
          'Péptido C',
          'Índice HOMA-IR',
          'Microalbuminuria',
          'Perfil lipídico completo',
          'Creatinina',
          'Tasa de filtración glomerular',
          'Ácido úrico',
          'Electrolitos séricos',
        ],
      },
    ],
  },

  {
    category: 'Hematología',
    exams: [
      'Hemograma completo',
      'Hemoglobina',
      'Hematocrito',
      'Plaquetas',
      'Reticulocitos',
      'Grupo sanguíneo',
      'Factor Rh',
    ],
  },

  {
    category: 'Hemostasia y Trombosis',
    exams: [
      'Tiempo de protrombina (TP)',
      'Tiempo parcial de tromboplastina (TTPa)',
      'INR',
      'Fibrinógeno',
      'Dímero D',
      'Proteína C',
      'Proteína S',
    ],
  },

  {
    category: 'Bioquímica',
    exams: [
      'Glucosa',
      'Urea',
      'Creatinina',
      'Ácido úrico',
      'Calcio',
      'Magnesio',
      'Fósforo',
      'Proteínas totales',
      'Albúmina',
      'PCR',
    ],
  },

  {
    category: 'Heces',
    exams: [
      'Examen directo de heces',
      'Parasitológico seriado',
      'Reacción inflamatoria fecal',
      'Sangre oculta en heces',
      'Coprocultivo',
    ],
  },

  {
    category: 'Otros Exámenes',
    exams: [],
    allowCustom: true,
  },
];