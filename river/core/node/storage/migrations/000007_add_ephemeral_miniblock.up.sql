-- Add ephemeral stream state
ALTER TABLE es ADD COLUMN IF NOT EXISTS ephemeral BOOLEAN NOT NULL DEFAULT FALSE;

-- Add index for ephemeral stream state
CREATE INDEX IF NOT EXISTS idx_es_ephemeral ON es(ephemeral);
