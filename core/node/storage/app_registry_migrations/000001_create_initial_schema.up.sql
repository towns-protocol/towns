CREATE TABLE IF NOT EXISTS app_registry (
    app_id                  CHAR(40) PRIMARY KEY NOT NULL,
    app_owner_id            CHAR(40)             NOT NULL,
    encrypted_shared_secret CHAR(64)             NOT NULL,
    webhook                 VARCHAR,
    device_key              VARCHAR,
    fallback_key            VARCHAR
);

ALTER TABLE app_registry ADD CONSTRAINT unique_device_key UNIQUE (device_key);
CREATE INDEX app_registry_owner_idx on app_registry USING hash (app_owner_id);
CREATE INDEX app_registry_device_id_idx on app_registry USING hash (device_key);

CREATE TABLE IF NOT EXISTS app_session_keys (
    device_key VARCHAR NOT NULL,
    session_id VARCHAR NOT NULL,
    ciphertext VARCHAR NOT NULL,
    PRIMARY KEY(device_key, session_id),
    CONSTRAINT fk_device_key FOREIGN KEY (device_key) REFERENCES app_registry(device_key)
);

CREATE TABLE IF NOT EXISTS enqueued_messages (
    device_key       VARCHAR NOT NULL,
    session_id       VARCHAR NOT NULL,
    message_envelope BYTEA   NOT NULL,
    CONSTRAINT fk_device_key FOREIGN KEY (device_key) REFERENCES app_registry(device_key)
);

CREATE INDEX enqueued_messages_device_session_idx on enqueued_messages (device_key, session_id);