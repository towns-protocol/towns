DROP TRIGGER IF EXISTS notify_on_md_last_block ON md_last_block;
DROP FUNCTION IF EXISTS notify_md_last_block();

DROP TABLE IF EXISTS md_blocks;

DROP INDEX IF EXISTS md_stream_placement_nodes_gin_idx;
DROP TABLE IF EXISTS md_stream_placement;

DROP TABLE IF EXISTS md_stream_records;
DROP TABLE IF EXISTS md_last_block;
