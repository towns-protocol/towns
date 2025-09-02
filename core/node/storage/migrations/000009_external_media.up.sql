CREATE TABLE external_media_streams (
    stream_id CHAR(64) PRIMARY KEY,                  -- Stream ID as primary key (matches other tables)
    upload_id TEXT NOT NULL DEFAULT '',              -- upload ID for multipart uploads
    part_to_etag JSONB NOT NULL DEFAULT '{}',       -- map of part number to ETag
    bytes_uploaded BIGINT NOT NULL DEFAULT 0,        -- size of the stream so far
);

ALTER TABLE es ADD COLUMN IF NOT EXISTS location TEXT NOT NULL DEFAULT '';