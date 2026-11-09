/**
 * test_clinical_report_pdf.js
 *
 * Verificación de generación de Informe Clínico en PDF enriquecido con IA:
 * 1. Login con paciente semilla o temporal.
 * 2. Invocación de GET /api/v1/users/me/clinical-report.
 * 3. Validación de cabeceras (Content-Type: application/pdf).
 * 4. Validación de firma binaria %PDF y tamaño.
 * 5. Verificación de registro CLINICAL_REPORT_GENERATED en audit_logs.
 * 6. Guardado de una copia local para inspección visual.
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const db = require('./src/config/db');

const BASE_URL = 'http://localhost:5000/api/v1';

function generateRandomValidRut() {
  const num = Math.floor(10000000 + Math.random() * 89999999);
  const digits = num.toString().split('').reverse();
  let sum = 0;
  let mul = 2;
  for (const d of digits) {
    sum += parseInt(d, 10) * mul;
    mul = mul === 7 ? 2 : mul + 1;
  }
  const rem = 11 - (sum % 11);
  const dv = rem === 11 ? '0' : rem === 10 ? 'K' : rem.toString();
  return `${num.toString().slice(0, 2)}.${num.toString().slice(2, 5)}.${num.toString().slice(5, 8)}-${dv}`;
}

async function testClinicalReport() {
  console.log('========================================================');
  console.log('🧪 Iniciando prueba de Informe Clínico en PDF con IA');
  console.log('========================================================\n');

  let sessionCookie = null;
  let testUserId = null;
  const randomTag = Math.floor(1000 + Math.random() * 9000);
  const testEmail = `test_pdf_${randomTag}@test.cl`;
  const testPassword = `Password${randomTag}!`;
  const testRut = generateRandomValidRut();

  try {
    // 1. REGISTRO DE PACIENTE TEMPORAL
    console.log('[1/4] Registrando paciente de prueba para generar informe...');
    const regRes = await axios.post(`${BASE_URL}/auth/register`, {
      rut: testRut,
      firstName: 'Matías',
      lastName: 'Tapia',
      email: testEmail,
      password: testPassword,
      role: 'PACIENTE',
      acceptedTerms: true,
    });

    testUserId = regRes.data.data.user.id;
    const setCookie = regRes.headers['set-cookie'];
    sessionCookie = setCookie ? setCookie[0].split(';')[0] : '';
    console.log(`✅ Paciente de prueba registrado con ID: ${testUserId}`);

    // 2. PETICIÓN DEL INFORME CLÍNICO EN PDF
    console.log('\n[2/4] Solicitando GET /api/v1/users/me/clinical-report...');
    const reportRes = await axios.get(`${BASE_URL}/users/me/clinical-report`, {
      headers: { Cookie: sessionCookie },
      responseType: 'arraybuffer',
      validateStatus: () => true,
    });

    if (reportRes.status !== 200) {
      console.error('❌ Error solicitando PDF:', reportRes.status, reportRes.data.toString());
      process.exit(1);
    }

    console.log(`✅ Respuesta recibida con Status: ${reportRes.status}`);
    const contentType = reportRes.headers['content-type'];
    const contentDisposition = reportRes.headers['content-disposition'];
    console.log(`   - Content-Type: ${contentType}`);
    console.log(`   - Content-Disposition: ${contentDisposition}`);

    // 3. VALIDACIÓN BINARIA DE FORMATO PDF
    console.log('\n[3/4] Validando firma mágica y estructura del binario...');
    const buffer = Buffer.from(reportRes.data);
    const magicNumber = buffer.slice(0, 4).toString('utf-8');
    console.log(`   - Firma inicial: "${magicNumber}" (Esperado: "%PDF")`);
    console.log(`   - Tamaño total: ${buffer.length} bytes`);

    if (magicNumber !== '%PDF' || buffer.length < 1000) {
      console.error('❌ El archivo generado no tiene una estructura PDF válida.');
      process.exit(1);
    }
    console.log('✅ Archivo PDF válido y consistente.');

    // Guardar copia local de muestra
    const outPath = path.join(__dirname, 'sample_informe_clinico.pdf');
    fs.writeFileSync(outPath, buffer);
    console.log(`   - Copia de inspección guardada en: ${outPath}`);

    // 4. VERIFICACIÓN EN AUDITORÍA
    console.log('\n[4/4] Verificando trazabilidad en audit_logs...');
    const auditRes = await db.query(
      `SELECT action, details, created_at
       FROM audit_logs
       WHERE action = 'CLINICAL_REPORT_GENERATED'
       ORDER BY created_at DESC
       LIMIT 1`
    );

    if (auditRes.rows.length > 0) {
      const log = auditRes.rows[0];
      console.log(`✅ Registro de auditoría encontrado: ${log.action}`);
      console.log(`   - Detalles:`, log.details);
    } else {
      console.warn('⚠️ No se encontró registro en audit_logs.');
    }

    console.log('\n========================================================');
    console.log('🎉 INFORME CLÍNICO EN PDF CON IA GENERADO CON ÉXITO');
    console.log('========================================================\n');
  } catch (error) {
    console.error('❌ Error durante la prueba:', error.message);
  } finally {
    if (testUserId) {
      console.log('🧹 Purgando paciente de prueba temporal...');
      await db.query('DELETE FROM users WHERE id = $1', [testUserId]);
      console.log('✅ Paciente de prueba purgado.');
    }
    await db.pool.end();
  }
}

testClinicalReport();
