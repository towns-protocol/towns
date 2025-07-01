-- Drop the index first
DROP INDEX IF EXISTS app_registry_metadata_idx;

-- Drop the app_metadata column
ALTER TABLE app_registry DROP COLUMN IF EXISTS app_metadata; 