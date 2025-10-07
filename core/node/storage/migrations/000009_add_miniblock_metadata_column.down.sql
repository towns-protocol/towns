ALTER TABLE es DROP COLUMN IF EXISTS metadata;

DO $$
	DECLARE

    suffix CHAR(2);
	i INT;

    numPartitions INT;

    BEGIN

    SELECT num_partitions from settings where single_row_key=true into numPartitions;

    FOR i IN 0.. numPartitions LOOP
        suffix = LPAD(TO_HEX(i), 2, '0');
        -- Make blockdata mandatory from the miniblock partition
        -- This will intentionally fail if there are any NULL values in the blockdata column because
        -- dropping the metadata column from the es table can't be done for these records.
        EXECUTE 'ALTER TABLE miniblocks_m' || suffix || ' ALTER COLUMN blockdata SET NOT NULL;';
    END LOOP;
END;
$$;
