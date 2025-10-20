-- Add blockdata_ext column to es table. This column will be used to determine if blockdata is
-- stored in external storage or in the DB (NULL (backwards compatibility), D - DB, G - GCS, S - S3)
ALTER TABLE es ADD blockdata_ext CHAR NOT NULL DEFAULT 'D';
ALTER TABLE es ADD CONSTRAINT blockdata_ext_values CHECK (blockdata_ext IN ('D', 'G','S'));

-- create external storage media stream miniblock tables
DO $$
	DECLARE

suffix CHAR(2);
	i INT;

    numPartitions INT;

BEGIN
SELECT num_partitions from settings where single_row_key=true into numPartitions;
    FOR i IN 0.. numPartitions LOOP
            suffix = LPAD(TO_HEX(i), 2, '0');

            -- make the media stream blockdata column optional
            EXECUTE 'ALTER TABLE miniblocks_m' || SUFFIX || ' ALTER COLUMN blockdata DROP NOT NULL;';

            -- Tables that contain records when media stream miniblock data is stored in an external storage.
            EXECUTE 'CREATE TABLE IF NOT EXISTS miniblocks_ext_storage_m' || suffix || ' (
                stream_id CHAR(64) NOT NULL,
                seq_num BIGINT NOT NULL,             -- miniblock number
                start_byte BIGINT NOT NULL,          -- offset where miniblock starts in combined object
                size BIGINT NOT NULL,                -- how big the blockdata is in bytes
                PRIMARY KEY (stream_id, seq_num)
            )';
    END LOOP;
END;
$$;
