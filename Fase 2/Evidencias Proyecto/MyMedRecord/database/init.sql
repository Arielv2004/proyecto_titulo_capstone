-- MyMedRecord - Base Database Schema
-- Ley N° 21.668 (Interoperabilidad de Fichas Clínicas) & Ley N° 20.584

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Tabla de Usuarios y Roles
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rut VARCHAR(12) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('PACIENTE', 'MEDICO', 'ADMIN')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabla de Permisos de Acceso Médico (Consentimiento y delegación temporal de ficha)
CREATE TABLE IF NOT EXISTS access_grants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    grant_type VARCHAR(20) NOT NULL CHECK (grant_type IN ('RUT', 'QR', 'TEMPORAL')),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_revoked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabla de Documentos Médicos e Informes Procesados
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    uploaded_by UUID NOT NULL REFERENCES users(id),
    document_type VARCHAR(50) NOT NULL, -- 'RECETA', 'EXAMEN_LAB', 'INFORME', etc.
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    extracted_data JSONB,               -- Entidades estructuradas por IA
    encrypted_notes TEXT,               -- Encriptado con AES-256-GCM
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tabla de Signos Vitales y Métricas Clínicas
CREATE TABLE IF NOT EXISTS vital_signs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    systolic_bp INTEGER,                -- Presión sistólica (mmHg)
    diastolic_bp INTEGER,               -- Presión diastólica (mmHg)
    heart_rate INTEGER,                 -- Frecuencia cardíaca (bpm)
    glucose_level NUMERIC(5, 2),        -- Nivel de glucosa (mg/dL)
    oxygen_saturation NUMERIC(4, 1),    -- SpO2 (%)
    temperature NUMERIC(4, 1),          -- Temperatura (°C)
    is_abnormal BOOLEAN DEFAULT FALSE,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Tabla de Auditoría Continua (Obligatoria por Ley 21.668 / 20.584)
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    patient_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,        -- 'READ_PATIENT_RECORD', 'UPLOAD_EXAM', 'GRANT_ACCESS', etc.
    ip_address VARCHAR(45) NOT NULL,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices de optimización para búsquedas clínicas
CREATE INDEX IF NOT EXISTS idx_users_rut ON users(rut);
CREATE INDEX IF NOT EXISTS idx_vital_signs_patient ON vital_signs(patient_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_patient ON documents(patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_patient ON audit_logs(patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_access_grants_lookup ON access_grants(patient_id, doctor_id, is_revoked);

-- Datos Iniciales de Demostración (Contraseña para todos: password123)
INSERT INTO users (id, rut, first_name, last_name, email, password_hash, role)
VALUES 
    ('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', '12345678-9', 'Ignacio', 'Pérez', 'paciente@mymedrecord.cl', '$2b$10$sAeGx1oVam0wqcCk.A5aaeYHKGW2vGEF9gFe8kDcBqzMMpLoS4VOW', 'PACIENTE'),
    ('b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e', '98765432-1', 'Dr. Ariel', 'González', 'medico@mymedrecord.cl', '$2b$10$sAeGx1oVam0wqcCk.A5aaeYHKGW2vGEF9gFe8kDcBqzMMpLoS4VOW', 'MEDICO'),
    ('c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f', '11223344-5', 'Sergio', 'Silva', 'admin@mymedrecord.cl', '$2b$10$sAeGx1oVam0wqcCk.A5aaeYHKGW2vGEF9gFe8kDcBqzMMpLoS4VOW', 'ADMIN')
ON CONFLICT (email) DO NOTHING;

-- Registro de Signos Vitales de Ejemplo para el Paciente
INSERT INTO vital_signs (patient_id, systolic_bp, diastolic_bp, heart_rate, glucose_level, oxygen_saturation, temperature)
VALUES 
    ('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 120, 80, 72, 95.5, 98.0, 36.6);
