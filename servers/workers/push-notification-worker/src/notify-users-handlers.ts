import {
  PushSubscriptionSqlStatement,
  deletePushSubscription,
} from './subscription-handlers'
import { TaggedUsers, getNotificationTags } from './tag-handlers'

import { Env } from 'index'
import { Mute, NotificationType } from './types'
import { NotifyRequestParams } from './request-interfaces'
import { isQueryResultSubscription } from './subscription-handlers'
import { sendNotificationViaWebPush } from './web-push/send-notification'

class NotifySqlStatement {
  static SelectUsersToNotify = `
    SELECT
      DISTINCT c.UserId AS userId,
      'users to notify' AS info
    FROM
      UserSettingsSpace s INNER JOIN UserSettingsChannel c
      ON s.SpaceId = c.SpaceId AND s.UserId = c.UserId
    WHERE
      s.SpaceId = ?1 AND
      c.ChannelId = ?2 AND
      (
        c.ChannelMute = '${Mute.Unmuted}' OR
        (
          s.SpaceMute <> '${Mute.Muted}' AND
          c.ChannelMute <> '${Mute.Muted}'
        )
      );`
}

export interface QueryResultsUsersToNotify {
  userId: string
  info: string
}

export enum SendPushStatus {
  Success = 'success',
  Error = 'error',
  NotSubscribed = 'not-subscribed',
}

export interface SendPushResponse {
  status: SendPushStatus
  userId: string
  pushSubscription: string
  message?: string
}

export async function notifyUsers(params: NotifyRequestParams, env: Env) {
  const allNotificationRequests: Promise<SendPushResponse>[] = []
  const taggedUsers = await getNotificationTags(params.channelId, env.DB)
  const usersToNotify = await getUsersToNotify(env.DB, taggedUsers, params)
  // gather all the notification requests into a single promise
  for (const user of usersToNotify) {
    const userParams = createUserSpecificParams(taggedUsers, params, user)
    const stmt = env.DB.prepare(
      PushSubscriptionSqlStatement.SelectPushSubscriptions,
    ).bind(user)
    const pushSubscriptions = await stmt.all()
    if (pushSubscriptions.results) {
      for (const subscription of pushSubscriptions.results) {
        if (isQueryResultSubscription(subscription)) {
          switch (subscription.pushType) {
            case 'web-push':
              allNotificationRequests.push(
                sendNotificationViaWebPush(user, userParams, subscription, env),
              )
              break
            default:
              console.error('notifyUser', 'unknown pushType', subscription)
              break
          }
        }
      }
    }
  }

  // send all the notifications
  let sendResults: PromiseSettledResult<SendPushResponse>[] = []
  try {
    sendResults = await Promise.allSettled(allNotificationRequests)
  } catch (err) {
    // best effort to notify all users
    // ignore any errors
    console.error('notifyUser', err)
  }

  // handle the results
  // count the number of successful notifications sent
  let notificationsSentCount = 0
  for (const result of sendResults) {
    if (result.status === 'fulfilled') {
      if (result.value.status === SendPushStatus.Success) {
        notificationsSentCount++
      } else {
        console.log('failed to send notification', result.value.status)
        // delete it from the db
        console.log(
          'delete subscription from the db',
          result.value.userId,
          result.value.pushSubscription,
        )
        try {
          await deletePushSubscription(
            env.DB,
            result.value.userId,
            result.value.pushSubscription,
          )
        } catch (err) {
          console.error('failed to delete subscription from the db', err)
        }
      }
    } else {
      console.log('failed to send notification', result.reason)
    }
  }
  console.log('notificationsSentCount', notificationsSentCount)
  return new Response(notificationsSentCount.toString(), { status: 200 })
}

function createUserSpecificParams(
  taggedUsers: TaggedUsers,
  params: NotifyRequestParams,
  userId: string,
): NotifyRequestParams {
  const userParams = { ...params }
  if (taggedUsers.mentionedUsers.includes(userId)) {
    userParams.payload.notificationType = NotificationType.Mention
  } else if (taggedUsers.replyToUsers.includes(userId)) {
    userParams.payload.notificationType = NotificationType.ReplyTo
  }
  return userParams
}

async function getUsersToNotify(
  db: D1Database,
  taggedUsers: TaggedUsers,
  params: NotifyRequestParams,
): Promise<string[]> {
  // Notify users according to the following rules:
  // 1. If the user is mentioned, notify them
  // 2. If the user is participating in  a reply-to thread, notify them
  // 3. If the user explicitly unmuted a channel, notify them
  // 4. If the user is subscribed to the channel and neither the channel nor
  // its parent is muted, notify them
  const notifyUsers = new Set<string>()
  params.users.forEach((user) => {
    // Rules 1 and 2
    if (
      taggedUsers.mentionedUsers.includes(user) ||
      taggedUsers.replyToUsers.includes(user)
    ) {
      notifyUsers.add(user)
    }
  })
  // Rule 3 and 4 is captured in the sql query
  const stmt = db
    .prepare(NotifySqlStatement.SelectUsersToNotify)
    .bind(params.spaceId, params.channelId)
  const { results } = await stmt.all()
  for (const result of results) {
    const r = result as unknown as QueryResultsUsersToNotify
    if (r.userId) {
      notifyUsers.add(r.userId)
    }
  }
  return Array.from(notifyUsers)
}
