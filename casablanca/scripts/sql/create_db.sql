CREATE DATABASE casablanca;
\c casablanca;
CREATE TABLE IF NOT EXISTS event_stream_sample (
  event_id BIGSERIAL,
  data TEXT NOT NULL
);