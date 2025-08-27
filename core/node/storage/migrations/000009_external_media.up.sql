CREATE TABLE external_media_streams (
    stream_id BIGINT PRIMARY KEY,                    -- Stream ID as primary key
    upload_id TEXT NOT NULL DEFAULT '',              -- upload ID for multipart uploads
    part_number INT NOT NULL DEFAULT 0,              -- part number for multipart uploads
);