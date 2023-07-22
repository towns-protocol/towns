import {
  DeleteSettingsRequestParams,
  GetSettingsRequestParams,
  SaveSettingsRequestParams,
} from './request-interfaces'
import { create204Response, create422Response } from './http-responses'

import { UserId } from './types'
import { printDbResultInfo } from './sql'

class SettingsSqlStatement {
  static InsertIntoNotificationSettings = `
  INSERT INTO NotificationSettings (
    UserId,
    Settings
  ) VALUES (
    ?1,
    ?2
  ) ON CONFLICT (UserId)
  DO UPDATE SET
    Settings = excluded.Settings;`

  static SelectFromNotificationSettings = `
  SELECT
    UserId AS userId,
    Settings AS settings
  FROM NotificationSettings
  WHERE
    UserId=?1;`

  static DeleteFromNotificationSettings = `
    DELETE FROM NotificationSettings
    WHERE
      UserId=?1;`
}

export interface QueryResultNotificationSettings {
  userId: UserId
  settings: string
}

export async function saveSettings(
  db: D1Database,
  params: SaveSettingsRequestParams,
) {
  const result = await db
    .prepare(SettingsSqlStatement.InsertIntoNotificationSettings)
    .bind(params.userId, JSON.stringify(params.settings))
    .run()
  let response: Response = create204Response()
  if (!result.success) {
    printDbResultInfo('saveSettings sql error', result)
    response = create422Response()
  }
  return create204Response()
}

export async function deleteSettings(
  db: D1Database,
  params: DeleteSettingsRequestParams,
) {
  const result = await db
    .prepare(SettingsSqlStatement.DeleteFromNotificationSettings)
    .bind(params.userId)
    .run()
  let response: Response = create204Response()
  if (!result.success) {
    printDbResultInfo('deleteSettings sql error', result)
    response = create422Response()
  }
  return create204Response()
}

export async function getSettings(
  db: D1Database,
  params: GetSettingsRequestParams,
) {
  const result = await db
    .prepare(SettingsSqlStatement.SelectFromNotificationSettings)
    .bind(params.userId)
    .run()
  let response: Response = create204Response()
  if (!result.success) {
    printDbResultInfo('getSettings sql error', result)
    response = create422Response()
  }
  return create204Response()
}
