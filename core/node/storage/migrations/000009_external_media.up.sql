-- Table for per-stream data
CREATE TABLE external_media_streams (
    stream_id CHAR(64) PRIMARY KEY,                  -- Stream ID as primary key (matches other tables)
    upload_id TEXT NOT NULL DEFAULT '',              -- upload ID for multipart uploads
    parts INT NOT NULL DEFAULT 0,                    -- number of total parts seen in the multipart upload
);

-- Table for per-chunk data
CREATE TABLE external_media_chunks (
    stream_id CHAR(64) NOT NULL,                     -- Stream ID (foreign key)
    miniblock INT NOT NULL,                          -- Miniblock number
    part_number INT NOT NULL,                        -- Part number in multipart upload
    etag TEXT NOT NULL,                              -- ETag from S3 upload
    start_bytes BIGINT NOT NULL,                     -- Start byte position for this chunk
    end_bytes BIGINT NOT NULL,                       -- End byte position for this chunk
    PRIMARY KEY (stream_id, part_number),            -- Primary key
    UNIQUE(miniblock),
);

ALTER TABLE es ADD COLUMN IF NOT EXISTS location TEXT NOT NULL DEFAULT '';