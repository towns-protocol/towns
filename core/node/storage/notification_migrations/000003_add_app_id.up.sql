-- Add app_id column to webpushsubscriptions table
ALTER TABLE webpushsubscriptions ADD COLUMN app_id SMALLINT NOT NULL DEFAULT 1; -- 1 = NOTIFICATION_APP_TOWNS

-- Drop existing primary key
ALTER TABLE webpushsubscriptions DROP CONSTRAINT webpushsubscriptions_pkey;

-- Add new composite primary key including app_id
ALTER TABLE webpushsubscriptions ADD PRIMARY KEY (key_auth, key_p256dh, app_id);

-- Add index on app_id for efficient filtering
CREATE INDEX WEB_SUB_APP_ID_IDX ON webpushsubscriptions USING hash (app_id);

-- Add app_id column to apnpushsubscriptions table
ALTER TABLE apnpushsubscriptions ADD COLUMN app_id SMALLINT NOT NULL DEFAULT 1; -- 1 = NOTIFICATION_APP_TOWNS

-- Drop existing primary key
ALTER TABLE apnpushsubscriptions DROP CONSTRAINT apnpushsubscriptions_pkey;

-- Add new composite primary key including app_id
ALTER TABLE apnpushsubscriptions ADD PRIMARY KEY (device_token, app_id);

-- Add index on app_id for efficient filtering
CREATE INDEX APN_SUB_APP_ID_IDX ON apnpushsubscriptions USING hash (app_id);