import {
  PushSubscriptionSqlStatement,
  deletePushSubscription,
} from './subscription-handlers'
import { TaggedUsers, getNotificationTags } from './tag-handlers'

import { Env } from 'index'
import { NotificationType } from './types'
import { NotifyRequestParams } from './request-interfaces'
import { isQueryResultSubscription } from './subscription-handlers'
import { sendNotificationViaWebPush } from './web-push/send-notification'

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
  const taggedUsers = await getNotificationTags(params.topic, env.DB)
  patchToEnsureSpecCompliance(params)
  // gather all the notification requests into a single promise
  for (const user of params.users) {
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

function patchToEnsureSpecCompliance(params: NotifyRequestParams) {
  // https://developer.apple.com/documentation/usernotifications/sending_web_push_notifications_in_web_apps_safari_and_other_browsers
  const MAX_LENGTH = 32
  const base64EncodedTopicWithMaxLength = btoa(params.topic).substring(
    0,
    MAX_LENGTH,
  )
  /*
  console.log(
    `patch topic "${params.topic}" -> ${base64EncodedTopicWithMaxLength}`,
  )
  */
  params.topic = base64EncodedTopicWithMaxLength
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
