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

-- Tags for push notifications so that the Worker has
-- additional context to format the notification message
DROP TABLE IF EXISTS NotificationTag;
CREATE TABLE IF NOT EXISTS NotificationTag (
  SpaceId VARCHAR(255) NOT NULL,
  ChannelId VARCHAR(255) NOT NULL,
  UserId VARCHAR(255) NOT NULL,
  Tag VARCHAR(128) NOT NULL, -- mention, reply_to, new_message
  CONSTRAINT NotificationTag_PK PRIMARY KEY (ChannelId, UserId)
);

DROP TABLE IF EXISTS UserSettings;
CREATE TABLE IF NOT EXISTS UserSettings (
  UserId VARCHAR(255) NOT NULL PRIMARY KEY,
  ReplyTo INTEGER NOT NULL DEFAULT 1,
  Mention INTEGER NOT NULL DEFAULT 1,
  DirectMessage INTEGER NOT NULL DEFAULT 1
);

DROP TABLE IF EXISTS UserSettingsSpace;
CREATE TABLE IF NOT EXISTS UserSettingsSpace (
  SpaceId VARCHAR(255) NOT NULL,
  UserId VARCHAR(255) NOT NULL,
  SpaceMute VARCHAR(32) NOT NULL DEFAULT 'default', -- mute, unmute, default
  CONSTRAINT UserSettingsSpace_PK PRIMARY KEY (SpaceId, UserId)
  FOREIGN KEY (UserId)
    REFERENCES UserSettings(UserId)
    ON DELETE CASCADE
);

drop table UserSettingsChannel;
CREATE TABLE IF NOT EXISTS UserSettingsChannel (
  SpaceId VARCHAR(255) NOT NULL,
  ChannelId VARCHAR(255) NOT NULL,
  UserId VARCHAR(255) NOT NULL,
  ChannelMute VARCHAR(32) NOT NULL DEFAULT 'default', -- mute, unmute, default
  CONSTRAINT UserSettingsChannel_PK PRIMARY KEY (ChannelId, UserId)
  FOREIGN KEY (UserId)
    REFERENCES UserSettings(UserId)
    ON DELETE CASCADE
);
