import {
  AddSubscriptionRequestParams,
  MentionRequestParams,
  NotifyRequestParams,
  RemoveSubscriptionRequestParams,
  ReplyToRequestParams,
} from './request-interfaces'
import { NotificationType, PushType } from './types'
import {
  QueryResultNotificationTag,
  isQueryResultSubscription,
} from './query-interfaces'
import { SendPushResponse, SendPushStatus } from './send-push-interfaces'
import { create204Response, create422Response } from './http-responses'

import { Env } from 'index'
import { sendNotificationViaWebPush } from './web-push/send-notification'

interface TaggedUsers {
  channelId: string
  mentionedUsers: string[]
  replyToUsers: string[]
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

  static InsertIntoNotificationTag = `
  INSERT INTO NotificationTag (
    ChannelId,
    UserId,
    Tag
  ) VALUES (
    ?1,
    ?2,
    ?3
  ) ON CONFLICT (ChannelId, UserId)
  DO UPDATE SET
    Tag = excluded.Tag;`

  static SelectFromNotificationTag = `
  SELECT
    ChannelId AS channelId,
    UserId AS userId,
    Tag AS tag
  FROM NotificationTag
  WHERE
    ChannelId=?1;`

  static DeleteNotificationTag = `
    DELETE FROM NotificationTag
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
  return create204Response()
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
  return create204Response()
}

export async function notifyUsers(params: NotifyRequestParams, env: Env) {
  const allNotificationRequests: Promise<SendPushResponse>[] = []
  const taggedUsers = await getNotificationTags(params.topic, env.DB)
  // gather all the notification requests into a single promise
  for (const user of params.users) {
    const userParams = createUserSpecificParams(taggedUsers, params, user)
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

export async function tagMentionUsers(
  db: D1Database,
  params: MentionRequestParams,
) {
  const prepStatement = db.prepare(SqlStatement.InsertIntoNotificationTag)
  const bindedStatements = params.userIds.map((user) =>
    prepStatement.bind(params.channelId, user, NotificationType.Mention),
  )
  const rows = await db.batch(bindedStatements)
  // create the http response
  let response: Response = create204Response()
  if (rows.length > 0) {
    //printDbResultInfo('tagMentionUsers', rows[0])
    if (!rows[0].success) {
      response = create422Response()
    }
  }
  return response
}

export async function tagReplyToUser(
  db: D1Database,
  params: ReplyToRequestParams,
) {
  const prepStatement = db.prepare(SqlStatement.InsertIntoNotificationTag)
  const bindedStatements = params.userIds.map((user) =>
    prepStatement.bind(params.channelId, user, NotificationType.ReplyTo),
  )
  const rows = await db.batch(bindedStatements)
  // create the http response
  let response: Response = create204Response()
  if (rows.length > 0) {
    //printDbResultInfo('tagReplyToUser', rows[0])
    if (!rows[0].success) {
      response = create422Response()
    }
  }
  return response
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

async function getNotificationTags(
  channelId: string,
  DB: D1Database,
): Promise<TaggedUsers> {
  // select the tagged users
  const selectTaggedUsers = DB.prepare(
    SqlStatement.SelectFromNotificationTag,
  ).bind(channelId)

  // delete the tagged users after reading them
  const deleteUsers = DB.prepare(SqlStatement.DeleteNotificationTag).bind(
    channelId,
  )

  // get the tagged users from the DB for this channel
  const mentionedUsers: string[] = []
  const replyToUsers: string[] = []
  const rows = await DB.batch([selectTaggedUsers, deleteUsers])
  if (rows && rows.length > 0) {
    const results = rows[0].results
    for (const row of results) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const r = row as QueryResultNotificationTag
      switch (r.tag) {
        case NotificationType.Mention:
          mentionedUsers.push(r.userId)
          break
        case NotificationType.ReplyTo:
          replyToUsers.push(r.userId)
          break
      }
    }
  }

  // nothing specific for the channel
  return {
    channelId,
    mentionedUsers,
    replyToUsers,
  }
}
