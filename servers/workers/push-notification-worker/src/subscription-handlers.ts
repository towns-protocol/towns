import {
  AddSubscriptionRequestParams,
  RemoveSubscriptionRequestParams,
} from './request-interfaces'
import { PushType, UserId, isPushType, isUserId } from './types'

import { Env } from './index'
import { create204Response, create422Response } from './http-responses'
import { printDbResultInfo } from './sql'

export class PushSubscriptionSqlStatement {
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

export interface QueryResultSubscription {
  userId: UserId
  pushSubscription: string // stored as string in the database
  pushType: PushType
}

export function isQueryResultSubscription(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  result: any,
): result is QueryResultSubscription {
  return (
    isUserId(result.userId) &&
    typeof result.pushSubscription === 'string' &&
    isPushType(result.pushType)
  )
}

export async function addPushSubscription(
  params: AddSubscriptionRequestParams,
  env: Env,
) {
  const pushType: PushType = params.pushType ?? 'web-push' // default
  const result = await env.DB.prepare(
    PushSubscriptionSqlStatement.InsertIntoPushSubscription,
  )
    .bind(params.userId, JSON.stringify(params.subscriptionObject), pushType)
    .run()

  let response: Response = create204Response()
  if (!result.success) {
    printDbResultInfo('addPushSubscription sql error', result)
    response = create422Response()
  }
  return create204Response()
}

export async function removePushSubscription(
  params: RemoveSubscriptionRequestParams,
  env: Env,
) {
  const result = await deletePushSubscription(
    env.DB,
    params.userId,
    JSON.stringify(params.subscriptionObject),
  )
  let response: Response = create204Response()
  if (!result.success) {
    printDbResultInfo('removePushSubscription sql error', result)
    response = create422Response()
  }
  return create204Response()
}

export async function deletePushSubscription(
  db: D1Database,
  userId: string,
  subscriptionObject: string,
) {
  return db
    .prepare(PushSubscriptionSqlStatement.DeleteFromPushSubscription)
    .bind(userId, subscriptionObject)
    .run()
}
