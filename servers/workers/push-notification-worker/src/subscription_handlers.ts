import {
  AddChannelSubscriptionRequestParams,
  AddSubscriptionRequestParams,
} from './subscription_types'
import { Environment } from '../../common'

class SqlStatements {
  static selectPushSubscriptionsLimited =
    'SELECT * FROM PushSubscription LIMIT 20;'
  static insertIntoPushSubscription = `
INSERT INTO PushSubscription (
  UserId,
  PushSubscription
) VALUES (
  ?1,
  ?2,
) ON CONFLICT (PushSubscription) DO
UPDATE SET
  UserId=excluded.UserId;`
}

export async function getPushSubscriptions(env: Environment, db: D1Database) {
  // for development and test only. should be disabled in prod
  switch (env) {
    case 'development':
    case 'test': {
      const { results } = await db
        .prepare(SqlStatements.selectPushSubscriptionsLimited)
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
    .prepare(SqlStatements.insertIntoPushSubscription)
    .bind(params.userId, params.pushSubscription)
    .run()
  return new Response('', { status: 204 })
}
