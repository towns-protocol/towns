-- CREATE DATABASE casablanca;
-- \c casablanca;

CREATE TABLE IF NOT EXISTS es (
  stream_name VARCHAR PRIMARY KEY,
  latest_snapshot_miniblock BIGINT NOT NULL);

CREATE OR REPLACE FUNCTION public.notify_newevent()
  RETURNS trigger
  LANGUAGE plpgsql
AS $function$
DECLARE 
BEGIN
    PERFORM pg_notify('es_newevent_' || lower(TG_ARGV[0]), '');
    RETURN NULL;
END;
$function$;
