DROP INDEX IF EXISTS enqueued_messages_device_key_created_at_idx;
DROP INDEX IF EXISTS enqueued_messages_created_at_idx;
ALTER TABLE enqueued_messages DROP COLUMN IF EXISTS created_at;
