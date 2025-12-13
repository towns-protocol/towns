-- Add created_at to enqueued_messages for TTL-based cleanup
ALTER TABLE enqueued_messages ADD COLUMN created_at TIMESTAMP DEFAULT NOW();

-- Index for efficient cleanup queries (by time and by device)
CREATE INDEX enqueued_messages_created_at_idx ON enqueued_messages (created_at);
CREATE INDEX enqueued_messages_device_key_created_at_idx ON enqueued_messages (device_key, created_at);
