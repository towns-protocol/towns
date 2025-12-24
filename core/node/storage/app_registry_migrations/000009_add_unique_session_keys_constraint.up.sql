-- Step 1: Create helper function to sort a VARCHAR array
CREATE OR REPLACE FUNCTION sort_varchar_array(arr VARCHAR[]) RETURNS VARCHAR[] AS $$
BEGIN
    -- unnest expands array into rows, ORDER BY sorts them, ARRAY collects back
    -- Example: ['S3','S1','S2'] -> rows S3,S1,S2 -> sorted S1,S2,S3 -> ['S1','S2','S3']
    RETURN ARRAY(SELECT unnest(arr) ORDER BY 1);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Step 2: Create trigger function that uses the helper
CREATE OR REPLACE FUNCTION sort_session_ids_trigger() RETURNS TRIGGER AS $$
BEGIN
    NEW.session_ids := sort_varchar_array(NEW.session_ids);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Create trigger to auto-sort session_ids before insert
CREATE TRIGGER trigger_sort_session_ids
BEFORE INSERT ON app_session_keys
FOR EACH ROW EXECUTE FUNCTION sort_session_ids_trigger();

-- Step 4: Sort existing session_ids arrays (one-time migration)
UPDATE app_session_keys
SET session_ids = sort_varchar_array(session_ids);

-- Step 5: Delete duplicate rows (same device_key, stream_id, session_ids), keeping first by ctid
DELETE FROM app_session_keys a
USING app_session_keys b
WHERE a.device_key = b.device_key
  AND a.stream_id = b.stream_id
  AND a.session_ids = b.session_ids
  AND a.ctid > b.ctid;

-- Step 6: Create helper function to hash session_ids for indexing
-- (B-tree indexes have a 2704 byte limit, large session_ids arrays can exceed this)
CREATE OR REPLACE FUNCTION hash_session_ids(arr VARCHAR[]) RETURNS TEXT AS $$
BEGIN
    RETURN md5(array_to_string(arr, ','));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Step 7: Add unique index on (device_key, stream_id, hash(session_ids))
CREATE UNIQUE INDEX unique_device_stream_session_ids
ON app_session_keys (device_key, stream_id, hash_session_ids(session_ids));
