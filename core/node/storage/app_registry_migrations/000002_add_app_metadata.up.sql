-- Add app_metadata column to store all metadata as JSONB
ALTER TABLE app_registry ADD COLUMN app_metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Add display_name column for unique bot names
ALTER TABLE app_registry ADD COLUMN display_name VARCHAR;

-- Create unique index on display_name
CREATE UNIQUE INDEX app_registry_display_name_idx ON app_registry (display_name) WHERE display_name IS NOT NULL;