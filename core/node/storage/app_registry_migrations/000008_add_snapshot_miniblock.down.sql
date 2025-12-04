-- Remove snapshot_miniblock column
ALTER TABLE stream_sync_cookies DROP COLUMN IF EXISTS snapshot_miniblock;
