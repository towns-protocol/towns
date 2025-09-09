-- Restore app_metadata JSONB column
ALTER TABLE app_registry ADD COLUMN app_metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Remove individual metadata columns
ALTER TABLE app_registry 
DROP COLUMN description,
DROP COLUMN image_url,
DROP COLUMN external_url,
DROP COLUMN avatar_url,
DROP COLUMN slash_commands,
DROP COLUMN display_name;

-- No display_name index to remove (duplicates were allowed)