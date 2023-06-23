import {
  PushType,
  SubscriptionObject,
  Urgency,
  UserId,
  isPushType,
  isSubscriptionObject,
  isUrgency,
  isUserId,
} from './type-aliases'

export interface AddSubscriptionRequestParams {
  userId: UserId
  subscriptionObject: SubscriptionObject
  pushType?: PushType
}

export function isAddSubscriptionRequestParams(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params: any,
): params is AddSubscriptionRequestParams {
  return isUserId(params.userId) &&
    isSubscriptionObject(params.subscriptionObject) &&
    params.pushType /*optional parameter*/
    ? isPushType(params.pushType)
    : true
}

export interface RemoveSubscriptionRequestParams {
  userId: string
  subscriptionObject: SubscriptionObject
}

export function isRemoveSubscriptionRequestParams(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params: any,
): params is RemoveSubscriptionRequestParams {
  return (
    isUserId(params.userId) && isSubscriptionObject(params.subscriptionObject)
  )
}

export interface NotifyRequestParams {
  users: string[]
  payload: string
  title?: string
  /* push options */
  urgency?: Urgency
}

export function isNotifyRequestParams(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params: any,
): params is NotifyRequestParams {
  return (
    Array.isArray(params.users) &&
    params.users.every((user: unknown) => isUserId(user)) &&
    typeof params.payload === 'string' &&
    /* optional parameters */
    (typeof params.title === 'string' || params.title === undefined) &&
    (isUrgency(params.urgency) || params.urgency === undefined)
  )
}
