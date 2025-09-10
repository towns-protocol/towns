-- Add version field for optimistic locking
ALTER TABLE app_registry ADD COLUMN version INTEGER NOT NULL DEFAULT 1;