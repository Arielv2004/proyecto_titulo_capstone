-- Integración del modelo operativo. No elimina tablas ni datos de la base existente.
CREATE TABLE IF NOT EXISTS auth_sessions (
    token_hash CHAR(64) PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (expires_at > created_at)
);
CREATE INDEX IF NOT EXISTS auth_sessions_user_idx ON auth_sessions(user_id);
CREATE INDEX IF NOT EXISTS auth_sessions_expiry_idx ON auth_sessions(expires_at);

CREATE TABLE IF NOT EXISTS privacy_acceptances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    version VARCHAR(20) NOT NULL CHECK (length(btrim(version)) > 0),
    accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, version)
);
-- Se conserva la fecha registrada, sin inventar aceptación para cuentas sin ella.
INSERT INTO privacy_acceptances(user_id, version, accepted_at)
SELECT id, terms_version, terms_accepted_at FROM users
WHERE terms_accepted_at IS NOT NULL AND NULLIF(btrim(terms_version), '') IS NOT NULL
ON CONFLICT (user_id, version) DO NOTHING;

CREATE TABLE IF NOT EXISTS security_rate_limits (
    key CHAR(64) PRIMARY KEY,
    hits INTEGER NOT NULL CHECK (hits > 0),
    expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS security_rate_limits_expiry_idx ON security_rate_limits(expires_at);

-- El trabajo debe sobrevivir a la eliminación de la cuenta o del documento.
-- Solo la referencia de almacenamiento cifrada se retiene hasta completar la tarea.
CREATE TABLE IF NOT EXISTS document_deletions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID UNIQUE REFERENCES documents(id) ON DELETE SET NULL,
    patient_id UUID REFERENCES users(id) ON DELETE SET NULL,
    storage_path_cipher TEXT,
    attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
    next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    last_error_code VARCHAR(40),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (completed_at IS NOT NULL OR storage_path_cipher IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS document_deletions_pending_idx
ON document_deletions(next_attempt_at) WHERE completed_at IS NULL;
