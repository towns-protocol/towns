CREATE TABLE IF NOT EXISTS app_registry (
    app_id                  CHAR(40) PRIMARY KEY NOT NULL,
    app_owner_id            CHAR(40)             NOT NULL,
    encrypted_shared_secret CHAR(64)             NOT NULL,
    webhook                 VARCHAR,
    device_key              VARCHAR,
    fallback_key            VARCHAR
);

CREATE INDEX app_registry_owner_idx on app_registry USING hash (app_owner_id);

CREATE TABLE IF NOT EXISTS app_session_keys (
    app_id     CHAR(40) NOT NULL,
    session_id VARCHAR  NOT NULL,
    ciphertext VARCHAR  NOT NULL,
    PRIMARY KEY(app_id, session_id)
);
