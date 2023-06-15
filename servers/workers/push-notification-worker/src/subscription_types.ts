// only 'web-push' is supported for now. 'ios' and 'android' are reserved for future use.
export type PushType = 'web-push' | 'ios' | 'android'

export interface PushSubscriptionKeys {
  auth: string
  p256dh: string
}

export interface PushSubscription {
  endpoint: string
  keys: PushSubscriptionKeys
}

export interface AddSubscriptionRequestParams {
  userId: string
  pushSubscription: PushSubscription
}

export interface AddChannelSubscriptionRequestParams {
  userId: string
  pushSubscription: PushSubscription
}

export function isAddSubscriptionRequestParams(
  params: any,
): params is AddSubscriptionRequestParams {
  return (
    params.userId &&
    params.pushSubscription &&
    isPushSubscription(params.pushSubscription)
  )
}

function isPushSubscription(
  subscription: any,
): subscription is PushSubscription {
  return (
    subscription.endpoint &&
    subscription.keys &&
    subscription.keys.auth &&
    subscription.keys.p256dh
  )
}
