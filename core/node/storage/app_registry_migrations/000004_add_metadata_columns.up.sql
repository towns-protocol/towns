-- Add individual columns for each metadata field
ALTER TABLE app_registry 
ADD COLUMN description TEXT,
ADD COLUMN image_url TEXT,
ADD COLUMN external_url TEXT,
ADD COLUMN avatar_url TEXT,
ADD COLUMN slash_commands JSONB DEFAULT '[]'::jsonb,
ADD COLUMN display_name VARCHAR;

-- No uniqueness constraint on display_name as duplicates are allowed
-- Only username needs to be unique (already handled by existing constraint)

-- Remove old app_metadata column
ALTER TABLE app_registry DROP COLUMN app_metadata;