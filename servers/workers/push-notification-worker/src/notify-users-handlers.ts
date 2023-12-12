import {
  Mute,
  NotificationContentDm,
  NotificationType,
  PushOptions,
} from './types'
import {
  PushSubscriptionSqlStatement,
  deletePushSubscription,
} from './subscription-handlers'
import { TaggedUsers, getNotificationTags } from './tag-handlers'

import { Env } from './index'
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
  // DoNotDisturb: select all the users that don't want to be notified about replyTo
  static SelectDnDReplyToUsers = `
    SELECT
      UserId AS userId,
      'dnd replyTo users' AS info
    FROM
      UserSettings
    WHERE
      ReplyTo = 0` // no ';' because more conditions are added dynamically
  // DoNotDisturb: select all the users that don't want to be notified about mentions
  static SelectDnDMentionUsers = `
    SELECT
      UserId AS userId,
      'dnd mention users' AS info
    FROM
      UserSettings
    WHERE
      Mention = 0` // no ';' because more conditions are added dynamically
  // DoNotDisturb: select all the users that don't want to be notified about DMs
  static SelectDnDDirectMessageUsers = `
    SELECT
      UserId AS userId,
      'dnd directMessage users' AS info
    FROM
      UserSettings
    WHERE
      DirectMessage = false` // no ';' because more conditions are added dynamically
}

export interface QueryResultsMutedUser {
  userId: string
}

export interface QueryResultsDoNotDisturbUser {
  userId: string
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
  // track which users we attempted to notify for debugging
  const attemptedToNotifyUsers = new Set<string>()
  // gather all the notification requests into a single promise
  for (const user of usersToNotify) {
    const userOptions = createUserSpecificParams(taggedUsers, params, user)
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
                sendNotificationViaWebPush(userOptions, subscription, env),
              )
              attemptedToNotifyUsers.add(user)
              break
            default:
              console.error('notifyUser', 'unknown pushType', subscription)
              break
          }
        }
      }
    }
  }

  // log the users we attempted to notify
  console.log('attemptedToNotifyUsers', attemptedToNotifyUsers)
  // log the users we weren't able to notify
  for (const user of usersToNotify) {
    if (!attemptedToNotifyUsers.has(user)) {
      console.log('user not notified', user)
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
        console.log(
          'failed to send notification',
          result.value.status,
          result.value.userId,
        )
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
): PushOptions {
  const userOptions: PushOptions = {
    userId,
    channelId: params.channelId,
    payload: { ...params.payload },
    urgency: params.urgency,
  }
  switch (true) {
    case taggedUsers.mentionedUsers.includes(userId):
      userOptions.payload.notificationType = NotificationType.Mention
      break
    case taggedUsers.replyToUsers.includes(userId):
      userOptions.payload.notificationType = NotificationType.ReplyTo
      break
    case params.payload.notificationType === NotificationType.DirectMessage:
      {
        const recipients = getRecipientsForDm(params)
        const content: NotificationContentDm = {
          spaceId: params.spaceId,
          channelId: params.channelId,
          senderId: params.sender,
          recipients,
        }
        userOptions.payload.content = content
      }
      break
    default:
      break
  }
  console.log('userOptions', userOptions)
  return userOptions
}

async function getUsersToNotify(
  db: D1Database,
  taggedUsers: TaggedUsers,
  params: NotifyRequestParams,
): Promise<string[]> {
  if (params.users.length == 0) {
    // nothing to do
    return []
  }

  // Notify users according to the following rules:
  // 1. If the user is mentioned, notify if the user's DND mention is false
  // 2. If the user is participating in a reply-to thread, notify if the user's DND replyTo is false
  // 3. If the user muted the town or channel, do not notify
  const notifyUsers = new Set<string>()
  const mutedUsers = new Set<string>()
  const dndReplyToUsers = new Set<string>()
  const dndMentionUsers = new Set<string>()

  const mutedUsersStatement = prepareMutedUsersStatement(
    db,
    params.spaceId,
    params.channelId,
  )
  const dndReplyToStatement = prepareDnDReplyToUsersStatement(db, params.users)
  const dndMentionStatement = prepareDnDMentionUsersStatement(db, params.users)
  const [mutedUsersQuery, dndReplyToQuery, dndMentionQuery] = await Promise.all(
    [
      mutedUsersStatement.all(),
      dndReplyToStatement.all(),
      dndMentionStatement.all(),
    ],
  )
  if (mutedUsersQuery.success) {
    for (const qr of mutedUsersQuery.results) {
      const r = qr as unknown as QueryResultsMutedUser
      mutedUsers.add(r.userId)
    }
  }
  if (dndReplyToQuery.success) {
    for (const qr of dndReplyToQuery.results) {
      const r = qr as unknown as QueryResultsDoNotDisturbUser
      dndReplyToUsers.add(r.userId)
    }
  }
  if (dndMentionQuery.success) {
    for (const qr of dndMentionQuery.results) {
      const r = qr as unknown as QueryResultsDoNotDisturbUser
      dndMentionUsers.add(r.userId)
    }
  }

  console.log(
    'params.users',
    params.users,
    'taggedUsers',
    taggedUsers,
    'mutedUsers',
    mutedUsers,
    'dndReplyToUsers',
    dndReplyToUsers,
    'dndMentionUsers',
    dndMentionUsers,
  )

  for (const user of params.users) {
    const shouldReplyTo =
      taggedUsers.replyToUsers.includes(user) && !dndReplyToUsers.has(user)
    const shouldMention =
      taggedUsers.mentionedUsers.includes(user) && !dndMentionUsers.has(user)
    // should notify if the user is in a DM/GDM, mentioned or participating in a replyTo thread
    // AND the user is not muted for the town or channel
    const shouldNotify =
      (params.payload.notificationType === NotificationType.DirectMessage ||
        shouldReplyTo ||
        shouldMention) &&
      !mutedUsers.has(user)

    console.log(
      'user',
      user,
      'shouldNotify',
      shouldNotify,
      'shouldMention',
      shouldMention,
      'shouldReplyTo',
      shouldReplyTo,
    )
    if (shouldNotify) {
      notifyUsers.add(user)
    }
  }
  return Array.from(notifyUsers)
}

function getRecipientsForDm(params: NotifyRequestParams): string[] {
  const recipients: string[] = []
  if (params.payload.notificationType === NotificationType.DirectMessage) {
    for (const user of params.users) {
      if (user !== params.sender) {
        recipients.push(user)
      }
    }
    params.users
  }
  return recipients
}

function prepareMutedUsersStatement(
  db: D1Database,
  spaceId: string,
  channelId: string,
): D1PreparedStatement {
  const stmt = db
    .prepare(NotifySqlStatement.SelectMutedUsers)
    .bind(spaceId, channelId)
  return stmt
}

function prepareDnDReplyToUsersStatement(
  db: D1Database,
  users: string[],
): D1PreparedStatement {
  let sql = NotifySqlStatement.SelectDnDReplyToUsers + ' AND ('
  for (let i = 1; i <= users.length; i++) {
    if (i === users.length) {
      // add the last user without the OR
      sql += ` UserId = ?${i}`
    } else {
      sql += ` UserId = ?${i} OR`
    }
  }
  sql += ' );'
  //console.log('DnDReply sql', sql)
  return db.prepare(sql).bind(...users)
}

function prepareDnDMentionUsersStatement(
  db: D1Database,
  users: string[],
): D1PreparedStatement {
  let sql = NotifySqlStatement.SelectDnDMentionUsers + ' AND ('
  for (let i = 1; i <= users.length; i++) {
    if (i === users.length) {
      // add the last user without the OR
      sql += ` UserId = ?${i}`
    } else {
      sql += ` UserId = ?${i} OR`
    }
  }
  sql += ' );'
  //console.log('DnDMention sql', sql)
  return db.prepare(sql).bind(...users)
}
