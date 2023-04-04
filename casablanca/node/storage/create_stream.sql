CREATE TABLE IF NOT EXISTS stream_<<name>> (
  seq_num BIGSERIAL,
  hash BYTEA NOT NULL,
  signature BYTEA NOT NULL,
  event BYTEA NOT NULL, 
  PRIMARY KEY (seq_num));

CREATE OR REPLACE TRIGGER new_event_trigger_<<name>> AFTER INSERT ON stream_<<name>> FOR EACH ROW EXECUTE PROCEDURE notify_newevent('<<name>>')
