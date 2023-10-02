-- CREATE DATABASE casablanca;
-- \c casablanca;

CREATE TABLE IF NOT EXISTS es (
  stream_id VARCHAR PRIMARY KEY,
  latest_snapshot_miniblock BIGINT NOT NULL);

CREATE TABLE IF NOT EXISTS miniblocks (
  stream_id VARCHAR NOT NULL,
  seq_num BIGINT,
  blockdata BYTEA NOT NULL,
  PRIMARY KEY (stream_id, seq_num)
  ) PARTITION BY LIST (stream_id);

CREATE TABLE IF NOT EXISTS minipools (
  stream_id VARCHAR NOT NULL,
  generation BIGINT NOT NULL ,
  slot_num BIGINT NOT NULL ,
  envelope BYTEA,
  PRIMARY KEY (stream_id, generation, slot_num)
  ) PARTITION BY LIST (stream_id);