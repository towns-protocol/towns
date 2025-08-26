CREATE TABLE external_media_streams (
    stream_id BIGINT PRIMARY KEY,                    -- Stream ID as primary key
    storage_url TEXT NOT NULL DEFAULT 'inline',     -- inline, s3, gcs, etc.
);