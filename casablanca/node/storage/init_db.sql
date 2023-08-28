-- CREATE DATABASE casablanca;
-- \c casablanca;

CREATE TABLE IF NOT EXISTS es (
  stream_name VARCHAR PRIMARY KEY,
  latest_snapshot_miniblock BIGINT NOT NULL);
