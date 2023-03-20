-- CREATE DATABASE casablanca;
-- \c casablanca;

CREATE TABLE IF NOT EXISTS es (
  name VARCHAR PRIMARY KEY);

CREATE TABLE IF NOT EXISTS es_events (
  es_name VARCHAR, 
  seq_num BIGSERIAL,
  hash BYTEA NOT NULL,
  signature BYTEA NOT NULL,
  event BYTEA NOT NULL, 
  PRIMARY KEY (es_name, seq_num),
  FOREIGN KEY (es_name) REFERENCES es(name));

CREATE TABLE IF NOT EXISTS es_events_debug (
  es_name VARCHAR, 
  seq_num BIGINT, 
  hash BYTEA NOT NULL,
  signature BYTEA NOT NULL,
  event JSONB NOT NULL, 
  PRIMARY KEY (es_name, seq_num));

CREATE OR REPLACE FUNCTION public.notify_newevent()
  RETURNS trigger
  LANGUAGE plpgsql
AS $function$
DECLARE 
BEGIN
    PERFORM pg_notify('es_newevent', row_to_json(NEW)::text);
    RETURN NULL;
END;
$function$;

CREATE OR REPLACE TRIGGER new_event_trigger AFTER INSERT ON es_events FOR EACH ROW EXECUTE PROCEDURE notify_newevent()
