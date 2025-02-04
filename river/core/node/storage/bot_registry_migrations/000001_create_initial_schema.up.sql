CREATE TABLE IF NOT EXISTS bot_registry (
    bot_id CHAR(40) NOT NULL PRIMARY KEY,
    bot_owner_id CHAR(40) NOT NULL,
    webhook VARCHAR
);

CREATE INDEX bot_registry_owner_idx on bot_registry USING hash (bot_owner_id);