-- sanity check
select 'PushSubscription' as 'TABLE_NAME', count(*) as 'COUNT' from PushSubscription;
select * from PushSubscription limit 20;
select 'NotificationTab' as 'TABLE_NAME', count(*) as 'COUNT' from NotificationTag;
select * from NotificationTag limit 20;
