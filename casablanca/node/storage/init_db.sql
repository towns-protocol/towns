-- CREATE DATABASE casablanca;
-- \c casablanca;

CREATE TABLE IF NOT EXISTS es (
  name VARCHAR PRIMARY KEY);

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
