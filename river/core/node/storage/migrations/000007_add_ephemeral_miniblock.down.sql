-- Remove ephemeral column from miniblocks table
ALTER TABLE es DROP COLUMN IF EXISTS ephemeral;
