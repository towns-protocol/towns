-- Rename display_name column to username to better reflect its purpose
ALTER TABLE app_registry RENAME COLUMN display_name TO username;

-- The existing unique index on display_name needs to be renamed
ALTER INDEX app_registry_display_name_idx RENAME TO app_registry_username_idx;