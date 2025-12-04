-- Add snapshot_miniblock column for gap detection on service restart
ALTER TABLE stream_sync_cookies
ADD COLUMN IF NOT EXISTS snapshot_miniblock BIGINT NOT NULL DEFAULT 0;
