-- Migración: ubicación laboral del médico.
-- No elimina tablas ni registros.
-- No modifica la verificación ni la disponibilidad.

BEGIN;

ALTER TABLE public.doctor_profiles
    ADD COLUMN IF NOT EXISTS region_code VARCHAR(2),
    ADD COLUMN IF NOT EXISTS city VARCHAR(100),
    ADD COLUMN IF NOT EXISTS address VARCHAR(255);

COMMENT ON COLUMN public.doctor_profiles.region_code IS
    'Código de región de Chile de dos dígitos: 01 a 16.';

COMMENT ON COLUMN public.doctor_profiles.city IS
    'Ciudad o comuna laboral informada por el médico.';

COMMENT ON COLUMN public.doctor_profiles.address IS
    'Dirección laboral opcional informada por el médico.';

COMMIT;