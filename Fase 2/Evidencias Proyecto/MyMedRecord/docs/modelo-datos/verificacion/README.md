# Verificación del modelo consolidado

Modelo actual: 26 de noviembre de 2026. Regresiones históricas: 25 de noviembre de 2026. Las pruebas se realizaron en bases temporales y los datos habituales se conservaron.

## Resultados

- **19 pruebas nuevas de integración del modelo: aprobadas.** Registro: [modelo-operativo.tap](modelo-operativo.tap). Código reproducible: `backend-core/tests/final-model.test.cjs`.
- **21 comprobaciones de regresión históricas: aprobadas el 25 de noviembre sobre el esquema anterior de 19 tablas.** Incluyen 6 casos de documentos, 3 de ingreso/navegación, eliminación/exportación de cuenta, acceso directo y QR, accesibilidad, autorización y robustez.
- La regresión inicial tuvo 20 aprobados y un fallo en ROB-01: la segunda confirmación simultánea respondía 500. Se corrigió la confirmación mediante una transacción y bloqueo de fila. La reprueba de los seis casos documentales y ROB-01 aprobó (7 casos). No se suman las repruebas como nuevos casos.
- La ejecución del 25 de noviembre posterior a los ajustes de lectura/cifrado repitió esos 21 casos y aprobó **21/21**. Los casos documentales INT-DOC usan respuestas controladas del proveedor para verificar el comportamiento de la API; no miden la precisión de Gemini. La extracción real se documenta por separado.
- [Detalle de ejecuciones de regresión](regresion.csv).

Las pruebas nuevas verifican migración de 14 a 18 tablas sin perder usuarios, retirada del registro anterior, aplicación idempotente, instalación nueva equivalente, sesiones distintas, revocación al salir, vencimiento, rechazo de JWT sin sesión, revocación de todas las sesiones al restablecer contraseña, consumo único del enlace, registro de aceptación, limpieza al eliminar cuenta, límites concurrentes, caducidad de contadores, cola de eliminación con ruta cifrada, reintentos y supervivencia de tareas al eliminar la cuenta. También verifican confirmaciones concurrentes, rollback de una confirmación incompleta, cifrado y recuperación del perfil, recetas y laboratorios, conversión idempotente, exportación sin payload, rechazo de contenido cifrado alterado y lectura de la ficha compartida usada por médico y QR.

## Retirada del registro de migraciones

El 26 de noviembre se eliminó únicamente `schema_migrations` de `mymedrecord_main`, sin CASCADE ni reinicialización. Se respaldó antes la tabla fuera de Git. El ejecutor no la recrea y se actualizaron instalación nueva, exportación del modelo e imagen. Las **19 pruebas específicas del modelo se ejecutaron nuevamente y aprobaron 19/19** sobre el esquema de 18 tablas; MOD-01 comprueba expresamente que el registro está ausente después de repetir las migraciones.

Los reportes de regresión anteriores se conservan como históricos; no se presentan como nuevas ejecuciones del 26 de noviembre. El registro TAP anterior de 19 tablas se conserva en [historial/modelo-19-tablas-20261125.tap](historial/modelo-19-tablas-20261125.tap).

## Extracción documental y dependencia de IA

La ejecución ampliada posterior al cifrado incluyó 23 casos: **21 aprobaron y 2 fallaron**, E2E-04 y E2E-08. No se suman estos casos a la regresión de 21 porque comparten pruebas.

- E2E-04: el análisis devolvió texto OCR, pero no los medicamentos estructurados esperados. La comprobación de corrección/persistencia desde la interfaz no se cumplió al faltar el nombre del medicamento.
- E2E-08: el análisis de la receta manuscrita no produjo los campos esperados. No acredita extracción manuscrita correcta en esta ejecución.
- La comprobación directa con Gemini configurado y su alternativa devolvió errores 504; los registros del servicio documental también mostraron tiempos de espera y errores 503. Esto explica la indisponibilidad observada, pero no convierte las pruebas fallidas en aprobadas.
- La persistencia de recetas y laboratorios revisados se verificó independientemente con datos ficticios controlados en MOD-15 y MOD-16. ROB-02 verificó que un timeout conserve la opción de revisión manual.

Debe repetirse E2E-04 y E2E-08 cuando el proveedor responda correctamente. Los resultados no permiten declarar que todas las funcionalidades y dependencias externas funcionen al 100 %.

## Base habitual

La migración incremental se aplicó después de crear un respaldo privado fuera de Git. Los conteos antes y después coinciden:

| Tabla | Antes | Después |
| --- | ---: | ---: |
| users | 2 | 2 |
| documents | 9 | 9 |
| prescriptions | 2 | 2 |
| access_grants | 5 | 5 |
| qr_visitor_requests | 3 | 3 |

La base activa contiene 18 tablas y 23 claves foráneas. No se reinicializó y no se modificó la base anterior de 18 tablas.

## Límites

Estos resultados corresponden a esta integración. Los informes anteriores de `docs/pruebas` son evidencia histórica de otra ejecución y no se modificaron. No se repitió aquí una medición completa de fidelidad manuscrita, el análisis ZAP, rendimiento concurrente ni la prueba remota de Supabase. Los dos intentos de extracción con IA se detallan arriba. La cámara física, el envío real de correo y las condiciones de producción requieren sus comprobaciones específicas.

## Artefactos

El registro TAP corresponde a las 19 pruebas nuevas contra PostgreSQL real. El CSV conserva resultados por caso y ejecución, incluyendo los fallos, sin adjuntar datos clínicos ni secretos. Los reportes HTML, trazas y capturas de las dos ejecuciones de regresión permanecen fuera de Git, en `D:\MyMedRecordRuntime\verificacion-modelo-final-cifrado` y `D:\MyMedRecordRuntime\verificacion-modelo-final-definitiva`. La compilación del frontend también terminó correctamente; no se interpreta como una prueba clínica.
