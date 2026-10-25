# MyMedRecord - Sistema de Digitalización e Interoperabilidad Clínica

> **Proyecto de Portafolio de Título (APT) - Ingeniería en Informática**  
> **Integrantes:** Ariel Velásquez, Sergio Vera, Ignacio Ruiz  
> **Marco Regulatorio:** Ley N° 21.668 (Interoperabilidad de Fichas Clínicas) y Ley N° 20.584 (Derechos y Deberes del Paciente)  
> **Estado Actual:** Prototipo académico con datos ficticios (PostgreSQL 15 en Docker, API REST Express, Frontend React 19 + PWA, Microservicio de IA en Python + Gemini, y Almacenamiento en Supabase Storage).

---

## 1. Descripción del Proyecto

MyMedRecord es una plataforma de salud digital concebida para la interoperabilidad de fichas clínicas en Chile. Permite a los pacientes ser los titulares de su información médica, unificando antecedentes, recetas y atenciones de prestadores públicos (FONASA) y privados (ISAPRE).

La plataforma destaca por su motor de Inteligencia Artificial que permite fotografiar una receta en papel para extraer automáticamente los medicamentos, dosis y diagnósticos, almacenando la información de forma estructurada, segura y validada por el propio paciente.
### Capturas de la Aplicación

**Vista de Escritorio:**

<img width="800" alt="Dashboard Escritorio" src="https://github.com/user-attachments/assets/ab200f26-a4d3-44bf-870c-da02a752c222" />


**Vistas Móviles:**
<div style="display: flex; gap: 10px; flex-wrap: wrap;">
  <img width="250" alt="Móvil 1" src="https://github.com/user-attachments/assets/ce65d80e-1e44-4e7f-b5df-6909f5d7e3c7" />
  <img width="250" alt="Móvil 2" src="https://github.com/user-attachments/assets/ad89f5cb-9de7-4753-8da5-f2d364cc1489" />
  <img width="250" alt="Móvil 4" src="https://github.com/user-attachments/assets/aab358db-6aa8-4a92-a393-34ce3c45871a" />
</div>





---

## 2. Estado de Avance del Proyecto (Módulos Desarrollados)

| Módulo / Funcionalidad | Estado | Descripción del Avance |
| :--- | :---: | :--- |
| **Base de Datos Relacional (PostgreSQL 15)** | [Completado] | 10 tablas normalizadas (`init.sql`) con índices, claves foráneas, restricciones de integridad y tabla de auditoría forense (`audit_logs`). |
| **Autenticación Dual (RUT o Correo)** | [Completado] | Inicio de sesión con RUT Chileno (validación Módulo 11) o Email, gestionado con tokens JWT en cookies seguras HttpOnly. |
| **Digitalización OCR con IA (ai-service)** | Integrado; prueba real de Gemini pendiente | OCR local con Tesseract y estructuración automática con Gemini cuando existe clave válida. Se conserva revisión manual ante fallos. |
| **Flujo de Confirmación Previa** | [Completado] | El paciente revisa, edita y valida los datos extraídos por la IA antes de guardarlos en su historial clínico, evitando datos erróneos. |
| **Almacenamiento en la Nube** | [Completado] | Las imágenes de los documentos se guardan de forma segura en Supabase Storage (URLs públicas), evitando saturar el disco local. |
| **Cálculo de Vigencia de Recetas** | [Completado] | El sistema calcula automáticamente la fecha de vencimiento (`valid_until`) basándose en la duración de los medicamentos extraídos. |
| **Portal del Paciente ("Mi Ficha")** | [Completado] | Dashboard interactivo (Modo Claro/Oscuro), subida de documentos (cámara/galería), historial con badges de vigencia y generación de QR. |
| **Portal del Médico Administrador** | [Completado] | Búsqueda clínica por RUT, revisión de signos vitales, emisión de recetas electrónicas (CIE-10) y panel de trazabilidad (Ley N° 21.668). |
| **Diseño y Modo Claro / Oscuro** | [Completado] | Interfaz moderna y responsiva (PWA) con selector de tema y soporte completo para dispositivos móviles. |
| **Escáner QR en vivo por Cámara** | [En desarrollo] | Tokens temporales operativos en base de datos (`access_grants`); pendiente vinculación de API de cámara web en tiempo real. |

---

## 3. Estructura de la Arquitectura

```text
MyMedRecord/
├── frontend/          # Cliente web PWA en React 19 + Vite + TailwindCSS 4 (Modo Claro/Oscuro)
├── backend-core/      # API REST en Node.js + Express (JWT HttpOnly, RBAC, Bcrypt, SDK Supabase)
├── ai-service/        # Microservicio de IA en Python 3.13 + FastAPI + Tesseract OCR + Gemini
├── database/          # Script DDL de inicialización (init.sql) para PostgreSQL 15
├── docker-compose.yml # Orquestador Docker (Base de Datos + pgAdmin 4)
└── README.md          # Documentación del avance y guía de ejecución
```

---

## 4. Guía de Ejecución Rápida

### Prerrequisitos

- Docker Desktop (en ejecución).
- Node.js (v18 o superior).
- Python (v3.10 o superior).
- Tesseract OCR (con soporte para español instalado).

### Paso 1: Configurar y migrar el entorno

Seguir [Instalación y migración segura](docs/PROTECCION_DATOS_SENSIBLES.md#instalación-y-migración-segura). El backend requiere claves de cifrado, token de servicio, migraciones y un usuario PostgreSQL limitado; ya no basta con ejecutar el servidor con credenciales de superusuario.

Copiar los `.env.example` solo para un entorno nuevo. No sobrescribir las claves de una base ya cifrada. Los `.env` no se publican en Git. Nunca ejecutar `database/init.sql` sobre una base existente ni eliminar el volumen para actualizarla.

Para arrancar la base y pgAdmin antes de migrar:

```bash
docker compose up -d db pgadmin
```

Los puertos locales son PostgreSQL `127.0.0.1:5432` y pgAdmin `http://localhost:5050`. Las credenciales administrativas de demostración del Compose no son las del usuario limitado de la aplicación.

### Paso 2: Configurar OCR y Gemini

En `ai-service/.env`, mantener `AI_SERVICE_TOKEN` igual al del backend y configurar una clave privada:

```env
LLM_PROVIDER=gemini
LLM_MODEL=gemini-2.5-flash
LLM_API_KEY=
EXTERNAL_AI_ENABLED=true
```

No pegar claves en documentación, chats o commits. El flujo es automático, sin casilla adicional al subir documentos. La clave de Gemini está pendiente en el entorno revisado: las pruebas simuladas no garantizan extracción real. Usar documentos ficticios.

```bash
docker compose up -d --build ocr ocr-gateway
```

El gateway escucha en `127.0.0.1:8000`; el servicio requiere autenticación del backend. No iniciar simultáneamente otro proceso Python en ese puerto. Para desactivar Gemini, establecer `EXTERNAL_AI_ENABLED=false` en el entorno de Compose y recrear el servicio. Ante falta de clave o fallo del proveedor, el OCR queda disponible para revisión manual.

### Paso 3: Iniciar Backend

Después de completar las migraciones y restringir el usuario de base de datos:

```bash
cd backend-core
npm install
npm run dev
```

API: `http://localhost:5000/api/v1`. Storage debe ser privado y las variables deben corresponder al entorno local. Consultar [controles, pruebas y pendientes](docs/PROTECCION_DATOS_SENSIBLES.md).

### Paso 5: Iniciar Frontend (React)

En otra terminal:

```bash
cd frontend
npm install
npm run dev
```

*Disponible en: `http://localhost:5173`*

---

## 5. Cuentas de Demostración Pre-configuradas

En la pantalla de inicio de sesión se puede ingresar manualmente o utilizar los accesos rápidos:

| Rol Oficial | Identificador (RUT o Correo) | Contraseña | Capacidades Disponibles |
| :--- | :--- | :--- | :--- |
| **Paciente** | `paciente@mymedrecord.cl` o `12.345.678-9` | `password123` | Ficha personal, digitalización de recetas con IA, historial médico y generación de QR. |
| **Médico Administrador** | `medico@mymedrecord.cl` o `98.765.432-1` | `password123` | Búsqueda clínica por RUT, emisión de recetas electrónicas y supervisión de auditoría (Ley 21.668). |

<img width="800" alt="image" src="https://github.com/user-attachments/assets/9d4e2975-1cbe-43ab-a253-19dd724ef49d" />


---

## 6. Flujo de Trabajo y Metodología (Scrum / GitFlow)

- **Sprints:** Ciclos semanales de entrega de incrementos de software funcional.
- **Estrategia de Ramas:** Ramas temáticas (`feature/`) para revisión cruzada mediante Pull Requests antes de integrar a las ramas principales.
- **Roles del Equipo:**
  - **Product Owner:** Ariel Velásquez
  - **Scrum Master:** Sergio Vera
  - **Developer:** Ignacio Ruiz
