import {
  AddSubscriptionRequestParams,
  MentionRequestParams,
  NotifyRequestParams,
  RemoveSubscriptionRequestParams,
} from './request-interfaces'
import {
  QueryResultMentionedUser,
  isQueryResultSubscription,
} from './query-interfaces'
import { SendPushResponse, SendPushStatus } from './send-push-interfaces'

import { Env } from 'index'
import { NotificationType, PushType } from './types'
import { sendNotificationViaWebPush } from './web-push/send-notification'

interface CurrentChannelContext {
  channelId: string
  mentionedUsers: string[]
}

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

  static InsertIntoMentionedUser = `
  INSERT INTO MentionedUser (
    ChannelId,
    UserId
  ) VALUES (
    ?1,
    ?2
  ) ON CONFLICT (ChannelId, UserId) DO NOTHING;`

  static SelectMentionedUsersInChannel = `
  SELECT
    UserId AS userId
  FROM MentionedUser
  WHERE
    ChannelId=?1;`

  static DeleteMentionedUsersInChannel = `
    DELETE FROM MentionedUser
    WHERE
      ChannelId=?1;`
}

export async function addPushSubscription(
  params: AddSubscriptionRequestParams,
  env: Env,
) {
  const pushType: PushType = params.pushType ?? 'web-push' // default
  const info = await env.DB.prepare(SqlStatement.InsertIntoPushSubscription)
    .bind(params.userId, JSON.stringify(params.subscriptionObject), pushType)
    .run()

  printDbResultInfo('addPushSubscription', info)
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
  printDbResultInfo('removePushSubscription', info)
  return new Response(null, { status: 204 })
}

export async function notifyUsers(params: NotifyRequestParams, env: Env) {
  const allNotificationRequests: Promise<SendPushResponse>[] = []
  const context = await getCurrentChannelContext(params.topic, env.DB)
  // gather all the notification requests into a single promise
  for (const user of params.users) {
    const userParams = createUserSpecificParams(context, params, user)
    const stmt = env.DB.prepare(SqlStatement.SelectPushSubscriptions).bind(user)
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

export async function mentionUsers(params: MentionRequestParams, env: Env) {
  const prepStatement = env.DB.prepare(SqlStatement.InsertIntoMentionedUser)
  const bindedStatements = params.userIds.map((user) =>
    prepStatement.bind(params.channelId, user),
  )
  const rows = await env.DB.batch(bindedStatements)
  if (rows.length > 0) {
    console.log('mentionUsers', rows[0].success)
    //printDbResultInfo('mentionUsers', rows[0])
  } else {
    console.log('mentionUsers', 'no rows')
  }
  return new Response(null, { status: 204 })
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

function createUserSpecificParams(
  context: CurrentChannelContext,
  params: NotifyRequestParams,
  userId: string,
): NotifyRequestParams {
  const userParams = { ...params }
  if (context.mentionedUsers.includes(userId)) {
    userParams.payload.notificationType = NotificationType.Mention
  }
  return userParams
}

async function getCurrentChannelContext(
  channelId: string,
  DB: D1Database,
): Promise<CurrentChannelContext> {
  // select the mentioned users
  const selectMentionedUsers = DB.prepare(
    SqlStatement.SelectMentionedUsersInChannel,
  ).bind(channelId)

  // delete the mentioned users after reading them
  const deleteUsers = DB.prepare(
    SqlStatement.DeleteMentionedUsersInChannel,
  ).bind(channelId)

  // get the mentioned users from the DB for this channel
  const rows = await DB.batch([selectMentionedUsers, deleteUsers])
  if (rows && rows.length > 0) {
    const userIds: string[] =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      rows[0].results?.map((row) => (row as any).userId) ?? []
    const mentionedUsers: string[] = userIds
    return {
      channelId,
      mentionedUsers,
    }
  }

  // nothing specific for the channel
  return {
    channelId,
    mentionedUsers: [],
  }
}
