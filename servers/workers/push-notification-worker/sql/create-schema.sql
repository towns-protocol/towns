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

-- drop table NotificationTag;

-- Tags for push notifications so that the Worker has
-- additional context to format the notification message
CREATE TABLE IF NOT EXISTS NotificationTag (
  TownId VARCHAR(255) NOT NULL,
  ChannelId VARCHAR(255) NOT NULL,
  UserId VARCHAR(255) NOT NULL,
  Tag VARCHAR(128) NOT NULL,
  CONSTRAINT NotificationTag_PK PRIMARY KEY (ChannelId, UserId)
);

CREATE TABLE IF NOT EXISTS UserSettings (
  UserId VARCHAR(255) NOT NULL,
  Settings VARCHAR(1024) NOT NULL,
  CONSTRAINT NotificationSettings_PK PRIMARY KEY (UserId)
);

CREATE TABLE IF NOT EXISTS UserSettingsTownChannel (
  TownId VARCHAR(255) NOT NULL,
  ChannelId VARCHAR(255) NOT NULL,
  UserId VARCHAR(255) NOT NULL,
  TownMuteSetting VARCHAR(32) NOT NULL,
  ChannelMuteSetting VARCHAR(32) NOT NULL,
  CONSTRAINT TownChannelUserSettings_PK PRIMARY KEY (TownId, ChannelId, UserId)
);
