// only 'web-push' is supported for now. 'ios' and 'android' are reserved for future use.
export type PushType = 'web-push' | 'ios' | 'android'

export interface PushSubscriptionKeys {
  auth: string
  p256dh: string
}

export interface PushSubscription {
  endpoint: string
  keys: PushSubscriptionKeys
  expirationTime: number | null
}

function isPushSubscription(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  subscription: any,
): subscription is PushSubscription {
  return (
    subscription.endpoint &&
    subscription.keys &&
    subscription.keys.auth &&
    subscription.keys.p256dh &&
    subscription.expirationTime !== undefined
  )
}

export interface AddSubscriptionRequestParams {
  userId: string
  pushSubscription: PushSubscription
}

export function isAddSubscriptionRequestParams(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params: any,
): params is AddSubscriptionRequestParams {
  return (
    params.userId &&
    params.pushSubscription &&
    isPushSubscription(params.pushSubscription)
  )
}

export interface RemoveSubscriptionRequestParams {
  userId: string
  pushSubscription: PushSubscription
}

export function isRemoveSubscriptionRequestParams(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params: any,
): params is RemoveSubscriptionRequestParams {
  return (
    params.userId &&
    params.pushSubscription &&
    isPushSubscription(params.pushSubscription)
  )
}
