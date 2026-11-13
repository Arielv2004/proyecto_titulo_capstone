CREATE TABLE IF NOT EXISTS qr_visitor_requests (
    grant_id UUID PRIMARY KEY REFERENCES access_grants(id) ON DELETE CASCADE,
    credential_hash CHAR(64) NOT NULL UNIQUE,
    status VARCHAR(10) NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'ENDED')),
    request_expires_at TIMESTAMPTZ NOT NULL
);
