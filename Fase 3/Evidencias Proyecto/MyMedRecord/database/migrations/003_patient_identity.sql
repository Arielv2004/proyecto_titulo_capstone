-- Datos declarados del paciente. No convierte el género antiguo en sexo biológico.
BEGIN;
ALTER TABLE patient_profiles
    ADD COLUMN IF NOT EXISTS biological_sex VARCHAR(10),
    ADD COLUMN IF NOT EXISTS gender_other VARCHAR(80);
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'patient_profiles_biological_sex_check'
                   AND conrelid = 'patient_profiles'::regclass) THEN
        ALTER TABLE patient_profiles ADD CONSTRAINT patient_profiles_biological_sex_check
            CHECK (biological_sex IS NULL OR biological_sex IN ('FEMENINO', 'MASCULINO'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'patient_profiles_gender_other_check'
                   AND conrelid = 'patient_profiles'::regclass) THEN
        ALTER TABLE patient_profiles ADD CONSTRAINT patient_profiles_gender_other_check
            CHECK (gender_other IS NULL OR length(btrim(gender_other)) BETWEEN 1 AND 80);
    END IF;
END $$;
COMMIT;
