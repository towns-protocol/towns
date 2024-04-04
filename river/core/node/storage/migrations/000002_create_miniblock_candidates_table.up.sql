CREATE TABLE IF NOT EXISTS miniblock_candidates (
  stream_id CHAR(64) NOT NULL,
  seq_num BIGINT NOT NULL,
  block_hash CHAR(64) NOT NULL,
  blockdata BYTEA NOT NULL,
  PRIMARY KEY (stream_id, block_hash, seq_num)
  ) PARTITION BY LIST (stream_id);

-- Install sha224 for migrating existing streams to partitions, as this is used for computing
-- NOTE: sha3-224 used for other tables is not availabe in all deployments of postgres.
-- the partition names. Use pg_advisory_xact_lock to avoid failures from concurrent installations
-- during test cases.
select pg_advisory_xact_lock(hashtext('install_pgcrypto_extension'));
create extension IF NOT EXISTS pgcrypto WITH SCHEMA public CASCADE;

-- Create partitions for existing streams in the miniblock candidates table
DO $$
DECLARE
	stream RECORD;
BEGIN
	FOR stream IN
		SELECT stream_id from es
	LOOP
		EXECUTE format(
			'CREATE TABLE %I PARTITION OF miniblock_candidates for values in (%L)',
			'miniblock_candidates_' || encode(digest(stream.stream_id, 'sha224'), 'hex'),
			stream.stream_id);
	END LOOP;
	RETURN;
END;
$$;