CREATE TABLE IF NOT EXISTS app_registry (
    app_id                  CHAR(40) PRIMARY KEY NOT NULL,
    app_owner_id            CHAR(40)             NOT NULL,
    encrypted_shared_secret CHAR(64)             NOT NULL,
    forward_setting         SMALLINT             NOT NULL DEFAULT 0,
    webhook                 VARCHAR,
    device_key              VARCHAR,
    fallback_key            VARCHAR
);

ALTER TABLE app_registry ADD CONSTRAINT unique_device_key UNIQUE (device_key);
CREATE INDEX app_registry_owner_idx on app_registry USING hash (app_owner_id);
CREATE INDEX app_registry_device_id_idx on app_registry USING hash (device_key);

CREATE OR REPLACE FUNCTION array_has_no_duplicates(anyarray) RETURNS boolean AS $$
  SELECT cardinality($1) = cardinality(ARRAY(SELECT DISTINCT unnest($1)));
$$ LANGUAGE sql IMMUTABLE;

CREATE TABLE IF NOT EXISTS app_session_keys (
    device_key  VARCHAR    NOT NULL,
    stream_id   CHAR(64)   NOT NULL,
    session_ids VARCHAR[]  NOT NULL,
    message_envelope BYTEA NOT NULL,
    CHECK (array_length(session_ids, 1) > 0), -- session ids array contains at least 1 element
    CHECK (array_has_no_duplicates(session_ids)), -- all session ids are unique within an array
    CONSTRAINT fk_device_key FOREIGN KEY (device_key) REFERENCES app_registry(device_key)
);

CREATE EXTENSION IF NOT EXISTS btree_gin;

-- Combined index on device_key and individual elements of the session_ids column so that we can search the db
-- by (device_key, session_id) efficiently
CREATE INDEX idx_app_session_keys_device_key_session_id ON app_session_keys USING GIN (device_key, session_ids);

CREATE TABLE IF NOT EXISTS enqueued_messages (
    device_key       VARCHAR NOT NULL,
    session_id       VARCHAR NOT NULL,
    message_envelope BYTEA   NOT NULL,
    CONSTRAINT fk_device_key FOREIGN KEY (device_key) REFERENCES app_registry(device_key)
);

CREATE INDEX enqueued_messages_device_session_idx on enqueued_messages (device_key, session_id);