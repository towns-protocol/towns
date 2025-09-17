-- Add active field for app activation/deactivation
ALTER TABLE app_registry ADD COLUMN active BOOLEAN NOT NULL DEFAULT true;

-- Create index for efficient filtering of active/inactive apps
CREATE INDEX app_registry_active_idx ON app_registry(active);