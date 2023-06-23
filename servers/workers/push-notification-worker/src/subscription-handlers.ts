import {
  AddSubscriptionRequestParams,
  NotifyRequestParams,
  RemoveSubscriptionRequestParams,
} from './request-interfaces'
import { SendPushResponse, SendPushStatus } from './send-push-interfaces'

import { Env } from 'index'
import { PushType } from './type-aliases'
import { isQueryResultSubscription } from './query-interfaces'
import { sendNotificationViaWebPush } from './web-push/send-notification'

class SqlStatement {
  static SelectPushSubscriptions = `
  SELECT
    UserId AS userId,
    PushSubscription AS pushSubscription,
    PushType AS pushType
  FROM PushSubscription
  WHERE
    UserId=?1;`

  static InsertIntoPushSubscription = `
  INSERT INTO PushSubscription (
    UserId,
    PushSubscription,
    PushType
  ) VALUES (
    ?1,
    ?2,
    ?3
  ) ON CONFLICT (PushSubscription) DO
  UPDATE SET
    UserId=excluded.UserId;`

  static DeleteFromPushSubscription = `
  DELETE FROM PushSubscription
  WHERE
    UserId=?1 AND
    PushSubscription=?2;`
}

export async function addPushSubscription(
  params: AddSubscriptionRequestParams,
  env: Env,
) {
  const pushType: PushType = params.pushType ?? 'web-push' // default
  const info = await env.DB.prepare(SqlStatement.InsertIntoPushSubscription)
    .bind(params.userId, JSON.stringify(params.subscriptionObject), pushType)
    .run()

  //printDbResultInfo('addPushSubscription', info)
  return new Response(null, { status: 204 })
}

export async function removePushSubscription(
  params: RemoveSubscriptionRequestParams,
  env: Env,
) {
  const info = await deletePushSubscription(
    env.DB,
    params.userId,
    JSON.stringify(params.subscriptionObject),
  )
  //printDbResultInfo('removePushSubscription', info)
  return new Response(null, { status: 204 })
}

export async function notifyUsers(params: NotifyRequestParams, env: Env) {
  const allNotificationRequests: Promise<SendPushResponse>[] = []
  // gather all the notification requests into a single promise
  for (const user of params.users) {
    const stmt = env.DB.prepare(SqlStatement.SelectPushSubscriptions).bind(user)
    const pushSubscriptions = await stmt.all()
    if (pushSubscriptions.results) {
      for (const subscription of pushSubscriptions.results) {
        if (isQueryResultSubscription(subscription)) {
          switch (subscription.pushType) {
            case 'web-push':
              allNotificationRequests.push(
                sendNotificationViaWebPush(user, params, subscription, env),
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
  return new Response(notificationsSentCount.toString(), { status: 200 })
}

function printDbResultInfo(message: string, info: D1Result<unknown>) {
  console.log(
    message,
    'success:',
    info.success,
    'meta:',
    info.meta,
    'results:',
    info.results,
  )
}

async function deletePushSubscription(
  db: D1Database,
  userId: string,
  subscriptionObject: string,
) {
  return db
    .prepare(SqlStatement.DeleteFromPushSubscription)
    .bind(userId, subscriptionObject)
    .run()
}
