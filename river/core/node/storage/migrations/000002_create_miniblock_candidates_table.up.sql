CREATE TABLE IF NOT EXISTS miniblock_candidates (
  stream_id CHAR(64) NOT NULL,
  seq_num BIGINT NOT NULL,
  block_hash CHAR(64) NOT NULL,
  blockdata BYTEA NOT NULL,
  PRIMARY KEY (stream_id, block_hash, seq_num)
  ) PARTITION BY LIST (stream_id);

-- Install sha3-224 for migrating existing streams to partitions, as this is used for computing
-- the partition names.
create extension IF NOT EXISTS pgcrypto WITH SCHEMA public CASCADE;

-- Create partitions for existing streams in the miniblock candidates table
DO $$
DECLARE
	miniblock RECORD;
BEGIN
	FOR miniblock IN
		SELECT stream_id from miniblocks
	LOOP
		EXECUTE format(
			'CREATE TABLE %I PARTITION OF miniblock_candidates for values in (%L)',
			'miniblock_candidates_' || encode(digest(miniblock.stream_id, 'sha3-224'), 'hex'),
			miniblock.stream_id);
	END LOOP;
	RETURN;
END;
$$;