ALTER TABLE app_registry ADD COLUMN display_name TEXT NOT NULL;
ALTER TABLE app_registry ADD COLUMN app_metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Add a unique index on the display_name column
CREATE UNIQUE INDEX app_registry_display_name_idx ON app_registry (display_name); 