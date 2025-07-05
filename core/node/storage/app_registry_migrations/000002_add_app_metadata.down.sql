-- Drop the index first
DROP INDEX IF EXISTS app_registry_display_name_idx;

-- Drop the columns
ALTER TABLE app_registry DROP COLUMN IF EXISTS display_name;
ALTER TABLE app_registry DROP COLUMN IF EXISTS app_metadata; 