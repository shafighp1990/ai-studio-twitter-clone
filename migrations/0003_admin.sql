ALTER TABLE users ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0 CHECK(is_admin IN (0,1));
ALTER TABLE users ADD COLUMN disabled INTEGER NOT NULL DEFAULT 0 CHECK(disabled IN (0,1));
ALTER TABLE users ADD COLUMN must_change_password INTEGER NOT NULL DEFAULT 0 CHECK(must_change_password IN (0,1));
ALTER TABLE users ADD COLUMN auth_version INTEGER NOT NULL DEFAULT 0;
ALTER TABLE sessions ADD COLUMN auth_version INTEGER NOT NULL DEFAULT 0;
CREATE TABLE admin_audit(id TEXT PRIMARY KEY,actor_id TEXT NOT NULL REFERENCES users(id),action TEXT NOT NULL,target_id TEXT NOT NULL,details TEXT NOT NULL DEFAULT '{}',created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')));
CREATE INDEX admin_audit_created ON admin_audit(created_at DESC);
CREATE TABLE removed_media(key TEXT PRIMARY KEY,removed_by TEXT NOT NULL REFERENCES users(id),created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')));
