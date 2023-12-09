-- for debugging. Run any sql statement.
--delete from PushSubscription;
--delete from NotificationTag;
--delete from UserSettings;
--delete from UserSettingsSpace;
--delete from UserSettingsChannel;
--insert into NotificationTag (SpaceId, ChannelId, UserId, Tag) values ('!spaceId-1', '!channelId-1', '0xAlice', 'reply_to');
--insert into NotificationTag (SpaceId, ChannelId, UserId, Tag) values ('!spaceId-1', '!channelId-1', '0xBob', 'reply_to');
--update UserSettings set ReplyTo = 1, Mention = 1, DirectMessage = 1 where UserId = '0xBob';
--update UserSettingsChannel set ChannelMute = 'default' where UserId = '0xBob';
select * from PushSubscription;
select * from UserSettings;
select * from UserSettingsSpace;
select * from UserSettingsChannel;
select * from NotificationTag;
