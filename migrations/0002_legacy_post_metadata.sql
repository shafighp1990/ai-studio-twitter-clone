-- Preserve the legacy metadata column during the complete data import.
ALTER TABLE posts ADD COLUMN external_post_id TEXT;
CREATE INDEX rate_limits_expiry ON rate_limits(expires_at);
CREATE INDEX sessions_expiry ON sessions(expires_at);
