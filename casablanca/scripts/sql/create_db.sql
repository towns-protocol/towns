CREATE DATABASE casablanca;
\c casablanca;

CREATE TABLE IF NOT EXISTS es_sample (
  seq_num BIGSERIAL,
  data TEXT NOT NULL
);

CREATE OR REPLACE FUNCTION public.notify_newevent()
  RETURNS trigger
  LANGUAGE plpgsql
AS $function$
DECLARE 
channel_name TEXT := 'newevent_' || TG_TABLE_NAME;
BEGIN
    PERFORM pg_notify(channel_name, row_to_json(NEW)::text);
    RETURN NULL;
END;
$function$;

CREATE TRIGGER new_event_trigger AFTER INSERT ON es_sample
FOR EACH ROW EXECUTE PROCEDURE notify_newevent();