import {
  DeleteSettingsRequestParams,
  GetSettingsRequestParams,
  SaveSettingsRequestParams,
} from './request-interfaces'
import {
  Mute,
  UserSettings,
  UserSettingsChannel,
  UserSettingsSpace,
} from './types'
import {
  create204Response,
  create404Response,
  create422Response,
} from './http-responses'

import { printDbResultInfo } from './sql'

class SettingsSqlStatement {
  static SelectUserSettings = `
    SELECT
      UserId AS userId,
      ReplyTo AS replyTo,
      Mention AS mention,
      DirectMessage AS directMessage
    FROM UserSettings
    WHERE
      UserId=?1;`

  static SelectUserSettingsSpace = `
    SELECT
      SpaceId AS spaceId,
      UserId AS userId,
      SpaceMute AS spaceMute
    FROM UserSettingsSpace
    WHERE
      UserId=?1;`

  static SelectUserSettingsChannel = `
      SELECT
        SpaceId AS spaceId,
        ChannelId AS channelId,
        UserId AS userId,
        ChannelMute AS channelMute
      FROM UserSettingsChannel
      WHERE
        UserId=?1;`

  static DeleteUserSettings = `
    DELETE FROM UserSettings
    WHERE
      UserId=?1;`

  static InsertIntoUserSettings = `
      INSERT INTO UserSettings (
        UserId,
        DirectMessage,
        Mention,
        ReplyTo
      ) VALUES (
        ?1,
        ?2,
        ?3,
        ?4
      ) ON CONFLICT (UserId)
      DO UPDATE SET
        DirectMessage = excluded.DirectMessage,
        Mention = excluded.Mention,
        ReplyTo = excluded.ReplyTo;`

  static InsertIntoUserSettingsSpace = `
    INSERT INTO UserSettingsSpace (
      SpaceId,
      UserId,
      SpaceMute
    ) VALUES (
      ?1,
      ?2,
      ?3
    ) ON CONFLICT (SpaceId, UserId)
    DO UPDATE SET
      SpaceMute = excluded.SpaceMute;`

  static InsertIntoUserSettingsChannel = `
    INSERT INTO UserSettingsChannel (
      SpaceId,
      ChannelId,
      UserId,
      ChannelMute
    ) VALUES (
      ?1,
      ?2,
      ?3,
      ?4
    ) ON CONFLICT (ChannelId, UserId)
    DO UPDATE SET
      ChannelMute = excluded.ChannelMute;`
}

export type QueryResultUserSettingsAny =
  | QueryResultUserSettings
  | QueryResultUserSettingsSpace
  | QueryResultUserSettingsChannel

// see SettingsSqlStatement.SelectUserSettings
export interface QueryResultUserSettings {
  userId: string
  replyTo: number
  mention: number
  directMessage: number
}

// see SettingsSqlStatement.SelectUserSettingsSpace
export interface QueryResultUserSettingsSpace {
  spaceId: string
  userId: string
  spaceMute: Mute
}

// see SettingsSqlStatement.SelectUserSettingsChannel
export interface QueryResultUserSettingsChannel {
  spaceId: string
  channelId: string
  userId: string
  channelMute: Mute
}

export async function saveSettings(
  db: D1Database,
  params: SaveSettingsRequestParams,
): Promise<Response> {
  // default to success
  let success = true
  const preparedStatements: D1PreparedStatement[] = []
  // add the prepared statements for updating the user settings
  addPreparedUserSettings(preparedStatements, db, params.userSettings)
  // add the prepared statements for updating the space settings
  addPreparedSpaceSettings(
    preparedStatements,
    db,
    params.userSettings.userId,
    params.userSettings.spaceSettings,
  )
  // add the prepared statements for updating the channel settings
  addPreparedChannelSettings(
    preparedStatements,
    db,
    params.userSettings.userId,
    params.userSettings.channelSettings,
  )
  try {
    // execute the prepared statements
    const rows = await db.batch(preparedStatements)
    // print debug info on error
    if (rows.length > 0) {
      if (
        !rows.every((r) => {
          if (!r.success) {
            printDbResultInfo('saveSettings sql error', r)
          }
          return r.success
        })
      ) {
        console.error('saveSettings one or more sql statements failed')
        success = false
      }
    }
  } catch (e) {
    console.error('saveSettings error', e)
    success = false
  }
  // http response
  console.log('saveSettings success', success /*, 'params', params*/)
  return success ? create204Response() : create422Response()
}

export async function deleteSettings(
  db: D1Database,
  params: DeleteSettingsRequestParams,
): Promise<Response> {
  // default to success
  let success = true
  const pDeleteSetting = preparedDeleteUserSettings(db, params.userId)
  try {
    // execute the prepared statements
    const result = await pDeleteSetting.run()
    // print debug info on error
    if (!result.success) {
      printDbResultInfo('deleteSettings sql error', result)
      success = false
    }
  } catch (e) {
    console.error('deleteSettings error', e)
    success = false
  }
  // http response
  return success ? create204Response() : create422Response()
}

export async function getSettings(
  db: D1Database,
  params: GetSettingsRequestParams,
): Promise<Response> {
  // create the default http response
  const userSettings: UserSettings = {
    userId: params.userId,
    spaceSettings: [],
    channelSettings: [],
    replyTo: true,
    mention: true,
    directMessage: true,
  }

  const preparedStatements: D1PreparedStatement[] = []
  const preparedGetSettings = prepareGetUserSettings(db, params.userId)
  const preparedGetSettingsSpace = prepareGetSettingsSpace(db, params.userId)
  const preparedGetSettingsChannel = prepareGetSettingsChannel(
    db,
    params.userId,
  )
  preparedStatements.push(preparedGetSettings)
  preparedStatements.push(preparedGetSettingsSpace)
  preparedStatements.push(preparedGetSettingsChannel)
  try {
    // execute the prepared statements
    const rows = await db.batch(preparedStatements)
    // get the user settings
    if (rows.length > 0) {
      const rowIndex = 0
      if (rows[rowIndex].success) {
        if (rows[rowIndex].results.length === 0) {
          printDbResultInfo(
            `no settings found for user '${params.userId}'`,
            rows[rowIndex],
          )
          return create404Response()
        }
        const r = rows[rowIndex].results[0] as QueryResultUserSettings
        userSettings.replyTo = r.replyTo !== 0
        userSettings.mention = r.mention !== 0
        userSettings.directMessage = r.directMessage !== 0
      } else {
        printDbResultInfo(
          `getSettings rows[${rowIndex}] sql error`,
          rows[rowIndex],
        )
        return create422Response()
      }
    }
    // get the space settings
    if (rows.length > 1) {
      const rowIndex = 1
      if (rows[rowIndex].success) {
        userSettings.spaceSettings = rows[rowIndex].results.map(
          (r): UserSettingsSpace => {
            const queryResult = r as QueryResultUserSettingsSpace
            return {
              spaceId: queryResult.spaceId,
              spaceMute: queryResult.spaceMute,
            }
          },
        )
      } else {
        printDbResultInfo(
          `getSettings rows[${rowIndex}] sql error`,
          rows[rowIndex],
        )
        return create422Response()
      }
    }
    // get the channel settings
    if (rows.length > 2) {
      const rowIndex = 2
      if (rows[rowIndex].success) {
        userSettings.channelSettings = rows[rowIndex].results.map(
          (r): UserSettingsChannel => {
            const queryResult = r as QueryResultUserSettingsChannel
            return {
              spaceId: queryResult.spaceId,
              channelId: queryResult.channelId,
              channelMute: queryResult.channelMute,
            }
          },
        )
      } else {
        printDbResultInfo(
          `getSettings rows[${rowIndex}] sql error`,
          rows[rowIndex],
        )
        return create422Response()
      }
    }
  } catch (e) {
    console.error('getSettings error', e)
    return create422Response()
  }
  // success response
  return new Response(JSON.stringify(userSettings), {
    status: 200,
  })
}

function prepareGetUserSettings(
  db: D1Database,
  userId: string,
): D1PreparedStatement {
  const preparedStatment = db
    .prepare(SettingsSqlStatement.SelectUserSettings)
    .bind(userId)
  return preparedStatment
}

function prepareGetSettingsSpace(
  db: D1Database,
  userId: string,
): D1PreparedStatement {
  const preparedStatment = db
    .prepare(SettingsSqlStatement.SelectUserSettingsSpace)
    .bind(userId)
  return preparedStatment
}

function prepareGetSettingsChannel(
  db: D1Database,
  userId: string,
): D1PreparedStatement {
  const preparedStatment = db
    .prepare(SettingsSqlStatement.SelectUserSettingsChannel)
    .bind(userId)
  return preparedStatment
}

function addPreparedUserSettings(
  preparedStatements: D1PreparedStatement[],
  db: D1Database,
  userSettings: UserSettings,
) {
  // insert the new space settings
  const pStatement = db
    .prepare(SettingsSqlStatement.InsertIntoUserSettings)
    .bind(
      userSettings.userId,
      userSettings.directMessage ? 1 : 0,
      userSettings.mention ? 1 : 0,
      userSettings.replyTo ? 1 : 0,
    )
  preparedStatements.push(pStatement)
}

function addPreparedSpaceSettings(
  preparedStatements: D1PreparedStatement[],
  db: D1Database,
  userId: string,
  spaceSettings: UserSettingsSpace[],
) {
  if (spaceSettings.length === 0) {
    // nothing to change.
    return
  }
  // insert the new space settings
  const insertSettings = db.prepare(
    SettingsSqlStatement.InsertIntoUserSettingsSpace,
  )
  for (const s of spaceSettings) {
    const bindedNewSettings = insertSettings.bind(
      s.spaceId,
      userId,
      s.spaceMute,
    )
    preparedStatements.push(bindedNewSettings)
  }
}

function addPreparedChannelSettings(
  preparedStatements: D1PreparedStatement[],
  db: D1Database,
  userId: string,
  channelSettings: UserSettingsChannel[],
) {
  if (channelSettings.length === 0) {
    // nothing to change.
    return
  }
  // insert the new channel settings
  const insertSettings = db.prepare(
    SettingsSqlStatement.InsertIntoUserSettingsChannel,
  )
  for (const s of channelSettings) {
    const bindedNewSettings = insertSettings.bind(
      s.spaceId,
      s.channelId,
      userId,
      s.channelMute,
    )
    preparedStatements.push(bindedNewSettings)
  }
}

function preparedDeleteUserSettings(
  db: D1Database,
  userId: string,
): D1PreparedStatement {
  const preparedStatement = db
    .prepare(SettingsSqlStatement.DeleteUserSettings)
    .bind(userId)
  return preparedStatement
}
