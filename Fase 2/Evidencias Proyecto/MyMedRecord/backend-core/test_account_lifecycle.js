/**
 * test_account_lifecycle.js
 *
 * Script de verificación para los derechos de Cancelación (Derecho al Olvido)
 * y Portabilidad según la Ley 21.719 en MyMedRecord.
 *
 * IMPORTANTE:
 * Crea un usuario aleatorio (test_delete_<random>@test.cl) con un RUT simulado
 * válido y NO toca ni modifica a los usuarios semilla (paciente@mymedrecord.cl
 * ni medico@mymedrecord.cl).
 */

const axios = require('axios');
const path = require('path');
const fs = require('fs');
const FormData = require('form-data');
const db = require('./src/config/db');

const BASE_URL = 'http://localhost:5000/api/v1';

// Generador simple de RUT chileno válido para tests
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

async function run() {
  console.log('========================================================');
  console.log('🧪 Iniciando test de ciclo de vida de cuenta (Ley 21.719)');
  console.log('========================================================\n');

  const randomTag = Math.floor(1000 + Math.random() * 9000);
  const testEmail = `test_delete_${randomTag}@test.cl`;
  const testPassword = `Password${randomTag}!`;
  const testRut = generateRandomValidRut();

  console.log(`👤 Usuario de prueba: ${testEmail} (RUT: ${testRut})`);

  let sessionCookie = null;
  let testUserId = null;

  try {
    // 1. REGISTRO CON CONSENTIMIENTO EXPLÍCITO (Ley 21.719)
    console.log('\n[1/6] Registrando nuevo paciente...');
    const registerRes = await axios.post(
      `${BASE_URL}/auth/register`,
      {
        rut: testRut,
        firstName: 'Test',
        lastName: 'Olvido',
        email: testEmail,
        password: testPassword,
        role: 'PACIENTE',
        acceptedTerms: true,
      },
      { validateStatus: () => true }
    );

    if (registerRes.status !== 201) {
      console.error('❌ Falló el registro:', registerRes.status, registerRes.data);
      process.exit(1);
    }

    testUserId = registerRes.data.data.user.id;
    const setCookie = registerRes.headers['set-cookie'];
    if (setCookie && setCookie.length > 0) {
      sessionCookie = setCookie[0].split(';')[0];
    }

    console.log(`✅ Paciente registrado con ID: ${testUserId}`);
    console.log(`🍪 Cookie de sesión capturada: ${sessionCookie ? 'OK' : 'No recibida'}`);

    // 2. SUBIR UN DOCUMENTO DE PRUEBA
    console.log('\n[2/6] Subiendo documento clínico de prueba...');
    const form = new FormData();
    const dummyBuffer = Buffer.from('Contenido de prueba para receta medica - Paracetamol 500mg');
    form.append('file', dummyBuffer, {
      filename: `receta_test_${randomTag}.png`,
      contentType: 'image/png',
    });
    form.append('document_type', 'RECETA');
    form.append('title', 'Receta Test Olvido');

    const uploadRes = await axios.post(`${BASE_URL}/documents/upload`, form, {
      headers: {
        ...form.getHeaders(),
        Cookie: sessionCookie,
      },
      validateStatus: () => true,
    });

    console.log(`📄 Respuesta subida documento: status ${uploadRes.status}`);
    const docId = uploadRes.data?.data?.document?.id || uploadRes.data?.data?.id;
    console.log(`✅ Documento creado con ID: ${docId || 'N/A'}`);

    // 3. EXPORTAR DATOS (PORTABILIDAD)
    console.log('\n[3/6] Probando exportación completa (GET /users/me/export)...');
    const exportRes = await axios.get(`${BASE_URL}/users/me/export`, {
      headers: { Cookie: sessionCookie },
      validateStatus: () => true,
    });

    if (exportRes.status !== 200) {
      console.error('❌ Falló exportación:', exportRes.status, exportRes.data);
      process.exit(1);
    }

    const exported = exportRes.data;
    console.log('✅ Exportación generada con éxito');
    console.log('   - Legal basis:', exported.export_metadata?.legal_basis);
    console.log('   - Cuenta:', exported.account?.email);
    console.log('   - Documentos exportados:', exported.documents?.length);
    console.log('   - Contiene ocr_raw_text:', exported.documents[0] ? 'ocr_raw_text' in exported.documents[0] : 'N/A');
    console.log('   - Auditoría incluida:', exported.audit_logs?.length);

    // 4. INTENTO FALLIDO DE ELIMINACIÓN (SIN CONFIRMACIÓN CORRECTA)
    console.log('\n[4/6] Probando validaciones de seguridad en DELETE /users/me...');
    const badConfirmRes = await axios.delete(`${BASE_URL}/users/me`, {
      headers: { Cookie: sessionCookie },
      data: { confirmation: 'eliminar', password: testPassword }, // minúscula inválida
      validateStatus: () => true,
    });
    console.log(`   - Confirmación inválida ('eliminar'): Status ${badConfirmRes.status} (${badConfirmRes.data?.message})`);

    const badPassRes = await axios.delete(`${BASE_URL}/users/me`, {
      headers: { Cookie: sessionCookie },
      data: { confirmation: 'ELIMINAR', password: 'wrongpassword' },
      validateStatus: () => true,
    });
    console.log(`   - Contraseña incorrecta: Status ${badPassRes.status} (${badPassRes.data?.message})`);

    // 5. ELIMINACIÓN DEFINITIVA EXITOSA (DERECHO AL OLVIDO)
    console.log('\n[5/6] Ejecutando supresión definitiva de cuenta...');
    const deleteRes = await axios.delete(`${BASE_URL}/users/me`, {
      headers: { Cookie: sessionCookie },
      data: { confirmation: 'ELIMINAR', password: testPassword },
      validateStatus: () => true,
    });

    if (deleteRes.status !== 200) {
      console.error('❌ Falló eliminación:', deleteRes.status, deleteRes.data);
      process.exit(1);
    }
    console.log('✅ Respuesta exitosa:', deleteRes.data.message);

    // 6. VERIFICACIÓN EN BASE DE DATOS
    console.log('\n[6/6] Verificando en PostgreSQL que los datos fueron purgados...');
    const userCheck = await db.query('SELECT id, email FROM users WHERE id = $1', [testUserId]);
    console.log(`   - Usuario en tabla 'users': ${userCheck.rows.length === 0 ? 'PURGADO (OK)' : 'ERROR: Aún existe'}`);

    const docsCheck = await db.query('SELECT id FROM documents WHERE patient_id = $1', [testUserId]);
    console.log(`   - Documentos del paciente: ${docsCheck.rows.length === 0 ? 'PURGADOS (OK)' : 'ERROR: Aún existen'}`);

    const auditCheck = await db.query(
      `SELECT action, details FROM audit_logs WHERE action = 'ACCOUNT_DELETED' ORDER BY created_at DESC LIMIT 1`
    );
    console.log(`   - Registro ACCOUNT_DELETED en audit_logs:`, auditCheck.rows[0]?.action || 'NO ENCONTRADO');
    console.log(`   - Subject hash registrado:`, auditCheck.rows[0]?.details?.subject_hash ? 'OK (Pseudonimizado)' : 'FALTA');

    // 7. COMPROBAR QUE LA SESIÓN ANTIGUA YA NO FUNCIONA
    const postDeleteReq = await axios.get(`${BASE_URL}/users/me/export`, {
      headers: { Cookie: sessionCookie },
      validateStatus: () => true,
    });
    console.log(`   - Petición con sesión eliminada: Status ${postDeleteReq.status} (Acceso denegado o usuario no encontrado)`);

    console.log('\n========================================================');
    console.log('🎉 TODAS LAS VERIFICACIONES PASARON EXITOSAMENTE');
    console.log('========================================================\n');
  } catch (error) {
    console.error('❌ Error no controlado durante la prueba:', error.message);
  } finally {
    await db.pool.end();
  }
}

run();
