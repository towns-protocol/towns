-- This table may already exist in the schema and, if so, use the setting
-- stored in the table to determine partition count.
CREATE TABLE IF NOT EXISTS settings (
single_row_key BOOL PRIMARY KEY DEFAULT TRUE,
num_partitions INT DEFAULT 256 NOT NULL);
-- Create only setting row that should be in this table.
INSERT INTO settings (single_row_key, num_partitions) VALUES (TRUE, 256) on conflict do nothing;

DO $$
	DECLARE

	suffix CHAR(2);
	i INT;

    numPartitions INT;

	BEGIN

    SELECT num_partitions from settings where single_row_key=true into numPartitions;

	FOR i IN 0.. numPartitions LOOP
		suffix = LPAD(TO_HEX(i), 2, '0');

        -- Media stream partitions
        EXECUTE 'CREATE TABLE IF NOT EXISTS miniblocks_m' || suffix || ' (
            stream_id CHAR(64) NOT NULL,
            seq_num BIGINT NOT NULL,
            blockdata BYTEA NOT NULL,
            PRIMARY KEY (stream_id, seq_num)
        )';
        EXECUTE 'ALTER TABLE miniblocks_m' || suffix || ' ALTER COLUMN stream_id SET STORAGE PLAIN;';
        EXECUTE 'ALTER TABLE miniblocks_m' || suffix || ' ALTER COLUMN blockdata SET STORAGE EXTERNAL;';

        EXECUTE 'CREATE TABLE IF NOT EXISTS minipools_m' || suffix || ' (
            stream_id CHAR(64) NOT NULL,
            generation BIGINT NOT NULL ,
            slot_num BIGINT NOT NULL ,
            envelope BYTEA,
            PRIMARY KEY (stream_id, generation, slot_num)
        )';
        EXECUTE 'ALTER TABLE minipools_m' || suffix || ' ALTER COLUMN stream_id SET STORAGE PLAIN;';
        EXECUTE 'ALTER TABLE minipools_m' || suffix || ' ALTER COLUMN envelope SET STORAGE EXTERNAL;';

        EXECUTE 'CREATE TABLE IF NOT EXISTS miniblock_candidates_m' || suffix || ' (
            stream_id CHAR(64) NOT NULL,
            seq_num BIGINT NOT NULL,
            block_hash CHAR(64) NOT NULL,
            blockdata BYTEA NOT NULL,
            PRIMARY KEY (stream_id, seq_num, block_hash)
        )';
        EXECUTE 'ALTER TABLE miniblock_candidates_m' || suffix || ' ALTER COLUMN stream_id SET STORAGE PLAIN;';
        EXECUTE 'ALTER TABLE miniblock_candidates_m' || suffix || ' ALTER COLUMN block_hash SET STORAGE PLAIN;';
        EXECUTE 'ALTER TABLE miniblock_candidates_m' || suffix || ' ALTER COLUMN blockdata SET STORAGE EXTERNAL;';

        -- Partitions for regular streams
        EXECUTE 'CREATE TABLE IF NOT EXISTS miniblocks_r' || suffix || ' (
            stream_id CHAR(64) NOT NULL,
            seq_num BIGINT NOT NULL,
            blockdata BYTEA NOT NULL,
            PRIMARY KEY (stream_id, seq_num)
        )';
        EXECUTE 'ALTER TABLE miniblocks_r' || suffix || ' ALTER COLUMN stream_id SET STORAGE PLAIN;';
        EXECUTE 'ALTER TABLE miniblocks_r' || suffix || ' ALTER COLUMN blockdata SET STORAGE EXTERNAL;';

        EXECUTE 'CREATE TABLE IF NOT EXISTS minipools_r' || suffix || ' (
            stream_id CHAR(64) NOT NULL,
            generation BIGINT NOT NULL ,
            slot_num BIGINT NOT NULL ,
            envelope BYTEA,
            PRIMARY KEY (stream_id, generation, slot_num)
        )';
        EXECUTE 'ALTER TABLE minipools_r' || suffix || ' ALTER COLUMN stream_id SET STORAGE PLAIN;';
        EXECUTE 'ALTER TABLE minipools_r' || suffix || ' ALTER COLUMN envelope SET STORAGE EXTERNAL;';

        EXECUTE 'CREATE TABLE IF NOT EXISTS miniblock_candidates_r' || suffix || ' (
            stream_id CHAR(64) NOT NULL,
            seq_num BIGINT NOT NULL,
            block_hash CHAR(64) NOT NULL,
            blockdata BYTEA NOT NULL,
            PRIMARY KEY (stream_id, seq_num, block_hash)
        )';
        EXECUTE 'ALTER TABLE miniblock_candidates_r' || suffix || ' ALTER COLUMN stream_id SET STORAGE PLAIN;';
        EXECUTE 'ALTER TABLE miniblock_candidates_r' || suffix || ' ALTER COLUMN block_hash SET STORAGE PLAIN;';
        EXECUTE 'ALTER TABLE miniblock_candidates_r' || suffix || ' ALTER COLUMN blockdata SET STORAGE EXTERNAL;';
	END LOOP;
END;
$$;

-- Track table migration status
ALTER TABLE es ADD migrated BOOLEAN NOT NULL DEFAULT FALSE;
