import {
  MentionRequestParams,
  ReplyToRequestParams,
} from './request-interfaces'
import { NotificationType, UserId } from './types'
import { create204Response, create422Response } from './http-responses'

import { printDbResultInfo } from './sql'

class TagSqlStatement {
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

  static DeleteFromNotificationTag = `
    DELETE FROM NotificationTag
    WHERE
      ChannelId=?1;`
}

export interface QueryResultNotificationTag {
  channelId: string
  userId: UserId
  tag: string
}

export interface TaggedUsers {
  channelId: string
  mentionedUsers: string[]
  replyToUsers: string[]
}

export async function tagMentionUsers(
  db: D1Database,
  params: MentionRequestParams,
) {
  const prepStatement = db.prepare(TagSqlStatement.InsertIntoNotificationTag)
  const bindedStatements = params.userIds.map((user) =>
    prepStatement.bind(params.channelId, user, NotificationType.Mention),
  )
  const rows = await db.batch(bindedStatements)
  // create the http response
  let response: Response = create204Response()
  if (rows.length > 0) {
    if (!rows[0].success) {
      printDbResultInfo('tagMentionUsers sql error', rows[0])
      response = create422Response()
    }
  }
  return response
}

export async function tagReplyToUser(
  db: D1Database,
  params: ReplyToRequestParams,
) {
  const prepStatement = db.prepare(TagSqlStatement.InsertIntoNotificationTag)
  const bindedStatements = params.userIds.map((user) =>
    prepStatement.bind(params.channelId, user, NotificationType.ReplyTo),
  )
  const rows = await db.batch(bindedStatements)
  // create the http response
  let response: Response = create204Response()
  if (rows.length > 0) {
    if (!rows[0].success) {
      printDbResultInfo('tagReplyToUser sql error', rows[0])
      response = create422Response()
    }
  }
  return response
}

export async function getNotificationTags(
  channelId: string,
  DB: D1Database,
): Promise<TaggedUsers> {
  // select the tagged users
  const selectTaggedUsers = DB.prepare(
    TagSqlStatement.SelectFromNotificationTag,
  ).bind(channelId)

  // delete the tagged users after reading them
  const deleteUsers = DB.prepare(
    TagSqlStatement.DeleteFromNotificationTag,
  ).bind(channelId)

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
