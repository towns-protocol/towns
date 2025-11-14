-- Remove index on (device_key, stream_id)
DROP INDEX IF EXISTS idx_app_session_keys_device_stream;

