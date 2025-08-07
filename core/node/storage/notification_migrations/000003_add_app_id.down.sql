-- Remove app_id indexes
DROP INDEX IF EXISTS APN_SUB_APP_ID_IDX;
DROP INDEX IF EXISTS WEB_SUB_APP_ID_IDX;

-- Restore original primary key for apnpushsubscriptions
ALTER TABLE apnpushsubscriptions DROP CONSTRAINT apnpushsubscriptions_pkey;
ALTER TABLE apnpushsubscriptions ADD PRIMARY KEY (device_token);

-- Remove app_id column from apnpushsubscriptions
ALTER TABLE apnpushsubscriptions DROP COLUMN app_id;

-- Restore original primary key for webpushsubscriptions
ALTER TABLE webpushsubscriptions DROP CONSTRAINT webpushsubscriptions_pkey;
ALTER TABLE webpushsubscriptions ADD PRIMARY KEY (key_auth, key_p256dh);

-- Remove app_id column from webpushsubscriptions
ALTER TABLE webpushsubscriptions DROP COLUMN app_id;