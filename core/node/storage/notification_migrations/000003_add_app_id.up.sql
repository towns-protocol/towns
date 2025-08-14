-- Add app_name column to webpushsubscriptions table
ALTER TABLE webpushsubscriptions ADD COLUMN app_name VARCHAR(50) NOT NULL DEFAULT 'towns';

-- Drop existing primary key
ALTER TABLE webpushsubscriptions DROP CONSTRAINT webpushsubscriptions_pkey;

-- Add new composite primary key including app_name
ALTER TABLE webpushsubscriptions ADD PRIMARY KEY (key_auth, key_p256dh, app_name);

-- Add app_name column to apnpushsubscriptions table
ALTER TABLE apnpushsubscriptions ADD COLUMN app_name VARCHAR(50) NOT NULL DEFAULT 'towns';

-- Drop existing primary key
ALTER TABLE apnpushsubscriptions DROP CONSTRAINT apnpushsubscriptions_pkey;

-- Add new composite primary key including app_name
ALTER TABLE apnpushsubscriptions ADD PRIMARY KEY (device_token, app_name);
