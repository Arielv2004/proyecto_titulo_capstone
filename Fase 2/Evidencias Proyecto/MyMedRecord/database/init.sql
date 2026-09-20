-- ==============================================================================
-- MyMedRecord - Sistema de Digitalización e Interoperabilidad Clínica
-- Cumplimiento: Ley N° 21.668 (Interoperabilidad Ficha Clínica) y Ley N° 20.584
-- Arquitectura de Base de Datos Relacional (PostgreSQL 15)
-- Modelado: Sergio Vera | Backend & Seguridad: Ariel Velásquez | Frontend: Ignacio Ruiz
-- ==============================================================================

-- 1. Extensiones necesarias para UUID v4 y funciones criptográficas
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Limpieza de tablas previas (en orden inverso de dependencias para idempotencia)
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS access_grants CASCADE;
DROP TABLE IF EXISTS lab_test_items CASCADE;
DROP TABLE IF EXISTS lab_reports CASCADE;
DROP TABLE IF EXISTS prescription_items CASCADE;
DROP TABLE IF EXISTS prescriptions CASCADE;
DROP TABLE IF EXISTS vital_signs CASCADE;
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS patient_profiles CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ==============================================================================
-- TABLA 1: users (Usuarios y Autenticación Central con control RBAC)
-- ==============================================================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rut VARCHAR(12) UNIQUE NOT NULL,                          -- Formato chileno: '12345678-9'
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,                     -- Hash bcrypt / Argon2
    role VARCHAR(20) NOT NULL DEFAULT 'PACIENTE' CHECK (role IN ('PACIENTE', 'MEDICO')),
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- TABLA 2: patient_profiles (Ficha Clínica Base del Paciente - Relación 1:1)
-- NOTA DE DISEÑO: Todos los campos clínicos son OPCIONALES (NULLABLE) para
-- garantizar registro rápido sin fricción; el paciente los completa en "Mi Ficha".
-- ==============================================================================
CREATE TABLE patient_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    birth_date DATE,                                          -- Opcional en el registro
    gender VARCHAR(20),                                       -- 'MASCULINO', 'FEMENINO', 'OTRO'
    blood_type VARCHAR(5),                                    -- 'O+', 'A+', 'B+', 'AB+', 'O-', etc.
    health_insurance VARCHAR(50),                             -- 'FONASA A/B/C/D', 'Consalud', etc.
    is_organ_donor BOOLEAN DEFAULT TRUE,                     -- Calidad de donante en Chile
    allergies TEXT[] DEFAULT '{}',                           -- Array: {'Penicilina', 'Ibuprofeno'}
    chronic_conditions TEXT[] DEFAULT '{}',                  -- Array: {'Hipertensión', 'Asma'}
    emergency_contact_name VARCHAR(150),
    emergency_contact_phone VARCHAR(20),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- TABLA 3: access_grants (Portal de Acceso Médico por Código QR)
-- Permite acceso temporal e interoperable a profesionales de la salud bajo Ley N° 21.668,
-- validando su RUT profesional y centro médico sin exigirles cuenta previa en el sistema.
-- ==============================================================================
CREATE TABLE access_grants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(100) UNIQUE NOT NULL,                       -- Token seguro del código QR
    grant_type VARCHAR(20) NOT NULL DEFAULT 'QR_TEMPORAL' CHECK (grant_type IN ('QR_TEMPORAL', 'DIRECTO')),
    doctor_name VARCHAR(150),                                 -- Nombre del médico que escaneó
    doctor_rut VARCHAR(12),                                   -- RUT del médico para la bitácora legal
    doctor_institution VARCHAR(150),                          -- Hospital / Clínica de la atención
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,             -- Vigencia (ej. 30 minutos)
    is_revoked BOOLEAN DEFAULT FALSE,                         -- Revocación instantánea por el paciente
    access_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- TABLA 4: documents (Repositorio Universal de Documentos Digitalizados)
-- Almacena el archivo fotográfico, metadatos, transcripción OCR y notas cifradas.
-- ==============================================================================
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    uploaded_by UUID NOT NULL REFERENCES users(id),
    document_type VARCHAR(30) NOT NULL CHECK (document_type IN ('RECETA', 'EXAMEN_LAB', 'INFORME', 'IMAGEN', 'OTRO')),
    title VARCHAR(200) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size_bytes INTEGER,
    document_date DATE,                                       -- Fecha leída en el papel original
    issuing_doctor VARCHAR(150),                              -- Médico detectado por OCR / IA
    issuing_institution VARCHAR(150),                         -- Clínica / CESFAM detectado
    ocr_raw_text TEXT,                                        -- Transcripción OCR pura
    ocr_confidence NUMERIC(5, 2),                             -- % de certeza de lectura de la IA
    encrypted_notes TEXT,                                     -- Observaciones cifradas en AES-256-GCM
    status VARCHAR(20) NOT NULL DEFAULT 'PROCESANDO' CHECK (status IN ('PROCESANDO', 'PENDIENTE_REVISION', 'CONFIRMADO', 'ERROR')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- TABLA 5: prescriptions (Cabecera de Recetas Médicas Extraídas)
-- ==============================================================================
CREATE TABLE prescriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID UNIQUE NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    doctor_name VARCHAR(150),
    diagnosis_code VARCHAR(10),                               -- Código internacional CIE-10 (ej. 'J00')
    diagnosis_text VARCHAR(255),                              -- Diagnóstico textual
    issue_date DATE,
    valid_until DATE,                                         -- Fecha de vigencia farmacéutica
    is_chronic BOOLEAN DEFAULT FALSE,                         -- Si es tratamiento crónico / GES
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVA' CHECK (status IN ('ACTIVA', 'FINALIZADA', 'VENCIDA')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- TABLA 6: prescription_items (Detalle de Medicamentos - Relación 1:N en 3NF)
-- ==============================================================================
CREATE TABLE prescription_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prescription_id UUID NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
    medication_name VARCHAR(150) NOT NULL,                    -- Nombre fármaco (ej. 'Amoxicilina')
    dosage VARCHAR(50),                                       -- Dosis (ej. '500 mg')
    frequency VARCHAR(100),                                   -- Frecuencia (ej. 'Cada 8 horas')
    duration VARCHAR(100),                                    -- Duración (ej. 'Por 7 días')
    instructions TEXT,                                        -- Indicación ('Tomar con alimentos')
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- TABLA 7: lab_reports (Cabecera de Informes de Laboratorio)
-- ==============================================================================
CREATE TABLE lab_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID UNIQUE NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    laboratory_name VARCHAR(150),                             -- Ej. 'Laboratorio Bionet'
    sample_date DATE,                                         -- Fecha de toma de muestra
    observations TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- TABLA 8: lab_test_items (Analitos / Resultados de Laboratorio - Relación 1:N en 3NF)
-- ==============================================================================
CREATE TABLE lab_test_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lab_report_id UUID NOT NULL REFERENCES lab_reports(id) ON DELETE CASCADE,
    test_name VARCHAR(150) NOT NULL,                          -- Ej. 'Glucosa en Ayunas'
    result_value VARCHAR(50) NOT NULL,                        -- Ej. '95', 'Positivo'
    unit VARCHAR(30),                                         -- Ej. 'mg/dL', 'UI/L', '%'
    reference_range VARCHAR(100),                             -- Ej. '70 - 100 mg/dL'
    is_abnormal BOOLEAN DEFAULT FALSE,                        -- Bandera de alerta visual
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- TABLA 9: audit_logs (Bitácora Inmutable de Auditoría - Ley 21.668 y 20.584)
-- ==============================================================================
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    patient_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,                             -- 'READ_RECORD', 'QR_ACCESS', 'DOWNLOAD_PDF', etc.
    details JSONB,                                            -- Información contextual en JSON
    ip_address VARCHAR(45) NOT NULL,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- ÍNDICES DE RENDIMIENTO (Performance & Lookups)
-- ==============================================================================
CREATE INDEX idx_users_rut ON users(rut);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_patient_profiles_user ON patient_profiles(user_id);
CREATE INDEX idx_access_grants_token ON access_grants(token);
CREATE INDEX idx_access_grants_patient ON access_grants(patient_id, expires_at);
CREATE INDEX idx_documents_patient ON documents(patient_id, created_at DESC);
CREATE INDEX idx_documents_type ON documents(patient_id, document_type);
CREATE INDEX idx_prescriptions_patient ON prescriptions(patient_id, status);
CREATE INDEX idx_prescription_items_rx ON prescription_items(prescription_id);
CREATE INDEX idx_lab_reports_patient ON lab_reports(patient_id);
CREATE INDEX idx_lab_test_items_report ON lab_test_items(lab_report_id);
CREATE INDEX idx_audit_logs_patient ON audit_logs(patient_id, created_at DESC);

-- ==============================================================================
-- DATOS INICIALES DE DEMOSTRACIÓN (SEEDS)
-- Contraseña unificada para todas las cuentas de prueba: password123
-- Hash bcrypt correspondiente: $2b$10$sAeGx1oVam0wqcCk.A5aaeYHKGW2vGEF9gFe8kDcBqzMMpLoS4VOW
-- ==============================================================================

-- 1. Usuarios demo (Paciente y Médico)
INSERT INTO users (id, rut, first_name, last_name, email, password_hash, role)
VALUES 
    ('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', '12345678-9', 'Ignacio', 'Pérez', 'paciente@mymedrecord.cl', '$2b$10$sAeGx1oVam0wqcCk.A5aaeYHKGW2vGEF9gFe8kDcBqzMMpLoS4VOW', 'PACIENTE'),
    ('b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e', '98765432-1', 'Dr. Ariel', 'Velásquez', 'medico@mymedrecord.cl', '$2b$10$sAeGx1oVam0wqcCk.A5aaeYHKGW2vGEF9gFe8kDcBqzMMpLoS4VOW', 'MEDICO')
ON CONFLICT (email) DO NOTHING;

-- 2. Perfil clínico inicial de demostración del Paciente (completado opcionalmente)
INSERT INTO patient_profiles (user_id, birth_date, gender, blood_type, health_insurance, is_organ_donor, allergies, chronic_conditions, emergency_contact_name, emergency_contact_phone)
VALUES (
    'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    '1995-06-15',
    'MASCULINO',
    'O+',
    'FONASA Tramo B',
    TRUE,
    ARRAY['Penicilina', 'Ibuprofeno'],
    ARRAY['Hipertensión Arterial Primaria'],
    'María Gómez (Cónyuge)',
    '+56 9 8765 4321'
)
ON CONFLICT (user_id) DO NOTHING;

-- 3. Documento Demo 1: Receta Médica digitalizada por foto
INSERT INTO documents (
    id, patient_id, uploaded_by, document_type, title, file_name, file_path, 
    mime_type, file_size_bytes, document_date, issuing_doctor, issuing_institution, 
    ocr_raw_text, ocr_confidence, status
)
VALUES (
    'd1e2f3a4-b5c6-7d8e-9f0a-1b2c3d4e5f60',
    'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    'RECETA',
    'Receta Médica - Infección Respiratoria Aguda',
    'receta_amoxicilina.jpg',
    '/uploads/documents/receta_amoxicilina.jpg',
    'image/jpeg',
    245600,
    '2026-08-20',
    'Dr. Carlos Morales',
    'CESFAM Los Castaños',
    'RP: Amoxicilina + Ácido Clavulánico 875/125mg cada 12 hrs por 7 días. Paracetamol 500mg cada 8 hrs SOS.',
    97.50,
    'CONFIRMADO'
)
ON CONFLICT (id) DO NOTHING;

-- 4. Cabecera de la receta estructurada
INSERT INTO prescriptions (id, document_id, patient_id, doctor_name, diagnosis_code, diagnosis_text, issue_date, valid_until, is_chronic, status)
VALUES (
    'e1f2a3b4-c5d6-7e8f-9a0b-1c2d3e4f5a01',
    'd1e2f3a4-b5c6-7d8e-9f0a-1b2c3d4e5f60',
    'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    'Dr. Carlos Morales',
    'J06.9',
    'Infección respiratoria aguda, no especificada',
    '2026-08-20',
    '2026-09-20',
    FALSE,
    'ACTIVA'
)
ON CONFLICT (id) DO NOTHING;

-- 5. Items de medicamentos de la receta (relación 1:N)
INSERT INTO prescription_items (prescription_id, medication_name, dosage, frequency, duration, instructions)
VALUES 
    ('e1f2a3b4-c5d6-7e8f-9a0b-1c2d3e4f5a01', 'Amoxicilina + Ácido Clavulánico', '875/125 mg', 'Cada 12 horas', 'Por 7 días', 'Tomar al inicio de las comidas con abundante agua.'),
    ('e1f2a3b4-c5d6-7e8f-9a0b-1c2d3e4f5a01', 'Paracetamol', '500 mg', 'Cada 8 horas', 'Por 3 días (SOS)', 'Tomar solo en caso de fiebre superior a 38°C o dolor corporal intenso.')
ON CONFLICT DO NOTHING;

-- 6. Documento Demo 2: Examen de Laboratorio
INSERT INTO documents (
    id, patient_id, uploaded_by, document_type, title, file_name, file_path, 
    mime_type, file_size_bytes, document_date, issuing_doctor, issuing_institution, 
    ocr_raw_text, ocr_confidence, status
)
VALUES (
    'd2e3f4a5-b6c7-8d9e-0f1a-2b3c4d5e6f71',
    'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    'EXAMEN_LAB',
    'Perfil Bioquímico y Glicemia',
    'perfil_bioquimico.pdf',
    '/uploads/documents/perfil_bioquimico.pdf',
    'application/pdf',
    512300,
    '2026-08-25',
    'Dra. Marcela Fuenzalida',
    'Laboratorio Bionet Las Condes',
    'GLUCOSA EN AYUNAS: 95 mg/dL (Ref: 70-100). COLESTEROL TOTAL: 215 mg/dL (Ref: < 200). TRIGLICÉRIDOS: 140 mg/dL (Ref: < 150).',
    98.20,
    'CONFIRMADO'
)
ON CONFLICT (id) DO NOTHING;

-- 7. Cabecera del informe de laboratorio
INSERT INTO lab_reports (id, document_id, patient_id, laboratory_name, sample_date, observations)
VALUES (
    'f1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b02',
    'd2e3f4a5-b6c7-8d9e-0f1a-2b3c4d5e6f71',
    'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    'Laboratorio Clínico Bionet',
    '2026-08-25',
    'Muestra tomada en ayunas de 10 horas. Suero límpido no hemolizado.'
)
ON CONFLICT (id) DO NOTHING;

-- 8. Analitos del examen de laboratorio (relación 1:N)
INSERT INTO lab_test_items (lab_report_id, test_name, result_value, unit, reference_range, is_abnormal)
VALUES 
    ('f1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b02', 'Glucosa en Ayunas', '95', 'mg/dL', '70 - 100 mg/dL', FALSE),
    ('f1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b02', 'Colesterol Total', '215', 'mg/dL', '< 200 mg/dL', TRUE),
    ('f1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b02', 'Triglicéridos', '140', 'mg/dL', '< 150 mg/dL', FALSE)
ON CONFLICT DO NOTHING;

-- 9. Pase de Acceso Médico por Código QR inicial de demostración (Ley 21.668)
INSERT INTO access_grants (id, patient_id, token, grant_type, doctor_rut, doctor_name, doctor_institution, expires_at, is_revoked)
VALUES (
    'a3b4c5d6-e7f8-9a0b-1c2d-3e4f5a6b7c8d',
    'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    'MMR-12H-DEMO-2026-CONSULTA',
    'QR_TEMPORAL',
    '98765432-1',
    'Dr. Ariel Velásquez',
    'Centro Médico y Consulta de Especialidades',
    NOW() + INTERVAL '12 hours',
    FALSE
)
ON CONFLICT (token) DO NOTHING;

-- 10. Registro inicial de auditoría (Cumplimiento Ley 21.668)
INSERT INTO audit_logs (user_id, patient_id, action, details, ip_address, user_agent)
VALUES (
    'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    'INITIALIZE_RECORD',
    '{"message": "Creación inicial de ficha clínica digital bajo Ley N° 21.668"}'::jsonb,
    '127.0.0.1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) MyMedRecord/1.0'
);
