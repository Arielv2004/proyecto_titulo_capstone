# Pruebas de software de MyMedRecord

Evidencias digitales complementarias de la Documentación General del proyecto. Evaluación de noviembre de 2026 con datos de prueba y una receta manuscrita anonimizada.

Ubicación dentro del proyecto: `docs/pruebas/`.

## Abrir los resultados

Descargue o clone el repositorio y abra [el resumen navegable](01_Informe/00_Resumen.html) en un navegador. GitHub muestra el código del HTML: este paquete no publica un sitio web. Conserve las carpetas asociadas a los reportes.

- [Matriz detallada CSV](01_Informe/03_Matriz_resultados.csv).
- [Reporte principal](02_Evidencias/07_Reporte_automatico/Vigente/HTML/index.html).
- [Reprueba de revisión documental](02_Evidencias/07_Reporte_automatico/Reprueba_revision/HTML/index.html).
- [Reprueba de ZAP](02_Evidencias/07_Reporte_automatico/Reprueba_ZAP/HTML/index.html).
- [Prueba de almacenamiento remoto](02_Evidencias/07_Reporte_automatico/Almacenamiento_remoto/HTML/index.html).
- [Reporte autenticado de ZAP](02_Evidencias/06_No_funcionales/Seguridad/ZAP-autenticado.html).

## Interpretación

**36 casos o bloques ejecutados: 35 aprobados y 1 fallido.** La matriz contiene además la cámara física pendiente. Algunos bloques agrupan comprobaciones internas que no deben volver a sumarse. Se usa la última ejecución por caso; no se suman repruebas.

El reporte principal conserva su resultado original, incluido un fallo del mecanismo de ejecución de ZAP que se resolvió en una reprueba. El caso SIS-REAL-png permanece fallido por extracción inconsistente de duración. La reprueba E2E-08 comprueba revisión y persistencia manual; no elimina el fallo de extracción. Lectura de QR desde imagen aprobada; cámara física pendiente.

ZAP: 0 tipos de alerta altos, 2 medios, 2 bajos y 5 informativos. Algunos registros originales cuentan instancias; son métricas diferentes.

## Carpetas

- `01_Informe`: resumen, matriz y manifiesto de integridad.
- `02_Evidencias/02_Unitarias`: comprobaciones de reglas aisladas.
- `02_Evidencias/03_Integracion`: perfil, autorización, documentos y robustez.
- `02_Evidencias/04_Sistema`: entradas y resultados de extracción documental.
- `02_Evidencias/05_Extremo_a_extremo`: capturas y verificaciones de recorridos.
- `02_Evidencias/06_No_funcionales`: accesibilidad, calidad, rendimiento y seguridad.
- `02_Evidencias/07_Reporte_automatico`: ejecución principal y repruebas.

## Preparación y alcance

Esta copia documental no es una nueva ejecución ni contiene el paquete de automatización. Se excluyeron historial antiguo, trazas ZIP completas del navegador, exportaciones completas de cuenta y registros de servidor. Los adjuntos de traza se sustituyeron por una nota; los resultados y sus fechas no se modificaron. Se ocultaron credenciales detectables en los archivos de texto. Los originales del escritorio permanecen sin cambios.

Las pruebas se realizaron sobre una copia de trabajo con correcciones locales de autenticación, OCR/PDF y contraste, explicadas en el informe. No deben atribuirse exclusivamente al commit base sin esas correcciones. El resultado no acredita seguridad exhaustiva, precisión general de IA ni capacidad de producción. El bucket temporal de Supabase se eliminó al finalizar.
