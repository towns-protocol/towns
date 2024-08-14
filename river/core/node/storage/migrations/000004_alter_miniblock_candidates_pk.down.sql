-- Drop the existing primary key
ALTER TABLE miniblock_candidates
DROP CONSTRAINT miniblock_candidates_pkey;

-- Add the new primary key with the desired order
ALTER TABLE miniblock_candidates
ADD PRIMARY KEY (stream_id, block_hash, seq_num);
