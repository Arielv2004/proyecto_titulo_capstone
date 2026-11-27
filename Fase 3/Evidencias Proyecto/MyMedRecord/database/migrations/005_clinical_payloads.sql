-- No añade tablas: prepara almacenamiento cifrado de campos clínicos.
ALTER TABLE patient_profiles ADD COLUMN IF NOT EXISTS encrypted_payload JSONB;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS encrypted_payload JSONB;
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS encrypted_payload JSONB;
ALTER TABLE prescription_items ADD COLUMN IF NOT EXISTS encrypted_payload JSONB;
ALTER TABLE lab_reports ADD COLUMN IF NOT EXISTS encrypted_payload JSONB;
ALTER TABLE lab_test_items ADD COLUMN IF NOT EXISTS encrypted_payload JSONB;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS encrypted_payload JSONB;
