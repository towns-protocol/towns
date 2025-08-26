CREATE TABLE external_media_streams (
    stream_id BIGINT PRIMARY KEY,                    -- Stream ID as primary key
    storage_type INTEGER NOT NULL DEFAULT 0,         -- 0 = inline, 1 = S3, 2 = GCS, etc.
);