-- Update primary keys to remove app_name field from composite keys
-- The app_name column remains in the tables for historical data

-- Update webpushsubscriptions primary key
ALTER TABLE webpushsubscriptions DROP CONSTRAINT webpushsubscriptions_pkey;
ALTER TABLE webpushsubscriptions ADD PRIMARY KEY (key_auth, key_p256dh);

-- Update apnpushsubscriptions primary key  
ALTER TABLE apnpushsubscriptions DROP CONSTRAINT apnpushsubscriptions_pkey;
ALTER TABLE apnpushsubscriptions ADD PRIMARY KEY (device_token);