-- Revert primary keys to include app_name field

-- Revert webpushsubscriptions primary key
ALTER TABLE webpushsubscriptions DROP CONSTRAINT webpushsubscriptions_pkey;
ALTER TABLE webpushsubscriptions ADD PRIMARY KEY (key_auth, key_p256dh, app_name);

-- Revert apnpushsubscriptions primary key
ALTER TABLE apnpushsubscriptions DROP CONSTRAINT apnpushsubscriptions_pkey;
ALTER TABLE apnpushsubscriptions ADD PRIMARY KEY (device_token, app_name);