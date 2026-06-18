const fs = require('fs');
const path = require('path');

const filePath = path.join(
  __dirname,
  'apps',
  'web',
  'src',
  'pages',
  'Anamnesis.tsx',
);

if (!fs.existsSync(filePath)) {
  console.error('❌ No existe el archivo:', filePath);
  process.exit(1);
}

let text = fs.readFileSync(filePath, 'utf8');

if (!text.includes('export default function Anamnesis')) {
  console.error('❌ Este archivo NO parece ser Anamnesis.tsx.');
  console.error('Busqué: export default function Anamnesis');
  console.error('No se hicieron cambios.');
  process.exit(1);
}

const backupPath = `${filePath}.backup-${Date.now()}`;
fs.writeFileSync(backupPath, text, 'utf8');
console.log('✅ Backup creado:', backupPath);

// 1. Asegurar encabezado con salto de línea correcto
text = text.replace(
  '// HCELM - pages/Anamnesis.tsx\r\n// Módulo de anamnesis/HCE: diagnósticos, receta, órdenes, PDF y destino final.import',
  '// HCELM - pages/Anamnesis.tsx\r\n// Módulo de anamnesis/HCE: diagnósticos, receta, órdenes, PDF y destino final.\r\nimport',
);

text = text.replace(
  '// HCELM - pages/Anamnesis.tsx\n// Módulo de anamnesis/HCE: diagnósticos, receta, órdenes, PDF y destino final.import',
  '// HCELM - pages/Anamnesis.tsx\n// Módulo de anamnesis/HCE: diagnósticos, receta, órdenes, PDF y destino final.\nimport',
);

// 2. Agregar encounterId al formData si no existe
if (!text.includes('encounterId:')) {
  text = text.replace(
    "const [formData, setFormData] = useState({\n    patientId: '',",
    "const [formData, setFormData] = useState({\n    patientId: '',\n    encounterId: '',",
  );

  text = text.replace(
    "const [formData, setFormData] = useState({\r\n    patientId: '',",
    "const [formData, setFormData] = useState({\r\n    patientId: '',\r\n    encounterId: '',",
  );
}

// 3. Asegurar que al cargar selectedPatient también guarde encounterId
text = text.replace(
  `patientId: selectedPatient.id,
        motivoConsulta: selectedEncounter?.reason || prev.motivoConsulta,`,
  `patientId: selectedPatient.id,
        encounterId:
          encounterIdFromUrl ||
          selectedEncounter?.id ||
          prev.encounterId,
        motivoConsulta: selectedEncounter?.reason || prev.motivoConsulta,`,
);

text = text.replace(
  `patientId: selectedPatient.id,\r
        motivoConsulta: selectedEncounter?.reason || prev.motivoConsulta,`,
  `patientId: selectedPatient.id,\r
        encounterId:\r
          encounterIdFromUrl ||\r
          selectedEncounter?.id ||\r
          prev.encounterId,\r
        motivoConsulta: selectedEncounter?.reason || prev.motivoConsulta,`,
);

// 4. Cambiar dependencia del useEffect principal si encuentra el patrón
text = text.replace(
  `  }, []);`,
  `  }, [encounterIdFromUrl]);`,
);

// 5. Agregar useEffect de scroll automático si no existe
if (!text.includes('diagnosticos-section')) {
  const scrollEffect = `
  useEffect(() => {
    if (sectionFromUrl !== 'diagnosticos') return;

    const timeout = window.setTimeout(() => {
      const diagnosticsSection = document.getElementById('diagnosticos-section');

      if (diagnosticsSection) {
        diagnosticsSection.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [sectionFromUrl]);

`;

  const firstHandleChangeIndex = text.indexOf('  function handleChange');
  if (firstHandleChangeIndex !== -1) {
    text =
      text.slice(0, firstHandleChangeIndex) +
      scrollEffect +
      text.slice(firstHandleChangeIndex);
  } else {
    console.warn('⚠️ No encontré function handleChange para insertar el scroll. Se omitió ese paso.');
  }
}

// 6. Agregar id a la sección Diagnósticos CIE-10
text = text.replace(
  `<div className="border rounded-lg p-4 bg-yellow-50">
          <div className="flex justify-between items-start gap-4 mb-3">
            <div>
              <h2 className="text-lg font-bold text-slate-700">Diagnósticos CIE-10</h2>`,
  `<div id="diagnosticos-section" className="border rounded-lg p-4 bg-yellow-50">
          <div className="flex justify-between items-start gap-4 mb-3">
            <div>
              <h2 className="text-lg font-bold text-slate-700">Diagnósticos CIE-10</h2>`,
);

fs.writeFileSync(filePath, text, 'utf8');

console.log('✅ Anamnesis.tsx actualizado quirúrgicamente.');
console.log('✅ Se conservó backup por seguridad.');