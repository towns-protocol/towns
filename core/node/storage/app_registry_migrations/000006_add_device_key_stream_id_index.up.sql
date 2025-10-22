-- Add index on (device_key, stream_id) for efficient GetSessionKeyForStream queries
CREATE INDEX idx_app_session_keys_device_stream ON app_session_keys (device_key, stream_id);

