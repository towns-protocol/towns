ALTER TABLE app_registry ADD COLUMN app_metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Add an index on the app_metadata column for better query performance
CREATE INDEX app_registry_metadata_idx ON app_registry USING GIN (app_metadata); 