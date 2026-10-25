CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS auth_sessions (
  token_hash text PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL, revoked_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS auth_sessions_user_idx ON auth_sessions(user_id);
CREATE TABLE IF NOT EXISTS security_rate_limits (
  key text PRIMARY KEY, hits integer NOT NULL, expires_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS qr_consultations (
  id uuid PRIMARY KEY, grant_id uuid NOT NULL REFERENCES access_grants(id),
  credential_hash text NOT NULL UNIQUE, status text NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING','APPROVED','REJECTED')),
  declared_identity jsonb NOT NULL, request_expires_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), decided_at timestamptz
);
CREATE INDEX IF NOT EXISTS qr_consultations_grant_idx ON qr_consultations(grant_id);
CREATE TABLE IF NOT EXISTS privacy_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id),
  version text NOT NULL, accepted_at timestamptz NOT NULL DEFAULT now(), UNIQUE(user_id,version)
);
CREATE TABLE IF NOT EXISTS document_deletions (
  document_id uuid PRIMARY KEY REFERENCES documents(id), patient_id uuid NOT NULL REFERENCES users(id),
  attempts integer NOT NULL DEFAULT 0, next_attempt_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE patient_profiles ADD COLUMN IF NOT EXISTS encrypted_payload jsonb;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS encrypted_payload jsonb;
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS encrypted_payload jsonb;
ALTER TABLE prescription_items ADD COLUMN IF NOT EXISTS encrypted_payload jsonb;
ALTER TABLE lab_reports ADD COLUMN IF NOT EXISTS encrypted_payload jsonb;
ALTER TABLE lab_test_items ADD COLUMN IF NOT EXISTS encrypted_payload jsonb;
ALTER TABLE IF EXISTS vital_signs ADD COLUMN IF NOT EXISTS encrypted_payload jsonb;
ALTER TABLE access_grants ADD COLUMN IF NOT EXISTS token_hash text;
ALTER TABLE access_grants ADD COLUMN IF NOT EXISTS token_cipher jsonb;
CREATE UNIQUE INDEX IF NOT EXISTS access_grants_token_hash_idx ON access_grants(token_hash);
