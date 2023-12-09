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
    SpaceId,
    ChannelId,
    UserId,
    Tag
  ) VALUES (
    ?1,
    ?2,
    ?3,
    ?4
  ) ON CONFLICT (ChannelId, UserId)
  DO UPDATE SET
    Tag = excluded.Tag;`

  static SelectFromNotificationTag = `
  SELECT
    SpaceId As spaceId,
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
  spaceId: string
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
    prepStatement.bind(
      params.spaceId,
      params.channelId,
      user,
      NotificationType.Mention,
    ),
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
    prepStatement.bind(
      params.spaceId,
      params.channelId,
      user,
      NotificationType.ReplyTo,
    ),
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
  console.log('getNotificationTags', 'channelId', channelId)
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
  const results = await DB.batch([selectTaggedUsers, deleteUsers])
  for (const result of results) {
    if (result.success) {
      console.log('getNotificationTags', 'result', result)
      for (const row of result.results) {
        const r0 = row as QueryResultNotificationTag
        switch (r0.tag) {
          case NotificationType.Mention:
            mentionedUsers.push(r0.userId)
            break
          case NotificationType.ReplyTo:
            replyToUsers.push(r0.userId)
            break
        }
      }
    }
  }

  console.log(
    'getNotificationTags',
    'mentionedUsers',
    mentionedUsers,
    'replyToUsers',
    replyToUsers,
  )
  // nothing specific for the channel
  return {
    channelId,
    mentionedUsers,
    replyToUsers,
  }
}
