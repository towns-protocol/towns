import {
  AddSubscriptionRequestParams,
  RemoveSubscriptionRequestParams,
} from './subscription_types'

import { Environment } from '../../common'

class SqlStatement {
  static SelectPushSubscriptionsLimited =
    'SELECT * FROM PushSubscription LIMIT 20;'

  static InsertIntoPushSubscription = `
INSERT INTO PushSubscription (
  UserId,
  PushSubscription
) VALUES (
  ?1,
  ?2,
) ON CONFLICT (PushSubscription) DO
UPDATE SET
  UserId=excluded.UserId;`

  static DeleteFromPushSubscription = `
DELETE FROM PushSubscription
WHERE
  UserId=?1 AND
  PushSubscription=?2;`
}

export async function getPushSubscriptions(env: Environment, db: D1Database) {
  // for development and test only. should be disabled in prod
  switch (env) {
    case 'development':
    case 'test': {
      const { results } = await db
        .prepare(SqlStatement.SelectPushSubscriptionsLimited)
        .all()
      return Response.json(results)
    }
    default:
      console.log(
        '[subscription_handler] Test function is not allowed for environment',
        env,
      )
      return new Response('Not allowed', { status: 404 })
  }
}

export async function addPushSubscription(
  params: AddSubscriptionRequestParams,
  db: D1Database,
) {
  const info = await db
    .prepare(SqlStatement.InsertIntoPushSubscription)
    .bind(params.userId, params.pushSubscription)
    .run()
  return new Response('', { status: 204 })
}

export async function removePushSubscription(
  params: RemoveSubscriptionRequestParams,
  db: D1Database,
) {
  const info = await db
    .prepare(SqlStatement.DeleteFromPushSubscription)
    .bind(params.userId, params.pushSubscription)
    .run()
  return new Response('', { status: 204 })
}
