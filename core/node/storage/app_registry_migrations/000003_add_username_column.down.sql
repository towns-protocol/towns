-- Rename username back to display_name
ALTER TABLE app_registry RENAME COLUMN username TO display_name;

-- Rename the index back
ALTER INDEX app_registry_username_idx RENAME TO app_registry_display_name_idx;