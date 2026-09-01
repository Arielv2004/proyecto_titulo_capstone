# 🏥 MyMedRecord - Plataforma de Interoperabilidad Clínica Digital

> **Proyecto de Portafolio de Título (APT) - Ingeniería en Informática**  
> **Integrantes:** Ignacio, Ariel, Sergio  
> **Marco Regulatorio:** Ley N° 21.668 (Interoperabilidad de Fichas Clínicas) y Ley N° 20.584 (Derechos y Deberes del Paciente)  
> **Estado:** Base Funcional, Autenticación HttpOnly, Ciberseguridad AES-256, PWA y Base de Datos en Docker

---

## 📌 1. Descripción del Proyecto

**MyMedRecord** es una plataforma de salud digital interoperable concebida bajo la arquitectura **PWA (Progressive Web Application)** con diseño adaptativo dual (portal médico clínico en escritorio y app móvil táctil para pacientes en smartphones).

Permite a los pacientes en Chile ser los **únicos dueños de su historial médico**, unificando recetas, atenciones, diagnósticos y exámenes de prestadores públicos (FONASA) y privados (ISAPRE), permitiendo otorgar **consentimientos temporales y auditados** a médicos mediante RUT o código QR.

---

## 🏛️ 2. Arquitectura del Repositorio

El proyecto utiliza **Clean Architecture**, separación estricta de capas y **Security by Design**:

```text
MyMedRecord/
├── frontend/          # PWA en React 19 + Vite + TailwindCSS (Cero datos médicos en localStorage)
├── backend-core/      # API Gateway en Node.js + Express (JWT en Cookies HttpOnly, RBAC, AES-256-GCM)
├── ai-service/        # Microservicio en Python + FastAPI (OCR Tesseract, PDFMiner, LLM)
├── database/          # Scripts DDL de inicialización (init.sql) con datos demo en PostgreSQL 15
├── docker-compose.yml # Orquestador de base de datos PostgreSQL 15 y pgAdmin 4
└── README.md          # Guía de instalación y puesta en marcha para el equipo
```

### 🛡️ Ciberseguridad y Cumplimiento Normativo
* **Cifrado en Reposo:** Diagnósticos y notas clínicas protegidas con estándar militar **AES-256-GCM**.
* **Autenticación Blindada:** Sesiones transmitidas en Cookies `HttpOnly`, `Secure` y `SameSite=Strict` (inmunes a ataques XSS/CSRF).
* **Trazabilidad Inmutable:** Registro continuo en tabla `audit_logs` (registra ID de usuario, IP, acción y timestamp por Ley 21.668).
* **Validación Oficial de RUT:** Algoritmo chileno **Módulo 11** en tiempo real.

---

## 🚀 3. Guía de Instalación Paso a Paso (Para el Equipo)

Sigue estos 4 pasos para ejecutar el proyecto en tu computador local en menos de 3 minutos:

### 📋 Prerrequisitos
Asegúrate de tener instalado:
1. **[Docker Desktop](https://www.docker.com/products/docker-desktop/)** (Debe estar abierto y corriendo).
2. **[Node.js (v18 o superior)](https://nodejs.org/)**
3. **[Git](https://git-scm.com/)**

---

### 🔹 Paso 1: Clonar el Repositorio
Abre tu terminal y clona el proyecto:
```bash
git clone <URL_DEL_REPOSITORIO_GITHUB>
cd MyMedRecord
```

---

### 🔹 Paso 2: Levantar la Base de Datos con Docker
Ejecuta en la raíz del proyecto:
```bash
docker compose up -d
```
Esto creará automáticamente la base de datos PostgreSQL con todas las tablas e índices creados y usuarios semilla pre-cargados:
* **PostgreSQL:** `localhost:5432` (Base de datos: `mymedrecord` / Usuario: `postgres` / Clave: `password`)
* **pgAdmin 4 (Panel Visual):** `http://localhost:5050` (Usuario: `admin@mymedrecord.cl` / Clave: `admin`)

---

### 🔹 Paso 3: Iniciar el Backend Core (API)
Abre una terminal y ejecuta:
```bash
cd backend-core
npm install
npm run dev
```
* **API Backend:** Disponible en `http://localhost:5000/api/v1`
* *(Nota: El archivo `.env` ya viene configurado por defecto para desarrollo local).*

---

### 🔹 Paso 4: Iniciar el Frontend (Web & Móvil)
Abre **otra terminal** y ejecuta:
```bash
cd frontend
npm install
npm run dev
```
* **Aplicación Web:** Disponible en `http://localhost:5173`
* **Acceso desde el Celular (Misma red Wi-Fi):** Abre Safari o Chrome en tu teléfono e ingresa a `http://<TU_IP_LOCAL>:5173` (ej: `http://192.168.1.84:5173`).

---

## 👥 4. Cuentas de Prueba Pre-configuradas

Puedes iniciar sesión manualmente o tocar los **botones de acceso rápido** en la pantalla de Login:

| Rol | Correo Electrónico | Contraseña | Funcionalidad en la App |
| :--- | :--- | :--- | :--- |
| 🧑‍💼 **Paciente** | `paciente@mymedrecord.cl` | `password123` | Portal Paciente (Ficha, Signos Vitales, QR, Subida) |
| 👨‍⚕️ **Médico** | `medico@mymedrecord.cl` | `password123` | Portal Médico (Buscador por RUT, Prescripción) |
| 🛡️ **Admin** | `admin@mymedrecord.cl` | `password123` | Portal Admin (Auditoría Continua, Trazabilidad) |

---

## 🌿 5. Flujo de Trabajo en Git para el Equipo

1. **Nunca subir archivos `.env` ni carpetas `node_modules`** (ya están protegidos en `.gitignore`).
2. **Crear ramas para nuevas funcionalidades:**
   ```bash
   git checkout -b feature/nombre-de-la-tarea
   ```
3. **Hacer commits descriptivos:**
   ```bash
   git commit -m "feat: implementacion de modulo X"
   ```
4. **Subir cambios a la rama:**
   ```bash
   git push origin feature/nombre-de-la-tarea
   ```

---

## 📜 6. Marco Académico y Licencia
Proyecto desarrollado para el **Portafolio de Título (APT)** de Ingeniería en Informática. Prohibida su copia o distribución no autorizada sin consentimiento del equipo de desarrollo.
