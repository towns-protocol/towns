-- create local table for development and testing
DROP TABLE IF EXISTS PushSubscription;

CREATE TABLE IF NOT EXISTS PushSubscription (
  UserID VARCHAR(255) NOT NULL, -- wallet account 
  PushSubscription VARCHAR(512), -- push subscription object from the web-push library
  PushType VARCHAR(64) NOT NULL DEFAULT 'web-push', -- push type [ 'web-push' | 'mobile' ]. Currently only 'web-push' is supported
  CONSTRAINT PushSubscription_PK PRIMARY KEY (PushSubscription)
);

-- insert a test subscription for verification
INSERT INTO PushSubscription (
  UserID,
  PushSubscription
) VALUES (
  '0x1111',
  '{"endpoint": "https://some-push-service.com/unique-0x1111", "keys": { "p256dh": "1111", "auth":"1111" }}'
);
INSERT INTO PushSubscription (
  UserID,
  PushSubscription
) VALUES (
  '0x2222',
  '{"endpoint": "https://some-push-service.com/unique-0x2222", "keys": { "p256dh": "2222", "auth":"2222" }}'
);
