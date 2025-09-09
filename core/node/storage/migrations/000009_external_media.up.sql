-- Table for per-stream data
CREATE TABLE external_media_uploads (
    stream_id CHAR(64) PRIMARY KEY,                  -- Stream ID as primary key (matches other tables)
    upload_id TEXT NOT NULL DEFAULT '',              -- upload ID for multipart uploads
    etags JSONB NOT NULL DEFAULT '[]',               -- etags for each part in the multipart upload
    PRIMARY KEY (stream_id)
);

-- Table for per-chunk data
CREATE TABLE external_media_markers (
    stream_id CHAR(64) NOT NULL,                     -- Stream ID (foreign key)
    miniblock INT NOT NULL,                          -- Miniblock number
    start_bytes BIGINT NOT NULL,                     -- Start byte position for this chunk
    end_bytes BIGINT NOT NULL,                       -- End byte position for this chunk
    PRIMARY KEY (stream_id, miniblock),
    FOREIGN KEY (stream_id) REFERENCES es(stream_id) ON DELETE CASCADE
);

ALTER TABLE es ADD COLUMN IF NOT EXISTS location TEXT NOT NULL DEFAULT '';