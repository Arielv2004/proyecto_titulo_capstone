# MyMedRecord - Sistema de Digitalización e Interoperabilidad Clínica

> **Proyecto de Portafolio de Título (APT) - Ingeniería en Informática**  
> **Integrantes:** Ariel Velásquez, Sergio Vera, Ignacio Ruiz  
> **Marco Regulatorio:** Ley N° 21.668 (Interoperabilidad de Fichas Clínicas) y Ley N° 20.584 (Derechos y Deberes del Paciente)  
> **Estado Actual:** MVP Funcional Operativo (PostgreSQL 15 en Docker, API REST Express, Frontend React 19 + PWA, Microservicio de IA en Python + Gemini, y Almacenamiento en Supabase Storage).

---

## 1. Descripción del Proyecto

MyMedRecord es una plataforma de salud digital concebida para la interoperabilidad de fichas clínicas en Chile. Permite a los pacientes ser los titulares de su información médica, unificando antecedentes, recetas y atenciones de prestadores públicos (FONASA) y privados (ISAPRE).

La plataforma destaca por su motor de Inteligencia Artificial que permite fotografiar una receta en papel para extraer automáticamente los medicamentos, dosis y diagnósticos, almacenando la información de forma estructurada, segura y validada por el propio paciente.

---

## 2. Estado de Avance del Proyecto (Módulos Desarrollados)

| Módulo / Funcionalidad | Estado | Descripción del Avance |
| :--- | :---: | :--- |
| **Base de Datos Relacional (PostgreSQL 15)** | [Completado] | 10 tablas normalizadas (`init.sql`) con índices, claves foráneas, restricciones de integridad y tabla de auditoría forense (`audit_logs`). |
| **Autenticación Dual (RUT o Correo)** | [Completado] | Inicio de sesión con RUT Chileno (validación Módulo 11) o Email, gestionado con tokens JWT en cookies seguras HttpOnly. |
| **Digitalización OCR con IA (ai-service)** | [Completado] | Microservicio en FastAPI que usa Tesseract para leer la imagen y Gemini (LLM) para estructurar los datos clínicos (medicamentos, diagnósticos). |
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

### Paso 1: Levantar Base de Datos (Docker)

En la raíz del proyecto ejecutar:

```bash
docker compose up -d
```

- **PostgreSQL:** `localhost:5432` (Base de datos: `mymedrecord` / Usuario: `postgres` / Clave: `password`)
- **pgAdmin 4:** `http://localhost:5050` (Usuario: `admin@mymedrecord.cl` / Clave: `admin`)

### Paso 2: Configurar Variables de Entorno (`.env`)

Se deben crear los archivos `.env` basándose en los `.env.example` de cada carpeta.

#### Backend (`backend-core/.env`):
Debe incluir las credenciales de la base de datos local y las llaves de Supabase Storage:

```env
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=password
DB_NAME=mymedrecord
AI_SERVICE_URL=http://localhost:8000
CORS_ORIGIN=http://localhost:5173
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=su_service_role_key
SUPABASE_BUCKET=medical-documents
```

#### AI Service (`ai-service/.env`):
Debe incluir la API Key de Google Gemini:

```env
PORT=8000
LLM_PROVIDER=gemini
LLM_MODEL=gemini-1.5-flash
LLM_API_KEY=su_api_key_de_gemini
```

### Paso 3: Iniciar Backend (API Node.js)

En una terminal:

```bash
cd backend-core
npm install
npm run dev
```

*Disponible en: `http://localhost:5000/api/v1`*

### Paso 4: Iniciar Microservicio de IA (Python)

En una nueva terminal:

```bash
cd ai-service
python -m venv venv
.\venv\Scripts\activate    # En Windows (o 'source venv/bin/activate' en Linux/macOS)
pip install -r requirements.txt
python main.py
```

*Disponible en: `http://localhost:8000/docs`*

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

---

## 6. Flujo de Trabajo y Metodología (Scrum / GitFlow)

- **Sprints:** Ciclos semanales de entrega de incrementos de software funcional.
- **Estrategia de Ramas:** Ramas temáticas (`feature/`) para revisión cruzada mediante Pull Requests antes de integrar a las ramas principales.
- **Roles del Equipo:**
  - **Product Owner:** Ariel Velásquez
  - **Scrum Master:** Sergio Vera
  - **Developer:** Ignacio Ruiz