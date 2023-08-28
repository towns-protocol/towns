CREATE TABLE IF NOT EXISTS stream_<<name>> (
  seq_num BIGSERIAL,
  hash BYTEA NOT NULL,
  signature BYTEA NOT NULL,
  event BYTEA NOT NULL, 
  PRIMARY KEY (seq_num));
