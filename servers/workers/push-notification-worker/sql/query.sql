-- sanity check
select 'PushSubscription' as 'TABLE_NAME', count(*) as 'COUNT' from PushSubscription;
select * from PushSubscription limit 20;
select 'NotificationTag' as 'TABLE_NAME', count(*) as 'COUNT' from NotificationTag;
select * from NotificationTag limit 20;
select 'UserSettings' as 'TABLE_NAME', count(*) as 'COUNT' from UserSettings;
select * from UserSettings limit 20;
select 'UserSettingsSpace' as 'TABLE_NAME', count(*) as 'COUNT' from UserSettingsSpace;
select * from UserSettingsSpace limit 20;
select 'UserSettingsChannel' as 'TABLE_NAME', count(*) as 'COUNT' from UserSettingsChannel;
select * from UserSettingsChannel limit 20;
