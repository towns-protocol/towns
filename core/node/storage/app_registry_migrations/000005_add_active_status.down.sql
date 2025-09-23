-- Remove active status field and index
DROP INDEX IF EXISTS app_registry_active_idx;
ALTER TABLE app_registry DROP COLUMN active;