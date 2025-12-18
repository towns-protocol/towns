ALTER TABLE app_session_keys
DROP CONSTRAINT IF EXISTS unique_device_stream_session_ids;

DROP TRIGGER IF EXISTS trigger_sort_session_ids ON app_session_keys;

DROP FUNCTION IF EXISTS sort_session_ids_trigger();

DROP FUNCTION IF EXISTS sort_varchar_array(VARCHAR[]);
