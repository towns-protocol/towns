-- Table for per-stream data
CREATE TABLE external_media_uploads (
    stream_id CHAR(64) PRIMARY KEY,                  -- Stream ID as primary key (matches other tables)
    upload_id TEXT NOT NULL DEFAULT '',              -- upload ID for multipart uploads
    etags JSONB NOT NULL DEFAULT '[]'                -- etags for each part in the multipart upload
);
ALTER TABLE external_media_uploads ALTER COLUMN stream_id SET STORAGE PLAIN;
ALTER TABLE external_media_uploads ALTER COLUMN upload_id SET STORAGE PLAIN;
ALTER TABLE external_media_uploads ALTER COLUMN etags SET STORAGE PLAIN;

-- Create partitioned tables for external_media_markers
-- This follows the same partitioning strategy as miniblocks/minipools
DO $$
	DECLARE
		suffix CHAR(2);
		i INT;
		numPartitions INT;
	BEGIN
		SELECT num_partitions from settings where single_row_key=true into numPartitions;
		
		FOR i IN 0.. numPartitions LOOP
			suffix = LPAD(TO_HEX(i), 2, '0');
			
			-- Create partitioned external_media_markers tables
			EXECUTE 'CREATE TABLE IF NOT EXISTS external_media_markers_m' || suffix || ' (
				stream_id CHAR(64) NOT NULL,                     -- Stream ID (foreign key)
				miniblock INT NOT NULL,                          -- Miniblock number
				start_bytes BIGINT NOT NULL,                     -- Start byte position for this chunk
				end_bytes BIGINT NOT NULL,                       -- End byte position for this chunk
				PRIMARY KEY (stream_id, miniblock)
			)';
			EXECUTE 'ALTER TABLE external_media_markers_m' || suffix || ' ALTER COLUMN stream_id SET STORAGE PLAIN;';
		END LOOP;
	END;
$$;

ALTER TABLE es ADD COLUMN IF NOT EXISTS location TEXT NOT NULL DEFAULT '';