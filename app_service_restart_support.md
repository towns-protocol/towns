

1. Only sync streams with bots in them
  1.1 how do to it? can we get a list of streams with bots?
  1.2 we need to be notified when a bot joins a stream

2. maybe we can have a list of apps per channel, so we won't have to iterate over all members to find the apps

Why is it important?
Since we want to track what was the last message handled by the app service, we don't want to do it for each and every stream

We have two problems:
1. app service does not send messages that are sealed to a miniblock while it was down
2. Bot miss messages if it is down, we do not queue them
   2.1 consider queueing events for bots that are down
   2.2 limit size of queue / time in queue (ttl)

Two ways to solve downtime problem in app service:
1. save last cookie, replay from last cookie when coming back up
  1.1. we will send events more than once
  1.2 needs to dedup in the bot (is this acceptable?)
2. save last event sent
  2.1 much more write to the database
  2.2. could be a viable solution
