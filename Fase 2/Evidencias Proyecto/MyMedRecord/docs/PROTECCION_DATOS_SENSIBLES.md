# Protección de datos sensibles — implementación y operación

Estado: prototipo con datos ficticios. Rama de implementación: IgnacioRuiz.
Esta entrega no certifica cumplimiento legal ni autoriza un piloto clínico.

## Cambios implementados

- Originales en bucket privado medical-documents. El backend valida propietario o permiso antes de entregar los bytes, con no-store. No entrega URLs públicas ni firmadas al navegador. Las referencias antiguas se convierten a supabase://bucket/objeto.
- Supabase falla de forma controlada; no existe fallback automático. El modo local requiere STORAGE_MODE=local y no se permite como modo de producción.
- Antecedentes, metadatos clínicos descriptivos, texto OCR, recetas, resultados y motivo de citas se guardan como sobres AES-256-GCM. Cada sobre lleva versión, clave, IV aleatorio y tag; AAD vincula tabla, fila y paciente. RUT, correo, relaciones, estados y fechas operativas siguen consultables.
- Sesiones opacas aleatorias de 256 bits en cookie HttpOnly/SameSite Strict; la base conserva solo SHA-256. Cada solicitud verifica sesión, vigencia y cuenta activa. Logout revoca en servidor. Un trigger invalida sesiones y permisos al desactivar una cuenta, incluso si luego se reactiva.
- CSRF mediante token firmado y comprobación de origen, límites persistentes para registro, login, QR, carga documental y exportación.
- Médicos: cuenta activa, rol MEDICO, perfil VERIFICADO y habilitado; permiso del médico correcto, vigente y no revocado. Las rutas heredadas de citas también exigen perfil habilitado. La navegación nueva usa el ID del permiso directo; las rutas antiguas siguen comprobando autorización.
- QR sin cuenta: identificación declarada cifrada, solicitud de cinco minutos, aprobación/rechazo por el paciente y cookie de consulta ligada al navegador. La expiración nunca supera la del pase. Finalizar consulta invalida esa sesión; revocar un pase no revoca los demás. Los QR anteriores a la migración quedan anulados.
- El enlace QR nuevo transporta el código en el fragmento, que no viaja en la solicitud HTTP; se retira de la dirección al abrir la página. No se persisten tokens ni fichas en localStorage. No hay service worker que almacene respuestas clínicas.
- OCR local: Tesseract en español e inglés instalado en contenedor, lectura de PDF local, autenticación del backend y acceso al proveedor externo para estructuración. El gateway solo publica 127.0.0.1:8000. La demostración restaura la estructuración automática con Gemini, descrita abajo; no se ofrece un modelo de lenguaje local.
- Procesamiento: contenido real admitido, máximo 10 MB, 20 páginas PDF y 20 megapíxeles; dos procesos simultáneos y terminación del subproceso a los 40 segundos. La imagen OCR usa además timeout de Tesseract.
- Confirmar/descartar retira el texto OCR; temporales abandonados de más de 24 horas se limpian al iniciar y cada hora.
- El borrado oculta inmediatamente el documento y crea una tarea durable. Si Storage falla, queda pendiente; se reintenta cada hora. Al completarse se eliminan los datos estructurados asociados y se vacía la carga clínica del documento.
- La auditoría registra acción, recurso o patrón de ruta, resultado, modalidad e identidad declarada/autenticada. El rol de aplicación solo puede insertar y leer audit_logs. Un administrador PostgreSQL sigue teniendo capacidad de modificarla.
- Por decisión de interfaz, Mi perfil no muestra exportación JSON ni aceptación del aviso. Los endpoints del backend permanecen implementados; los originales se descargan individualmente desde Mi ficha.

## Evidencia de verificación

Los tests crean una base aislada mmr_security_test_* con usuarios ficticios y la eliminan al finalizar. Nunca inicializan la base principal.

| Comprobación | Resultado observado |
|---|---|
| Perfil cifrado, AAD diferente y tag manipulado | Verificado |
| Confirmación y actualización de documento, lectura estructurada | Verificado |
| Lectura/edición/borrado entre pacientes distintos | Denegado |
| QR sin aprobación, sesión de otro navegador | Denegado |
| Aprobación del paciente, dos pases y revocación independiente | Verificado |
| Solicitud vencida después de cinco minutos | Denegada |
| Médico suspendido, ficha y original | Denegado |
| Logout y cuenta desactivada/reactivada con sesión anterior | Denegado |
| CSRF ausente y exceso de login | Denegado |
| Borrado físico fallido, reintento y temporal abandonado | Verificado |
| UPDATE y DELETE de auditoría por rol de aplicación | Denegado |
| Exportación propia y aceptación versionada | Verificado |
| Restauración de BD y reaplicación de bajas posteriores | Verificado en destino aislado |
| Navegador: solicitud, aprobación, móvil 393 px y revocación | Verificado |
| OCR real de PNG y PDF sin Gemini, autenticación del servicio | Verificado |
| Descarga anónima de las 16 URLs de objetos preexistentes | Denegada |
| Carga real de imagen, OCR, confirmación, original y eliminación | Verificado |

Se detectó que una descarga de Storage inmediatamente posterior al borrado podía devolver una respuesta en caché. Las nuevas cargas usan cacheControl=0 y la descarga autorizada fuerza una URL de consulta fresca. El backend siempre niega documentos con estado ELIMINADO, incluso si el proveedor conserva temporalmente alguna caché.

Dos referencias de originales de la base de demostración apuntaban a archivos ausentes. No se generaron reemplazos ficticios para ocultar el problema. El respaldo de originales avisa de esta falta; los metadatos y datos estructurados sí forman parte del respaldo de la base.

## Instalación y migración segura

1. Detener el backend y conservar el entorno anterior. Nunca ejecutar database/init.sql en una base existente: es destructivo.
2. Configurar backend-core/.env y ai-service/.env fuera de Git. Para una base ya cifrada, recuperar sus claves autorizadas; nunca generar claves distintas esperando leer esos datos.
3. Para la primera instalación local, ejecutar desde backend-core: node scripts/setup-local-security.cjs. El script conserva las credenciales administrativas en .private/admin.env y genera secretos independientes. Revisar que ese archivo no viaje en repositorios ni entregas.
4. Crear un respaldo: node scripts/backup.cjs. Conservar las claves por separado en un gestor de secretos. El respaldo del dump se cifra antes de escribirse en disco.
5. Ejecutar node scripts/migrate-security.cjs. Usa transacción y comprueba descifrado; mantiene lecturas compatibles, limpia copias clínicas y anula QR antiguos. Repetir no vuelve a revocar los nuevos QR.
6. Configurar el bucket como privado desde Supabase. El backend rechaza arrancar si Storage sigue público.
7. Ejecutar node scripts/restrict-db.cjs. Crea/configura mymedrecord_app con clave aleatoria, sin superusuario, creación de roles ni bases. Impide edición/borrado de auditoría y escritura de la tabla de migraciones.
8. Desde la raíz del proyecto ejecutar docker compose up -d --build. PostgreSQL/pgAdmin/gateway OCR se exponen solo en loopback. El contenedor OCR es no-root, de solo lectura, con límites de memoria/procesos y salida externa para Gemini.
9. Iniciar backend y frontend con sus comandos habituales. Todos deben volver a iniciar sesión y emitir nuevos pases QR.
10. Ejecutar las pruebas con datos ficticios antes de integrar la rama.

Producción exige PUBLIC_APP_URL HTTPS, STORAGE_MODE=supabase, usuario limitado y secretos reales. TRUST_PROXY=1 solo detrás de un proxy propio que quite encabezados reenviados del cliente. Configurar el proxy para no registrar query strings, cookies, encabezados Authorization ni cuerpos clínicos. El dominio público se configura por despliegue, nunca se pregunta al paciente.

## Pruebas reproducibles

Desde backend-core:

- npm test: API, cifrado, permisos, cola de borrado, sesiones, auditoría y restauración.
- node scripts/test-storage.cjs: bucket privado, URLs preexistentes y carga/lectura/borrado de un archivo ficticio. Usa .private/ficticio.png generado por la prueba OCR.
- RUN_LIVE_INTEGRATION=1 añade a npm test la carga completa con Storage y OCR reales y recuperación de un original desde respaldo. En PowerShell usar $env:RUN_LIVE_INTEGRATION='1'.
- PLAYWRIGHT_MODULE y CHROME_PATH permiten añadir la prueba de navegador con Playwright/Chromium instalados. El frontend debe estar levantado; las llamadas se redirigen a la API de la base de prueba.

Desde ai-service: python test_local_ocr.py, con dependencias instaladas y Docker OCR levantado. El generador de imagen usa la fuente Arial de Windows; adaptar su ruta en otros sistemas.

Desde frontend: npm run lint y npm run build.

Los resultados y capturas locales van a .private y no se publican. El build conserva una advertencia de tamaño del bundle; no se presentó como error de seguridad.

## Respaldos y recuperación

- node scripts/backup.cjs: dump PostgreSQL cifrado y comprobado.
- node scripts/backup-files.cjs: originales cifrados individualmente y manifiesto cifrado. Si falta un archivo devuelve error; no declara que el respaldo sea completo.
- Respaldar también el registro vigente .private/deletion-ledger.jsonl en un destino independiente del snapshot y protegido. Guarda bajas sin texto clínico, cifradas. Se sincroniza a disco antes de confirmar una baja.
- Custodiar CLINICAL_ENCRYPTION_KEYS por separado. Mantener las versiones antiguas mientras existan sobres o respaldos que las utilicen.
- Restaurar primero en una base nueva y aislada: node scripts/restore-security.cjs <respaldo.json.enc> mmr_restore_<nombre>.
- El script exige el registro de bajas, descifra las filas, aplica eliminaciones posteriores y anula todos los permisos y sesiones. Por diseño ningún permiso antiguo vuelve a funcionar; los pacientes emiten otros.
- Recuperar originales, si corresponde: node scripts/restore-files.cjs <directorio-files> mmr_restore_<nombre>. Omite bajas y filas ausentes, evita sobrescribir archivos diferentes y sube los recuperados con referencias nuevas. No habilitar el destino si el manifiesto marca faltantes.
- Comparar recuentos y comprobar originales, perfiles y registros ficticios. Aplicar permisos limitados y verificar migraciones antes de cambiar DB_NAME.
- El backup y el ledger en el mismo disco no protegen frente a pérdida del equipo. Se requiere copia externa cifrada, con control de acceso y retención aprobada.
- La recuperación no puede recuperar archivos que ya se entregaron a terceros ni deshacer sus descargas.

## Claves y rotación

La clave service_role compartida anteriormente debe considerarse expuesta. No se incluyó en código ni documentos. Sigue pendiente crear una nueva, guardarla directamente en backend-core/.env, verificar Storage y desactivar la anterior desde Supabase. No pegar claves en chats.

Rotación clínica: agregar v2 a CLINICAL_ENCRYPTION_KEYS, poner CLINICAL_ACTIVE_KEY=v2 y mantener v1. Las escrituras nuevas usarán v2; la lectura reconoce cada kid. Recifrar datos anteriores mediante una migración revisada y verificar antes de retirar v1. No reutilizar secretos de CSRF, OCR, almacenamiento ni cifrado.

## Responsabilidades y condiciones pendientes antes de un piloto real

El equipo debe asignar nominalmente responsable de operación, custodio de claves y responsable de privacidad/incidentes. El rol técnico de base de datos no sustituye estas responsabilidades.

Pendientes externos:
- Rotar y revocar la clave de Storage expuesta; revisar políticas RLS y credenciales del proyecto Supabase.
- Verificar cifrado del volumen del host y del disco de la base; no se ha acreditado BitLocker ni cifrado del volumen Docker en este equipo.
- Configurar HTTPS, dominio y proxy de producción; renovar credenciales administrativas de ejemplo de PostgreSQL/pgAdmin.
- Recuperar o reemplazar explícitamente los dos originales ausentes de demostración si se desean conservar.
- Aprobar conservación y borrado de documentos confirmados, auditoría, respaldos y registro de bajas; no se inventaron plazos.
- Definir contacto del responsable, finalidad, destinatarios/proveedores, jurisdicción y condiciones aplicables a un piloto. El aviso actual lo identifica como prototipo.
- Activar copias externas, alertas de fallos de limpieza/auditoría y ensayar restauración operativa por el responsable.
- Completar revisión independiente antes de autorizar información clínica real.

Incidente: suspender accesos afectados, revocar credenciales y sesiones, preservar auditoría y respaldos protegidos, determinar datos y personas afectadas y documentar corrección y comunicaciones aplicables. No copiar documentos clínicos en tickets o capturas.

## Fuentes del plan

- [Supabase: buckets privados y públicos](https://supabase.com/docs/guides/storage/buckets/fundamentals).
- [Condiciones de Gemini API](https://ai.google.dev/gemini-api/terms?hl=en). Aplicables cuando se habilita la opción de Gemini.
- [Ley 21.719, texto oficial BCN](https://www.bcn.cl/leychile/navegar?i=1209272). La implementación técnica no reemplaza la revisión de las obligaciones aplicables.

## Flujo automático OCR + Gemini para la demostración académica

Se restaura el flujo original: seleccionar cámara, galería o PDF → leer con OCR → estructurar automáticamente con Gemini → revisar/corregir → confirmar o descartar. No se pide marcar una casilla adicional. El texto se envía al proveedor; el prototipo utiliza exclusivamente datos ficticios. Se conservan el cifrado, los permisos y el almacenamiento privado.

Configurar `LLM_API_KEY` y `LLM_MODEL=gemini-2.5-flash` en `ai-service/.env` y ejecutar `docker compose up -d --build ocr ocr-gateway`. Cada integrante necesita configurar una clave privada válida; no se incluye en Git. El Compose base habilita Gemini y salida de red, sin publicar directamente el servicio OCR. Para un entorno solo local se puede ejecutar con `EXTERNAL_AI_ENABLED=false` en el entorno de Compose.

Si falta la clave o falla el proveedor, se muestra un aviso y queda disponible el texto OCR para revisión manual. Las respuestas se validan contra el esquema clínico y no se guardan errores técnicos como datos clínicos. La llamada al proveedor tiene un plazo de 30 segundos.

La prueba `ai-service/.venv/Scripts/python.exe ai-service/test_gemini_flow.py` verifica el procesamiento automático con un proveedor simulado y la degradación controlada. La extracción real con Google sigue pendiente de una clave y cuota válidas; no se considera acreditada por las pruebas simuladas.

## Ajustes de interfaz posteriores

Se retiraron contacto de emergencia en perfil/ficha médica y el bloque de exportación JSON y aceptación del aviso en Mi perfil. No se eliminaron datos almacenados ni endpoints de privacidad. Se restauraron los textos originales de selección/progreso de subida y se mantienen el texto OCR desplegable y los avisos de fallo. Las pruebas del flujo Gemini usan respuestas simuladas; la clave del entorno sigue pendiente. No se publicó ni integró esta entrega a main.
