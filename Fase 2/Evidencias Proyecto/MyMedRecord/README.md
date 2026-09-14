# MyMedRecord - Sistema de Digitalización e Interoperabilidad Clínica

> **Proyecto de Portafolio de Título (APT) - Ingeniería en Informática**  
> **Integrantes:** Ariel Velásquez, Sergio Vera, Ignacio Ruiz  
> **Marco Regulatorio:** Ley N° 21.668 (Interoperabilidad de Fichas Clínicas) y Ley N° 20.584 (Derechos y Deberes del Paciente)  
> **Estado Actual:** Base Funcional Operativa (PostgreSQL 15 en Docker, API REST Express, Frontend React con Modo Claro/Oscuro y Autenticación Dual RUT/Email)

---

## 1. Descripción del Proyecto

MyMedRecord es una plataforma web de salud digital concebida para la interoperabilidad de fichas clínicas en Chile. Permite a los pacientes ser los titulares de su información médica, unificando antecedentes, recetas y atenciones de prestadores públicos (FONASA) y privados (ISAPRE), otorgando consentimientos auditados a profesionales acreditados mediante su RUT o código QR.

---

## 2. Estado de Avance del Proyecto (Módulos Desarrollados)

| Módulo / Funcionalidad | Estado | Descripción del Avance |
| :--- | :---: | :--- |
| **Base de Datos Relacional (PostgreSQL 15)** | [Completado] | 10 tablas normalizadas en contenedor Docker (init.sql), con índices, claves foráneas, restricciones de integridad y tabla de auditoría forense (audit_logs). |
| **Autenticación Dual (RUT o Correo)** | [Completado] | Registro e inicio de sesión funcional con RUT Chileno (con o sin formato, validado mediante Módulo 11) o Email, gestionado con tokens JWT en cookies seguras HttpOnly. |
| **Ecosistema de 2 Roles Canónicos** | [Completado] | Sistema unificado exclusivamente en Paciente (Titular) y Médico Administrador (atención clínica y supervisión de auditoría). |
| **Portal del Paciente ("Mi Ficha")** | [Completado] | Dashboard interactivo con alerta de ficha incompleta y modal estructurado con opción "Otro" (texto libre para registrar alergias y patologías). |
| **Portal del Médico Administrador** | [Completado] | Búsqueda clínica unificada por RUT, revisión de signos vitales, emisión de recetas electrónicas (CIE-10) y panel de trazabilidad (Ley N° 21.668). |
| **Diseño y Modo Claro / Oscuro** | [Completado] | Interfaz moderna con selector de tema integrado en el menú de usuario y estilos coordinados en todas las vistas. |
| **Digitalización OCR con IA (ai-service)** | [En desarrollo] | Microservicio en Python con FastAPI y Tesseract para extracción automática de recetas y exámenes médicos. |
| **Escáner QR en vivo por Cámara** | [En desarrollo] | Tokens temporales operativos en base de datos (access_grants); pendiente vinculación de API de cámara web en tiempo real. |

---

## 3. Estructura de la Arquitectura

```text
MyMedRecord/
├── frontend/          # Cliente web en React 18 + Vite + TailwindCSS (Modo Claro/Oscuro)
├── backend-core/      # API REST en Node.js + Express (JWT HttpOnly, RBAC, Bcrypt)
├── ai-service/        # Microservicio de procesamiento OCR en Python + FastAPI
├── database/          # Script DDL de inicialización (init.sql) para PostgreSQL 15
├── docker-compose.yml # Orquestador Docker (Base de Datos + pgAdmin 4)
└── README.md          # Documentación del avance y guía de ejecución
```

---

## 4. Guía de Ejecución Rápida

### Prerrequisitos
* Docker Desktop (en ejecución).
* Node.js (v18 o superior).

---

### Paso 1: Levantar Base de Datos (Docker)
En la raíz del proyecto ejecutar:
```bash
docker compose up -d
```
* PostgreSQL: localhost:5432 (Base de datos: mymedrecord / Usuario: postgres / Clave: password)
* pgAdmin 4: http://localhost:5050 (Usuario: admin@mymedrecord.cl / Clave: admin)

---

### Paso 2: Iniciar Backend (API)
En una terminal:
```bash
cd backend-core
npm install
npm run dev
```
* Disponible en: http://localhost:5000/api/v1

---

### Paso 3: Iniciar Frontend
En otra terminal:
```bash
cd frontend
npm install
npm run dev
```
* Disponible en: http://localhost:5173

---

## 5. Cuentas de Demostración Pre-configuradas

En la pantalla de inicio de sesión se puede ingresar manualmente o utilizar los accesos rápidos:

| Rol Oficial | Identificador (RUT o Correo) | Contraseña | Capacidades Disponibles |
| :--- | :--- | :--- | :--- |
| **Paciente** | paciente@mymedrecord.cl o 12.345.678-9 | password123 | Ficha personal ("Mi Ficha"), signos vitales, antecedentes y generación de QR de emergencia. |
| **Médico Administrador** | medico@mymedrecord.cl o 98.765.432-1 | password123 | Búsqueda clínica por RUT, emisión de recetas electrónicas y supervisión de auditoría (Ley 21.668). |

---

## 6. Flujo de Trabajo y Metodología (Scrum / GitFlow)
* Sprints: Ciclos semanales de entrega de incrementos de software funcional.
* Estrategia de Ramas: Ramas temáticas (feature/) para revisión cruzada mediante Pull Requests antes de integrar a las ramas principales.
* Roles del Equipo:
  * Product Owner: Ariel Velásquez
  * Scrum Master: Sergio Vera
  * Developer: Ignacio Ruiz
