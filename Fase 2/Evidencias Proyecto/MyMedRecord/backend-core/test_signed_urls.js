/**
 * test_signed_urls.js
 *
 * Verificación integral de URLs firmadas (Signed URLs) en Supabase:
 * 1. Subida con almacenamiento de path relativo (sin URL pública expuesta).
 * 2. Generación de Signed URL temporal (1 hora).
 * 3. Descarga exitosa mediante la URL firmada.
 * 4. Verificación de expiración de token firmado (solicitud con tiempo vencido).
 * 5. Generación de Signed URL a partir de URLs legacy públicas completas.
 * 6. Limpieza del archivo de prueba en Supabase Storage.
 */

const axios = require('axios');
const SupabaseService = require('./src/services/supabase.service');

async function testSignedUrls() {
  console.log('========================================================');
  console.log('🧪 Iniciando verificación de Signed URLs (Ley 21.719)');
  console.log('========================================================\n');

  if (!SupabaseService.isConfigured()) {
    console.error('❌ Supabase Storage no está configurado en las variables de entorno.');
    process.exit(1);
  }

  const dummyContent = 'Contenido sensible de receta medica protegida con URL firmada - Ley 21.719';
  const dummyBuffer = Buffer.from(dummyContent);
  let uploadedPath = null;

  try {
    // 1. SUBIDA CON PATH RELATIVO
    console.log('[1/5] Subiendo archivo a Supabase Storage...');
    const uploadRes = await SupabaseService.uploadFile(dummyBuffer, 'receta_confidencial.txt', 'text/plain');
    uploadedPath = uploadRes.filePath;
    console.log(`✅ Archivo subido. Path interno devuelto: "${uploadedPath}"`);
    console.log(`   - ¿Contiene protocolo http?: ${uploadedPath.startsWith('http') ? 'SÍ (Error)' : 'NO (Correcto - Confidencial)'}`);

    // 2. GENERACIÓN DE SIGNED URL (1 HORA)
    console.log('\n[2/5] Solicitando Signed URL válida por 3600 segundos...');
    const signedUrl = await SupabaseService.getSignedUrl(uploadedPath, 3600);
    console.log(`✅ Signed URL obtenida exitosamente:`);
    console.log(`   ${signedUrl.slice(0, 100)}...`);
    console.log(`   - Contiene token firmado: ${signedUrl.includes('token=') ? 'SÍ' : 'NO'}`);

    // 3. ACCESO A TRAVÉS DE LA SIGNED URL
    console.log('\n[3/5] Descargando contenido a través de la Signed URL...');
    const downloadRes = await axios.get(signedUrl, { responseType: 'text' });
    if (downloadRes.status === 200 && downloadRes.data === dummyContent) {
      console.log('✅ Descarga exitosa: El contenido coincide exactamente con el original.');
    } else {
      console.error('❌ Falló la descarga o el contenido no coincide.');
      process.exit(1);
    }

    // 4. VERIFICACIÓN DE EXPIRACIÓN (SIGNED URL CON 1 SEGUNDO DE VIDA)
    console.log('\n[4/5] Probando expiración de token (1 segundo de vida)...');
    const shortLivedUrl = await SupabaseService.getSignedUrl(uploadedPath, 1);
    console.log('   - Esperando 3 segundos para que expire el token...');
    await new Promise((resolve) => setTimeout(resolve, 3000));

    try {
      await axios.get(shortLivedUrl);
      console.error('❌ ERROR: La URL firmada aún respondió 200 cuando debía haber expirado.');
      process.exit(1);
    } catch (err) {
      const status = err.response?.status;
      console.log(`✅ Solicitud rechazada por Supabase tras expirar (Status ${status || 'Error'}: ${err.response?.data?.message || err.message}).`);
    }

    // 5. COMPATIBILIDAD CON DOCUMENTOS LEGACY (URL PÚBLICA COMPLETA)
    console.log('\n[5/5] Probando compatibilidad con formato legacy de URL pública completa...');
    const legacyUrl = `https://lfxiklmrovqoqypugala.supabase.co/storage/v1/object/public/medical-documents/${uploadedPath}`;
    console.log(`   - URL legacy simulada: ${legacyUrl}`);
    const signedFromLegacy = await SupabaseService.getSignedUrl(legacyUrl, 3600);
    console.log(`✅ Signed URL generada desde URL legacy: ${signedFromLegacy ? 'OK' : 'FALLÓ'}`);
    const legacyDownloadRes = await axios.get(signedFromLegacy);
    console.log(`✅ Contenido descargado desde URL legacy resuelta: Status ${legacyDownloadRes.status}`);

    console.log('\n========================================================');
    console.log('🎉 TODAS LAS PRUEBAS DE SIGNED URLS PASARON EXITOSAMENTE');
    console.log('========================================================\n');
  } catch (error) {
    console.error('❌ Error no controlado en la prueba:', error.message);
  } finally {
    // Limpieza
    if (uploadedPath) {
      console.log('🧹 Limpiando archivo de prueba en Supabase Storage...');
      await SupabaseService.deleteFile(uploadedPath);
      console.log('✅ Archivo de prueba eliminado.');
    }
  }
}

testSignedUrls();

