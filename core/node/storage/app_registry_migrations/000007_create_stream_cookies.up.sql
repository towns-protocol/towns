-- Create table for storing stream sync cookies to enable App Registry
-- to resume from last processed position after restarts
CREATE TABLE IF NOT EXISTS stream_sync_cookies (
    stream_id            CHAR(64) PRIMARY KEY NOT NULL,
    minipool_gen         BIGINT NOT NULL,
    prev_miniblock_hash  BYTEA NOT NULL,
    updated_at           TIMESTAMP DEFAULT NOW()
);

-- Index on updated_at for potential cleanup queries
CREATE INDEX idx_stream_sync_cookies_updated_at ON stream_sync_cookies(updated_at);
