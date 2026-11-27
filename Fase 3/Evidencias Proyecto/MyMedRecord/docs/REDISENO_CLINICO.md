# Rediseño de experiencia clínica

## Objetivo y alcance

Aplicar la dirección visual clínica humana acordada al portal paciente y al portal médico, conservando los contratos existentes. El paciente debe reconocer su ficha, encontrar documentos y gestionar permisos; el médico debe identificar al paciente autorizado y la procedencia de la información disponible.

Base de trabajo: `8983274` de `main`. Rama: `IgnacioRuiz`.

No se modifican servicios backend, endpoints, esquema de PostgreSQL ni reglas de extracción clínica. Las llamadas de registro, autenticación, análisis/confirmación/descarte de documentos y permisos conservan sus contratos.

## Inventario y jerarquía implementada

| Vista | Datos existentes | Jerarquía y estados |
| --- | --- | --- |
| Inicio paciente | Documentos subidos y permisos emitidos | Propuesta de valor → subir y compartir → pasos para comenzar → acceso a Mi ficha → documentos recientes, permisos y categorías. Carga, error y ausencia de documentos. Los antecedentes personales permanecen en Mi perfil. |
| Mi ficha | Lista de documentos y detalle estructurado | Búsqueda y categorías → título completo → institución, profesional y fechas → estado técnico de carga → abrir/eliminar errores. El visor muestra datos extraídos sin clasificar los resultados de laboratorio como normales o anormales. |
| Mi perfil | Identidad, grupo sanguíneo, previsión, alergias, condiciones, medicamentos/cirugías declarados y contacto de emergencia | Datos de identificación → salud y contacto → antecedentes. Edición conserva el contacto y la declaración de donación existentes. |
| Compartir y accesos | Pases QR/directos y bitácora del paciente | Permisos emitidos → vigencia/revocación → actividad. Carga y errores diferenciados de una lista vacía. |
| Portal médico | Permisos directos recibidos | Resumen de permisos → búsqueda por nombre/RUT dentro de pacientes autorizados → estado del consentimiento → abrir ficha/QR. |
| Ficha compartida directa y QR | Perfil declarado y recetas con medicamentos | Paciente y consentimiento → antecedentes relevantes y contacto → recetas, fecha de emisión, vigencia, profesional y procedencia. |
| Auditoría médico | Datos de ejemplo ya presentes | Señalización visible de demostración; no se presentan como actividad real. |

## Sistema visual

- Inter variable alojada en `frontend/public/fonts`, con licencia OFL incluida; alternativas de sistema. No hay descarga de fuentes al abrir la aplicación.
- Azul tinta `#17324D`, teal `#147D79`, fondo `#F5F7F6` y superficies blancas. Para texto pequeño sobre superficies teñidas se usa teal `#116B68`, comprobado durante la revisión de contraste.
- Tokens semánticos para superficies, texto, bordes, foco y estados. Tema oscuro definido en paralelo.
- Los estilos del sistema viven en `src/styles/design-system.css`; `src/index.css` es su entrada. Se retiraron las reglas globales anteriores de modo oscuro con `!important`. Las únicas excepciones restantes son las de movimiento reducido.
- Navegación móvil inferior hasta 767 px; navegación superior desde 768 px. Grillas se apilan en móvil; tablas clínicas densas tienen desplazamiento horizontal dentro de su región.
- Zoom habilitado en el viewport, foco visible, enlace para saltar al contenido, controles con etiquetas y diálogos con Escape, ciclo de Tab y restitución de foco.

### Componentes

- `components/ui/ClinicalUI.jsx`: botones, tarjetas, encabezados, estados, carga, avisos y navegación.
- `components/ui/DialogFrame.jsx`: ciclo de foco de los diálogos; cada flujo conserva su propia regla de cierre.
- `components/patient/PatientHome.jsx`, `PatientRecords.jsx`, `PatientProfile.jsx`: presentación separada de las operaciones del dashboard.
- `components/doctor/DoctorHome.jsx`: permisos y búsqueda.
- `components/doctor/ClinicalRecord.jsx`: visor común para acceso directo y QR.
- `utils/clinicalDate.js`: formato de fecha con tratamiento de fechas sin zona horaria.

## Precisión de la información

- `CONFIRMADO` significa que el documento se guardó. En la ficha aparece como estado técnico de carga, sin sugerir validación médica.
- El visor de exámenes presenta el valor extraído y el rango de referencia del documento, sin emitir una clasificación clínica. La interpretación corresponde al profesional de salud.
- Una fecha de vigencia no acredita que el paciente siga usando un medicamento.
- La confianza OCR no se presenta como exactitud clínica.
- Antecedentes vacíos se muestran como información no registrada; no equivalen a ausencia de una enfermedad.
- El endpoint utilizado por ambas fichas compartidas devuelve signos vitales de ejemplo. El visor excluye esos valores.
- Ese endpoint entrega perfil y recetas, pero no documentos ni resultados de laboratorio. Se indica la disponibilidad real en la interfaz. Incluirlos requiere una siguiente etapa de API, fuera de este cambio.
- La ficha compartida no informa quién revisó la extracción ni la fecha de actualización del perfil; se hace explícita esa ausencia.
- `/auth/me` contiene los datos de la sesión JWT y puede omitir nombres. Tras una recarga se usa una identidad neutral cuando falta el nombre, nunca nombres de ejemplo.
- La exportación legal/PDF de documentos y la auditoría médica contienen funciones demostrativas previas. Este cambio no implementa una exportación certificada.

## Validación realizada

Revisión en Chrome con Playwright, a 360, 390, 768 y 1440 px, temas claro/oscuro, y análisis con axe-core (reglas WCAG 2 A/AA y 2.1 AA):

- Inicio, documentos, ficha, accesos y ayuda del paciente; portales y búsqueda del médico; ficha autorizada real y acceso denegado; entrada QR.
- Diálogos de edición, documentos, subida, selección de médico y QR; hoja móvil de cámara/archivo.
- Escape, foco dentro del diálogo y vuelta al control que lo abrió.
- Caducidad del permiso con reloj simulado: se oculta la información clínica; validación QR manual simulada, cierre de consulta e impresión del visor; revisión de contraste en login y registro.
- Carga, ausencia de datos y errores de consultas con respuestas interceptadas en el navegador.
- Error de guardado de perfil: conserva los campos ingresados y no anuncia éxito. Se verificó que no se borraran el contacto ni la declaración de donación al preparar el envío.
- Análisis, revisión y confirmación de un documento con respuestas simuladas. Un solo diálogo permanece visible al terminar. No se guardaron documentos de prueba en PostgreSQL.
- Tras la revisión del equipo se comprobó el nuevo Inicio en escritorio y móvil, temas claro y oscuro; los botones de subida y acceso abren los diálogos existentes, Mi ficha abre documentos, Mi perfil conserva los antecedentes y el visor de examen no clasifica resultados como normales o anormales.
- Sin desbordamiento horizontal de página en los tamaños revisados. Las tablas clínicas mantienen su propio desplazamiento.
- Build de producción con Vite correcto. Permanece el aviso por tamaño del paquete principal, que incluye el lector QR.
- Oxlint sin errores; conserva advertencias en código previo de efectos/escáner y variables no usadas. También se comprobó `no-undef` con entorno de navegador en una configuración temporal.

La revisión automática complementa la visual; no constituye una certificación de accesibilidad. No se ensayaron cámara física, OCR/Gemini reales, envío de nuevos permisos ni dispositivos iOS/Android físicos. Los flujos con escrituras se comprobaron mediante interceptación de red para conservar los datos locales.

## Cómo revisar y continuar

1. Trabajar desde este checkout, no desde las copias independientes del proyecto.
2. Iniciar PostgreSQL/pgAdmin con el Compose existente; luego backend y frontend con sus comandos de desarrollo habituales.
3. Abrir `http://localhost:5173`, iniciar sesión con cuentas locales y revisar ambos roles.
4. En paciente: probar Inicio → Mi ficha (documentos) → Mi perfil (datos personales) → Accesos; abrir/cerrar los diálogos con teclado, alternar tema y cambiar ancho.
5. En médico: buscar por nombre/RUT, abrir un permiso vigente, comprobar fechas/procedencia y finalizar la consulta.
6. Ejecutar `npm run build` y `npm run lint` dentro de `frontend` antes de integrar.

Siguiente etapa funcional propuesta: documentos y laboratorios reales en la API compartida, trazabilidad de revisión humana, auditoría médica real y exportación documentada. Mantener estos cambios separados del rediseño para poder revisarlos con el equipo.

## Fuente tipográfica

Inter Latin variable, distribución Fontsource: `https://cdn.jsdelivr.net/fontsource/fonts/inter:vf@latest/latin-wght-normal.woff2`, copiada al proyecto durante la implementación. Licencia del proyecto Inter: `https://github.com/rsms/inter/blob/master/LICENSE.txt`. La aplicación utiliza únicamente el archivo local incluido.
