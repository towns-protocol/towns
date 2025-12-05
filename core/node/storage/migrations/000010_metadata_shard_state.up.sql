-- Global state table for metadata shards; keyed by shard_id.
CREATE TABLE IF NOT EXISTS metadata (
    shard_id BIGINT PRIMARY KEY,
    last_height BIGINT NOT NULL DEFAULT 0,
    last_app_hash BYTEA NOT NULL DEFAULT ''::BYTEA,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
