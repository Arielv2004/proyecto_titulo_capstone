-- ==============================================================================
-- MIGRACIÓN 001: Consentimiento explícito de datos sensibles (Ley 21.719)
-- Idempotente: puede ejecutarse varias veces sin efectos adversos.
-- ==============================================================================

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS terms_version VARCHAR(20);

