-- md_stream_records contain latest version of stream record for each stream.
CREATE TABLE IF NOT EXISTS md_stream_records (
    stream_id BYTEA PRIMARY KEY,
    last_miniblock_hash BYTEA NOT NULL,
    last_miniblock_num BIGINT NOT NULL,
    replication_factor INT NOT NULL,
    sealed BOOLEAN NOT NULL DEFAULT FALSE,
    nodes INT[] NOT NULL,  -- same as md_streams_placement.nodes
    created_at_block BIGINT NOT NULL,
    updated_at_block BIGINT NOT NULL,
    CHECK (octet_length(stream_id) = 32),
    CHECK (octet_length(last_miniblock_hash) = 32),
    CHECK (last_miniblock_num >= 0)
);

-- md_stream_placement is "cold" table since placement changes rarely.
-- This is a denormalization to avoid updating GIN index on nodes on frequent unrelated hash updates.
CREATE TABLE IF NOT EXISTS md_stream_placement (
    stream_id BYTEA PRIMARY KEY,
    nodes INT[] NOT NULL,  -- same as md_stream_records.nodes
    CHECK (octet_length(stream_id) = 32)
);

CREATE INDEX IF NOT EXISTS md_stream_placement_nodes_gin_idx
    ON md_stream_placement USING GIN (nodes);

-- md_blocks contains list of changes to streams.
-- each batch of writes generates a new block number (+1 from previous)
-- block_slot values are sequential within a block starting from 0
-- block_num for last updated block is stored in md_last_block.block_num.
-- md_blocks contains full updated record of the stream, i.e. all
-- fields (even if not updated) are set.
CREATE TABLE IF NOT EXISTS md_blocks (
    block_num BIGINT NOT NULL,
    block_slot BIGINT NOT NULL,
    stream_id BYTEA NOT NULL,
    event_mask SMALLINT NOT NULL,  -- bitmask indicating which fields were updated
    last_miniblock_hash BYTEA,
    last_miniblock_num BIGINT,
    nodes INT[] NOT NULL,
    replication_factor INT NOT NULL,
    sealed BOOLEAN,
    CHECK (octet_length(stream_id) = 32),
    CHECK (block_num >= 0),
    CHECK (block_slot >= 0),
    PRIMARY KEY (block_num, block_slot)
);

-- md_last_block contains the last block number.
-- all updates to md_xxx tables take lock on md_last_block only row
-- and as such are serialized.
-- each batch of writes generates a new block number (+1 from previous)
-- It's possible to get snapshot of state and then query for updates
-- by doing REPEATABLE READ transaction and reading md_last_block.block_num
-- and md_stream_records and then querying md_blocks for updates since that block.
CREATE TABLE IF NOT EXISTS md_last_block (
    singleton_key BOOLEAN NOT NULL DEFAULT TRUE PRIMARY KEY,
    block_num BIGINT NOT NULL,
    CHECK (singleton_key = TRUE)
);

CREATE OR REPLACE FUNCTION notify_md_last_block()
    RETURNS TRIGGER
AS
$$
    BEGIN
    PERFORM pg_notify('md_record_block', NEW.block_num::text);
    RETURN NEW;
    END;
$$ LANGUAGE PLPGSQL;

DROP TRIGGER IF EXISTS notify_on_md_last_block on md_last_block;
CREATE TRIGGER notify_on_md_last_block
    AFTER INSERT OR UPDATE
    ON md_last_block
    FOR EACH ROW
    EXECUTE PROCEDURE notify_md_last_block();

INSERT INTO md_last_block (singleton_key, block_num) VALUES (TRUE, -1);
