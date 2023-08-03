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
  // select all the users that have muted the town or channel
  static SelectMutedUsers = `
    SELECT
      DISTINCT UserId AS userId,
      'muted users' AS info
    FROM
      UserSettingsSpace
    WHERE
      SpaceId = ?1 AND SpaceMute = '${Mute.Muted}'
    UNION
    SELECT
      DISTINCT UserId AS userId,
      'muted users' AS info
    FROM
      UserSettingsChannel
    WHERE
      SpaceId = ?1 AND ChannelId = ?2 AND ChannelMute = '${Mute.Muted}';`
}

export interface QueryResultsMutedUsers {
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
  // 2. If the user is participating in a reply-to thread, notify them
  // 3. If the user muted the town or channel, do not notify them
  const notifyUsers = new Set<string>()
  const stmt = db
    .prepare(NotifySqlStatement.SelectMutedUsers)
    .bind(params.spaceId, params.channelId)
  const { results } = await stmt.all()
  const mutedUsers = results as unknown[] as QueryResultsMutedUsers[]
  params.users.forEach((user) => {
    // Rules 1 and 2
    if (
      taggedUsers.mentionedUsers.includes(user) ||
      taggedUsers.replyToUsers.includes(user)
    ) {
      notifyUsers.add(user)
    }
    // Rule 3
    if (!mutedUsers.some((mutedUser) => mutedUser.userId === user)) {
      notifyUsers.add(user)
    }
  })
  return Array.from(notifyUsers)
}
