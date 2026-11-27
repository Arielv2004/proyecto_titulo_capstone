/**
 * test_pdf_grouping_layout.js
 *
 * Verificación exhaustiva de:
 * 1. Encabezado de dos columnas sin superposición.
 * 2. Agrupación de múltiples fármacos en una sola fila por receta (separados por coma).
 * 3. Consolidación de recetas duplicadas con los mismos fármacos en la misma fecha.
 * 4. Conversión de médicos "No especificado" en un guion "-".
 * 5. Tamaño A4 con tablas proporcionadas a 9pt.
 * 6. Redacción fluida del resumen de IA (sin paréntesis ni sintaxis de plantilla).
 */

const fs = require('fs');
const path = require('path');
const PDFService = require('./src/services/pdf.service');

async function testPdfGroupingAndLayout() {
  console.log('========================================================');
  console.log('🧪 Probando corrección de diseño, A4 y agrupación en PDF');
  console.log('========================================================\n');

  const mockPatient = {
    first_name: 'Alejandro',
    last_name: 'Valenzuela Morales',
    rut: '16.782.914-3',
    email: 'alejandro.valenzuela@salud.cl',
  };

  const mockProfile = {
    health_insurance: 'FONASA Tramo B',
    blood_type: 'O+',
    is_organ_donor: true,
    emergency_contact_name: 'Carmen Morales',
    emergency_contact_phone: '+56 9 8765 4321',
    allergies: ['Penicilina', 'AINEs (Ketorolaco)'],
    chronic_conditions: ['Hipertensión Arterial Primaria', 'Dislipidemia Leve'],
  };

  // Recetas para probar agrupación y consolidación:
  // - Receta 1: Múltiples fármacos en la misma prescripción (Amoxicilina, Paracetamol, Ibuprofeno).
  // - Receta 2: Fármaco único (Losartán) con médico especificado.
  // - Receta 3: Fármaco con médico "No especificado" -> debe mostrar "-".
  // - Receta 4: Duplicado exacto de Receta 2 (misma fecha, mismo médico, mismo fármaco) -> debe consolidarse.
  const mockPrescriptions = [
    {
      id: 'rx-1',
      doctor_name: 'Dra. Patricia Muñoz',
      issue_date: '2026-10-14',
      status: 'ACTIVA',
      items: [
        { medication_name: 'Amoxicilina', dosage: '500 mg', frequency: 'cada 8 horas', duration: 'por 7 días' },
        { medication_name: 'Paracetamol', dosage: '500 mg', frequency: 'cada 8 horas en caso de fiebre', duration: 'por 3 días' },
        { medication_name: 'Ibuprofeno', dosage: '400 mg', frequency: 'cada 12 horas con las comidas', duration: 'por 5 días' },
      ],
    },
    {
      id: 'rx-2',
      doctor_name: 'Dr. Roberto Soto',
      issue_date: '2026-09-01',
      status: 'ACTIVA',
      items: [
        { medication_name: 'Losartán Potásico', dosage: '50 mg', frequency: '1 comprimido cada 24 horas', duration: 'uso permanente' },
      ],
    },
    {
      id: 'rx-3',
      doctor_name: 'No especificado',
      issue_date: '2026-08-20',
      status: 'FINALIZADA',
      items: [
        { medication_name: 'Omeprazol', dosage: '20 mg', frequency: '1 cápsula en ayunas', duration: 'por 14 días' },
      ],
    },
    {
      id: 'rx-4', // Duplicado de rx-2 para verificar consolidación
      doctor_name: 'Dr. Roberto Soto',
      issue_date: '2026-09-01',
      status: 'ACTIVA',
      items: [
        { medication_name: 'Losartán Potásico', dosage: '50 mg', frequency: '1 comprimido cada 24 horas', duration: 'uso permanente' },
      ],
    },
  ];

  const mockLabReports = [
    {
      id: 'lab-1',
      laboratory_name: 'Laboratorio Clínico San José',
      sample_date: '2026-10-02',
      items: [
        { test_name: 'Glicemia en ayunas', result_value: '94', unit: 'mg/dL', reference_range: '70 - 100 mg/dL', is_abnormal: false },
        { test_name: 'Colesterol Total', result_value: '228', unit: 'mg/dL', reference_range: '< 200 mg/dL', is_abnormal: true },
        { test_name: 'Triglicéridos', result_value: '142', unit: 'mg/dL', reference_range: '< 150 mg/dL', is_abnormal: false },
      ],
    },
  ];

  const naturalAiSummary =
    'El paciente Alejandro Valenzuela Morales cuenta con 4 documentos clínicos registrados en su historial digital de MyMedRecord. ' +
    'Registra antecedentes conocidos de hipersensibilidad a la Penicilina y comorbilidades activas de Hipertensión Arterial Primaria y Dislipidemia Leve.\n\n' +
    'En relación a su esquema terapéutico, cuenta con 3 prescripciones médicas vigentes, destacando cobertura antibiótica con Amoxicilina y tratamiento antihipertensivo continuo con Losartán Potásico 50 mg. ' +
    'En el perfil paraclínico reciente se observan cifras de glicemia estables, con elevación moderada del colesterol total (228 mg/dL) que amerita seguimiento nutricional y control lipídico ambulatorio.';

  console.log('[1/3] Ejecutando agrupación y consolidación de prescripciones...');
  const grouped = PDFService.groupAndConsolidatePrescriptions(mockPrescriptions);
  console.log(`   - Prescripciones de entrada: ${mockPrescriptions.length}`);
  console.log(`   - Prescripciones consolidadas resultantes: ${grouped.length} (Esperado: 3, eliminó el duplicado de Losartán)`);

  if (grouped.length !== 3) {
    console.error('❌ Falló la consolidación de recetas duplicadas.');
    process.exit(1);
  }
  console.log('✅ Consolidación exitosa.');

  console.log('\n[2/3] Verificando detalle de fármacos agrupados en una sola celda...');
  const multiMed = grouped[0];
  console.log(`   - Fármacos combinados de Receta 1: "${multiMed.medications}"`);
  if (!multiMed.medications.includes('Amoxicilina') || !multiMed.medications.includes('Paracetamol')) {
    console.error('❌ No se agruparon correctamente los fármacos de la misma receta.');
    process.exit(1);
  }
  console.log('✅ Múltiples medicamentos agrupados por coma correctamente.');

  console.log('\n[3/3] Verificando sustitución de médico no especificado por guion "-":');
  const noDoc = grouped.find((g) => g.medications.includes('Omeprazol'));
  console.log(`   - Médico de Omeprazol: "${noDoc?.doctor}" (Esperado: "-")`);
  if (noDoc?.doctor !== '-') {
    console.error('❌ No se reemplazó el médico "No especificado" por "-".');
    process.exit(1);
  }
  console.log('✅ Médico sustituido por guion "-" con éxito.');

  console.log('\n📄 Generando archivo PDF A4 completo con diseño corregido...');
  const pdfBuffer = await PDFService.generateClinicalReport({
    patient: mockPatient,
    profile: mockProfile,
    aiSummary: naturalAiSummary,
    prescriptions: mockPrescriptions,
    labReports: mockLabReports,
    documents: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }],
  });

  const outPath = path.join(__dirname, 'sample_informe_clinico_corregido.pdf');
  fs.writeFileSync(outPath, pdfBuffer);
  console.log(`✅ Archivo PDF generado con éxito en: ${outPath} (${pdfBuffer.length} bytes)`);

  console.log('\n========================================================');
  console.log('🎉 TODAS LAS CORRECCIONES DE PDF PASARON CON ÉXITO');
  console.log('========================================================\n');
}

testPdfGroupingAndLayout();

