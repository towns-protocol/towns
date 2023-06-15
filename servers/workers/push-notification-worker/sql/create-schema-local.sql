-- create local table for development and testing
DROP TABLE IF EXISTS PushSubscription;

CREATE TABLE IF NOT EXISTS PushSubscription (
  PushType VARCHAR(64) NOT NULL DEFAULT 'web-push', -- push type [ 'web-push' | 'ios' | 'android' ]. Currently only 'web-push' is supported
  UserId VARCHAR(255) NOT NULL, -- wallet account
  PushSubscription VARCHAR(512) NOT NULL, -- push subscription object from the public notification services
  CONSTRAINT Subscription_PK PRIMARY KEY (PushSubscription)
);

CREATE INDEX idx_user_id
ON PushSubscription (UserId);

-- insert a test subscription for verification
INSERT INTO PushSubscription (
  UserId,
  PushSubscription
) VALUES (
  '0x1111',
  '{"endpoint": "https://some-push-service.com/unique-0x1111", "keys": { "p256dh": "1111", "auth":"1111" }}'
);
INSERT INTO PushSubscription (
  UserId,
  PushSubscription
) VALUES (
  '0x2222',
  '{"endpoint": "https://some-push-service.com/unique-0x2222", "keys": { "p256dh": "2222", "auth":"2222" }}'
);
-- test upsert
INSERT INTO PushSubscription (
  UserId,
  PushSubscription
) VALUES (
  '0x3333',
  '{"endpoint": "https://some-push-service.com/unique-0x2222", "keys": { "p256dh": "2222", "auth":"2222" }}'
) ON CONFLICT (PushSubscription) DO
UPDATE SET
  UserId=excluded.UserId;
