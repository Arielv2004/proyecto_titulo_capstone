-- ==============================================================================
-- MyMedRecord - Sistema de Digitalización e Interoperabilidad Clínica
-- Cumplimiento: Ley N° 21.668 (Interoperabilidad Ficha Clínica) y Ley N° 20.584
-- Arquitectura de Base de Datos Relacional (PostgreSQL 15)
-- Modelado: Sergio Vera | Backend & Seguridad: Ariel Velásquez | Frontend: Ignacio Ruiz
-- ==============================================================================

-- 1. Extensiones necesarias para UUID v4 y funciones criptográficas
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Limpieza de tablas previas
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS appointments CASCADE;
DROP TABLE IF EXISTS access_grants CASCADE;
DROP TABLE IF EXISTS lab_test_items CASCADE;
DROP TABLE IF EXISTS lab_reports CASCADE;
DROP TABLE IF EXISTS prescription_items CASCADE;
DROP TABLE IF EXISTS prescriptions CASCADE;
DROP TABLE IF EXISTS vital_signs CASCADE;
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS patient_profiles CASCADE;
DROP TABLE IF EXISTS doctor_profiles CASCADE;
DROP TABLE IF EXISTS health_institutions CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ==============================================================================
-- TABLA 1: users
-- Usuarios y Autenticación Central con control RBAC
-- ==============================================================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rut VARCHAR(12) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'PACIENTE'
        CHECK (role IN ('PACIENTE', 'MEDICO')),
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- TABLA 2: patient_profiles
-- Ficha Clínica Base del Paciente - Relación 1:1
-- ==============================================================================
CREATE TABLE patient_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    birth_date DATE,
    gender VARCHAR(20),
    blood_type VARCHAR(5),
    health_insurance VARCHAR(50),
    is_organ_donor BOOLEAN DEFAULT TRUE,
    allergies TEXT[] DEFAULT '{}',
    chronic_conditions TEXT[] DEFAULT '{}',
    emergency_contact_name VARCHAR(150),
    emergency_contact_phone VARCHAR(20),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- TABLA 3: health_institutions
-- Catálogo de hospitales, clínicas, CESFAM y consultas.
-- Permite que el paciente seleccione primero una institución y luego vea
-- los médicos registrados/verificados asociados a ella.
-- ==============================================================================
CREATE TABLE health_institutions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    institution_type VARCHAR(30) NOT NULL
        CHECK (institution_type IN ('HOSPITAL', 'CLINICA', 'CESFAM', 'CENTRO_MEDICO', 'CONSULTA', 'OTRO')),
    rut VARCHAR(12),
    address VARCHAR(255),
    commune VARCHAR(100),
    city VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(150),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_health_institution_name_city UNIQUE (name, city)
);

-- ==============================================================================
-- TABLA 4: doctor_profiles
-- Información profesional separada de la autenticación de users.
-- Un usuario MEDICO no se considera profesional verificado solo por registrarse:
-- su perfil mantiene el estado de validación de sus antecedentes.
-- ==============================================================================
CREATE TABLE doctor_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    institution_id UUID REFERENCES health_institutions(id) ON DELETE SET NULL,
    institution_name_other VARCHAR(200),

    -- Identificador profesional informado por el médico.
    -- En producción debe contrastarse con una fuente oficial antes de marcar
    -- el perfil como VERIFICADO.
    professional_registry VARCHAR(100),
    specialty VARCHAR(150),
    professional_title VARCHAR(150) DEFAULT 'Médico/a Cirujano/a',

    verification_status VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE'
        CHECK (verification_status IN ('PENDIENTE', 'VERIFICADO', 'RECHAZADO', 'SUSPENDIDO')),
    verified_at TIMESTAMP WITH TIME ZONE,
    is_available_for_sharing BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CHECK (
        (verification_status = 'VERIFICADO' AND verified_at IS NOT NULL)
        OR verification_status <> 'VERIFICADO'
    )
);

-- ==============================================================================
-- TABLA 5: access_grants
-- Autorizaciones temporales de acceso a la ficha clínica.
--
-- DIRECTO:
-- El paciente comparte voluntariamente su ficha con un médico registrado.
--
-- QR_TEMPORAL:
-- El paciente genera un código QR asociado a un token temporal de acceso.
--
-- Ambos mecanismos utilizan un acceso temporal y controlado
-- mediante /shared-record/:token.
-- ==============================================================================
CREATE TABLE access_grants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    patient_id UUID NOT NULL
        REFERENCES users(id) ON DELETE CASCADE,

    doctor_id UUID
        REFERENCES users(id) ON DELETE CASCADE,

    -- Datos del profesional que utiliza un acceso QR.
    -- En acceso DIRECTO, doctor_id identifica al médico registrado.
    doctor_rut VARCHAR(12),
    doctor_name VARCHAR(200),
    doctor_institution VARCHAR(200),

    token VARCHAR(100) UNIQUE NOT NULL,

    grant_type VARCHAR(20) NOT NULL
        CHECK (
            grant_type IN (
                'QR_TEMPORAL',
                'DIRECTO'
            )
        ),

    starts_at TIMESTAMP WITH TIME ZONE
        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,

    is_revoked BOOLEAN NOT NULL DEFAULT FALSE,

    access_count INTEGER NOT NULL DEFAULT 0,

    created_at TIMESTAMP WITH TIME ZONE
        DEFAULT CURRENT_TIMESTAMP,

    CHECK (expires_at > starts_at),

    CHECK (
        (grant_type = 'DIRECTO' AND doctor_id IS NOT NULL)
        OR
        (grant_type = 'QR_TEMPORAL')
    ),

    CHECK (
        doctor_id IS NULL
        OR doctor_id <> patient_id
    )
);

-- ==============================================================================
-- TABLA 6: appointments
-- Agenda médica temporal del prototipo.
--
-- Esta tabla se mantiene mientras migramos el flujo existente hacia
-- access_grants.
--
-- REGLA ACTUAL:
-- El médico puede acceder desde scheduled_at hasta access_expires_at.
-- ==============================================================================
CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    doctor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    access_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,

    status VARCHAR(20) NOT NULL DEFAULT 'PROGRAMADA'
        CHECK (
            status IN (
                'PROGRAMADA',
                'EN_ATENCION',
                'COMPLETADA',
                'CANCELADA'
            )
        ),

    reason VARCHAR(255),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CHECK (doctor_id <> patient_id),
    CHECK (access_expires_at > scheduled_at)
);

-- ==============================================================================
-- TABLA 7: documents
-- Repositorio Universal de Documentos Digitalizados
-- ==============================================================================
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    uploaded_by UUID NOT NULL REFERENCES users(id),

    document_type VARCHAR(30) NOT NULL
        CHECK (
            document_type IN (
                'RECETA',
                'EXAMEN_LAB',
                'INFORME',
                'IMAGEN',
                'OTRO'
            )
        ),

    title VARCHAR(200) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size_bytes INTEGER,
    document_date DATE,
    issuing_doctor VARCHAR(150),
    issuing_institution VARCHAR(150),
    ocr_raw_text TEXT,
    ocr_confidence NUMERIC(5, 2),
    encrypted_notes TEXT,

    status VARCHAR(20) NOT NULL DEFAULT 'PROCESANDO'
        CHECK (
            status IN (
                'PROCESANDO',
                'PENDIENTE_REVISION',
                'CONFIRMADO',
                'ERROR',
		'ELIMINADO'
            )
        ),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- TABLA 8: prescriptions
-- Cabecera de Recetas Médicas Extraídas
-- ==============================================================================
CREATE TABLE prescriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    document_id UUID UNIQUE NOT NULL
        REFERENCES documents(id) ON DELETE CASCADE,

    patient_id UUID NOT NULL
        REFERENCES users(id) ON DELETE CASCADE,

    doctor_name VARCHAR(150),
    diagnosis_code VARCHAR(10),
    diagnosis_text VARCHAR(255),
    issue_date DATE,
    valid_until DATE,
    is_chronic BOOLEAN DEFAULT FALSE,

    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVA'
        CHECK (
            status IN (
                'ACTIVA',
                'FINALIZADA',
                'VENCIDA'
            )
        ),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- TABLA 9: prescription_items
-- Medicamentos asociados a una receta
-- ==============================================================================
CREATE TABLE prescription_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    prescription_id UUID NOT NULL
        REFERENCES prescriptions(id) ON DELETE CASCADE,

    medication_name VARCHAR(150) NOT NULL,
    dosage VARCHAR(50),
    frequency VARCHAR(100),
    duration VARCHAR(100),
    instructions TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- TABLA 10: lab_reports
-- Informes de laboratorio
-- ==============================================================================
CREATE TABLE lab_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    document_id UUID UNIQUE NOT NULL
        REFERENCES documents(id) ON DELETE CASCADE,

    patient_id UUID NOT NULL
        REFERENCES users(id) ON DELETE CASCADE,

    laboratory_name VARCHAR(150),
    sample_date DATE,
    observations TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- TABLA 11: lab_test_items
-- Resultados individuales de laboratorio
-- ==============================================================================
CREATE TABLE lab_test_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    lab_report_id UUID NOT NULL
        REFERENCES lab_reports(id) ON DELETE CASCADE,

    test_name VARCHAR(150) NOT NULL,
    result_value VARCHAR(50) NOT NULL,
    unit VARCHAR(30),
    reference_range VARCHAR(100),
    is_abnormal BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- TABLA 12: audit_logs
-- Bitácora de Auditoría
-- ==============================================================================
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID
        REFERENCES users(id) ON DELETE SET NULL,

    patient_id UUID
        REFERENCES users(id) ON DELETE SET NULL,

    action VARCHAR(100) NOT NULL,
    details JSONB,
    ip_address VARCHAR(45) NOT NULL,
    user_agent TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- ÍNDICES DE RENDIMIENTO
-- ==============================================================================

CREATE INDEX idx_users_rut
    ON users(rut);

CREATE INDEX idx_users_email
    ON users(email);

CREATE INDEX idx_patient_profiles_user
    ON patient_profiles(user_id);

CREATE INDEX idx_health_institutions_name
    ON health_institutions(name);

CREATE INDEX idx_health_institutions_city
    ON health_institutions(city);

CREATE INDEX idx_doctor_profiles_institution
    ON doctor_profiles(institution_id);

CREATE INDEX idx_doctor_profiles_verification
    ON doctor_profiles(verification_status);

CREATE INDEX idx_doctor_profiles_specialty
    ON doctor_profiles(specialty);

-- Access Grants
CREATE INDEX idx_access_grants_token
    ON access_grants(token);

CREATE INDEX idx_access_grants_patient
    ON access_grants(patient_id, expires_at);

CREATE INDEX idx_access_grants_doctor
    ON access_grants(doctor_id, starts_at, expires_at);

-- Appointments
CREATE INDEX idx_appointments_doctor_schedule
    ON appointments(doctor_id, scheduled_at);

CREATE INDEX idx_appointments_patient_schedule
    ON appointments(patient_id, scheduled_at);

CREATE INDEX idx_appointments_status
    ON appointments(status);

-- Documents
CREATE INDEX idx_documents_patient
    ON documents(patient_id, created_at DESC);

CREATE INDEX idx_documents_type
    ON documents(patient_id, document_type);

-- Prescriptions
CREATE INDEX idx_prescriptions_patient
    ON prescriptions(patient_id, status);

CREATE INDEX idx_prescription_items_rx
    ON prescription_items(prescription_id);

-- Laboratory
CREATE INDEX idx_lab_reports_patient
    ON lab_reports(patient_id);

CREATE INDEX idx_lab_test_items_report
    ON lab_test_items(lab_report_id);

-- Audit
CREATE INDEX idx_audit_logs_patient
    ON audit_logs(patient_id, created_at DESC);

-- ==============================================================================
-- DATOS DEMO: USUARIOS INICIALES
-- ==============================================================================

INSERT INTO users (
    id, rut, first_name, last_name, email, password_hash, role, phone, is_active
) VALUES
(
    'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    '12.345.678-5',
    'Juan',
    'Pérez',
    'paciente@mymedrecord.cl',
    crypt('Paciente123!', gen_salt('bf')),
    'PACIENTE',
    '+56 9 1111 1111',
    TRUE
),
(
    'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e',
    '11.111.111-1',
    'Carlos',
    'Morales',
    'medico@mymedrecord.cl',
    crypt('Medico123!', gen_salt('bf')),
    'MEDICO',
    '+56 9 2222 2222',
    TRUE
)
ON CONFLICT (email) DO NOTHING;

-- ==============================================================================
-- INSTITUCIONES DE SALUD DEMO
-- ==============================================================================
INSERT INTO health_institutions (
    id, name, institution_type, address, commune, city, phone, is_active
) VALUES
(
    '11111111-1111-4111-8111-111111111111',
    'Hospital Puerto Montt',
    'HOSPITAL',
    'Los Aromos 65',
    'Puerto Montt',
    'Puerto Montt',
    NULL,
    TRUE
),
(
    '22222222-2222-4222-8222-222222222222',
    'CESFAM Los Castaños',
    'CESFAM',
    NULL,
    'Puerto Montt',
    'Puerto Montt',
    NULL,
    TRUE
),
(
    '33333333-3333-4333-8333-333333333333',
    'Clínica Puerto Montt',
    'CLINICA',
    NULL,
    'Puerto Montt',
    'Puerto Montt',
    NULL,
    TRUE
)
ON CONFLICT (name, city) DO NOTHING;

-- ==============================================================================
-- PERFIL PROFESIONAL DEL MÉDICO DEMO
-- ==============================================================================
INSERT INTO doctor_profiles (
    user_id,
    institution_id,
    professional_registry,
    specialty,
    professional_title,
    verification_status,
    verified_at,
    is_available_for_sharing
)
VALUES (
    'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e',
    '11111111-1111-4111-8111-111111111111',
    'DEMO-RNPI-0001',
    'Medicina General',
    'Médico Cirujano',
    'VERIFICADO',
    CURRENT_TIMESTAMP,
    TRUE
)
ON CONFLICT (user_id) DO NOTHING;

-- ==============================================================================
-- 2. PERFIL CLÍNICO INICIAL DEL PACIENTE
-- ==============================================================================

INSERT INTO patient_profiles (
    user_id,
    birth_date,
    gender,
    blood_type,
    health_insurance,
    is_organ_donor,
    allergies,
    chronic_conditions,
    emergency_contact_name,
    emergency_contact_phone
)
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

-- ==============================================================================
-- 3. CITA MÉDICA DEMO
--
-- Se mantiene temporalmente para que el flujo actual del portal médico
-- continúe funcionando durante la migración hacia access_grants.
-- ==============================================================================

INSERT INTO appointments (
    id,
    doctor_id,
    patient_id,
    scheduled_at,
    access_expires_at,
    status,
    reason
)
VALUES (
    'c3d4e5f6-a7b8-4c9d-8e0f-1a2b3c4d5e6f',
    'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e',
    'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP + INTERVAL '5 hours',
    'PROGRAMADA',
    'Consulta médica general'
)
ON CONFLICT (id) DO NOTHING;

-- ==============================================================================
-- 4. ACCESO DIRECTO DEMO
--
-- El paciente comparte su ficha con un médico registrado.
-- Utiliza un token y vence 5 horas después.
-- ==============================================================================

INSERT INTO access_grants (
    id,
    patient_id,
    doctor_id,
    token,
    grant_type,
    starts_at,
    expires_at,
    is_revoked
)
VALUES (
    'a3b4c5d6-e7f8-9a0b-1c2d-3e4f5a6b7c8d',
    'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e',
    'DIRECTO-DEMO-2026-TOKEN',
    'DIRECTO',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP + INTERVAL '5 hours',
    FALSE
)
ON CONFLICT (token) DO NOTHING;

-- ==============================================================================
-- 5. ACCESO QR DEMO
--
-- El paciente genera un QR temporal.
-- doctor_id queda NULL en esta etapa.
-- ==============================================================================

INSERT INTO access_grants (
    id,
    patient_id,
    doctor_id,
    token,
    grant_type,
    starts_at,
    expires_at,
    is_revoked
)
VALUES (
    'b4c5d6e7-f8a9-4b0c-8d1e-2f3a4b5c6d7e',
    'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    NULL,
    'QR-DEMO-2026-TOKEN',
    'QR_TEMPORAL',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP + INTERVAL '5 hours',
    FALSE
)
ON CONFLICT (token) DO NOTHING;

-- ==============================================================================
-- 6. DOCUMENTO DEMO 1: RECETA MÉDICA
-- ==============================================================================

INSERT INTO documents (
    id,
    patient_id,
    uploaded_by,
    document_type,
    title,
    file_name,
    file_path,
    mime_type,
    file_size_bytes,
    document_date,
    issuing_doctor,
    issuing_institution,
    ocr_raw_text,
    ocr_confidence,
    status
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

-- ==============================================================================
-- 7. CABECERA DE LA RECETA
-- ==============================================================================

INSERT INTO prescriptions (
    id,
    document_id,
    patient_id,
    doctor_name,
    diagnosis_code,
    diagnosis_text,
    issue_date,
    valid_until,
    is_chronic,
    status
)
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

-- ==============================================================================
-- 8. MEDICAMENTOS DE LA RECETA
-- ==============================================================================

INSERT INTO prescription_items (
    prescription_id,
    medication_name,
    dosage,
    frequency,
    duration,
    instructions
)
VALUES
(
    'e1f2a3b4-c5d6-7e8f-9a0b-1c2d3e4f5a01',
    'Amoxicilina + Ácido Clavulánico',
    '875/125 mg',
    'Cada 12 horas',
    'Por 7 días',
    'Tomar al inicio de las comidas con abundante agua.'
),
(
    'e1f2a3b4-c5d6-7e8f-9a0b-1c2d3e4f5a01',
    'Paracetamol',
    '500 mg',
    'Cada 8 horas',
    'Por 3 días (SOS)',
    'Tomar solo en caso de fiebre superior a 38°C o dolor corporal intenso.'
)
ON CONFLICT DO NOTHING;

-- ==============================================================================
-- 9. DOCUMENTO DEMO 2: EXAMEN DE LABORATORIO
-- ==============================================================================

INSERT INTO documents (
    id,
    patient_id,
    uploaded_by,
    document_type,
    title,
    file_name,
    file_path,
    mime_type,
    file_size_bytes,
    document_date,
    issuing_doctor,
    issuing_institution,
    ocr_raw_text,
    ocr_confidence,
    status
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

-- ==============================================================================
-- 10. CABECERA DEL INFORME DE LABORATORIO
-- ==============================================================================

INSERT INTO lab_reports (
    id,
    document_id,
    patient_id,
    laboratory_name,
    sample_date,
    observations
)
VALUES (
    'f1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b02',
    'd2e3f4a5-b6c7-8d9e-0f1a-2b3c4d5e6f71',
    'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    'Laboratorio Clínico Bionet',
    '2026-08-25',
    'Muestra tomada en ayunas de 10 horas. Suero límpido no hemolizado.'
)
ON CONFLICT (id) DO NOTHING;

-- ==============================================================================
-- 11. RESULTADOS DEL EXAMEN
-- ==============================================================================

INSERT INTO lab_test_items (
    lab_report_id,
    test_name,
    result_value,
    unit,
    reference_range,
    is_abnormal
)
VALUES
(
    'f1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b02',
    'Glucosa en Ayunas',
    '95',
    'mg/dL',
    '70 - 100 mg/dL',
    FALSE
),
(
    'f1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b02',
    'Colesterol Total',
    '215',
    'mg/dL',
    '< 200 mg/dL',
    TRUE
),
(
    'f1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b02',
    'Triglicéridos',
    '140',
    'mg/dL',
    '< 150 mg/dL',
    FALSE
)
ON CONFLICT DO NOTHING;

-- ==============================================================================
-- 12. REGISTRO INICIAL DE AUDITORÍA
-- ==============================================================================

INSERT INTO audit_logs (
    user_id,
    patient_id,
    action,
    details,
    ip_address,
    user_agent
)
VALUES (
    'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    'INITIALIZE_RECORD',
    '{"message": "Creación inicial de ficha clínica digital bajo Ley N° 21.668"}'::jsonb,
    '127.0.0.1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) MyMedRecord/1.0'
);

-- ==============================================================================
-- VISTA: médicos disponibles para compartir ficha
-- El frontend puede usar esta vista para mostrar:
-- institución -> médicos verificados disponibles.
-- ==============================================================================
CREATE OR REPLACE VIEW available_doctors AS
SELECT
    u.id AS doctor_id,
    u.rut,
    u.first_name,
    u.last_name,
    u.email,
    dp.professional_registry,
    dp.specialty,
    dp.professional_title,
    hi.id AS institution_id,
    hi.name AS institution_name,
    hi.institution_type,
    hi.city
FROM users u
JOIN doctor_profiles dp
    ON dp.user_id = u.id
JOIN health_institutions hi
    ON hi.id = dp.institution_id
WHERE u.role = 'MEDICO'
  AND u.is_active = TRUE
  AND dp.verification_status = 'VERIFICADO'
  AND dp.is_available_for_sharing = TRUE
  AND hi.is_active = TRUE;

-- Fin init.sql MyMedRecord
