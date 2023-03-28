-- CREATE DATABASE casablanca;
-- \c casablanca;

CREATE TABLE IF NOT EXISTS es (
  name VARCHAR PRIMARY KEY);

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
    PERFORM pg_notify('es_newevent', 'es_name:' || TG_ARGV[0]);
    RETURN NULL;
END;
$function$;
