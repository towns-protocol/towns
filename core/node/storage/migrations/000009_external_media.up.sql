-- Table for per-stream data
CREATE TABLE external_media_streams (
    stream_id CHAR(64) PRIMARY KEY,                  -- Stream ID as primary key (matches other tables)
    upload_id TEXT NOT NULL DEFAULT '',              -- upload ID for multipart uploads
    bytes_uploaded BIGINT NOT NULL DEFAULT 0,        -- size of the stream so far
);

-- Table for per-chunk data
CREATE TABLE external_media_chunks (
    stream_id CHAR(64) NOT NULL,                     -- Stream ID (foreign key)
    miniblock INT NOT NULL,                          -- Miniblock number
    part_number INT NOT NULL,                        -- Part number in multipart upload
    etag TEXT NOT NULL,                              -- ETag from S3 upload
    range_header TEXT NOT NULL,                      -- Range header for this chunk
    UNIQUE(stream_id, part_number)
);

ALTER TABLE es ADD COLUMN IF NOT EXISTS location TEXT NOT NULL DEFAULT '';