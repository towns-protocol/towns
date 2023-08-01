import {
  DeleteSettingsRequestParams,
  GetSettingsRequestParams,
  SaveSettingsRequestParams,
} from './request-interfaces'
import {
  Membership,
  Mute,
  UserSettings,
  UserSettingsChannel,
  UserSettingsSpace,
} from './types'
import { create204Response, create422Response } from './http-responses'

import { printDbResultInfo } from './sql'

class SettingsSqlStatement {
  static SelectUserSettingsSpace = `
    SELECT
      SpaceId AS spaceId,
      UserId AS userId,
      SpaceMembership AS spaceMembership,
      SpaceMute AS spaceMute
    FROM UserSettingsSpace
    WHERE
      UserId=?1;`

  static SelectUserSettingsChannel = `
      SELECT
        SpaceId AS spaceId,
        ChannelId AS channelId,
        UserId AS userId,
        ChannelMembership AS channelMembership,
        ChannelMute AS channelMute
      FROM UserSettingsChannel
      WHERE
        UserId=?1;`

  static DeleteUserSettingsSpace = `
    DELETE FROM UserSettingsSpace
    WHERE
      UserId=?1;`

  static DeleteUserSettingsChannel = `
    DELETE FROM UserSettingsChannel
    WHERE
      UserId=?1;`

  static InsertIntoUserSettingsSpace = `
    INSERT INTO UserSettingsSpace (
      SpaceId,
      UserId,
      SpaceMembership,
      SpaceMute
    ) VALUES (
      ?1,
      ?2,
      ?3,
      ?4
    ) ON CONFLICT (SpaceId, UserId)
    DO UPDATE SET
      SpaceMembership = excluded.SpaceMembership,
      SpaceMute = excluded.SpaceMute;`

  static InsertIntoUserSettingsChannel = `
    INSERT INTO UserSettingsChannel (
      SpaceId,
      ChannelId,
      UserId,
      ChannelMembership,
      ChannelMute
    ) VALUES (
      ?1,
      ?2,
      ?3,
      ?4,
      ?5
    ) ON CONFLICT (ChannelId, UserId)
    DO UPDATE SET
      ChannelMembership = excluded.ChannelMembership,
      ChannelMute = excluded.ChannelMute;`
}

// see SettingsSqlStatement.SelectUserSettingsSpace
export interface QueryResultUserSettingsSpace {
  spaceId: string
  userId: string
  spaceMembership: Membership
  spaceMute: Mute
}

// see SettingsSqlStatement.SelectUserSettingsChannel
export interface QueryResultUserSettingsChannel {
  spaceId: string
  channelId: string
  userId: string
  channelMembership: Membership
  channelMute: Mute
}

export type QueryResultUserSettings =
  | QueryResultUserSettingsSpace
  | QueryResultUserSettingsChannel

export async function saveSettings(
  db: D1Database,
  params: SaveSettingsRequestParams,
): Promise<Response> {
  // default to success
  let success = true
  const preparedStatements: D1PreparedStatement[] = []
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
  return success ? create204Response() : create422Response()
}

export async function deleteSettings(
  db: D1Database,
  params: DeleteSettingsRequestParams,
): Promise<Response> {
  // default to success
  let success = true
  const preparedStatements: D1PreparedStatement[] = []
  const preparedDeleteSettingSpace = preparedDeleteSettingsSpace(
    db,
    params.userId,
  )
  const preparedDeleteSettingChannel = preparedDeleteSettingsChannel(
    db,
    params.userId,
  )
  preparedStatements.push(preparedDeleteSettingSpace)
  preparedStatements.push(preparedDeleteSettingChannel)
  try {
    // execute the prepared statements
    const rows = await db.batch(preparedStatements)
    // print debug info on error
    if (rows.length > 0) {
      if (!rows[0].success) {
        printDbResultInfo('deleteSettings rows[0] sql error', rows[0])
        success = false
      }
    }
    if (rows.length > 1) {
      if (!rows[1].success) {
        printDbResultInfo('deleteSettings rows[1] sql error', rows[1])
        success = false
      }
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
  console.log(`getSettings params "${params.userId}"`)
  // create the default http response
  let success = true
  const userSettings: UserSettings = {
    userId: params.userId,
    spaceSettings: [],
    channelSettings: [],
  }

  const preparedStatements: D1PreparedStatement[] = []
  const preparedGetSettingSpace = preparedGetSettingsSpace(db, params.userId)
  const preparedGetSettingChannel = preparedGetSettingsChannel(
    db,
    params.userId,
  )
  preparedStatements.push(preparedGetSettingSpace)
  preparedStatements.push(preparedGetSettingChannel)
  try {
    // execute the prepared statements
    const rows = await db.batch(preparedStatements)
    // get the space settings
    if (rows.length > 0) {
      console.log('tak: rows[0]', rows[0].success, rows[0].results)
      if (rows[0].success) {
        userSettings.spaceSettings = rows[0].results.map(
          (r): UserSettingsSpace => {
            const queryResult = r as QueryResultUserSettingsSpace
            return {
              spaceId: queryResult.spaceId,
              spaceMembership: queryResult.spaceMembership,
              spaceMute: queryResult.spaceMute,
            }
          },
        )
      } else {
        printDbResultInfo('getSettings rows[0] sql error', rows[0])
        success = false
      }
    }
    // get the channel settings
    if (rows.length > 1) {
      console.log('tak: rows[1]', rows[1].success, rows[1].results)
      if (rows[1].success) {
        userSettings.channelSettings = rows[1].results.map(
          (r): UserSettingsChannel => {
            const queryResult = r as QueryResultUserSettingsChannel
            return {
              spaceId: queryResult.spaceId,
              channelId: queryResult.channelId,
              channelMembership: queryResult.channelMembership,
              channelMute: queryResult.channelMute,
            }
          },
        )
      } else {
        printDbResultInfo('getSettings rows[1] sql error', rows[1])
        success = false
      }
    }
  } catch (e) {
    console.error('getSettings error', e)
    success = false
  }
  // http response
  if (success) {
    return new Response(JSON.stringify(userSettings), {
      status: 200,
    })
  } else {
    return create422Response()
  }
}

function preparedGetSettingsSpace(
  db: D1Database,
  userId: string,
): D1PreparedStatement {
  const preparedStatment = db.prepare(
    SettingsSqlStatement.SelectUserSettingsSpace,
  )
  return preparedStatment.bind(userId)
}

function preparedGetSettingsChannel(
  db: D1Database,
  userId: string,
): D1PreparedStatement {
  const preparedStatment = db.prepare(
    SettingsSqlStatement.SelectUserSettingsChannel,
  )
  return preparedStatment.bind(userId)
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
      s.spaceMembership,
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
      s.channelMembership,
      s.channelMute,
    )
    preparedStatements.push(bindedNewSettings)
  }
}

function preparedDeleteSettingsSpace(
  db: D1Database,
  userId: string,
): D1PreparedStatement {
  const preparedStatment = db.prepare(
    SettingsSqlStatement.DeleteUserSettingsSpace,
  )
  return preparedStatment.bind(userId)
}

function preparedDeleteSettingsChannel(
  db: D1Database,
  userId: string,
): D1PreparedStatement {
  const preparedStatment = db.prepare(
    SettingsSqlStatement.DeleteUserSettingsChannel,
  )
  return preparedStatment.bind(userId)
}
