# Modelo de datos consolidado de MyMedRecord

Modelo aplicado y verificado en `mymedrecord_main` el 26 de noviembre de 2026: **18 tablas y 23 claves foráneas**. La vista `available_doctors` no se cuenta como tabla.

## Distribución

| Área | Tablas | Cantidad |
| --- | --- | ---: |
| Usuarios y perfiles | `users`, `patient_profiles`, `doctor_profiles`, `health_institutions` | 4 |
| Documentos clínicos | `documents`, `prescriptions`, `prescription_items`, `lab_reports`, `lab_test_items` | 5 |
| Accesos y actividad | `access_grants`, `qr_visitor_requests`, `appointments`, `audit_logs` | 4 |
| Seguridad y operación | `auth_sessions`, `password_reset_tokens`, `privacy_acceptances`, `document_deletions`, `security_rate_limits` | 5 |
| Total | | **18** |

## Archivos

- [Vista de tablas por área y sus campos](modelo.html).
- [Imagen de las 18 tablas](modelo.png), generada desde los metadatos reales.
- [Relaciones en Mermaid](relaciones.mmd): cardinalidades y claves extraídas del catálogo real.
- [Metadatos del esquema](esquema.json): columnas, nulabilidad, claves y restricciones de unicidad.
- [Esquema SQL sin datos](esquema.sql).
- [Resultados de la integración](verificacion/README.md).

## Qué cambió

Se conservaron las 14 tablas de la versión actual y se incorporaron cuatro con integración en el código:

- `auth_sessions`: almacena el hash del JWT y su vigencia. Logout revoca la sesión; el restablecimiento de contraseña revoca todas las sesiones de la cuenta. El middleware comprueba la sesión y el estado/rol actual del usuario. Las cookies antiguas sin sesión registrada requieren iniciar sesión nuevamente.
- `privacy_acceptances`: registra la versión y fecha de aceptación en la misma transacción de registro. La migración copia únicamente aceptaciones que ya tenían versión y fecha en `users`. Los campos de `users` conservan el valor actual; la tabla representa el historial, con una aceptación por usuario y versión. Se elimina con la cuenta.
- `document_deletions`: conserva trabajos de eliminación de archivos y reintentos con espera progresiva. La ruta está cifrada y se elimina de la tarea al completarla. Sus referencias a usuario y documento son opcionales para que la tarea sobreviva a la eliminación de la cuenta. El trabajador procesa trabajos pendientes cada 30 segundos mientras la API está ejecutándose.
- `security_rate_limits`: contadores compartidos por los procesos de API para limitar intentos de autenticación, recuperación, registro y accesos. La clave es un hash del ámbito y dirección de origen; no guarda el correo ni la dirección en texto plano. Los contadores vencidos se limpian periódicamente.

Se mantiene `qr_visitor_requests` como única tabla de solicitudes del visitante. **No se crea `qr_consultations`**, para evitar duplicación de flujos. Se conserva `password_reset_tokens` para recuperación de contraseña.

`security_rate_limits` es una tabla operativa independiente: no necesita una clave foránea con usuarios.

Por decisión del responsable de esta integración, se retiró `schema_migrations` mediante una migración incremental y se respaldó previamente su contenido fuera de Git. Docker sigue proporcionando PostgreSQL; los archivos SQL se conservan en el repositorio. El ejecutor ya no guarda un historial de aplicación ni comprueba cambios de checksum.

## Datos clínicos y compatibilidad

La migración `005_clinical_payloads.sql` agrega `encrypted_payload` a siete tablas existentes; no crea tablas adicionales. La API cifra con AES-256-GCM los antecedentes del perfil, texto clínico y campos descriptivos de documentos, recetas, medicamentos, resultados de laboratorio y motivo de atención. La autenticación del cifrado vincula el contenido a su tabla, registro y titular. Las consultas autorizadas, edición, ficha médica, QR y exportación recuperan los valores mediante la misma capa de persistencia.

Las columnas originales permanecen por compatibilidad: los campos clínicos opcionales convertidos quedan en NULL y los textos obligatorios usan `[cifrado]`. Este valor es un marcador de almacenamiento; no se presenta al usuario. Permanecen consultables las claves, estados, fechas operativas y referencias a archivos. Esto no significa que todos los datos de todas las tablas ni los archivos originales estén cifrados.

Los campos antiguos de donación de órganos y contacto de emergencia se conservan en el esquema para compatibilidad, sin afirmar que sean opciones disponibles en el perfil actual. La interfaz utiliza el teléfono del propio paciente. La existencia de `appointments` tampoco incorpora una nueva agenda al portal.

## Relaciones principales

Los perfiles se relacionan con `users`; el perfil médico puede vincularse con `health_institutions`. Los documentos pertenecen a un paciente y registran quién los cargó. Las recetas y los informes de laboratorio referencian su documento, y sus ítems referencian la cabecera correspondiente.

Los permisos relacionan al paciente y, cuando corresponde, al médico registrado. Cada solicitud QR referencia un permiso. Las sesiones, los tokens de recuperación y las aceptaciones de privacidad referencian al usuario. Los trabajos de eliminación conservan sus referencias mientras las entidades existen y las establecen a NULL cuando se eliminan.

## Aplicación y reproducción

Para los integrantes, seguir primero [la guía de actualización del equipo](actualizar-equipo.md).

Sobre una base existente, desde `backend-core`:

```powershell
npm.cmd run migrate
```

El ejecutor recorre todos los archivos SQL ordenados, bajo un bloqueo compartido entre ejecuciones y con una transacción por archivo. Como no existe un registro de versiones aplicadas, cada archivo debe ser idempotente. Las futuras migraciones y el orden de actualización deben coordinarse entre los integrantes; no se detectan automáticamente archivos modificados después de aplicarlos. **No ejecutar `database/init.sql` sobre una base existente**: es un inicializador destructivo destinado a una instalación nueva.

Después de la migración, y antes de reabrir la API, convertir los registros clínicos existentes con la misma `AES_SECRET_KEY` privada que utilizará la aplicación:

```powershell
node scripts/encrypt-clinical-data.cjs
```

La conversión es transaccional e idempotente. Conservar la clave fuera de Git junto con una estrategia de respaldo: perderla impide recuperar los campos cifrados. En esta base local la migración y la conversión ya están aplicadas.

Para exportar nuevamente el modelo:

```powershell
node scripts/export-data-model.cjs
python scripts/render-data-model.py
```

Para verificar la integración en bases efímeras con PostgreSQL real:

```powershell
npm.cmd run test:model
```

La prueba utiliza Docker y el contenedor `mymedrecord_db`, crea bases de nombre aleatorio `mmr_model_*` y las elimina al finalizar. No reinicializa la base habitual. Se necesita que ese contenedor esté iniciado y que las dependencias de `backend-core` estén instaladas.

## Alcance de la verificación

La integración no equivale a una certificación de seguridad ni de precisión del OCR. Los informes anteriores conservan su fecha y alcance: no se deben presentar como si fueran ejecuciones sobre este esquema. La extracción documental se intentó en esta ejecución, pero dos pruebas no aprobaron por respuestas incompletas tras fallos del proveedor de IA. La cámara física, el envío SMTP y un despliegue de producción requieren su evaluación específica. Ver el detalle de resultados antes de afirmar cobertura integral.

La base anterior `mymedrecord` de 18 tablas se mantiene intacta como referencia. Esta integración no trasladó sus filas ni sus claves de cifrado a la base activa. Aunque ambos esquemas sumen 18 tablas, su composición no es idéntica: el esquema activo utiliza `qr_visitor_requests` y `password_reset_tokens`, y no `qr_consultations` ni `schema_migrations`. Las tablas e imágenes del informe deben reflejar este catálogo actual.
