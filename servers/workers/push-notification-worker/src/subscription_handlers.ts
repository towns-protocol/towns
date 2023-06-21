import {
  AddSubscriptionRequestParams,
  RemoveSubscriptionRequestParams,
} from './subscription_types'

class SqlStatement {
  static SelectPushSubscriptionsLimited =
    'SELECT * FROM PushSubscription LIMIT 20;'

  static InsertIntoPushSubscription = `
INSERT INTO PushSubscription (
  UserId,
  PushSubscription
) VALUES (
  ?1,
  ?2
) ON CONFLICT (PushSubscription) DO
UPDATE SET
  UserId=excluded.UserId;`

  static DeleteFromPushSubscription = `
DELETE FROM PushSubscription
WHERE
  UserId=?1 AND
  PushSubscription=?2;`
}

export async function addPushSubscription(
  params: AddSubscriptionRequestParams,
  db: D1Database,
) {
  // store the pushSubscription as a string
  const pushSubscription = JSON.stringify(params.pushSubscription)
  const info = await db
    .prepare(SqlStatement.InsertIntoPushSubscription)
    .bind(params.userId, pushSubscription)
    .run()
  console.log(
    'addPushSubscription',
    'success:',
    info.success,
    'meta:',
    info.meta,
    'results:',
    info.results,
  )
  return new Response(null, { status: 204 })
}

export async function removePushSubscription(
  params: RemoveSubscriptionRequestParams,
  db: D1Database,
) {
  // pushSubscription was stored as a string
  const pushSubscription = JSON.stringify(params.pushSubscription)
  const info = await db
    .prepare(SqlStatement.DeleteFromPushSubscription)
    .bind(params.userId, pushSubscription)
    .run()
  console.log(
    'removePushSubscription',
    'success:',
    info.success,
    'meta:',
    info.meta,
    'results:',
    info.results,
  )
  return new Response(null, { status: 204 })
}
