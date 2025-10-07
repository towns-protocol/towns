-- Add an optional metadata column to the es table that will hold extra information that
-- can be used to find block data if it's not stored in the DB.
ALTER TABLE es ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT NULL;

DO $$
	DECLARE

	suffix CHAR(2);
	i INT;

    numPartitions INT;

	BEGIN

    SELECT num_partitions from settings where single_row_key=true into numPartitions;

	FOR i IN 0.. numPartitions LOOP
		suffix = LPAD(TO_HEX(i), 2, '0');
        -- Make blockdata nullable to allow storing blockdata external.
        EXECUTE 'ALTER TABLE miniblocks_m' || suffix || ' ALTER COLUMN blockdata DROP NOT NULL;';
	END LOOP;
END;
$$;
