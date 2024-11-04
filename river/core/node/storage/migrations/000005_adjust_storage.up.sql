CREATE TABLE IF NOT EXISTS singlenodekey (
  uuid VARCHAR NOT NULL,
  storage_connection_time TIMESTAMP NOT NULL,
  info VARCHAR NOT NULL
);

CREATE OR REPLACE FUNCTION notify_on_upsert()
    RETURNS TRIGGER
AS
$$
    BEGIN
    PERFORM pg_notify(TG_TABLE_NAME, TG_TABLE_SCHEMA);
    RETURN NEW;
    END;
$$ LANGUAGE PLPGSQL;

DROP TRIGGER IF EXISTS notify_on_singlenodekey_upserts on singlenodekey;
CREATE TRIGGER notify_on_singlenodekey_upserts
    AFTER INSERT OR UPDATE
    ON singlenodekey
    FOR EACH ROW
    EXECUTE PROCEDURE notify_on_upsert();

CREATE TABLE IF NOT EXISTS es (
  stream_id CHAR(64) STORAGE PLAIN PRIMARY KEY,
  latest_snapshot_miniblock BIGINT NOT NULL);

CREATE TABLE IF NOT EXISTS miniblocks (
  stream_id CHAR(64) NOT NULL,
  seq_num BIGINT NOT NULL,
  blockdata BYTEA NOT NULL,
  PRIMARY KEY (stream_id, seq_num)
  ) PARTITION BY LIST (stream_id);
ALTER TABLE miniblocks ALTER COLUMN stream_id SET STORAGE PLAIN;
ALTER TABLE miniblocks ALTER COLUMN blockdata SET STORAGE EXTERNAL;

CREATE TABLE IF NOT EXISTS minipools (
  stream_id CHAR(64) NOT NULL,
  generation BIGINT NOT NULL,
  slot_num BIGINT NOT NULL,
  envelope BYTEA,
  PRIMARY KEY (stream_id, generation, slot_num)
  ) PARTITION BY LIST (stream_id);
ALTER TABLE minipools ALTER COLUMN stream_id SET STORAGE PLAIN;
ALTER TABLE minipools ALTER COLUMN envelope SET STORAGE EXTERNAL;

CREATE TABLE IF NOT EXISTS miniblock_candidates (
  stream_id CHAR(64) NOT NULL,
  seq_num BIGINT NOT NULL,
  block_hash CHAR(64) NOT NULL,
  blockdata BYTEA NOT NULL,
  PRIMARY KEY (stream_id, seq_num, block_hash)
) PARTITION BY LIST (stream_id);
ALTER TABLE miniblock_candidates ALTER COLUMN stream_id SET STORAGE PLAIN;
ALTER TABLE miniblock_candidates ALTER COLUMN block_hash SET STORAGE PLAIN;
ALTER TABLE miniblock_candidates ALTER COLUMN blockdata SET STORAGE EXTERNAL;
