CREATE TABLE IF NOT EXISTS minipool_<<name>> (
  generation BIGINT NOT NULL ,
  slot_num BIGINT NOT NULL ,
  envelope BYTEA,
  PRIMARY KEY (generation, slot_num));