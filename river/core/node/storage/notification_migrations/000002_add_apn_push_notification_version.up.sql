-- Track table migration status
ALTER TABLE apnpushsubscriptions ADD push_version INT NOT NULL DEFAULT 1;
