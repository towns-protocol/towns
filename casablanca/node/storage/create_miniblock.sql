CREATE TABLE IF NOT EXISTS miniblock_<<name>> (
  seq_num BIGINT,
  blockdata BYTEA NOT NULL,
  PRIMARY KEY (seq_num));