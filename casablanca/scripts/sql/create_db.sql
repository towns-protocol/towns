CREATE DATABASE casablanca;
\c casablanca;

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

