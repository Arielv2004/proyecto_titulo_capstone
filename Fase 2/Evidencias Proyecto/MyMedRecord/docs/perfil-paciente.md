# Datos de cuenta y confirmación del perfil

El paciente declara sexo biológico (Femenino o Masculino) y, opcionalmente, género
(Mujer, Hombre, No binario, Otra identidad o Prefiero no informar). Otra identidad
requiere un texto de 1 a 80 caracteres. Son datos independientes: nunca se infiere
uno a partir del otro. Los géneros históricos no reconocidos se conservan y se
identifican como registrados anteriormente.

El perfil está completo con sexo biológico, grupo sanguíneo y previsión. Un perfil
incompleto abre el formulario una vez por sesión del navegador, puede posponerse
y mantiene un aviso para completarlo. La marca de apertura solo contiene el ID
de cuenta en sessionStorage; no almacena datos clínicos. Se reinicia al entrar,
registrarse, salir o detectar una sesión inválida.

Guardar desde el formulario requiere sexo biológico y abre una confirmación.
Volver a editar o Escape no envían cambios. Confirmar bloquea el doble envío; un
error conserva los datos y vuelve al formulario. Solo se anuncia éxito tras la
respuesta del servidor. Los nuevos campos aparecen en Mi perfil, la ficha
compartida autorizada (médico o QR) y la exportación JSON.

## Actualización de una instalación existente

Aplicar `database/migrations/003_patient_identity.sql` en la base que usa la API,
antes de arrancar el backend actualizado. La migración es incremental y repetible:
añade `biological_sex` y `gender_other` a `patient_profiles`, sin nuevas tablas.
No ejecutar `database/init.sql` sobre una base existente: es un inicializador
destructivo. En el entorno de desarrollo actual se usa `mymedrecord_main`.

El campo `gender` mantiene su columna y sus valores anteriores. La migración deja
sexo biológico sin registrar hasta que el paciente lo seleccione. No restaura el
antiguo esquema de seguridad de 18 tablas ni modifica el OCR o los permisos QR.

## Contrato del perfil

`GET/PUT /api/v1/patient-profile/me` requiere una cuenta de paciente activa. PUT
recibe `biologicalSex`, `gender` y `genderOther`; GET y la respuesta de PUT devuelven
`biological_sex`, `gender` y `gender_other`. La ficha compartida usa camelCase.

- Sexo: `FEMENINO` o `MASCULINO`. Si se envía, no puede estar vacío.
- Género: `MUJER`, `HOMBRE`, `NO_BINARIO`, `OTRA_IDENTIDAD`,
  `PREFIERO_NO_INFORMAR`; `null` o cadena vacía lo eliminan explícitamente.
- Texto complementario: se recortan espacios exteriores. Solo corresponde a
  `OTRA_IDENTIDAD`; al cambiar de opción se elimina el texto previo.
- Omitir los campos nuevos conserva sus valores para clientes anteriores. El
  frontend omite un género histórico que no se haya modificado.
- El propietario se obtiene de la sesión, nunca del cuerpo recibido. Los nuevos
  valores no se incorporan al registro de auditoría.

## Verificación reproducible

Desde frontend: `node --test tests/clinicalDisplay.test.js tests/patientIdentity.test.js`
y `npm run build`.

Desde backend-core: `node --test test_patient_profile.js test_qr_single_use.js`.
Estas pruebas necesitan PostgreSQL local y credenciales de pruebas en `DB_USER`
y `DB_PASSWORD` con permiso de crear bases. Crean bases con nombres aleatorios y
las eliminan al finalizar; no usan las cuentas o documentos de la aplicación.

La prueba de navegador se activa con `PLAYWRIGHT_MODULE_PATH` apuntando al módulo
Playwright instalado y el frontend local en puerto 5173. Opcionalmente,
`BROWSER_EXECUTABLE` selecciona Chrome/Chromium y `PROFILE_SCREENSHOT_DIR` la
carpeta de capturas. Las llamadas de esa sesión de navegador se dirigen a la API
de prueba, con una base desechable. Cubre posposición, validación, cancelación,
guardado único, fallo y reintento, recarga, borrado del género y carga fallida.
