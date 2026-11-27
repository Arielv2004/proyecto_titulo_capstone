--
-- PostgreSQL database dump
--

\restrict Rcuga33GXEbk9gVpbGf8iBS66a8hdZfweHQV8Mmnt9fVCdDcUOn7OImZbU57TRR

-- Dumped from database version 15.19
-- Dumped by pg_dump version 15.19

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: access_grants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.access_grants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    patient_id uuid NOT NULL,
    doctor_id uuid,
    doctor_rut character varying(12),
    doctor_name character varying(200),
    doctor_institution character varying(200),
    token character varying(100) NOT NULL,
    grant_type character varying(20) NOT NULL,
    starts_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    is_revoked boolean DEFAULT false NOT NULL,
    access_count integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT access_grants_check CHECK ((expires_at > starts_at)),
    CONSTRAINT access_grants_check1 CHECK (((((grant_type)::text = 'DIRECTO'::text) AND (doctor_id IS NOT NULL)) OR ((grant_type)::text = 'QR_TEMPORAL'::text))),
    CONSTRAINT access_grants_check2 CHECK (((doctor_id IS NULL) OR (doctor_id <> patient_id))),
    CONSTRAINT access_grants_grant_type_check CHECK (((grant_type)::text = ANY ((ARRAY['QR_TEMPORAL'::character varying, 'DIRECTO'::character varying])::text[])))
);


--
-- Name: appointments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.appointments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    doctor_id uuid NOT NULL,
    patient_id uuid NOT NULL,
    scheduled_at timestamp with time zone NOT NULL,
    access_expires_at timestamp with time zone NOT NULL,
    status character varying(20) DEFAULT 'PROGRAMADA'::character varying NOT NULL,
    reason character varying(255),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    encrypted_payload jsonb,
    CONSTRAINT appointments_check CHECK ((doctor_id <> patient_id)),
    CONSTRAINT appointments_check1 CHECK ((access_expires_at > scheduled_at)),
    CONSTRAINT appointments_status_check CHECK (((status)::text = ANY ((ARRAY['PROGRAMADA'::character varying, 'EN_ATENCION'::character varying, 'COMPLETADA'::character varying, 'CANCELADA'::character varying])::text[])))
);


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    patient_id uuid,
    action character varying(100) NOT NULL,
    details jsonb,
    ip_address character varying(45) NOT NULL,
    user_agent text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: auth_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auth_sessions (
    token_hash character(64) NOT NULL,
    user_id uuid NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    revoked_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT auth_sessions_check CHECK ((expires_at > created_at))
);


--
-- Name: doctor_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.doctor_profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    institution_id uuid,
    institution_name_other character varying(200),
    professional_registry character varying(100),
    specialty character varying(150),
    professional_title character varying(150) DEFAULT 'Médico/a Cirujano/a'::character varying,
    verification_status character varying(20) DEFAULT 'PENDIENTE'::character varying NOT NULL,
    verified_at timestamp with time zone,
    is_available_for_sharing boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    region_code character varying(2),
    city character varying(100),
    address character varying(255),
    CONSTRAINT doctor_profiles_check CHECK (((((verification_status)::text = 'VERIFICADO'::text) AND (verified_at IS NOT NULL)) OR ((verification_status)::text <> 'VERIFICADO'::text))),
    CONSTRAINT doctor_profiles_verification_status_check CHECK (((verification_status)::text = ANY ((ARRAY['PENDIENTE'::character varying, 'VERIFICADO'::character varying, 'RECHAZADO'::character varying, 'SUSPENDIDO'::character varying])::text[])))
);


--
-- Name: COLUMN doctor_profiles.region_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.doctor_profiles.region_code IS 'Código de región de Chile de dos dígitos: 01 a 16.';


--
-- Name: COLUMN doctor_profiles.city; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.doctor_profiles.city IS 'Ciudad o comuna laboral informada por el médico.';


--
-- Name: COLUMN doctor_profiles.address; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.doctor_profiles.address IS 'Dirección laboral opcional informada por el médico.';


--
-- Name: health_institutions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.health_institutions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(200) NOT NULL,
    institution_type character varying(30) NOT NULL,
    rut character varying(12),
    address character varying(255),
    commune character varying(100),
    city character varying(100),
    phone character varying(20),
    email character varying(150),
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT health_institutions_institution_type_check CHECK (((institution_type)::text = ANY ((ARRAY['HOSPITAL'::character varying, 'CLINICA'::character varying, 'CESFAM'::character varying, 'CENTRO_MEDICO'::character varying, 'CONSULTA'::character varying, 'OTRO'::character varying])::text[])))
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    rut character varying(12) NOT NULL,
    first_name character varying(100) NOT NULL,
    last_name character varying(100) NOT NULL,
    email character varying(150) NOT NULL,
    password_hash character varying(255) NOT NULL,
    role character varying(20) DEFAULT 'PACIENTE'::character varying NOT NULL,
    phone character varying(20),
    is_active boolean DEFAULT true,
    terms_accepted_at timestamp with time zone,
    terms_version character varying(20),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT users_role_check CHECK (((role)::text = ANY ((ARRAY['PACIENTE'::character varying, 'MEDICO'::character varying])::text[])))
);


--
-- Name: available_doctors; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.available_doctors AS
 SELECT u.id AS doctor_id,
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
   FROM ((public.users u
     JOIN public.doctor_profiles dp ON ((dp.user_id = u.id)))
     JOIN public.health_institutions hi ON ((hi.id = dp.institution_id)))
  WHERE (((u.role)::text = 'MEDICO'::text) AND (u.is_active = true) AND ((dp.verification_status)::text = 'VERIFICADO'::text) AND (dp.is_available_for_sharing = true) AND (hi.is_active = true));


--
-- Name: document_deletions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.document_deletions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    document_id uuid,
    patient_id uuid,
    storage_path_cipher text,
    attempts integer DEFAULT 0 NOT NULL,
    next_attempt_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    last_error_code character varying(40),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT document_deletions_attempts_check CHECK ((attempts >= 0)),
    CONSTRAINT document_deletions_check CHECK (((completed_at IS NOT NULL) OR (storage_path_cipher IS NOT NULL)))
);


--
-- Name: documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    patient_id uuid NOT NULL,
    uploaded_by uuid NOT NULL,
    document_type character varying(30) NOT NULL,
    title character varying(200) NOT NULL,
    file_name character varying(255) NOT NULL,
    file_path character varying(500) NOT NULL,
    mime_type character varying(100) NOT NULL,
    file_size_bytes integer,
    document_date date,
    issuing_doctor character varying(150),
    issuing_institution character varying(150),
    ocr_raw_text text,
    ocr_confidence numeric(5,2),
    encrypted_notes text,
    status character varying(20) DEFAULT 'PROCESANDO'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    encrypted_payload jsonb,
    CONSTRAINT documents_document_type_check CHECK (((document_type)::text = ANY ((ARRAY['RECETA'::character varying, 'EXAMEN_LAB'::character varying, 'INFORME'::character varying, 'IMAGEN'::character varying, 'OTRO'::character varying])::text[]))),
    CONSTRAINT documents_status_check CHECK (((status)::text = ANY ((ARRAY['PROCESANDO'::character varying, 'TEMP'::character varying, 'PENDIENTE_REVISION'::character varying, 'CONFIRMADO'::character varying, 'ERROR'::character varying, 'ELIMINADO'::character varying])::text[])))
);


--
-- Name: lab_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lab_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    document_id uuid NOT NULL,
    patient_id uuid NOT NULL,
    laboratory_name character varying(150),
    sample_date date,
    observations text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    encrypted_payload jsonb
);


--
-- Name: lab_test_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lab_test_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lab_report_id uuid NOT NULL,
    test_name character varying(150) NOT NULL,
    result_value character varying(50) NOT NULL,
    unit character varying(30),
    reference_range character varying(100),
    is_abnormal boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    encrypted_payload jsonb
);


--
-- Name: password_reset_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.password_reset_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    token_hash character(64) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT password_reset_tokens_check CHECK ((expires_at > created_at))
);


--
-- Name: patient_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.patient_profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    birth_date date,
    gender character varying(20),
    blood_type character varying(5),
    health_insurance character varying(50),
    is_organ_donor boolean DEFAULT true,
    allergies text[] DEFAULT '{}'::text[],
    chronic_conditions text[] DEFAULT '{}'::text[],
    emergency_contact_name character varying(150),
    emergency_contact_phone character varying(20),
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    biological_sex character varying(10),
    gender_other character varying(80),
    encrypted_payload jsonb,
    CONSTRAINT patient_profiles_biological_sex_check CHECK (((biological_sex IS NULL) OR ((biological_sex)::text = ANY ((ARRAY['FEMENINO'::character varying, 'MASCULINO'::character varying])::text[])))),
    CONSTRAINT patient_profiles_gender_other_check CHECK (((gender_other IS NULL) OR ((length(btrim((gender_other)::text)) >= 1) AND (length(btrim((gender_other)::text)) <= 80))))
);


--
-- Name: prescription_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.prescription_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    prescription_id uuid NOT NULL,
    medication_name character varying(150) NOT NULL,
    dosage character varying(50),
    frequency character varying(100),
    duration character varying(100),
    instructions text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    encrypted_payload jsonb
);


--
-- Name: prescriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.prescriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    document_id uuid NOT NULL,
    patient_id uuid NOT NULL,
    doctor_name character varying(150),
    diagnosis_code character varying(10),
    diagnosis_text character varying(255),
    issue_date date,
    valid_until date,
    is_chronic boolean DEFAULT false,
    status character varying(20) DEFAULT 'ACTIVA'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    encrypted_payload jsonb,
    CONSTRAINT prescriptions_status_check CHECK (((status)::text = ANY ((ARRAY['ACTIVA'::character varying, 'PAUSADO'::character varying, 'FINALIZADA'::character varying, 'VENCIDA'::character varying, 'ELIMINADO'::character varying])::text[])))
);


--
-- Name: privacy_acceptances; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.privacy_acceptances (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    version character varying(20) NOT NULL,
    accepted_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT privacy_acceptances_version_check CHECK ((length(btrim((version)::text)) > 0))
);


--
-- Name: qr_visitor_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.qr_visitor_requests (
    grant_id uuid NOT NULL,
    credential_hash character(64) NOT NULL,
    status character varying(10) DEFAULT 'PENDING'::character varying NOT NULL,
    request_expires_at timestamp with time zone NOT NULL,
    CONSTRAINT qr_visitor_requests_status_check CHECK (((status)::text = ANY ((ARRAY['PENDING'::character varying, 'APPROVED'::character varying, 'REJECTED'::character varying, 'ENDED'::character varying])::text[])))
);


--
-- Name: security_rate_limits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.security_rate_limits (
    key character(64) NOT NULL,
    hits integer NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    CONSTRAINT security_rate_limits_hits_check CHECK ((hits > 0))
);


--
-- Name: access_grants access_grants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.access_grants
    ADD CONSTRAINT access_grants_pkey PRIMARY KEY (id);


--
-- Name: access_grants access_grants_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.access_grants
    ADD CONSTRAINT access_grants_token_key UNIQUE (token);


--
-- Name: appointments appointments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: auth_sessions auth_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_sessions
    ADD CONSTRAINT auth_sessions_pkey PRIMARY KEY (token_hash);


--
-- Name: doctor_profiles doctor_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.doctor_profiles
    ADD CONSTRAINT doctor_profiles_pkey PRIMARY KEY (id);


--
-- Name: doctor_profiles doctor_profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.doctor_profiles
    ADD CONSTRAINT doctor_profiles_user_id_key UNIQUE (user_id);


--
-- Name: document_deletions document_deletions_document_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_deletions
    ADD CONSTRAINT document_deletions_document_id_key UNIQUE (document_id);


--
-- Name: document_deletions document_deletions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_deletions
    ADD CONSTRAINT document_deletions_pkey PRIMARY KEY (id);


--
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


--
-- Name: health_institutions health_institutions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.health_institutions
    ADD CONSTRAINT health_institutions_pkey PRIMARY KEY (id);


--
-- Name: lab_reports lab_reports_document_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_reports
    ADD CONSTRAINT lab_reports_document_id_key UNIQUE (document_id);


--
-- Name: lab_reports lab_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_reports
    ADD CONSTRAINT lab_reports_pkey PRIMARY KEY (id);


--
-- Name: lab_test_items lab_test_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_test_items
    ADD CONSTRAINT lab_test_items_pkey PRIMARY KEY (id);


--
-- Name: password_reset_tokens password_reset_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (id);


--
-- Name: password_reset_tokens password_reset_tokens_token_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_hash_key UNIQUE (token_hash);


--
-- Name: password_reset_tokens password_reset_tokens_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_user_id_key UNIQUE (user_id);


--
-- Name: patient_profiles patient_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_profiles
    ADD CONSTRAINT patient_profiles_pkey PRIMARY KEY (id);


--
-- Name: patient_profiles patient_profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_profiles
    ADD CONSTRAINT patient_profiles_user_id_key UNIQUE (user_id);


--
-- Name: prescription_items prescription_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescription_items
    ADD CONSTRAINT prescription_items_pkey PRIMARY KEY (id);


--
-- Name: prescriptions prescriptions_document_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescriptions
    ADD CONSTRAINT prescriptions_document_id_key UNIQUE (document_id);


--
-- Name: prescriptions prescriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescriptions
    ADD CONSTRAINT prescriptions_pkey PRIMARY KEY (id);


--
-- Name: privacy_acceptances privacy_acceptances_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.privacy_acceptances
    ADD CONSTRAINT privacy_acceptances_pkey PRIMARY KEY (id);


--
-- Name: privacy_acceptances privacy_acceptances_user_id_version_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.privacy_acceptances
    ADD CONSTRAINT privacy_acceptances_user_id_version_key UNIQUE (user_id, version);


--
-- Name: qr_visitor_requests qr_visitor_requests_credential_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qr_visitor_requests
    ADD CONSTRAINT qr_visitor_requests_credential_hash_key UNIQUE (credential_hash);


--
-- Name: qr_visitor_requests qr_visitor_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qr_visitor_requests
    ADD CONSTRAINT qr_visitor_requests_pkey PRIMARY KEY (grant_id);


--
-- Name: security_rate_limits security_rate_limits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.security_rate_limits
    ADD CONSTRAINT security_rate_limits_pkey PRIMARY KEY (key);


--
-- Name: health_institutions uq_health_institution_name_city; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.health_institutions
    ADD CONSTRAINT uq_health_institution_name_city UNIQUE (name, city);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_rut_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_rut_key UNIQUE (rut);


--
-- Name: auth_sessions_expiry_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX auth_sessions_expiry_idx ON public.auth_sessions USING btree (expires_at);


--
-- Name: auth_sessions_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX auth_sessions_user_idx ON public.auth_sessions USING btree (user_id);


--
-- Name: document_deletions_pending_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX document_deletions_pending_idx ON public.document_deletions USING btree (next_attempt_at) WHERE (completed_at IS NULL);


--
-- Name: idx_access_grants_doctor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_access_grants_doctor ON public.access_grants USING btree (doctor_id, starts_at, expires_at);


--
-- Name: idx_access_grants_patient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_access_grants_patient ON public.access_grants USING btree (patient_id, expires_at);


--
-- Name: idx_access_grants_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_access_grants_token ON public.access_grants USING btree (token);


--
-- Name: idx_appointments_doctor_schedule; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_appointments_doctor_schedule ON public.appointments USING btree (doctor_id, scheduled_at);


--
-- Name: idx_appointments_patient_schedule; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_appointments_patient_schedule ON public.appointments USING btree (patient_id, scheduled_at);


--
-- Name: idx_appointments_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_appointments_status ON public.appointments USING btree (status);


--
-- Name: idx_audit_logs_patient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_patient ON public.audit_logs USING btree (patient_id, created_at DESC);


--
-- Name: idx_doctor_profiles_institution; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_doctor_profiles_institution ON public.doctor_profiles USING btree (institution_id);


--
-- Name: idx_doctor_profiles_specialty; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_doctor_profiles_specialty ON public.doctor_profiles USING btree (specialty);


--
-- Name: idx_doctor_profiles_verification; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_doctor_profiles_verification ON public.doctor_profiles USING btree (verification_status);


--
-- Name: idx_documents_patient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_documents_patient ON public.documents USING btree (patient_id, created_at DESC);


--
-- Name: idx_documents_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_documents_type ON public.documents USING btree (patient_id, document_type);


--
-- Name: idx_health_institutions_city; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_health_institutions_city ON public.health_institutions USING btree (city);


--
-- Name: idx_health_institutions_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_health_institutions_name ON public.health_institutions USING btree (name);


--
-- Name: idx_lab_reports_patient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lab_reports_patient ON public.lab_reports USING btree (patient_id);


--
-- Name: idx_lab_test_items_report; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lab_test_items_report ON public.lab_test_items USING btree (lab_report_id);


--
-- Name: idx_password_reset_tokens_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_password_reset_tokens_expires_at ON public.password_reset_tokens USING btree (expires_at);


--
-- Name: idx_patient_profiles_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_patient_profiles_user ON public.patient_profiles USING btree (user_id);


--
-- Name: idx_prescription_items_rx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prescription_items_rx ON public.prescription_items USING btree (prescription_id);


--
-- Name: idx_prescriptions_patient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prescriptions_patient ON public.prescriptions USING btree (patient_id, status);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: idx_users_rut; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_rut ON public.users USING btree (rut);


--
-- Name: security_rate_limits_expiry_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX security_rate_limits_expiry_idx ON public.security_rate_limits USING btree (expires_at);


--
-- Name: access_grants access_grants_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.access_grants
    ADD CONSTRAINT access_grants_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: access_grants access_grants_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.access_grants
    ADD CONSTRAINT access_grants_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: appointments appointments_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: appointments appointments_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: audit_logs audit_logs_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: audit_logs audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: auth_sessions auth_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_sessions
    ADD CONSTRAINT auth_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: doctor_profiles doctor_profiles_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.doctor_profiles
    ADD CONSTRAINT doctor_profiles_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.health_institutions(id) ON DELETE SET NULL;


--
-- Name: doctor_profiles doctor_profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.doctor_profiles
    ADD CONSTRAINT doctor_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: document_deletions document_deletions_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_deletions
    ADD CONSTRAINT document_deletions_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE SET NULL;


--
-- Name: document_deletions document_deletions_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_deletions
    ADD CONSTRAINT document_deletions_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: documents documents_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: documents documents_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(id);


--
-- Name: lab_reports lab_reports_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_reports
    ADD CONSTRAINT lab_reports_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE CASCADE;


--
-- Name: lab_reports lab_reports_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_reports
    ADD CONSTRAINT lab_reports_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: lab_test_items lab_test_items_lab_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_test_items
    ADD CONSTRAINT lab_test_items_lab_report_id_fkey FOREIGN KEY (lab_report_id) REFERENCES public.lab_reports(id) ON DELETE CASCADE;


--
-- Name: password_reset_tokens password_reset_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: patient_profiles patient_profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_profiles
    ADD CONSTRAINT patient_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: prescription_items prescription_items_prescription_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescription_items
    ADD CONSTRAINT prescription_items_prescription_id_fkey FOREIGN KEY (prescription_id) REFERENCES public.prescriptions(id) ON DELETE CASCADE;


--
-- Name: prescriptions prescriptions_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescriptions
    ADD CONSTRAINT prescriptions_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE CASCADE;


--
-- Name: prescriptions prescriptions_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescriptions
    ADD CONSTRAINT prescriptions_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: privacy_acceptances privacy_acceptances_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.privacy_acceptances
    ADD CONSTRAINT privacy_acceptances_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: qr_visitor_requests qr_visitor_requests_grant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qr_visitor_requests
    ADD CONSTRAINT qr_visitor_requests_grant_id_fkey FOREIGN KEY (grant_id) REFERENCES public.access_grants(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict Rcuga33GXEbk9gVpbGf8iBS66a8hdZfweHQV8Mmnt9fVCdDcUOn7OImZbU57TRR
