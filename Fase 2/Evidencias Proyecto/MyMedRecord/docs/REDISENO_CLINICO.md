# Rediseño de experiencia clínica

## Objetivo y alcance

Aplicar la dirección visual clínica humana acordada a toda la interfaz: portal paciente, portal médico, acceso, registro, visor QR y páginas públicas, conservando los contratos existentes. El paciente debe reconocer su ficha, encontrar documentos y gestionar permisos; el médico debe identificar al paciente autorizado y la procedencia de la información disponible.

Referencia visual inicial: `8983274`. Estado actualizado en la rama `IgnacioRuiz`.

El rediseño visual original se complementó con cambios de seguridad en backend, sesiones, permisos QR y cifrado. La implementación y sus límites están descritos en [Protección de datos sensibles](PROTECCION_DATOS_SENSIBLES.md). El proyecto sigue siendo una demostración académica con datos ficticios.

## Inventario y jerarquía implementada

| Vista | Datos existentes | Jerarquía y estados |
| --- | --- | --- |
| Inicio paciente | Documentos subidos y permisos emitidos | Mensaje a la izquierda con la propuesta de valor de IA y OCR, y acciones agrupadas a la derecha en escritorio; en móvil se apilan. La carga abre un mismo selector en Inicio, Mi ficha y navegación móvil, con cámara, galería y PDF por separado; los datos extraídos se revisan antes de guardarlos. Después: dos tarjetas de igual altura, con Documentos por tipo más ancha que Compartir con un médico y una descripción breve bajo cada título. Los tres pasos de uso quedan en la ayuda contextual; la lista de documentos permanece en Mi ficha. Se distinguen carga, error y ausencia de registros. |
| Mi ficha | Lista de documentos y detalle estructurado | Búsqueda y categorías → título completo → institución, profesional y fechas → estado técnico de carga → abrir/eliminar errores. El visor muestra datos extraídos sin clasificar los resultados de laboratorio como normales o anormales. |
| Mi perfil | Identidad, grupo sanguíneo, previsión, alergias, condiciones y medicamentos/cirugías declarados | Datos de cuenta → datos de salud → antecedentes. La edición conserva los campos existentes del backend; el contacto de emergencia no se presenta en el perfil ni en la ficha médica. Se retiraron de Mi perfil la exportación JSON y la aceptación del aviso; sus endpoints permanecen en el backend. |
| Compartir y accesos | Pases QR/directos y bitácora del paciente | Permisos emitidos → solicitudes QR para aprobar/rechazar → vigencia/revocación → actividad. Carga y errores diferenciados de una lista vacía. |
| Portal médico | Permisos directos recibidos | Resumen de permisos → búsqueda por nombre/RUT dentro de pacientes autorizados → estado del consentimiento → abrir ficha/QR. |
| Ficha compartida directa y QR | Perfil declarado y recetas con medicamentos | Paciente y consentimiento → antecedentes relevantes → recetas, fecha de emisión, vigencia, profesional y procedencia. |
| Auditoría médico | Datos de ejemplo ya presentes | Señalización visible de demostración; no se presentan como actividad real. |

## Sistema visual

- DM Sans variable alojada en `frontend/public/fonts`, con licencia OFL incluida; alternativas de sistema. No hay descarga de fuentes al abrir la aplicación.
- Identidad blanco, turquesa y menta: fondo `#F8FBFB`, tarjetas `#FFFFFF`, texto `#17343B`, acento `#55C8CD` y acción `#126B72`. En oscuro: fondo carbón `#101418`, tarjetas `#1A2026`, texto `#F4FAFA` y acción `#55C8CD` con texto oscuro. Los tonos claros se reservan para superficies e íconos; los enlaces sobre blanco usan teal oscuro.
- Tokens semánticos para superficies, texto, bordes, foco y estados. Tema oscuro definido en paralelo.
- El botón principal usa texto blanco sobre `#126B72` en claro (6,23:1), y texto `#102A31` sobre `#55C8CD` en oscuro (7,53:1). Los colores de error, advertencia y éxito mantienen significado propio. Los metadatos de color del navegador siguen el tema elegido.
- Las categorías de Inicio usan íconos clínicos de trazo uniforme en bases menta. El aviso destacado de Privacidad usa colores semánticos para conservar la lectura en ambos temas.
- Los estilos del sistema viven en `src/styles/design-system.css`; `src/index.css` es su entrada. Se retiraron las reglas globales anteriores de modo oscuro con `!important`. Las únicas excepciones restantes son las de movimiento reducido.
- Navegación móvil inferior hasta 767 px; navegación superior desde 768 px. Grillas se apilan en móvil; tablas clínicas densas tienen desplazamiento horizontal dentro de su región.
- Zoom habilitado en el viewport, foco visible, enlace para saltar al contenido, controles con etiquetas y diálogos con Escape, ciclo de Tab y restitución de foco.

### Componentes

- `components/ui/ClinicalUI.jsx`: botones, tarjetas, encabezados, estados, carga, avisos y navegación.
- `components/ui/DialogFrame.jsx`: ciclo de foco de los diálogos; cada flujo conserva su propia regla de cierre.
- `components/ui/ClinicalUI.jsx`: `InfoPopover` muestra ayuda contextual en una tarjeta flotante junto al ícono ℹ️, con cierre por Escape, botón o pulsación fuera. El círculo visible mide 32 px y conserva una zona pulsable de 44 px. Inicio, Mi ficha, Accesos y Mi perfil lo usan sin ocultar datos ni acciones esenciales. En los encabezados de estas tres últimas vistas, la acción queda antes del ícono de información.
- `components/patient/PatientHelp.jsx`: contactos visibles y preguntas frecuentes cerradas inicialmente. Se corrigieron las instrucciones de QR, duración y estado de documentos, y los colores de los contactos en ambos temas.
- `components/patient/PatientHome.jsx`, `PatientRecords.jsx`, `PatientProfile.jsx`: presentación separada de las operaciones del dashboard.
- `components/doctor/DoctorHome.jsx`: permisos y búsqueda.
- `components/doctor/ClinicalRecord.jsx`: visor común para acceso directo y QR.
- `utils/clinicalDate.js`: formato de fecha con tratamiento de fechas sin zona horaria.

El perfil clínico se obtiene y guarda mediante `/patient-profile/me`. La interfaz dejó de leer o escribir una copia en `localStorage`; tras una carga correcta desde el servidor elimina las claves heredadas del perfil. Un error de carga no se sustituye por datos locales antiguos.

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
- Revisión de la nueva paleta y DM Sans en 320, 390, 768 y 1440 px, temas claro y oscuro, en acceso, registro, portal paciente, portal médico, entrada QR, privacidad, términos y página no encontrada. Se corrigió el selector de métodos QR que excedía 320 px. La ayuda contextual conserva un objetivo de 44 px y cierra con Escape. Esta revisión usó respuestas de API simuladas en el navegador porque la sesión del backend local no estaba disponible.
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

DM Sans Latin y Latin Extended variables, distribuidas por Google Fonts y copiadas al proyecto durante la implementación. Fuente: `https://github.com/google/fonts/blob/main/ofl/dmsans/DMSans%5Bopsz%2Cwght%5D.ttf`; licencia incluida en `frontend/public/fonts/DM-Sans-OFL.txt`. La aplicación utiliza únicamente los archivos locales incluidos.

## Subida documental actual

Cámara, galería o PDF → OCR y Gemini automáticos → revisión/corrección → confirmar o descartar. Se retiró la casilla de activación por documento. Se restauraron los textos originales de selección y progreso, incluido «La IA y el OCR ayudan a extraer y organizar los datos. Podrás revisarlos antes de guardarlos. Máximo 10 MB.».

Se conservan dos ayudas adicionales: texto OCR desplegable y aviso con revisión manual cuando falla el proveedor. No se afirma identidad exacta de todos los estados con la versión anterior. La integración automática pasó pruebas simuladas; una extracción real de Gemini sigue pendiente de clave y cuota disponibles.
