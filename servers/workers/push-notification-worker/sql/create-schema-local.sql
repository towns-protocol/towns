-- create local table for development and testing
DROP TABLE IF EXISTS PushSubscription;

CREATE TABLE IF NOT EXISTS PushSubscription (
  SpaceId VARCHAR(255) NOT NULL, -- space id
  ChannelId VARCHAR(255), -- channel id
  PushType VARCHAR(64) NOT NULL DEFAULT 'web-push', -- push type [ 'web-push' | 'mobile' ]. Currently only 'web-push' is supported
  UserId VARCHAR(255) NOT NULL, -- wallet account
  PushSubscription VARCHAR(512), -- push subscription object from the web-push library
  CONSTRAINT PushSubscription_PK PRIMARY KEY (PushSubscription)
);

CREATE INDEX idx_user_id
ON PushSubscription (UserId);

CREATE INDEX idx_space_id
ON PushSubscription (SpaceId);

CREATE INDEX idx_channel_id
ON PushSubscription (ChannelId);

-- insert a test subscription for verification
INSERT INTO PushSubscription (
  UserId,
  SpaceId,
  PushSubscription
) VALUES (
  '0x1111',
  '!space-id_1:towns.com',
  '{"endpoint": "https://some-push-service.com/unique-0x1111", "keys": { "p256dh": "1111", "auth":"1111" }}'
);
INSERT INTO PushSubscription (
  UserId,
  SpaceId,
  PushSubscription
) VALUES (
  '0x2222',
  '!space-id_2:towns.com',
  '{"endpoint": "https://some-push-service.com/unique-0x2222", "keys": { "p256dh": "2222", "auth":"2222" }}'
);
