import { PushType, UserId, isPushType, isUserId } from './types'

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

export interface QueryResultNotificationTag {
  channelId: string
  userId: UserId
  tag: string
}
