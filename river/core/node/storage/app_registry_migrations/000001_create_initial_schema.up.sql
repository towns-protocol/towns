CREATE TABLE IF NOT EXISTS app_registry (
    app_id CHAR(40) NOT NULL PRIMARY KEY,
    app_owner_id CHAR(40) NOT NULL,
    encrypted_shared_secret CHAR(64) NOT NULL,
    webhook VARCHAR
);

CREATE INDEX app_registry_owner_idx on app_registry USING hash (app_owner_id);